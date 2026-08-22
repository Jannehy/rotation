"""The queries behind every number Rotation shows.

All of them read `scrobbles`, Navidrome's one-row-per-play history, joined to
the track metadata. Play counts in `annotation` are only used for the
lifetime totals from before Navidrome started keeping that history.
"""

from __future__ import annotations

import sqlite3
import time
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from .navidrome import Database, NavidromeUnavailable
from .periods import Range

# Joined once here so every query agrees on what "a play" is.
PLAYS = """
    FROM scrobbles AS s
    JOIN media_file AS mf ON mf.id = s.media_file_id
    WHERE s.user_id = ? AND s.submission_time >= ? AND s.submission_time < ?
"""


# How long the look-up of "which artists have a portrait" stays valid. Only a
# library scan changes the answer, so minutes are plenty.
ARTIST_IMAGE_TTL = 600

# Both picture services answer "we have no photo of this one" with a URL that
# works – Deezer with a grey silhouette, Last.fm with a grey star. Navidrome
# stores those like any other image, so an artist would end up with a blank
# avatar instead of the album cover we would otherwise show.
PLACEHOLDER_ART = (
    "d41d8cd98f00b204e9800998ecf8427e",   # md5 of nothing at all – Deezer
    "2a96cbd8b46e442fc41c2b86b821562f",   # Last.fm
)


def _is_portrait(url: str | None) -> bool:
    return bool(url) and not any(mark in url for mark in PLACEHOLDER_ART)


def _seconds(value) -> int:
    """Navidrome writes its timestamps as ISO text; we want plain seconds."""
    if not value:
        return 0
    try:
        moment = datetime.fromisoformat(str(value))
    except ValueError:
        return 0
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return int(moment.timestamp())


class Stats:
    def __init__(self, db: Database, tz: ZoneInfo):
        self.db = db
        self.tz = tz
        self._artist_images: dict[str, int] | None = None
        self._artist_images_at = 0.0

    # -- helpers ----------------------------------------------------------

    def _rows(self, sql: str, params: tuple) -> list:
        with self.db.connect() as conn:
            return conn.execute(sql, params).fetchall()

    def _one(self, sql: str, params: tuple):
        with self.db.connect() as conn:
            return conn.execute(sql, params).fetchone()

    def _args(self, user_id: str, rng: Range) -> tuple:
        return (user_id, rng.start, rng.end)

    def _local(self, ts: int) -> datetime:
        return datetime.fromtimestamp(ts, self.tz)

    # -- artwork ----------------------------------------------------------
    #
    # Navidrome keeps real artist portraits – whatever a metadata agent found,
    # or an image file next to the music – and serves them under the artwork
    # id `ar-<artist id>_<last update>`. It only has one for the artists it
    # could actually look up, so we ask the database which those are and fall
    # back to an album cover for the rest. Both ids reach the client in one
    # string, separated by `~`: /api/art tries them in order, so a portrait
    # whose source has gone stale still shows the cover.
    #
    # The last-update stamp is Navidrome's own: when a metadata agent finds a
    # better picture, the id changes and every cache along the way – ours,
    # the browser's, Navidrome's – lets go of the old one by itself.

    def _portraits(self) -> dict[str, int]:
        """Artists with a real picture, each with the time it last changed."""
        now = time.monotonic()
        if (self._artist_images is not None
                and now - self._artist_images_at < ARTIST_IMAGE_TTL):
            return self._artist_images
        found: dict[str, int] = {}
        try:
            with self.db.connect() as conn:
                columns = {
                    row["name"] for row in conn.execute("PRAGMA table_info(artist)")
                }
                # `uploaded_image` only exists in newer Navidrome versions.
                urls = [column for column in ("large_image_url", "medium_image_url")
                        if column in columns]
                uploaded = "uploaded_image" if "uploaded_image" in columns else None
                stamps = [column for column in
                          ("external_info_updated_at", "updated_at")
                          if column in columns]
                wanted = urls + ([uploaded] if uploaded else [])
                if wanted:
                    where = " OR ".join(f"COALESCE({c}, '') <> ''" for c in wanted)
                    rows = conn.execute(
                        f"SELECT id, {', '.join(wanted + stamps)} "
                        f"FROM artist WHERE {where}")
                    for row in rows:
                        has_image = (
                            (uploaded and (row[uploaded] or ""))
                            or any(_is_portrait(row[column]) for column in urls)
                        )
                        if has_image:
                            found[row["id"]] = max(
                                (_seconds(row[column]) for column in stamps),
                                default=0)
        except (sqlite3.Error, NavidromeUnavailable):
            found = {}
        self._artist_images, self._artist_images_at = found, now
        return found

    def _artist_name(self, artist_key: str, fallback: str) -> str:
        """The artist's own name, not the list of everyone on the track."""
        row = self._one("SELECT name FROM artist WHERE id = ?", (artist_key,))
        return (row["name"] if row else None) or fallback

    def _artist_art(self, artist_key: str, cover: str | None) -> str | None:
        """The portrait where there is one, with the album cover behind it."""
        stamp = self._portraits().get(artist_key)
        if stamp is None:
            return cover
        portrait = f"ar-{artist_key}_{stamp:x}"
        return f"{portrait}~{cover}" if cover else portrait

    # -- overall shape of a user's history --------------------------------

    def bounds(self, user_id: str) -> dict:
        row = self._one(
            "SELECT MIN(submission_time) AS first, MAX(submission_time) AS last, "
            "COUNT(*) AS plays FROM scrobbles WHERE user_id = ?",
            (user_id,),
        )
        lifetime = self._one(
            "SELECT COALESCE(SUM(play_count), 0) AS plays FROM annotation "
            "WHERE user_id = ? AND item_type = 'media_file'",
            (user_id,),
        )
        return {
            "first_play": row["first"] or 0,
            "last_play": row["last"] or 0,
            "history_plays": row["plays"] or 0,
            "lifetime_plays": lifetime["plays"] or 0,
        }

    # -- headline numbers -------------------------------------------------

    def summary(self, user_id: str, rng: Range) -> dict:
        row = self._one(
            f"""
            SELECT COUNT(*) AS plays,
                   COALESCE(SUM(mf.duration), 0) AS seconds,
                   COUNT(DISTINCT mf.id) AS tracks,
                   COUNT(DISTINCT NULLIF(mf.artist_id, '')) AS artists,
                   COUNT(DISTINCT NULLIF(mf.album_id, '')) AS albums
            {PLAYS}
            """,
            self._args(user_id, rng),
        )
        days = self._day_counts(user_id, rng)
        active = len(days)
        busiest = max(days.items(), key=lambda kv: kv[1]) if days else None
        return {
            "plays": row["plays"],
            "seconds": int(row["seconds"]),
            "tracks": row["tracks"],
            "artists": row["artists"],
            "albums": row["albums"],
            "active_days": active,
            "plays_per_active_day": round(row["plays"] / active, 1) if active else 0.0,
            "busiest_day": {"date": busiest[0], "plays": busiest[1]} if busiest else None,
        }

    # -- top lists --------------------------------------------------------

    def top_tracks(self, user_id: str, rng: Range, limit: int = 25) -> list[dict]:
        rows = self._rows(
            f"""
            SELECT mf.id, mf.title, mf.artist, mf.album, mf.album_id,
                   COUNT(*) AS plays, COALESCE(SUM(mf.duration), 0) AS seconds,
                   MAX(s.submission_time) AS last_play
            {PLAYS}
            GROUP BY mf.id
            ORDER BY plays DESC, seconds DESC
            LIMIT ?
            """,
            (*self._args(user_id, rng), limit),
        )
        return [
            {
                "id": r["id"],
                "title": r["title"],
                "artist": r["artist"],
                "album": r["album"],
                "art": r["album_id"] or r["id"],
                "plays": r["plays"],
                "seconds": int(r["seconds"]),
                "last_play": r["last_play"],
            }
            for r in rows
        ]

    def top_artists(self, user_id: str, rng: Range, limit: int = 25) -> list[dict]:
        """Grouped by artist id, so "Artist" and "Artist feat. X" stay together.

        The artwork is the artist's own picture where Navidrome has one, and
        the cover of the album they were played from most often otherwise.

        The name comes from the `artist` table, not from the track: since a
        track carries every contributor ("2Pac • Obie Trice"), using its text
        would label the group after the collaboration instead of the artist.
        """
        rows = self._rows(
            f"""
            WITH played AS (
                SELECT COALESCE(NULLIF(mf.artist_id, ''), mf.artist) AS artist_key,
                       mf.artist AS name, mf.id AS track_id,
                       mf.album_id AS album_id, mf.duration AS duration
                {PLAYS}
            ),
            ranked AS (
                SELECT artist_key,
                       MAX(name) AS name,
                       COUNT(*) AS plays,
                       COALESCE(SUM(duration), 0) AS seconds,
                       COUNT(DISTINCT track_id) AS tracks
                FROM played
                GROUP BY artist_key
                ORDER BY plays DESC, seconds DESC
                LIMIT ?
            )
            SELECT ranked.*,
                   (SELECT played.album_id FROM played
                     WHERE played.artist_key = ranked.artist_key
                       AND played.album_id <> ''
                     GROUP BY played.album_id
                     ORDER BY COUNT(*) DESC LIMIT 1) AS art,
                   (SELECT artist.name FROM artist
                     WHERE artist.id = ranked.artist_key) AS artist_name
            FROM ranked
            ORDER BY plays DESC, seconds DESC
            """,
            (*self._args(user_id, rng), limit),
        )
        return [
            {
                "id": r["artist_key"],
                "name": r["artist_name"] or r["name"],
                "plays": r["plays"],
                "seconds": int(r["seconds"]),
                "tracks": r["tracks"],
                "art": self._artist_art(r["artist_key"], r["art"]),
            }
            for r in rows
        ]

    def top_albums(self, user_id: str, rng: Range, limit: int = 25) -> list[dict]:
        rows = self._rows(
            f"""
            SELECT COALESCE(NULLIF(mf.album_id, ''), mf.album) AS key,
                   mf.album AS name,
                   MAX(mf.album_artist) AS artist,
                   COUNT(*) AS plays,
                   COALESCE(SUM(mf.duration), 0) AS seconds,
                   COUNT(DISTINCT mf.id) AS tracks,
                   MAX(mf.album_id) AS art
            {PLAYS}
              AND mf.album <> ''
            GROUP BY key
            ORDER BY plays DESC, seconds DESC
            LIMIT ?
            """,
            (*self._args(user_id, rng), limit),
        )
        return [
            {
                "id": r["key"],
                "name": r["name"],
                "artist": r["artist"],
                "plays": r["plays"],
                "seconds": int(r["seconds"]),
                "tracks": r["tracks"],
                "art": r["art"],
            }
            for r in rows
        ]

    def top_genres(self, user_id: str, rng: Range, limit: int = 12) -> list[dict]:
        """Genres live in `media_file.tags` as JSON since Navidrome 0.55.

        Tracks without a genre tag simply do not appear, so this is a view of
        the tagged part of the library, not of everything played. The plays
        are materialised first because `json_each` chokes on a row whose
        `tags` column is not valid JSON, whatever the WHERE clause says.
        """
        rows = self._rows(
            f"""
            WITH played AS MATERIALIZED (
                SELECT mf.tags AS tags, mf.duration AS duration
                {PLAYS}
                  AND mf.tags IS NOT NULL AND mf.tags <> '' AND json_valid(mf.tags)
            )
            SELECT json_extract(g.value, '$.value') AS name,
                   COUNT(*) AS plays,
                   COALESCE(SUM(played.duration), 0) AS seconds
            FROM played, json_each(played.tags, '$.genre') AS g
            WHERE name IS NOT NULL AND name <> ''
            GROUP BY name
            ORDER BY plays DESC, seconds DESC
            LIMIT ?
            """,
            (*self._args(user_id, rng), limit),
        )
        return [
            {"name": r["name"], "plays": r["plays"], "seconds": int(r["seconds"])}
            for r in rows
        ]

    # -- a track to stand for something -----------------------------------
    #
    # The recap story plays a song behind each of its cards. Picking it in the
    # browser would mean guessing from display names; here the ids decide.

    def top_track_for_artist(self, user_id: str, rng: Range,
                             artist_key: str) -> dict | None:
        """The track of this artist the user played most in the period."""
        row = self._one(
            f"""
            SELECT mf.id, mf.title, mf.artist, mf.album_id, COUNT(*) AS plays
            {PLAYS}
              AND COALESCE(NULLIF(mf.artist_id, ''), mf.artist) = ?
            GROUP BY mf.id
            ORDER BY plays DESC
            LIMIT 1
            """,
            (*self._args(user_id, rng), artist_key),
        )
        return self._track_brief(row)

    def top_track_for_genre(self, user_id: str, rng: Range,
                            genre: str) -> dict | None:
        """The track of this genre the user played most in the period."""
        row = self._one(
            f"""
            WITH played AS MATERIALIZED (
                SELECT mf.id AS id, mf.title AS title, mf.artist AS artist,
                       mf.album_id AS album_id, mf.tags AS tags
                {PLAYS}
                  AND mf.tags IS NOT NULL AND mf.tags <> '' AND json_valid(mf.tags)
            )
            SELECT played.id, played.title, played.artist, played.album_id,
                   COUNT(*) AS plays
            FROM played, json_each(played.tags, '$.genre') AS g
            WHERE json_extract(g.value, '$.value') = ?
            GROUP BY played.id
            ORDER BY plays DESC
            LIMIT 1
            """,
            (*self._args(user_id, rng), genre),
        )
        return self._track_brief(row)

    @staticmethod
    def _track_brief(row) -> dict | None:
        if row is None:
            return None
        return {
            "id": row["id"],
            "title": row["title"],
            "artist": row["artist"],
            "art": row["album_id"] or row["id"],
            "plays": row["plays"],
        }

    # -- shape over time --------------------------------------------------

    def _day_counts(self, user_id: str, rng: Range) -> dict[str, int]:
        rows = self._rows(
            f"SELECT s.submission_time AS ts {PLAYS}",
            self._args(user_id, rng),
        )
        days: dict[str, int] = {}
        for row in rows:
            key = self._local(row["ts"]).strftime("%Y-%m-%d")
            days[key] = days.get(key, 0) + 1
        return days

    def timeline(self, user_id: str, rng: Range) -> list[dict]:
        """Plays and minutes per local day, gaps filled with zeroes."""
        rows = self._rows(
            f"SELECT s.submission_time AS ts, mf.duration AS d {PLAYS}",
            self._args(user_id, rng),
        )
        buckets: dict[str, dict] = {}
        for row in rows:
            key = self._local(row["ts"]).strftime("%Y-%m-%d")
            bucket = buckets.setdefault(key, {"date": key, "plays": 0, "seconds": 0})
            bucket["plays"] += 1
            bucket["seconds"] += int(row["d"] or 0)
        if not buckets:
            return []
        start = self._local(rng.start).date()
        end = self._local(rng.end - 1).date()
        out, day = [], start
        while day <= end:
            key = day.strftime("%Y-%m-%d")
            out.append(buckets.get(key, {"date": key, "plays": 0, "seconds": 0}))
            day = day.fromordinal(day.toordinal() + 1)
        return out

    def clock(self, user_id: str, rng: Range) -> dict:
        """Weekday × hour matrix, Monday first – the listening fingerprint."""
        rows = self._rows(
            f"SELECT s.submission_time AS ts {PLAYS}",
            self._args(user_id, rng),
        )
        matrix = [[0] * 24 for _ in range(7)]
        hours = [0] * 24
        weekdays = [0] * 7
        for row in rows:
            local = self._local(row["ts"])
            matrix[local.weekday()][local.hour] += 1
            hours[local.hour] += 1
            weekdays[local.weekday()] += 1
        peak_hour = hours.index(max(hours)) if any(hours) else None
        return {
            "matrix": matrix,
            "hours": hours,
            "weekdays": weekdays,
            "peak_hour": peak_hour,
            "peak_weekday": weekdays.index(max(weekdays)) if any(weekdays) else None,
        }

    def streaks(self, user_id: str) -> dict:
        """Consecutive local days with at least one play."""
        rows = self._rows(
            "SELECT submission_time AS ts FROM scrobbles WHERE user_id = ? "
            "ORDER BY submission_time",
            (user_id,),
        )
        days = sorted({self._local(r["ts"]).date().toordinal() for r in rows})
        if not days:
            return {"current": 0, "longest": 0, "longest_end": None}
        longest = run = 1
        longest_end = days[0]
        for previous, day in zip(days, days[1:]):
            run = run + 1 if day == previous + 1 else 1
            if run > longest:
                longest, longest_end = run, day
        today = datetime.now(self.tz).date().toordinal()
        current = 0
        if days[-1] in (today, today - 1):
            current, cursor = 1, days[-1]
            for day in reversed(days[:-1]):
                if day == cursor - 1:
                    current += 1
                    cursor = day
                else:
                    break
        return {
            "current": current,
            "longest": longest,
            "longest_end": datetime.fromordinal(longest_end).strftime("%Y-%m-%d"),
        }

    # -- lists ------------------------------------------------------------

    def recent(self, user_id: str, limit: int = 50) -> list[dict]:
        rows = self._rows(
            """
            SELECT s.submission_time AS ts, mf.id, mf.title, mf.artist,
                   mf.album, mf.album_id, mf.duration
            FROM scrobbles AS s
            JOIN media_file AS mf ON mf.id = s.media_file_id
            WHERE s.user_id = ?
            ORDER BY s.submission_time DESC
            LIMIT ?
            """,
            (user_id, limit),
        )
        return [
            {
                "played_at": r["ts"],
                "id": r["id"],
                "title": r["title"],
                "artist": r["artist"],
                "album": r["album"],
                "art": r["album_id"] or r["id"],
                "seconds": int(r["duration"] or 0),
            }
            for r in rows
        ]

    def discoveries(self, user_id: str, rng: Range, limit: int = 12) -> list[dict]:
        """Artists heard for the first time inside this range."""
        rows = self._rows(
            """
            SELECT COALESCE(NULLIF(mf.artist_id, ''), mf.artist) AS key,
                   MAX(mf.artist) AS name,
                   (SELECT artist.name FROM artist
                     WHERE artist.id = COALESCE(NULLIF(mf.artist_id, ''), mf.artist))
                     AS artist_name,
                   MIN(s.submission_time) AS first_play,
                   COUNT(*) AS plays_total,
                   SUM(CASE WHEN s.submission_time >= ? AND s.submission_time < ?
                            THEN 1 ELSE 0 END) AS plays
            FROM scrobbles AS s
            JOIN media_file AS mf ON mf.id = s.media_file_id
            WHERE s.user_id = ?
            GROUP BY key
            HAVING first_play >= ? AND first_play < ?
            ORDER BY plays DESC, first_play ASC
            LIMIT ?
            """,
            (rng.start, rng.end, user_id, rng.start, rng.end, limit),
        )
        return [
            {
                "id": r["key"],
                "name": r["artist_name"] or r["name"],
                "plays": r["plays"],
                "first_play": r["first_play"],
            }
            for r in rows
        ]

    # -- detail views -----------------------------------------------------
    #
    # One item, in the period the user is currently looking at: how often,
    # where it stands in that period's ranking, what its biggest tracks are.
    # Two things stay absolute, because they only mean anything that way:
    # when the item was first and last heard, and the shape of all its plays
    # over months and hours.

    @staticmethod
    def _within(rows: list, rng: Range) -> list:
        return [row for row in rows if rng.contains(row["ts"])]

    @staticmethod
    def _range_info(rng: Range) -> dict:
        return {"range": {"key": rng.key, "label": rng.label,
                          "start": rng.start, "end": rng.end, "days": rng.days}}

    def _shape(self, rows: list) -> dict:
        """Months and hours for a set of plays, bucketed locally."""
        months: dict[str, int] = {}
        hours = [0] * 24
        for row in rows:
            local = self._local(row["ts"])
            key = local.strftime("%Y-%m")
            months[key] = months.get(key, 0) + 1
            hours[local.hour] += 1
        return {
            "months": [{"month": key, "plays": value}
                       for key, value in sorted(months.items())],
            "hours": hours,
        }

    def _rank(self, user_id: str, column: str, key: str, plays: int,
              rng: Range) -> int:
        """Which line of this period's top list the item sits on.

        Counted the way the list is sorted – plays first, listening time as
        the tie-breaker – so the number here is the position the user just
        tapped, not a second opinion about it. The item's own totals are
        taken from the same query as everyone else's: durations are floats,
        and a rounded copy of them would let an item outrank itself.
        """
        if not plays:
            return 0
        row = self._one(
            f"""
            WITH totals AS (
                SELECT {column} AS item, COUNT(*) AS plays,
                       COALESCE(SUM(mf.duration), 0) AS secs
                FROM scrobbles AS s
                JOIN media_file AS mf ON mf.id = s.media_file_id
                WHERE s.user_id = ?
                  AND s.submission_time >= ? AND s.submission_time < ?
                GROUP BY item
            ),
            me AS (SELECT plays, secs FROM totals WHERE item = ?)
            SELECT COUNT(*) + 1 AS rank
            FROM totals, me
            WHERE totals.plays > me.plays
               OR (totals.plays = me.plays AND totals.secs > me.secs)
            """,
            (user_id, rng.start, rng.end, key),
        )
        return row["rank"] if row else 1

    def track_detail(self, user_id: str, track_id: str,
                     rng: Range) -> dict | None:
        meta = self._one(
            "SELECT id, title, artist, artist_id, album, album_id, duration, year "
            "FROM media_file WHERE id = ?",
            (track_id,),
        )
        if meta is None:
            return None
        history = self._rows(
            "SELECT submission_time AS ts FROM scrobbles "
            "WHERE user_id = ? AND media_file_id = ? ORDER BY submission_time",
            (user_id, track_id),
        )
        rows = self._within(history, rng)
        plays = len(rows)
        duration = int(meta["duration"] or 0)
        detail = {
            "kind": "track",
            "id": meta["id"],
            "title": meta["title"],
            "artist": meta["artist"],
            "artist_id": meta["artist_id"] or meta["artist"],
            "album": meta["album"],
            "album_id": meta["album_id"] or "",
            "art": meta["album_id"] or meta["id"],
            "year": meta["year"] or 0,
            "duration": duration,
            "plays": plays,
            "seconds": plays * duration,
            "total_plays": len(history),
            "first_play": history[0]["ts"] if history else 0,
            "last_play": history[-1]["ts"] if history else 0,
            "rank": self._rank(user_id, "mf.id", track_id, plays, rng),
        }
        detail.update(self._shape(history))
        detail.update(self._range_info(rng))
        return detail

    def artist_detail(self, user_id: str, artist_key: str,
                      rng: Range) -> dict | None:
        history = self._rows(
            """
            SELECT s.submission_time AS ts, mf.duration AS duration,
                   mf.id AS track_id, mf.album_id AS album_id, mf.artist AS name
            FROM scrobbles AS s
            JOIN media_file AS mf ON mf.id = s.media_file_id
            WHERE s.user_id = ?
              AND COALESCE(NULLIF(mf.artist_id, ''), mf.artist) = ?
            ORDER BY s.submission_time
            """,
            (user_id, artist_key),
        )
        if not history:
            return None
        rows = self._within(history, rng)
        plays = len(rows)
        seconds = sum(int(r["duration"] or 0) for r in rows)
        detail = {
            "kind": "artist",
            "id": artist_key,
            "name": self._artist_name(artist_key, history[-1]["name"]),
            "art": self._artist_art(
                artist_key,
                next((r["album_id"] for r in reversed(history) if r["album_id"]),
                     None),
            ),
            "plays": plays,
            "seconds": seconds,
            "tracks": len({r["track_id"] for r in rows}),
            "albums": len({r["album_id"] for r in rows if r["album_id"]}),
            "total_plays": len(history),
            "first_play": history[0]["ts"],
            "last_play": history[-1]["ts"],
            "rank": self._rank(
                user_id, "COALESCE(NULLIF(mf.artist_id, ''), mf.artist)",
                artist_key, plays, rng),
        }
        detail.update(self._shape(history))
        detail.update(self._range_info(rng))
        detail["top_tracks"] = self._top_within(
            user_id, "COALESCE(NULLIF(mf.artist_id, ''), mf.artist)",
            artist_key, rng)
        detail["top_albums"] = self._albums_within(user_id, artist_key, rng)
        return detail

    def album_detail(self, user_id: str, album_key: str,
                     rng: Range) -> dict | None:
        history = self._rows(
            """
            SELECT s.submission_time AS ts, mf.duration AS duration,
                   mf.id AS track_id, mf.album AS name, mf.album_artist AS artist,
                   mf.album_id AS album_id
            FROM scrobbles AS s
            JOIN media_file AS mf ON mf.id = s.media_file_id
            WHERE s.user_id = ?
              AND COALESCE(NULLIF(mf.album_id, ''), mf.album) = ?
            ORDER BY s.submission_time
            """,
            (user_id, album_key),
        )
        if not history:
            return None
        rows = self._within(history, rng)
        plays = len(rows)
        seconds = sum(int(r["duration"] or 0) for r in rows)
        # How much of the album has actually been heard – usually a fraction.
        total = self._one(
            "SELECT COUNT(*) AS total FROM media_file "
            "WHERE COALESCE(NULLIF(album_id, ''), album) = ?",
            (album_key,),
        )
        detail = {
            "kind": "album",
            "id": album_key,
            "name": history[-1]["name"],
            "artist": history[-1]["artist"],
            "art": history[-1]["album_id"] or None,
            "plays": plays,
            "seconds": seconds,
            "tracks": len({r["track_id"] for r in rows}),
            "track_total": total["total"] if total else 0,
            "total_plays": len(history),
            "first_play": history[0]["ts"],
            "last_play": history[-1]["ts"],
            "rank": self._rank(
                user_id, "COALESCE(NULLIF(mf.album_id, ''), mf.album)",
                album_key, plays, rng),
        }
        detail.update(self._shape(history))
        detail.update(self._range_info(rng))
        detail["top_tracks"] = self._top_within(
            user_id, "COALESCE(NULLIF(mf.album_id, ''), mf.album)",
            album_key, rng)
        return detail

    def _top_within(self, user_id: str, column: str, key: str, rng: Range,
                    limit: int = 10) -> list[dict]:
        """The most played tracks inside one artist or album."""
        rows = self._rows(
            f"""
            SELECT mf.id, mf.title, mf.artist, mf.album_id,
                   COUNT(*) AS plays, MIN(s.submission_time) AS first_play
            FROM scrobbles AS s
            JOIN media_file AS mf ON mf.id = s.media_file_id
            WHERE s.user_id = ? AND {column} = ?
              AND s.submission_time >= ? AND s.submission_time < ?
            GROUP BY mf.id
            ORDER BY plays DESC
            LIMIT ?
            """,
            (user_id, key, rng.start, rng.end, limit),
        )
        return [
            {"id": r["id"], "title": r["title"], "artist": r["artist"],
             "art": r["album_id"] or r["id"], "plays": r["plays"],
             "first_play": r["first_play"]}
            for r in rows
        ]

    def _albums_within(self, user_id: str, artist_key: str, rng: Range,
                       limit: int = 6) -> list[dict]:
        rows = self._rows(
            """
            SELECT COALESCE(NULLIF(mf.album_id, ''), mf.album) AS album_key,
                   MAX(mf.album) AS name, MAX(mf.album_id) AS art,
                   COUNT(*) AS plays
            FROM scrobbles AS s
            JOIN media_file AS mf ON mf.id = s.media_file_id
            WHERE s.user_id = ?
              AND COALESCE(NULLIF(mf.artist_id, ''), mf.artist) = ?
              AND mf.album <> ''
              AND s.submission_time >= ? AND s.submission_time < ?
            GROUP BY album_key
            ORDER BY plays DESC
            LIMIT ?
            """,
            (user_id, artist_key, rng.start, rng.end, limit),
        )
        return [
            {"id": r["album_key"], "name": r["name"], "art": r["art"],
             "plays": r["plays"]}
            for r in rows
        ]
