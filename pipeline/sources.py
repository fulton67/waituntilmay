"""The source pool: config/sources.json, read once, resolved to paths.

A version may draw from any enabled source, so everything downstream needs a
source id attached to whatever it carries - a unit, a span, a cache key, a
line in the log. This module is the only place that knows where a source's
files live and how much of the draw it gets.

Weights are relative, not absolute: they are renormalised over the sources
that are actually enabled, so disabling one does not silently change how
often the others appear relative to each other.
"""
import json
import os

CONFIG = "config/sources.json"
ROOT = "sources"


def _resolve(entry):
    sid = entry["id"]
    base = entry.get("dir") or os.path.join(ROOT, sid)
    return {
        "id": sid,
        "dir": base,
        "video": entry.get("video") or os.path.join(base, "source.mp4"),
        "words": os.path.join(base, "transcript/words.json"),
        "phrases": os.path.join(base, "transcript/phrases.json"),
        "tags": os.path.join(base, "tags.json"),
        "enabled": bool(entry.get("enabled", True)),
        "weight": float(entry.get("weight", 1.0)),
        "duration": float(entry["duration"]),
        "fps": entry.get("fps"),
        "title": entry.get("title"),
        "channel": entry.get("channel"),
        "date": entry.get("date"),
        "url": entry.get("url"),
        "room_tone": entry.get("room_tone"),
        "drone": entry.get("drone"),
    }


def load(path=CONFIG, only_enabled=True):
    with open(path, encoding="utf-8") as f:
        cfg = json.load(f)
    out = [_resolve(e) for e in cfg["sources"]]
    if only_enabled:
        out = [s for s in out if s["enabled"]]
    if not out:
        raise RuntimeError(f"{path}: no enabled sources")
    return out


def by_id(sources):
    return {s["id"]: s for s in sources}


def weights(sources):
    """Normalised draw probability per source id."""
    tot = sum(max(0.0, s["weight"]) for s in sources)
    if tot <= 0:
        n = len(sources)
        return {s["id"]: 1.0 / n for s in sources}
    return {s["id"]: max(0.0, s["weight"]) / tot for s in sources}


def primary(sources, path=CONFIG):
    """The source the room tone and the drone come from.

    Silence between beats has to sound like one room even when the words
    crossed four sources, so the bed is always sampled from one of them.
    """
    with open(path, encoding="utf-8") as f:
        want = json.load(f).get("primary")
    d = by_id(sources)
    if want and want in d:
        return d[want]
    return sources[0]
