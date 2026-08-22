"""Playlists that follow a rule instead of a moment.

A snapshot of "my top 50 of the last 30 days" is stale the next morning, and
after a fortnight there are five of them and none is right. So Rotation keeps
the rule and rewrites the playlist: the same list stays in place in every
client, and its contents move with the listening.

The playlist lives in Navidrome, written through the Subsonic API with the
user's own credentials. Rotation stores nothing but the rule, so removing it
leaves the playlist behind as an ordinary one.
"""

from __future__ import annotations

import threading
import time
from zoneinfo import ZoneInfo

from .navidrome import Credentials, NavidromeUnavailable, Subsonic
from .periods import Range
from .stats import Stats
from .store import PlaylistRule, PlaylistRules

# How many songs a period is worth. A week does not hold fifty favourites;
# a month does, and a quarter or more deserves a proper hundred.
SIZES = {"7d": 25, "30d": 50, "90d": 100, "year": 100, "all": 100}
DEFAULT_SIZE = 50

# Every managed playlist carries this, so it is recognisable in Navidrome
# among the ones the user made themselves.
PREFIX = "Rotation"

# The playlist shows up in Navidrome, not in Rotation, so its name and note
# have to carry their own language – the client's, remembered with the rule.
PERIODS = {
    "de": {"7d": "7 Tage", "30d": "30 Tage", "90d": "90 Tage",
           "year": "Dieses Jahr", "all": "Gesamt"},
    "en": {"7d": "7 days", "30d": "30 days", "90d": "90 days",
           "year": "This year", "all": "All time"},
}
COMMENT = {
    "de": "Wird automatisch von Rotation gepflegt.",
    "en": "Kept up to date automatically by Rotation.",
}


def language(code: str | None) -> str:
    return "de" if (code or "").lower().startswith("de") else "en"


def size_for(range_key: str) -> int:
    return SIZES.get(range_key, DEFAULT_SIZE)


def name_for(range_key: str, size: int, lang: str = "en") -> str:
    lang = language(lang)
    period = PERIODS[lang].get(range_key, range_key)
    return f"{PREFIX} · Top {size} · {period}"


def comment_for(lang: str = "en") -> str:
    return COMMENT[language(lang)]


class PlaylistKeeper:
    """Writes the playlists, and comes back to them once a day."""

    def __init__(self, rules: PlaylistRules, stats: Stats, subsonic: Subsonic,
                 tz: ZoneInfo, resolve, log=print):
        self.rules = rules
        self.stats = stats
        self.subsonic = subsonic
        self.tz = tz
        # `resolve` turns a range key into a Range for a given user; app.py
        # owns that logic because "all" depends on the first play.
        self.resolve = resolve
        self.log = log
        self._credentials: dict[str, Credentials] = {}
        self._lock = threading.Lock()

    # -- credentials ------------------------------------------------------
    #
    # A nightly refresh needs to talk to Navidrome without anyone being
    # logged in. The token the user signed in with is kept for exactly that,
    # in memory only – it never reaches the database.

    def remember(self, user_id: str, credentials: Credentials) -> None:
        with self._lock:
            self._credentials[user_id] = credentials

    def forget(self, user_id: str) -> None:
        with self._lock:
            self._credentials.pop(user_id, None)

    def credentials(self, user_id: str) -> Credentials | None:
        with self._lock:
            return self._credentials.get(user_id)

    # -- writing ----------------------------------------------------------

    def refresh(self, rule: PlaylistRule,
                credentials: Credentials | None = None) -> int | None:
        """Rewrites one playlist. Returns how many songs it now holds."""
        creds = credentials or self.credentials(rule.user_id)
        if creds is None:
            return None
        rng: Range = self.resolve(rule.user_id, rule.range_key)
        tracks = self.stats.top_tracks(rule.user_id, rng, rule.size)
        if not tracks:
            return 0
        ids = [track["id"] for track in tracks]
        name = name_for(rule.range_key, rule.size, rule.lang)
        try:
            playlist_id = self.subsonic.write_playlist(
                creds, name, ids, rule.playlist_id, comment_for(rule.lang))
        except NavidromeUnavailable as exc:
            self.log(f"playlist: Navidrome unreachable – {exc}")
            return None
        if not playlist_id:
            return None
        self.rules.mark(rule.id, playlist_id, len(ids))
        return len(ids)

    def refresh_all(self) -> None:
        for rule in self.rules.all():
            if self.credentials(rule.user_id) is None:
                continue
            try:
                count = self.refresh(rule)
            except Exception as exc:                       # noqa: BLE001
                self.log(f"playlist {rule.id}: {exc}")
                continue
            if count is not None:
                self.log(f"playlist {rule.id}: {count} tracks")

    def start(self, every_seconds: int = 24 * 3600) -> None:
        """A daily pass, in the background, for as long as Rotation runs."""
        def loop() -> None:
            while True:
                time.sleep(every_seconds)
                self.refresh_all()

        thread = threading.Thread(target=loop, name="playlists", daemon=True)
        thread.start()
