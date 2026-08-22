"""Everything that talks to Navidrome: its database and its Subsonic API.

The database is opened **read-only**. Rotation never writes to it – it is
Navidrome's data, and a second writer on a live SQLite file is a good way to
lose a library.
"""

from __future__ import annotations

import hashlib
import secrets
import sqlite3
from dataclasses import dataclass
from pathlib import Path

import requests

from . import __version__


class NavidromeUnavailable(RuntimeError):
    """The database is missing, unreadable or not a Navidrome database."""


@dataclass(frozen=True)
class NavidromeUser:
    id: str
    user_name: str
    name: str
    is_admin: bool

    @property
    def display_name(self) -> str:
        return self.name or self.user_name


class Database:
    """Read-only access to `navidrome.db`."""

    def __init__(self, path: Path):
        self.path = path

    def connect(self) -> sqlite3.Connection:
        if not self.path.exists():
            raise NavidromeUnavailable(f"{self.path} does not exist")
        # `mode=ro` keeps SQLite from creating or changing anything. Navidrome
        # runs in WAL mode, so its -wal and -shm files must be readable too;
        # mount the whole data directory, not just the one file.
        uri = f"file:{self.path}?mode=ro"
        try:
            conn = sqlite3.connect(uri, uri=True, check_same_thread=False, timeout=5)
        except sqlite3.OperationalError as exc:
            raise NavidromeUnavailable(str(exc)) from exc
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA query_only = ON")
        return conn

    def check(self) -> None:
        """Fails loudly at start-up rather than quietly at the first request."""
        with self.connect() as conn:
            tables = {
                row["name"]
                for row in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                )
            }
        missing = {"scrobbles", "media_file", "user", "annotation"} - tables
        if missing:
            raise NavidromeUnavailable(
                "not a Navidrome database, or too old – missing "
                + ", ".join(sorted(missing))
            )

    def users(self) -> list[NavidromeUser]:
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT id, user_name, name, is_admin FROM user ORDER BY user_name"
            ).fetchall()
        return [
            NavidromeUser(r["id"], r["user_name"], r["name"] or "", bool(r["is_admin"]))
            for r in rows
        ]

    def user_by_name(self, user_name: str) -> NavidromeUser | None:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT id, user_name, name, is_admin FROM user "
                "WHERE user_name = ? COLLATE NOCASE",
                (user_name,),
            ).fetchone()
        if row is None:
            return None
        return NavidromeUser(
            row["id"], row["user_name"], row["name"] or "", bool(row["is_admin"])
        )

    def user_by_id(self, user_id: str) -> NavidromeUser | None:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT id, user_name, name, is_admin FROM user WHERE id = ?",
                (user_id,),
            ).fetchone()
        if row is None:
            return None
        return NavidromeUser(
            row["id"], row["user_name"], row["name"] or "", bool(row["is_admin"])
        )


@dataclass(frozen=True)
class Credentials:
    """Subsonic token credentials.

    Computed once at sign-in from the password the user typed, then reused.
    The password itself is never stored – not in the session, not on disk.
    """

    user_name: str
    salt: str
    token: str

    def as_params(self) -> dict[str, str]:
        return {
            "u": self.user_name,
            "t": self.token,
            "s": self.salt,
            "v": "1.16.1",
            "c": f"rotation/{__version__}",
            "f": "json",
        }


class Subsonic:
    """The thin slice of the Subsonic API that Rotation needs.

    Sign-in verification and cover art – nothing else. Statistics come from
    the database, because the API cannot answer "what did I play in March".
    """

    def __init__(self, base_url: str, verify_tls: bool = True, timeout: float = 8.0):
        self.base_url = base_url.rstrip("/")
        self.verify_tls = verify_tls
        self.timeout = timeout

    @staticmethod
    def credentials_for(user_name: str, password: str) -> Credentials:
        salt = secrets.token_hex(8)
        token = hashlib.md5((password + salt).encode("utf-8")).hexdigest()
        return Credentials(user_name=user_name, salt=salt, token=token)

    def ping(self, credentials: Credentials) -> bool:
        """True when Navidrome accepts these credentials."""
        try:
            response = requests.get(
                f"{self.base_url}/rest/ping.view",
                params=credentials.as_params(),
                timeout=self.timeout,
                verify=self.verify_tls,
            )
        except requests.RequestException as exc:
            raise NavidromeUnavailable(str(exc)) from exc
        if response.status_code != 200:
            raise NavidromeUnavailable(f"HTTP {response.status_code} from Navidrome")
        try:
            payload = response.json().get("subsonic-response", {})
        except ValueError as exc:
            raise NavidromeUnavailable("Navidrome returned no JSON") from exc
        return payload.get("status") == "ok"

    def playlists(self, credentials: Credentials) -> list[dict]:
        """The playlists this user can see, id and name only."""
        payload = self._call(credentials, "getPlaylists.view")
        entries = (payload or {}).get("playlists", {}).get("playlist", [])
        return [{"id": p.get("id"), "name": p.get("name")} for p in entries]

    def write_playlist(self, credentials: Credentials, name: str,
                       track_ids: list[str], playlist_id: str = "",
                       comment: str = "") -> str | None:
        """Creates the playlist or replaces its contents. Returns its id.

        Subsonic's createPlaylist does both: given a playlistId it overwrites
        the existing one, which is exactly what a playlist that follows a rule
        needs – the same list keeps its place in every client.
        """
        params = credentials.as_params()
        if playlist_id:
            params["playlistId"] = playlist_id
        else:
            params["name"] = name
        query = [(key, value) for key, value in params.items()]
        query += [("songId", track_id) for track_id in track_ids]
        try:
            response = requests.get(
                f"{self.base_url}/rest/createPlaylist.view",
                params=query, timeout=self.timeout * 3, verify=self.verify_tls)
        except requests.RequestException as exc:
            raise NavidromeUnavailable(str(exc)) from exc
        try:
            payload = response.json().get("subsonic-response", {})
        except ValueError:
            return None
        if payload.get("status") != "ok":
            return None
        created = payload.get("playlist", {}).get("id") or playlist_id
        if created and comment:
            # The name and the note live in Navidrome, so they carry the
            # user's language, not the server's.
            self._call(credentials, "updatePlaylist.view",
                       {"playlistId": created, "name": name, "comment": comment})
        return created or None

    def _call(self, credentials: Credentials, view: str,
              extra: dict | None = None) -> dict | None:
        params = credentials.as_params() | (extra or {})
        try:
            response = requests.get(f"{self.base_url}/rest/{view}", params=params,
                                    timeout=self.timeout, verify=self.verify_tls)
        except requests.RequestException as exc:
            raise NavidromeUnavailable(str(exc)) from exc
        try:
            payload = response.json().get("subsonic-response", {})
        except ValueError:
            return None
        return payload if payload.get("status") == "ok" else None

    def stream(self, credentials: Credentials, track_id: str,
               byte_range: str | None = None):
        """Opens a track for playback. Returns a streaming response or None.

        The file is passed through as it lies on disk. Asking Navidrome to
        transcode looks tempting – a third of the bytes – but it costs the
        one thing playback needs: measured here, a cold transcode took 0.8 s
        to the first byte, and a range request into the middle of one was
        answered with the whole file from the start, because there is nothing
        to seek in yet. Untouched, the same range came back in 36 ms.
        """
        params = credentials.as_params() | {
            "id": track_id,
            "estimateContentLength": "true",
        }
        try:
            response = requests.get(
                f"{self.base_url}/rest/stream.view",
                params=params,
                headers={"Range": byte_range} if byte_range else None,
                timeout=self.timeout,
                verify=self.verify_tls,
                stream=True,
            )
        except requests.RequestException:
            return None
        content_type = response.headers.get("Content-Type", "")
        if response.status_code not in (200, 206) or content_type.startswith("application/json"):
            response.close()
            return None
        return response

    def cover_art(self, credentials: Credentials, art_id: str, size: int = 300):
        """Returns (bytes, content-type) or None when there is no art."""
        params = credentials.as_params() | {"id": art_id, "size": str(size)}
        try:
            response = requests.get(
                f"{self.base_url}/rest/getCoverArt.view",
                params=params,
                timeout=self.timeout,
                verify=self.verify_tls,
            )
        except requests.RequestException:
            return None
        content_type = response.headers.get("Content-Type", "")
        if response.status_code != 200 or content_type.startswith("application/json"):
            return None
        return response.content, content_type or "image/jpeg"
