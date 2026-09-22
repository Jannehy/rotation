"""Rotation – listening statistics for Navidrome."""

__version__ = "0.7.7"

# The oldest Navidrome that keeps a per-play history in the `scrobbles`
# table. Older servers only know lifetime play counts, so Rotation refuses
# to start against them rather than showing half a picture.
MIN_NAVIDROME = "0.53.0"
