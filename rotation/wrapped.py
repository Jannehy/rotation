"""The year in review – the same numbers, arranged as a story.

Everything here is composed from `Stats`; there is no second source of truth,
so a Wrapped page can never disagree with the dashboard.
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from . import periods
from .stats import Stats


def build(stats: Stats, user_id: str, year: int, tz: ZoneInfo) -> dict:
    rng = periods.resolve(str(year), tz)
    summary = stats.summary(user_id, rng)

    months = [{"month": m, "plays": 0, "seconds": 0} for m in range(1, 13)]
    for day in stats.timeline(user_id, rng):
        index = int(day["date"][5:7]) - 1
        months[index]["plays"] += day["plays"]
        months[index]["seconds"] += day["seconds"]
    top_month = max(months, key=lambda m: m["plays"]) if summary["plays"] else None

    clock = stats.clock(user_id, rng)
    tracks = stats.top_tracks(user_id, rng, 10)
    artists = stats.top_artists(user_id, rng, 10)
    albums = stats.top_albums(user_id, rng, 10)
    genres = stats.top_genres(user_id, rng, 8)

    first = _first_play(stats, user_id, rng)
    previous = _previous_year(stats, user_id, year, tz)

    # How lopsided is the taste? The share of all plays that went to the
    # single most played artist is a surprisingly telling number.
    devotion = round(artists[0]["plays"] / summary["plays"] * 100) if artists and summary["plays"] else 0

    # The story plays a song behind its cards; which one is a question about
    # ids, not about display names, so it is answered here.
    artist_track = (stats.top_track_for_artist(user_id, rng, artists[0]["id"])
                    if artists else None)
    genre_track = (stats.top_track_for_genre(user_id, rng, genres[0]["name"])
                   if genres else None)

    return {
        "year": year,
        "summary": summary,
        "months": months,
        "top_month": top_month,
        "clock": clock,
        "tracks": tracks,
        "artists": artists,
        "albums": albums,
        "genres": genres,
        "discoveries": stats.discoveries(user_id, rng, 12),
        "first_play": first,
        "streak": _streak_within(stats, user_id, rng),
        "devotion": devotion,
        "artist_track": artist_track,
        "genre_track": genre_track,
        "previous": previous,
        "has_data": summary["plays"] > 0,
    }


def _first_play(stats: Stats, user_id: str, rng) -> dict | None:
    rows = stats._rows(                                    # noqa: SLF001 – same package
        """
        SELECT s.submission_time AS ts, mf.title, mf.artist, mf.album_id
        FROM scrobbles AS s
        JOIN media_file AS mf ON mf.id = s.media_file_id
        WHERE s.user_id = ? AND s.submission_time >= ? AND s.submission_time < ?
        ORDER BY s.submission_time ASC LIMIT 1
        """,
        (user_id, rng.start, rng.end),
    )
    if not rows:
        return None
    row = rows[0]
    return {
        "played_at": row["ts"],
        "title": row["title"],
        "artist": row["artist"],
        "art": row["album_id"],
    }


def _streak_within(stats: Stats, user_id: str, rng) -> int:
    """Longest run of consecutive days with a play, inside this year."""
    days = sorted({
        datetime.fromtimestamp(row["ts"], stats.tz).date().toordinal()
        for row in stats._rows(                            # noqa: SLF001
            "SELECT submission_time AS ts FROM scrobbles "
            "WHERE user_id = ? AND submission_time >= ? AND submission_time < ?",
            (user_id, rng.start, rng.end),
        )
    })
    if not days:
        return 0
    longest = run = 1
    for previous, day in zip(days, days[1:]):
        run = run + 1 if day == previous + 1 else 1
        longest = max(longest, run)
    return longest


def _previous_year(stats: Stats, user_id: str, year: int, tz: ZoneInfo) -> dict | None:
    """Only reported when the year before actually holds plays."""
    rng = periods.resolve(str(year - 1), tz)
    summary = stats.summary(user_id, rng)
    if not summary["plays"]:
        return None
    return {"year": year - 1, "plays": summary["plays"], "seconds": summary["seconds"]}
