"""Turning "last 30 days" or "2026" into a pair of unix timestamps.

Every boundary is computed in the configured time zone, so a day starts at
local midnight and a year at local New Year – not at UTC.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

ROLLING = {"7d": 7, "30d": 30, "90d": 90, "365d": 365}
NAMED = ("today", "week", "month", "year", "all", *ROLLING)


@dataclass(frozen=True)
class Range:
    start: int          # inclusive, unix seconds
    end: int            # exclusive, unix seconds
    key: str            # what was asked for
    label: str          # human wording, English; the UI translates
    days: int           # length in days, 0 for "all"

    def contains(self, ts: int) -> bool:
        return self.start <= ts < self.end


def _midnight(day: date, tz: ZoneInfo) -> int:
    return int(datetime(day.year, day.month, day.day, tzinfo=tz).timestamp())


def resolve(key: str, tz: ZoneInfo, first_play: int | None = None,
            now: datetime | None = None) -> Range:
    """`key` is one of NAMED, or a year ("2026"), or a month ("2026-08")."""
    now = now or datetime.now(tz)
    today = now.date()
    tomorrow = _midnight(today + timedelta(days=1), tz)

    if key in ROLLING:
        days = ROLLING[key]
        start = _midnight(today - timedelta(days=days - 1), tz)
        return Range(start, tomorrow, key, f"Last {days} days", days)

    if key == "today":
        return Range(_midnight(today, tz), tomorrow, key, "Today", 1)

    if key == "week":                     # current calendar week, Monday based
        start_day = today - timedelta(days=today.weekday())
        return Range(_midnight(start_day, tz), tomorrow, key, "This week",
                     today.weekday() + 1)

    if key == "month":
        start_day = today.replace(day=1)
        return Range(_midnight(start_day, tz), tomorrow, key, "This month",
                     today.day)

    if key == "year":
        start_day = today.replace(month=1, day=1)
        return Range(_midnight(start_day, tz), tomorrow, key, str(today.year),
                     (today - start_day).days + 1)

    if key == "all":
        start = first_play if first_play is not None else 0
        days = max(1, round((tomorrow - start) / 86400)) if start else 0
        return Range(start, tomorrow, key, "All time", days)

    if len(key) == 4 and key.isdigit():                       # 2026
        year = int(key)
        start = _midnight(date(year, 1, 1), tz)
        end = min(_midnight(date(year + 1, 1, 1), tz), tomorrow)
        return Range(start, end, key, key, max(1, round((end - start) / 86400)))

    if len(key) == 7 and key[4] == "-":                       # 2026-08
        year, month = int(key[:4]), int(key[5:])
        start = _midnight(date(year, month, 1), tz)
        nxt = date(year + (month == 12), (month % 12) + 1, 1)
        end = min(_midnight(nxt, tz), tomorrow)
        return Range(start, end, key, key, max(1, round((end - start) / 86400)))

    return resolve("30d", tz, first_play, now)


# When the recap makes itself known. Spotify has kept to a window between
# 29 November and 6 December since 2016 and never announces the day; Rotation
# picks the first of December and keeps the recap up through January, so a
# year has somewhere to be looked back at once it is actually over.
SEASON_START = (12, 1)
SEASON_END = (1, 31)


def season(tz: ZoneInfo, now: datetime | None = None) -> dict:
    """Whether the recap is in season, and which year it is about."""
    now = now or datetime.now(tz)
    in_december = now.month == 12
    in_january = now.month == 1 and now.day <= SEASON_END[1]
    year = now.year if in_december else now.year - 1
    start = datetime(year, SEASON_START[0], SEASON_START[1], tzinfo=tz)
    end = datetime(year + 1, SEASON_END[0], SEASON_END[1], tzinfo=tz) + timedelta(days=1)
    return {
        "open": in_december or in_january,
        "year": year,
        "start": int(start.timestamp()),
        "end": int(end.timestamp()),
    }


def years_between(first: int, last: int, tz: ZoneInfo) -> list[int]:
    """Every calendar year that holds at least part of the given span."""
    if not first:
        return []
    start = datetime.fromtimestamp(first, tz).year
    end = datetime.fromtimestamp(last, tz).year
    return list(range(end, start - 1, -1))
