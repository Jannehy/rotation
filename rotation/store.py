"""Rotation's own small database: profiles and friendships.

Navidrome knows who exists and what they played. It does not know who wants
to see whose numbers, so that lives here – deliberately in a separate file,
so Rotation can be removed without leaving a trace in Navidrome.
"""

from __future__ import annotations

import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS profile (
    user_id      TEXT PRIMARY KEY,
    user_name    TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    joined_at    INTEGER NOT NULL,
    last_seen    INTEGER NOT NULL,
    discoverable INTEGER NOT NULL DEFAULT 1
);

-- One row per "A added B". A friendship exists only when both rows are
-- there; a single row is a pending request. Nobody sees anybody else's
-- statistics without that second row.
CREATE TABLE IF NOT EXISTS friend_edge (
    from_id    TEXT NOT NULL,
    to_id      TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (from_id, to_id)
);

CREATE INDEX IF NOT EXISTS friend_edge_to ON friend_edge (to_id);

-- A playlist Rotation keeps up to date in Navidrome. Only the rule lives
-- here; the songs are written to Navidrome and rewritten every night, so a
-- deleted rule leaves nothing behind but the playlist itself.
CREATE TABLE IF NOT EXISTS playlist_rule (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    range_key   TEXT NOT NULL,
    size        INTEGER NOT NULL,
    playlist_id TEXT NOT NULL DEFAULT '',
    name        TEXT NOT NULL DEFAULT '',
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL DEFAULT 0,
    tracks      INTEGER NOT NULL DEFAULT 0,
    lang        TEXT NOT NULL DEFAULT 'en',
    UNIQUE (user_id, range_key)
);
"""


@dataclass(frozen=True)
class Profile:
    user_id: str
    user_name: str
    display_name: str
    discoverable: bool
    last_seen: int

    @property
    def name(self) -> str:
        return self.display_name or self.user_name


class Store:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(SCHEMA)
            self._migrate(conn)

    @staticmethod
    def _migrate(conn: sqlite3.Connection) -> None:
        """Columns added after a table first shipped.

        `CREATE TABLE IF NOT EXISTS` does nothing to a table that is already
        there, so every later column needs its own line here.
        """
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(playlist_rule)")}
        if columns and "lang" not in columns:
            conn.execute("ALTER TABLE playlist_rule ADD COLUMN "
                         "lang TEXT NOT NULL DEFAULT 'en'")

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, check_same_thread=False, timeout=10)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    # -- profiles ---------------------------------------------------------

    @staticmethod
    def _adopt_renamed_id(conn, user_id: str, user_name: str) -> None:
        """Carries a profile over when Navidrome hands the account a new id.

        Everything Rotation stores is keyed by the Navidrome user id, and that
        id is not as permanent as it looks: the 0.64 update handed every
        account a new one. Navidrome moved its own rows along, Rotation's did
        not - friendships and playlist rules were suddenly attached to an
        account that no longer existed, and the next sign-in started a blank
        second profile beside the old one. The account name is what stays, so
        it is what the old rows are found by.
        """
        old_ids = [r["user_id"] for r in conn.execute(
            "SELECT user_id FROM profile WHERE user_name = ? AND user_id <> ?",
            (user_name, user_id))]
        for old_id in old_ids:
            # OR IGNORE throughout: the new id may already carry a row that
            # the old one would collide with. The newer row wins, the stale
            # one goes - it describes the same person either way.
            conn.execute("UPDATE OR IGNORE friend_edge SET from_id = ? WHERE from_id = ?",
                         (user_id, old_id))
            conn.execute("UPDATE OR IGNORE friend_edge SET to_id = ? WHERE to_id = ?",
                         (user_id, old_id))
            conn.execute("DELETE FROM friend_edge WHERE from_id = ? OR to_id = ?",
                         (old_id, old_id))
            conn.execute("DELETE FROM friend_edge WHERE from_id = to_id")
            conn.execute("UPDATE OR IGNORE playlist_rule SET user_id = ? WHERE user_id = ?",
                         (user_id, old_id))
            conn.execute("DELETE FROM playlist_rule WHERE user_id = ?", (old_id,))
            # Keep the day they actually joined, not the day of the rename.
            conn.execute(
                """
                UPDATE profile SET joined_at = MIN(joined_at,
                    (SELECT joined_at FROM profile WHERE user_id = ?))
                WHERE user_id = ?
                """,
                (old_id, user_id))
            conn.execute("UPDATE OR IGNORE profile SET user_id = ? WHERE user_id = ?",
                         (user_id, old_id))
            conn.execute("DELETE FROM profile WHERE user_id = ?", (old_id,))

    def touch(self, user_id: str, user_name: str, display_name: str = "") -> None:
        """Records that this Navidrome user has signed in to Rotation."""
        now = int(time.time())
        with self._connect() as conn:
            self._adopt_renamed_id(conn, user_id, user_name)
            conn.execute(
                """
                INSERT INTO profile (user_id, user_name, display_name, joined_at, last_seen)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    user_name = excluded.user_name,
                    display_name = excluded.display_name,
                    last_seen = excluded.last_seen
                """,
                (user_id, user_name, display_name, now, now),
            )

    def profile(self, user_id: str) -> Profile | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM profile WHERE user_id = ?", (user_id,)
            ).fetchone()
        return _profile(row) if row else None

    def set_discoverable(self, user_id: str, discoverable: bool) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE profile SET discoverable = ? WHERE user_id = ?",
                (1 if discoverable else 0, user_id),
            )

    # -- friendships ------------------------------------------------------

    def add(self, from_id: str, to_id: str) -> None:
        if from_id == to_id:
            return
        with self._connect() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO friend_edge (from_id, to_id, created_at) "
                "VALUES (?, ?, ?)",
                (from_id, to_id, int(time.time())),
            )

    def remove(self, user_id: str, other_id: str) -> None:
        """Drops both directions – unfriending is not a request to reconsider."""
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM friend_edge WHERE (from_id = ? AND to_id = ?) "
                "OR (from_id = ? AND to_id = ?)",
                (user_id, other_id, other_id, user_id),
            )

    def withdraw(self, from_id: str, to_id: str) -> None:
        """Takes back an outgoing request without touching the other side."""
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM friend_edge WHERE from_id = ? AND to_id = ?",
                (from_id, to_id),
            )

    def friend_ids(self, user_id: str) -> set[str]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT mine.to_id AS id
                FROM friend_edge AS mine
                JOIN friend_edge AS theirs
                  ON theirs.from_id = mine.to_id AND theirs.to_id = mine.from_id
                WHERE mine.from_id = ?
                """,
                (user_id,),
            ).fetchall()
        return {row["id"] for row in rows}

    def are_friends(self, a: str, b: str) -> bool:
        if a == b:
            return True
        with self._connect() as conn:
            row = conn.execute(
                "SELECT 1 FROM friend_edge f1 JOIN friend_edge f2 "
                "ON f2.from_id = f1.to_id AND f2.to_id = f1.from_id "
                "WHERE f1.from_id = ? AND f1.to_id = ? LIMIT 1",
                (a, b),
            ).fetchone()
        return row is not None

    def incoming(self, user_id: str) -> set[str]:
        """Requests waiting for this user to confirm."""
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT theirs.from_id AS id
                FROM friend_edge AS theirs
                WHERE theirs.to_id = ?
                  AND NOT EXISTS (
                      SELECT 1 FROM friend_edge AS mine
                      WHERE mine.from_id = ? AND mine.to_id = theirs.from_id
                  )
                """,
                (user_id, user_id),
            ).fetchall()
        return {row["id"] for row in rows}

    def outgoing(self, user_id: str) -> set[str]:
        """Requests this user has sent and nobody has answered yet."""
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT mine.to_id AS id
                FROM friend_edge AS mine
                WHERE mine.from_id = ?
                  AND NOT EXISTS (
                      SELECT 1 FROM friend_edge AS theirs
                      WHERE theirs.from_id = mine.to_id AND theirs.to_id = ?
                  )
                """,
                (user_id, user_id),
            ).fetchall()
        return {row["id"] for row in rows}

    def discoverable_ids(self) -> set[str]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT user_id FROM profile WHERE discoverable = 1"
            ).fetchall()
        return {row["user_id"] for row in rows}

    def forget(self, user_id: str) -> None:
        """Removes a user from Rotation entirely (their Navidrome data stays)."""
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM friend_edge WHERE from_id = ? OR to_id = ?",
                (user_id, user_id),
            )
            conn.execute("DELETE FROM profile WHERE user_id = ?", (user_id,))


def _profile(row: sqlite3.Row) -> Profile:
    return Profile(
        user_id=row["user_id"],
        user_name=row["user_name"],
        display_name=row["display_name"],
        discoverable=bool(row["discoverable"]),
        last_seen=row["last_seen"],
    )


@dataclass(frozen=True)
class PlaylistRule:
    id: int
    user_id: str
    range_key: str
    size: int
    playlist_id: str
    name: str
    created_at: int
    updated_at: int
    tracks: int
    lang: str


def _rule(row) -> PlaylistRule:
    return PlaylistRule(
        id=row["id"], user_id=row["user_id"], range_key=row["range_key"],
        size=row["size"], playlist_id=row["playlist_id"], name=row["name"],
        created_at=row["created_at"], updated_at=row["updated_at"],
        tracks=row["tracks"], lang=row["lang"])


class PlaylistRules:
    """The playlists Rotation looks after, one rule per user and period."""

    def __init__(self, store: "Store"):
        self._store = store

    def upsert(self, user_id: str, range_key: str, size: int, name: str,
               lang: str = "en") -> PlaylistRule:
        now = int(time.time())
        with self._store._connect() as conn:
            conn.execute(
                """
                INSERT INTO playlist_rule
                    (user_id, range_key, size, name, created_at, updated_at, lang)
                VALUES (?, ?, ?, ?, ?, 0, ?)
                ON CONFLICT(user_id, range_key) DO UPDATE SET
                    size = excluded.size, name = excluded.name, lang = excluded.lang
                """,
                (user_id, range_key, size, name, now, lang),
            )
            row = conn.execute(
                "SELECT * FROM playlist_rule WHERE user_id = ? AND range_key = ?",
                (user_id, range_key)).fetchone()
        return _rule(row)

    def mark(self, rule_id: int, playlist_id: str, tracks: int) -> None:
        with self._store._connect() as conn:
            conn.execute(
                "UPDATE playlist_rule SET playlist_id = ?, tracks = ?, updated_at = ? "
                "WHERE id = ?",
                (playlist_id, tracks, int(time.time()), rule_id))

    def forget(self, user_id: str, range_key: str) -> None:
        with self._store._connect() as conn:
            conn.execute(
                "DELETE FROM playlist_rule WHERE user_id = ? AND range_key = ?",
                (user_id, range_key))

    def of(self, user_id: str) -> list[PlaylistRule]:
        with self._store._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM playlist_rule WHERE user_id = ? ORDER BY range_key",
                (user_id,)).fetchall()
        return [_rule(row) for row in rows]

    def all(self) -> list[PlaylistRule]:
        with self._store._connect() as conn:
            rows = conn.execute("SELECT * FROM playlist_rule").fetchall()
        return [_rule(row) for row in rows]
