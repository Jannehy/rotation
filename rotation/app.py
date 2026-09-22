"""The Flask application: sign-in, the JSON API and the artwork proxy."""

from __future__ import annotations

import secrets
import threading
import time
from datetime import timedelta

from flask import (Flask, Response, abort, jsonify, render_template, request,
                   send_file, session)
from io import BytesIO

from . import __version__, config, periods, playlists, wrapped
from .navidrome import Credentials, Database, NavidromeUnavailable, Subsonic
from .stats import Stats
from .store import PlaylistRules, Store

SESSION_DAYS = 30
ART_CACHE_SIZE = 256


class CredentialCache:
    """Subsonic tokens for signed-in users, in memory only.

    They never touch disk: a restart signs everyone out, which is the right
    trade for not storing password-equivalent secrets.
    """

    def __init__(self, ttl_seconds: int = SESSION_DAYS * 86400):
        self._items: dict[str, tuple[Credentials, float]] = {}
        self._ttl = ttl_seconds
        self._lock = threading.Lock()

    def put(self, sid: str, credentials: Credentials) -> None:
        with self._lock:
            self._items[sid] = (credentials, time.time())

    def get(self, sid: str) -> Credentials | None:
        with self._lock:
            item = self._items.get(sid)
            if item is None:
                return None
            credentials, created = item
            if time.time() - created > self._ttl:
                del self._items[sid]
                return None
            return credentials

    def drop(self, sid: str) -> None:
        with self._lock:
            self._items.pop(sid, None)


def create_app() -> Flask:
    cfg = config.load()
    app = Flask(__name__, static_folder="../static", template_folder="../templates")
    app.secret_key = cfg.secret_key
    app.permanent_session_lifetime = timedelta(days=SESSION_DAYS)
    app.config.update(SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_HTTPONLY=True)

    db = Database(cfg.navidrome_db)
    store = Store(cfg.store_path)
    subsonic = Subsonic(cfg.navidrome_url, verify_tls=cfg.verify_tls)
    stats = Stats(db, cfg.timezone)
    credentials = CredentialCache()
    rules = PlaylistRules(store)
    art_cache: dict[str, tuple[bytes, str]] = {}

    app.config["ROTATION"] = {"cfg": cfg, "db": db, "store": store, "stats": stats}

    # -- helpers ----------------------------------------------------------

    def current_user_id() -> str | None:
        sid = session.get("sid")
        if not sid or credentials.get(sid) is None:
            return None
        return session.get("uid")

    def require_user() -> str:
        user_id = current_user_id()
        if not user_id:
            abort(401)
        return user_id

    def target_user(viewer_id: str) -> str:
        """Whose numbers are being asked for – mine, or a friend's."""
        requested = request.args.get("user")
        if not requested or requested == viewer_id:
            return viewer_id
        if not store.are_friends(viewer_id, requested):
            abort(403)
        return requested

    def range_for(user_id: str, key: str) -> periods.Range:
        first = stats.bounds(user_id)["first_play"]
        return periods.resolve(key, cfg.timezone, first or None)

    keeper = playlists.PlaylistKeeper(
        rules, stats, subsonic, cfg.timezone,
        resolve=lambda user_id, key: range_for(user_id, key),
        log=app.logger.info)
    keeper.start()

    def describe(user_id: str) -> dict:
        profile = store.profile(user_id)
        user = db.user_by_id(user_id)
        return {
            "id": user_id,
            "user_name": user.user_name if user else (profile.user_name if profile else "?"),
            "name": (user.display_name if user else None) or (profile.name if profile else "?"),
        }

    # -- open endpoints ---------------------------------------------------

    @app.get("/api/version")
    def version():
        return jsonify({"name": "Rotation", "version": __version__})

    @app.get("/health")
    def health():
        try:
            db.check()
        except NavidromeUnavailable as exc:
            return jsonify({"status": "error", "detail": str(exc),
                            "version": __version__}), 503
        return jsonify({"status": "ok", "version": __version__})

    @app.get("/")
    def index():
        return render_template("index.html", version=__version__)

    @app.post("/api/login")
    def login():
        payload = request.get_json(silent=True) or {}
        user_name = (payload.get("username") or "").strip()
        password = payload.get("password") or ""
        if not user_name or not password:
            return jsonify({"error": "missing"}), 400

        creds = Subsonic.credentials_for(user_name, password)
        try:
            accepted = subsonic.ping(creds)
        except NavidromeUnavailable as exc:
            return jsonify({"error": "unreachable", "detail": str(exc)}), 502
        if not accepted:
            return jsonify({"error": "invalid"}), 401

        user = db.user_by_name(user_name)
        if user is None:
            # Navidrome accepted the login, so this can only mean the database
            # Rotation reads is not the one that server is using.
            return jsonify({"error": "mismatch"}), 500

        sid = secrets.token_urlsafe(24)
        credentials.put(sid, creds)
        # The nightly refresh needs to reach Navidrome without anyone being
        # logged in; the token stays in memory, never in a file.
        keeper.remember(user.id, creds)
        store.touch(user.id, user.user_name, user.name)
        session.permanent = True
        session["sid"] = sid
        session["uid"] = user.id
        return jsonify({"ok": True, "user": describe(user.id)})

    @app.post("/api/logout")
    def logout():
        sid = session.get("sid")
        if sid:
            credentials.drop(sid)
        session.clear()
        return jsonify({"ok": True})

    # -- identity ---------------------------------------------------------

    @app.get("/api/me")
    def me():
        user_id = require_user()
        if db.user_by_id(user_id) is None:
            # The session names an account Navidrome does not have. That used
            # to mean an endless empty page: every query asked for a user id
            # nobody owns and got nothing back. Ending the session sends the
            # client to the sign-in screen, where the current id is picked up.
            session.clear()
            abort(401)
        bounds = stats.bounds(user_id)
        profile = store.profile(user_id)
        return jsonify({
            "user": describe(user_id),
            "bounds": bounds,
            "years": periods.years_between(bounds["first_play"], bounds["last_play"],
                                           cfg.timezone),
            "timezone": str(cfg.timezone),
            "discoverable": profile.discoverable if profile else True,
            "season": periods.season(cfg.timezone),
            "version": __version__,
        })

    @app.post("/api/settings")
    def settings():
        user_id = require_user()
        payload = request.get_json(silent=True) or {}
        if "discoverable" in payload:
            store.set_discoverable(user_id, bool(payload["discoverable"]))
        return jsonify({"ok": True})

    # -- statistics -------------------------------------------------------

    @app.get("/api/overview")
    def overview():
        viewer = require_user()
        user_id = target_user(viewer)
        # Default "all": a client that does not name a period gets the whole
        # history rather than a page full of zeros.
        rng = range_for(user_id, request.args.get("range", "all"))
        return jsonify({
            "user": describe(user_id),
            "range": {"key": rng.key, "label": rng.label, "start": rng.start,
                      "end": rng.end, "days": rng.days},
            "summary": stats.summary(user_id, rng),
            "tracks": stats.top_tracks(user_id, rng, 25),
            "artists": stats.top_artists(user_id, rng, 25),
            "albums": stats.top_albums(user_id, rng, 25),
            "genres": stats.top_genres(user_id, rng, 10),
            "timeline": stats.timeline(user_id, rng),
            "clock": stats.clock(user_id, rng),
            "streaks": stats.streaks(user_id),
            "discoveries": stats.discoveries(user_id, rng, 12),
        })

    @app.get("/api/recent")
    def recent():
        viewer = require_user()
        user_id = target_user(viewer)
        limit = min(int(request.args.get("limit", 50)), 200)
        return jsonify({"plays": stats.recent(user_id, limit)})

    @app.get("/api/wrapped")
    def wrapped_year():
        viewer = require_user()
        user_id = target_user(viewer)
        bounds = stats.bounds(user_id)
        years = periods.years_between(bounds["first_play"], bounds["last_play"],
                                      cfg.timezone)
        requested = request.args.get("year")
        year = int(requested) if requested and requested.isdigit() else (
            years[0] if years else 0)
        if not year:
            return jsonify({"has_data": False, "years": []})
        payload = wrapped.build(stats, user_id, year, cfg.timezone)
        payload["years"] = years
        payload["user"] = describe(user_id)
        return jsonify(payload)

    # -- one item at a time -----------------------------------------------

    @app.get("/api/track/<path:item_id>")
    def track_detail(item_id: str):
        return _detail(stats.track_detail, item_id)

    @app.get("/api/artist/<path:item_id>")
    def artist_detail(item_id: str):
        return _detail(stats.artist_detail, item_id)

    @app.get("/api/album/<path:item_id>")
    def album_detail(item_id: str):
        return _detail(stats.album_detail, item_id)

    def _detail(lookup, item_id: str):
        viewer = require_user()
        user_id = target_user(viewer)
        # The detail page answers for the period the user is looking at, so
        # its play count and rank match the list they came from.
        # Default "all": a client that does not name a period gets the whole
        # history rather than a page full of zeros.
        rng = range_for(user_id, request.args.get("range", "all"))
        payload = lookup(user_id, item_id, rng)
        if payload is None:
            return jsonify({"error": "unknown"}), 404
        payload["user"] = describe(user_id)
        return jsonify(payload)

    # -- friends ----------------------------------------------------------

    @app.get("/api/friends")
    def friends():
        user_id = require_user()
        known = {u.id: u for u in db.users()}
        mutual = store.friend_ids(user_id)
        incoming = store.incoming(user_id)
        outgoing = store.outgoing(user_id)
        taken = mutual | incoming | outgoing | {user_id}
        # Only people who have opened Rotation and left themselves findable
        # show up as suggestions – nobody is listed against their will.
        suggestions = (store.discoverable_ids() & set(known)) - taken

        def block(ids):
            return sorted((describe(i) for i in ids if i in known),
                          key=lambda entry: entry["name"].lower())

        return jsonify({
            "friends": block(mutual),
            "incoming": block(incoming),
            "outgoing": block(outgoing),
            "suggestions": block(suggestions),
        })

    @app.post("/api/friends")
    def friend_add():
        user_id = require_user()
        payload = request.get_json(silent=True) or {}
        other = payload.get("user_id") or ""
        if not other or db.user_by_id(other) is None:
            return jsonify({"error": "unknown"}), 404
        store.add(user_id, other)
        return jsonify({"ok": True, "friends": store.are_friends(user_id, other)})

    @app.delete("/api/friends/<other_id>")
    def friend_remove(other_id: str):
        user_id = require_user()
        if request.args.get("withdraw") == "1":
            store.withdraw(user_id, other_id)
        else:
            store.remove(user_id, other_id)
        return jsonify({"ok": True})

    @app.get("/api/compare")
    def compare():
        viewer = require_user()
        other = request.args.get("user") or ""
        if not store.are_friends(viewer, other) or other == viewer:
            abort(403)
        rng = range_for(viewer, request.args.get("range", "30d"))
        mine = stats.top_artists(viewer, rng, 100)
        theirs = stats.top_artists(other, rng, 100)
        theirs_by_id = {a["id"]: a for a in theirs}
        shared = [
            {"name": a["name"], "art": a["art"],
             "mine": a["plays"], "theirs": theirs_by_id[a["id"]]["plays"]}
            for a in mine if a["id"] in theirs_by_id
        ]
        shared.sort(key=lambda entry: min(entry["mine"], entry["theirs"]), reverse=True)
        return jsonify({
            "range": {"key": rng.key, "label": rng.label, "start": rng.start,
                      "end": rng.end, "days": rng.days},
            "me": {"user": describe(viewer), "summary": stats.summary(viewer, rng),
                   "artists": mine[:10], "tracks": stats.top_tracks(viewer, rng, 5)},
            "them": {"user": describe(other), "summary": stats.summary(other, rng),
                     "artists": theirs[:10], "tracks": stats.top_tracks(other, rng, 5)},
            "shared": shared[:12],
        })

    # -- artwork ----------------------------------------------------------

    @app.get("/api/art/<art_id>")
    def art(art_id: str):
        sid = session.get("sid")
        creds = credentials.get(sid) if sid else None
        if creds is None:
            abort(401)
        size = min(int(request.args.get("size", 300)), 1000)
        key = f"{art_id}:{size}"
        hit = art_cache.get(key)
        if hit is None:
            # An artist arrives as "portrait~cover": take the first one
            # Navidrome actually hands out.
            fetched = None
            for candidate in art_id.split("~"):
                if not candidate:
                    continue
                fetched = subsonic.cover_art(creds, candidate, size)
                if fetched is not None:
                    break
            if fetched is None:
                abort(404)
            if len(art_cache) >= ART_CACHE_SIZE:
                art_cache.pop(next(iter(art_cache)))
            art_cache[key] = fetched
            hit = fetched
        payload, content_type = hit
        response = send_file(BytesIO(payload), mimetype=content_type)
        # Six hours, not a day: a portrait can improve when a metadata agent
        # finds a better one, and the id only changes if Navidrome noticed.
        response.headers["Cache-Control"] = "private, max-age=21600"
        return response

    # -- playlists Rotation keeps -----------------------------------------

    @app.get("/api/playlists")
    def playlist_rules():
        user_id = require_user()
        return jsonify({"playlists": [_rule_json(rule) for rule in rules.of(user_id)]})

    @app.post("/api/playlists")
    def playlist_create():
        user_id = require_user()
        payload = request.get_json(silent=True) or {}
        key = payload.get("range") or "30d"
        lang = playlists.language(payload.get("lang")
                                 or request.headers.get("Accept-Language"))
        rng = range_for(user_id, key)
        size = playlists.size_for(rng.key)
        rule = rules.upsert(user_id, rng.key, size,
                            playlists.name_for(rng.key, size, lang), lang)
        sid = session.get("sid")
        creds = credentials.get(sid) if sid else None
        written = keeper.refresh(rule, creds)
        if written is None:
            return jsonify({"error": "unreachable"}), 502
        fresh = next((r for r in rules.of(user_id) if r.id == rule.id), rule)
        return jsonify({"ok": True, "playlist": _rule_json(fresh), "tracks": written})

    @app.delete("/api/playlists/<range_key>")
    def playlist_forget(range_key: str):
        """Stops looking after it. The playlist itself stays in Navidrome."""
        user_id = require_user()
        rules.forget(user_id, range_key)
        return jsonify({"ok": True})

    def _rule_json(rule) -> dict:
        return {
            "range": rule.range_key,
            "size": rule.size,
            "name": rule.name,
            "playlist_id": rule.playlist_id,
            "tracks": rule.tracks,
            "updated_at": rule.updated_at,
        }

    # -- playback ---------------------------------------------------------

    @app.get("/api/stream/<track_id>")
    def stream(track_id: str):
        """One track, for the music behind the recap story.

        Rotation is a statistics app and holds no audio of its own; this hands
        the browser through to Navidrome with the session's own credentials,
        so nothing is playable that the user could not play anyway.
        """
        sid = session.get("sid")
        creds = credentials.get(sid) if sid else None
        if creds is None:
            abort(401)
        # The story starts its snippets in the middle of a song, so the range
        # the browser asks for has to reach Navidrome untouched.
        upstream = subsonic.stream(creds, track_id,
                                   byte_range=request.headers.get("Range"))
        if upstream is None:
            abort(404)

        def chunks():
            try:
                for chunk in upstream.iter_content(chunk_size=64 * 1024):
                    yield chunk
            finally:
                upstream.close()

        response = Response(
            chunks(),
            status=upstream.status_code,
            mimetype=upstream.headers.get("Content-Type", "audio/mpeg"))
        for header in ("Content-Length", "Content-Range", "Accept-Ranges"):
            value = upstream.headers.get(header)
            if value:
                response.headers[header] = value
        response.headers.setdefault("Accept-Ranges", "bytes")
        response.headers["Cache-Control"] = "private, max-age=3600"
        return response

    @app.errorhandler(401)
    def unauthorised(_):
        return jsonify({"error": "unauthorised"}), 401

    @app.errorhandler(403)
    def forbidden(_):
        return jsonify({"error": "forbidden"}), 403

    return app
