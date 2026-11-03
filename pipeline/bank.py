"""The clip bank: what is in it, and how a version is planned out of it.

The bank is one video clip per distinct phrase in config/beats.json, cut
once (scripts/build_bank.py) and shaded once per look (scripts/shade_bank.py).
Everything downstream addresses clips by id and never touches a source file
again, which is what makes a version cheap: the expensive work is per clip,
and there are a hundred-odd clips and thirty versions.

Two things live here because the assembler and the shader both need them: the
list of phrases the bank must hold, and the plan for one version - which
clips, in which order, trimmed and held to land on exactly 720 frames.
"""
import hashlib
import json
import os

from . import beats as B

BANK_DIR = "bank"
FPS = B.FPS
OUT_FRAMES = B.OUT_FRAMES

# A beat may carry one phrase or two. Two cuts inside a beat is what takes
# the piece from a cut every 4.3s to a cut every 2-3s, and the two beats the
# argument breaks on always get two, so the break and the answer to it are
# each said twice over.
TWO_ALWAYS = (4, 5)

# Which neighbouring beats may share a source: the arc's own two blum pairs,
# re-exported here so the planner and pipeline.beats cannot disagree.
SAME_SOURCE_OK = B.SAME_SOURCE_OK
MIN_PHRASE_FRAMES = 36            # 1.5s: shorter than this is not a phrase
MIN_HOLD_SHARE = 0.0

_WORDS = {}


def clip_id(source, t_in):
    """A clip's name: what it is, not which beat asked for it."""
    return "%s_%08d" % (source, round(t_in * 1000))


def phrases(cfg):
    """Every distinct phrase the bank has to hold, in a fixed order.

    Beat 7 draws from beat 1's pool, so the same stretch of tape is wanted
    by two beats; it is one clip with two beats against its name rather than
    two clips with the same frames in them.
    """
    seen = {}
    for b in cfg["beats"]:
        for c in b["pool"]:
            k = (c["source"], c["in"], c["out"])
            e = seen.get(k)
            if e is None:
                e = seen[k] = {
                    "id": clip_id(c["source"], c["in"]),
                    "source": c["source"], "in": c["in"], "out": c["out"],
                    "text": c["text"], "reads": c.get("reads"), "beats": [],
                }
            if b["n"] not in e["beats"]:
                e["beats"].append(b["n"])
    return [seen[k] for k in sorted(seen)]


def words_of(src):
    p = src["words"]
    if p not in _WORDS:
        with open(p, encoding="utf-8") as f:
            _WORDS[p] = json.load(f)
    return _WORDS[p]


def word_frames(src, a, b, n):
    """The frames a word ends on inside [a, b], in the clip's own frames.

    A beat carrying two phrases has to make room, and room is made by
    trimming the tail of a clip. Trimming anywhere lands mid-word; trimming
    here lands on a word's measured end, which is the only place a phrase
    can be shortened and still read as a phrase.
    """
    out = set()
    for w in words_of(src):
        e = w.get("end", w.get("start"))
        if e is None or e < a or e > b:
            continue
        f = int(round((e - a) * FPS))
        if 1 <= f < n:
            out.add(f)
    return sorted(out)


def load(path=None):
    p = path or os.path.join(BANK_DIR, "bank.json")
    with open(p, encoding="utf-8") as f:
        d = json.load(f)
    d["by_id"] = {c["id"]: c for c in d["clips"]}
    return d


def pools_by_beat(cfg, bank):
    """For each beat, the bank clips its pool points at, in pool order."""
    out = {}
    for b in cfg["beats"]:
        ids = []
        for c in b["pool"]:
            cid = clip_id(c["source"], c["in"])
            if cid in bank["by_id"]:
                ids.append(cid)
        out[b["n"]] = ids
    return out


# ------------------------------------------------------------- the look hash
LOOK = os.path.join("journey", "look.json")


def look_hash(path=LOOK, length=8):
    """A short, stable name for one set of slider positions.

    The shaded bank and the uploaded pool are both named by this, so a look
    that has been shaded before is recognised rather than rebuilt, and two
    looks sit side by side on Blob without one overwriting the other.

    It hashes the FILE, not a re-serialisation of what is in it. The shader
    is JavaScript and the assembler is Python, and the two do not agree on
    how to write a float - 1.0 against 1 is enough to make them disagree
    about which look is live. The bytes on disk are the one thing they both
    see the same way.

    Line endings are normalised first, and that is not a nicety. This is a
    Windows checkout with a git that rewrites endings on checkout: a
    round trip through the index turned every LF in this file into CRLF
    and the hash from 01d51599 into 13033def, which named a second,
    identical look and would have re-shaded the whole bank to produce the
    same pictures. The look is what the file says, not how it ends its
    lines.
    """
    with open(path, "rb") as f:
        raw = f.read().replace(b"\r\n", b"\n")
    return hashlib.sha256(raw).hexdigest()[:length]


def look_dir(h, root=BANK_DIR):
    return os.path.join(root, f"look-{h}")


# ---------------------------------------------------------------- the plan
# How much of the drawn material may be trimmed to make room for another
# cut. A beat carrying two phrases is the point of the bank - it takes the
# piece from a cut every 4.3s to a cut every 2.7 - but the phrases were
# authored as whole clauses, so the planner only adds a second one while
# what it would cost stays inside this share of the running time.
TRIM_BUDGET = 0.18


def _pick(rng, pool, bank, exclude):
    cands = [c for c in pool if c not in exclude]
    if not cands:
        return None
    return bank["by_id"][cands[rng.randrange(len(cands))]]


def plan(rng, cfg, bank):
    """One version: which clips, trimmed and held to exactly 720 frames.

    The arc is unchanged - seven beats, in order, one source per beat - and
    what is new is that a beat may say two things instead of one. Beats 4
    and 5 always do: the cables being cut and who cut them are the two
    places the piece is making an argument rather than a claim, and two
    phrases there means the break is reported twice and answered twice.

    Everything is decided before a frame is read. The total is exactly 720
    because the planner trims to it at word boundaries and then hands out
    whatever is left as breath at the end of each beat, so there is no
    stretch, no resample and no fitting after the fact.
    """
    pools = pools_by_beat(cfg, bank)
    chosen = {}
    used_in_1 = set()
    order = []

    for b in cfg["beats"]:
        n = b["n"]
        pool = pools[n]
        if not pool:
            raise RuntimeError(f"beat {n} has no clips in the bank")
        exclude = set(used_in_1) if n == 7 else set()
        prev = chosen.get(n - 1)
        if prev is not None and (n - 1, n) not in SAME_SOURCE_OK:
            other = [c for c in pool
                     if bank["by_id"][c]["source"] != prev[-1]["source"]
                     and c not in exclude]
            if other:
                pool = other
        first = _pick(rng, pool, bank, exclude)
        if first is None:
            raise RuntimeError(f"beat {n}: nothing left to draw")
        chosen[n] = [first]
        if n == 1:
            used_in_1.add(first["id"])
        order.append(n)

    def total_of():
        return sum(c["frames"] for n in order for c in chosen[n])

    def add_second(n):
        exclude = {c["id"] for c in chosen[n]}
        if n == 7:
            exclude |= used_in_1
        if n == 1:
            exclude |= {c["id"] for c in chosen.get(7, [])}
        c = _pick(rng, pools[n], bank, exclude)
        if c is None:
            return False
        chosen[n].append(c)
        if n == 1:
            used_in_1.add(c["id"])
        return True

    for n in TWO_ALWAYS:
        if not add_second(n):
            raise RuntimeError(f"beat {n} must carry two phrases")
    spare = [n for n in order if n not in TWO_ALWAYS]
    rng.shuffle(spare)
    ceiling = OUT_FRAMES * (1 + TRIM_BUDGET)
    for n in spare:
        if not add_second(n):
            continue
        if total_of() > ceiling:
            dropped = chosen[n].pop()
            used_in_1.discard(dropped["id"])
            if n == 1:
                used_in_1.add(chosen[1][0]["id"])

    played = {}
    for n in order:
        for c in chosen[n]:
            played[id(c)] = c["frames"]

    flat = [(n, c) for n in order for c in chosen[n]]
    over = sum(played[id(c)] for _, c in flat) - OUT_FRAMES
    stuck = set()
    while over > 0:
        live = [(played[id(c)], k) for k, (_, c) in enumerate(flat)
                if k not in stuck]
        if not live:
            break
        live.sort(reverse=True)
        k = live[0][1]
        c = flat[k][1]
        cur = played[id(c)]
        cands = [w for w in c["word_frames"]
                 if MIN_PHRASE_FRAMES <= w < cur]
        if not cands:
            stuck.add(k)
            continue
        # One word off the longest phrase, then look again. Taking the whole
        # remaining overrun off whichever phrase is longest right now puts
        # all of it on two or three of them - measured on seed 3, one beat
        # lost 59 frames while five lost nothing. A word at a time spreads
        # it, because a phrase stops being the longest as soon as it has
        # given something up.
        w = max(cands)
        over -= cur - w
        played[id(c)] = w

    if over > 0:
        raise RuntimeError(f"{over} frames over {OUT_FRAMES} with nothing "
                           f"left to trim at a word boundary")

    holds = {k: 0 for k in range(len(flat))}
    deficit = OUT_FRAMES - sum(played[id(c)] for _, c in flat)
    last_of_beat = []
    for n in order:
        ks = [k for k, (m, _) in enumerate(flat) if m == n]
        last_of_beat.append(ks[-1])
    i = 0
    while deficit > 0:
        holds[last_of_beat[i % len(last_of_beat)]] += 1
        deficit -= 1
        i += 1

    names = {b["n"]: b["name"] for b in cfg["beats"]}
    phrases, f = [], 0
    beat_start = {}
    for k, (n, c) in enumerate(flat):
        beat_start.setdefault(n, f)
        nf = played[id(c)]
        phrases.append({
            "beat": n, "beat_name": names[n],
            "index": sum(1 for p in phrases if p["beat"] == n),
            "clip": c["id"], "source": c["source"], "text": c["text"],
            "in": c["in"], "out": round(c["in"] + nf / FPS, 3),
            "clip_frames": c["frames"], "frames": nf,
            "trimmed": c["frames"] - nf, "hold": holds[k],
            "frame": f, "seconds": round(nf / FPS, 3),
        })
        f += nf + holds[k]

    if f != OUT_FRAMES:
        raise RuntimeError(f"the plan lands on {f} frames, not {OUT_FRAMES}")

    cuts = [beat_start[n] for n in sorted(TWO_ALWAYS)]
    return {"phrases": phrases, "beat_start": beat_start, "cuts": cuts,
            "frames": f, "n_phrases": len(phrases),
            "mean_cut_seconds": round(OUT_FRAMES / FPS / len(phrases), 3)}


def source_faults(plan_):
    """Any two neighbouring beats sharing a source outside the arc's own."""
    bad = []
    by_beat = {}
    for p in plan_["phrases"]:
        by_beat.setdefault(p["beat"], []).append(p)
    ns = sorted(by_beat)
    for a, b in zip(ns, ns[1:]):
        if (a, b) in SAME_SOURCE_OK:
            continue
        if by_beat[a][-1]["source"] == by_beat[b][0]["source"]:
            bad.append((a, b, by_beat[a][-1]["source"]))
    return bad
