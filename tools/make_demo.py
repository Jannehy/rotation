#!/usr/bin/env python3
"""Builds the demo dataset both apps ship with.

The apps cannot show anything before they have a server, which is a problem
for anyone evaluating Rotation – App Review included. So they carry a small
invented library and a year of invented plays, and compute the same
statistics from it locally. Plays are stored as offsets from "today", so the
demo never goes stale.

Run: python3 tools/make_demo.py > demo/demo.json
"""

from __future__ import annotations

import json
import math
import random

SEED = 20260820          # a fixed seed: the demo looks the same for everyone
DAYS = 400
random.seed(SEED)

# Invented artists – nothing that could be mistaken for a real catalogue.
CATALOGUE = [
    ("Halbmond Kollektiv", "Techno", ["Nordkurve", "Betongarten", "Kaltstart", "Hallenbad", "Endstation"]),
    ("Ivy Solberg", "Indie", ["Paper Boats", "Half a Mile", "Winter Light", "Salt", "Tallinn"]),
    ("Nachtbus", "Techno", ["Linie 9", "Umsteigen", "Letzte Fahrt", "Depot"]),
    ("Marisol Vega", "Pop", ["Ese Verano", "Naranja", "Contigo", "Tarde o Temprano", "Luz"]),
    ("Bruno Kessler Trio", "Jazz", ["Blue Hour", "Fifth Street", "Rain Check", "Ledger"]),
    ("SUBTERRA", "Drum & Bass", ["Depth Charge", "Undertow", "Grid", "Pressure"]),
    ("Ana Lindqvist", "Electronic", ["Glasshouse", "Neon Fields", "Silver Wire", "Aurora Line", "Static"]),
    ("The Paper Kites of Lisbon", "Indie", ["Alfama", "Tram 28", "Miradouro"]),
    ("Kollektiv Rost", "Industrial", ["Schwerkraft", "Zunder", "Eisen", "Funkenflug"]),
    ("Yuki Tamura", "Ambient", ["Hanabi", "Slow River", "Kite", "Paper Lantern", "Morning Fog"]),
    ("Dust & Copper", "Rock", ["Hollow Bones", "Ravine", "Iron Sky", "Cinder"]),
    ("Céline Marchand", "House", ["Boulevard", "Minuit", "Rive Gauche", "Après"]),
    ("Otto Wenger", "Techno", ["Werkhalle", "Schicht", "Blaue Stunde"]),
    ("Nadia Farouk", "R&B", ["Amber", "Slow Burn", "Velvet Rope", "Midnight Oil"]),
    ("Fjordlys", "Ambient", ["Sund", "Tidevann", "Nordlys"]),
    ("Bloc Hivernal", "Electronic", ["Givre", "Congère", "Verglas", "Blanc"]),
    ("Ren Takahashi", "Jazz", ["Shibuya Nights", "Coffee & Rain", "Late Set"]),
    ("Weissglut", "Industrial", ["Schmelzpunkt", "Glut", "Asche"]),
    ("Sofia Almeida", "Pop", ["Verão", "Lisboa", "Devagar", "Sal"]),
    ("Northern Signal", "Drum & Bass", ["Beacon", "Longwave", "Relay", "Static Coast"]),
]

# How often an artist gets played: a steep curve, the way listening really is.
def weight(rank: int) -> float:
    return 1.0 / math.pow(rank + 1.6, 1.25)

# When during the day music runs: two humps, morning and evening.
HOUR_WEIGHTS = [
    0.3, 0.2, 0.1, 0.1, 0.1, 0.3, 0.8, 2.2, 3.4, 4.0, 3.4, 2.6,
    2.4, 2.2, 2.4, 2.6, 3.0, 3.6, 4.2, 4.4, 3.6, 2.4, 1.4, 0.7,
]


def build() -> dict:
    artists, albums, tracks = [], [], []
    for index, (name, genre, titles) in enumerate(CATALOGUE):
        artist_id = f"ar{index}"
        artists.append({"id": artist_id, "name": name})
        album_id = f"al{index}"
        albums.append({"id": album_id, "name": f"{titles[0]}", "artist": artist_id})
        for track_index, title in enumerate(titles):
            tracks.append({
                "id": f"tr{index}-{track_index}",
                "title": title,
                "artist": artist_id,
                "album": album_id,
                "genre": genre,
                "seconds": random.randint(150, 380),
            })

    by_artist: dict[str, list[int]] = {}
    for position, track in enumerate(tracks):
        by_artist.setdefault(track["artist"], []).append(position)

    # Some artists only turn up later in the year, so "newly discovered"
    # has something to show.
    discovered_on = {}
    for index, artist in enumerate(artists):
        discovered_on[artist["id"]] = -DAYS if index < 14 else -random.randint(20, 150)

    order = list(range(len(artists)))
    random.shuffle(order)
    artist_weight = {artists[artist_index]["id"]: weight(rank)
                     for rank, artist_index in enumerate(order)}

    plays = []
    for day in range(-DAYS, 1):
        # Weekends are busier, and roughly one day in nine is silent.
        weekday = (day + DAYS) % 7
        if random.random() < 0.11:
            continue
        base = 6 if weekday in (5, 6) else 4
        count = max(0, int(random.gauss(base, 2.6)))
        available = [a for a in artists if discovered_on[a["id"]] <= day]
        if not available or not count:
            continue
        weights = [artist_weight[a["id"]] for a in available]
        for _ in range(count):
            artist = random.choices(available, weights=weights, k=1)[0]
            track_index = random.choice(by_artist[artist["id"]])
            hour = random.choices(range(24), weights=HOUR_WEIGHTS, k=1)[0]
            second = hour * 3600 + random.randint(0, 3599)
            plays.append([day, second, track_index])

    plays.sort(key=lambda play: (play[0], play[1]))
    return {
        "seed": SEED,
        "user": {"id": "demo", "user_name": "demo", "name": "Robin"},
        "artists": artists,
        "albums": albums,
        "tracks": tracks,
        "plays": plays,
        # Two invented friends, so the social side has something to show.
        "friends": [
            {"id": "f1", "name": "Mira", "plays": 612, "seconds": 152_000,
             "artists": ["Ana Lindqvist", "Nachtbus", "Yuki Tamura", "Marisol Vega", "SUBTERRA"]},
            {"id": "f2", "name": "Jonas", "plays": 289, "seconds": 71_500,
             "artists": ["Dust & Copper", "Halbmond Kollektiv", "Weissglut", "Ren Takahashi", "Fjordlys"]},
        ],
    }


if __name__ == "__main__":
    print(json.dumps(build(), ensure_ascii=False, separators=(",", ":")))
