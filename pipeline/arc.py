"""The five-beat arc, and the L-cut split between audio and picture.

Selection is random inside a fixed structure rather than across the whole
talk: every version walks the same five beats in the same order, but picks
different units inside each one. That is what stops a uniform draw over a
54-minute lecture from landing on setup sentences and dead air.

The voice runs as one continuous line and the picture is locked to it: one
segment per phrase, cut from that phrase's own source at that phrase's own
timestamps. The picture used to be cut on its own rhythm from a random unit in
the bank, which put one source's face over another source's voice for most of
every version; see build_video.

Consecutive phrases are chosen to answer each other - by preference a
different source that shares a word or a tag with the line before it - so a
cross-source cut reads as an exchange rather than a shuffle. See
pipeline/link.py.
"""
import numpy as np

from . import link as L
from . import media as M
from .units import BEATS

TARGET_SECONDS = 30.0
OUT_FRAMES = int(round(TARGET_SECONDS * M.FPS))

BEAT_UNITS = {
    "question": (1, 2),
    "physical": (2, 3),
    "water": (1, 3),
    "internet": (1, 2),
    "dissolution": (1, 3),
}
BREATH_MIN = 0.10          # shortest pause between beats
BREATH_MAX = 1.10          # longest, before the remainder goes to the tail
TAIL_MAX = 0.60            # never leave more than this of dead air at the end
SPEECH_TARGET = (26.0, 28.8)
# A segment shorter than this is gone before a viewer can place the voice or
# the face, which is the whole point of an exchange. It is a floor on
# selection, not a trim: units are clause runs and are never cut short.
MIN_SEGMENT = 1.5


def _score(u, rng, beat=None):
    """Prefer dense, self-contained clauses that are really about the beat."""
    s = u["density"]
    if beat and beat in u.get("strong", []):
        s += 3.0                      # the real line beats the merely adjacent one
    if u["ends_sentence"]:
        s += 1.2
    if 1.0 <= u["duration"] <= 3.2:
        s += 1.0
    if len(u["spans"]) == 1:
        s += 0.3
    return s * (0.75 + 0.5 * rng.random())


def pick_refrain(rng, pools):
    """Weighted random, not max().

    The refrain is the anchor and repeats twice per version, so taking the
    top-scoring line made 24 of 30 versions open and close with the same
    words. Sampling in proportion to score keeps the good lines likely
    without making one of them inevitable.
    """
    cands = [u for u in pools["refrain"]
             if MIN_SEGMENT <= u["duration"] <= 3.0] \
        or [u for u in pools["refrain"] if u["duration"] >= MIN_SEGMENT] \
        or pools["refrain"]
    if not cands:
        return None
    weights = [max(0.01, _score(u, rng)) for u in cands]
    total = sum(weights)
    r = rng.random() * total
    acc = 0.0
    for u, w in zip(cands, weights):
        acc += w
        if acc >= r:
            return u
    return cands[-1]


def _draw_source(rng, weights, available):
    """Pick which source this unit comes from, by the configured weight.

    The weight is applied here rather than as a multiplier on the score,
    because a score multiplier mixes "how much of the draw this source gets"
    with "how good this line is" and neither number stays readable. Sources
    with nothing left for this beat drop out and the rest renormalise.
    """
    live = [s for s in available if weights.get(s, 0) > 0]
    if not live:
        return rng.choice(list(available)) if available else None
    tot = sum(weights[s] for s in live)
    r = rng.random() * tot
    acc = 0.0
    for s in live:
        acc += weights[s]
        if acc >= r:
            return s
    return live[-1]


# The order the sequencer tries, and what each tier means in the log.
TIERS = {1: "cross-word", 2: "cross-tag", 3: "cross-none",
         4: "same-word", 5: "same-tag", 6: "same-none"}


def _next_unit(rng, cands, prev, weights, beat):
    """The next phrase, preferring an exchange over a shuffle.

    Six tiers, taken in order:

      1  a different source sharing a content word with the last phrase
      2  a different source sharing a tag
      3  a different source sharing nothing
      4  the same source sharing a content word
      5  the same source sharing a tag
      6  the same source, scored only

    Tier 1 is what the piece wants - Blum says cables, the news says the
    cables were cut. The word link gets its own tier above the tag link
    because a tag is nearly free: `physical` is on a third of Blum's
    phrases, so folding the two together let a tag satisfy the rule and the
    word link never got chased.

    The same-source tiers exist because the beat pools are not evenly spread:
    of the 152 `physical` units long enough to use, 148 are Blum, so a rule
    that insisted on crossing every time would run that beat dry and lose the
    beat altogether, which is a gate. Which tier fired is recorded for every
    cut, so the linked share is a number in the log rather than a claim here.
    """
    prev_src = (prev or {}).get("src")
    diff = [u for u in cands if u.get("src") != prev_src]
    for tier, pool in ((1, [u for u in diff if L.shares_word(prev, u)]),
                       (2, [u for u in diff if L.shares_tag(prev, u)]),
                       (3, diff),
                       (4, [u for u in cands if L.shares_word(prev, u)]),
                       (5, [u for u in cands if L.shares_tag(prev, u)]),
                       (6, cands)):
        if not pool:
            continue
        if weights:
            have = sorted({u["src"] for u in pool if u.get("src")})
            sid = _draw_source(rng, weights, have)
            pool = [u for u in pool if u.get("src") == sid] or pool
        ranked = sorted(pool, key=lambda u: -_score(u, rng, beat))
        top = ranked[:max(5, min(10, len(ranked)))]
        return top[rng.randrange(len(top))], tier
    return None, None


def plan_arc(rng, units, pools, seed_refrain=None, weights=None):
    used = set()
    refrain = seed_refrain or pick_refrain(rng, pools)
    if refrain:
        used.add(refrain["id"])

    # The chain runs through the whole version, not per beat: the phrase a
    # beat opens on answers the one the beat before it closed on. `seq` is
    # the order so far, so seq[-1] is always what the viewer just heard.
    seq = [refrain] if refrain else []
    beats = []
    # The budget is spent as the draw goes, not repaired afterwards. The
    # trim-down loop below will not empty a beat - that would fail the
    # five-beat gate - so with longer segments it often has nothing it is
    # allowed to pop, and an initial draw that overshot stayed overshot:
    # measured, 1 plan in 400 drew 31.09s of source against a 30s cap.
    # Each beat still to come is left MIN_SEGMENT of room so that spending
    # here cannot starve a later beat into breaking the ceiling itself.
    spent = 2 * refrain["duration"] if refrain else 0.0
    for bi, b in enumerate(BEATS):
        want = rng.randint(*BEAT_UNITS[b])
        reserve = MIN_SEGMENT * (len(BEATS) - bi - 1)
        chosen = []
        for k in range(want):
            room = SPEECH_TARGET[1] - spent - reserve
            cands = [u for u in pools[b] if u["id"] not in used
                     and u["duration"] >= MIN_SEGMENT]
            if not cands:
                break
            fits = [u for u in cands if u["duration"] <= room]
            if fits:
                pool = fits
            elif k == 0:
                # the beat has to exist, so take the shortest line in it and
                # let the ceiling give rather than the structure
                pool = [min(cands, key=lambda x: x["duration"])]
            else:
                break
            u, _tier = _next_unit(rng, pool, seq[-1] if seq else None,
                                  weights, b)
            if u is None:
                break
            used.add(u["id"])
            chosen.append(u)
            seq.append(u)
            spent += u["duration"]
        beats.append(chosen)

    def speech(bs):
        return (sum(u["duration"] for beat in bs for u in beat)
                + (2 * refrain["duration"] if refrain else 0))

    guard = 0
    while speech(beats) > SPEECH_TARGET[1] and guard < 60:
        guard += 1
        cand = [i for i in range(len(beats)) if len(beats[i]) > 1]
        if not cand:
            break
        bi = max(cand, key=lambda i: sum(u["duration"] for u in beats[i]))
        beats[bi].pop(rng.randrange(len(beats[bi])))

    guard = 0
    while speech(beats) < SPEECH_TARGET[0] and guard < 80:
        guard += 1
        order = sorted(range(len(beats)),
                       key=lambda i: sum(u["duration"] for u in beats[i]))
        added = False
        for bi in order:
            # Only units that still fit under the ceiling, and the room is
            # checked before anything else chooses. Topping up stops at the
            # lower bound, so one long clause added to reach 26.0s can land
            # the plan past 28.8 - and nothing trims afterwards. A 6.3s unit
            # did exactly that: 32.0s of speech planned into a 30s slot, the
            # closing refrain clipped, and the version rejected.
            #
            # Filtering here rather than after the source draw means the
            # draw only ever sees units that fit, and a source with nothing
            # short enough drops out of it the same way a source with
            # nothing left for the beat does. A beat where nothing fits is
            # skipped: stopping a little under the floor costs nothing, and
            # going over the cap costs the whole version.
            room = SPEECH_TARGET[1] - speech(beats)
            cands = [u for u in pools[BEATS[bi]]
                     if u["id"] not in used and u["duration"] <= room
                     and u["duration"] >= MIN_SEGMENT]
            if not cands:
                continue
            # A top-up lands at the end of its beat, so it answers whatever
            # currently ends that beat - or, for an empty one, the phrase the
            # beat before it ends on. The same tiers as the first draw: a
            # unit added to reach the floor is still part of the exchange.
            u, _tier = _next_unit(rng, cands, _ends_before(beats, bi, refrain),
                                  weights, BEATS[bi])
            if u is None:
                continue
            used.add(u["id"])
            beats[bi].append(u)
            added = True
            break
        if not added:
            break

    order = ([refrain] if refrain else []) + [u for beat in beats for u in beat] \
            + ([refrain] if refrain else [])
    return {"refrain": refrain, "beats": beats, "order": order,
            "links": links_for(order),
            "speech_seconds": round(speech(beats), 3)}


def _ends_before(beats, bi, refrain):
    """The phrase the viewer hears immediately before beat `bi`'s next slot."""
    if beats[bi]:
        return beats[bi][-1]
    for j in range(bi - 1, -1, -1):
        if beats[j]:
            return beats[j][-1]
    return refrain


def links_for(order):
    """How each phrase picks up from the one before it, over the final order.

    Measured after trimming and topping up rather than recorded during
    selection: a unit the trim loop removed would otherwise leave a link
    pointing at a phrase that is no longer in the version. This is what the
    log reports, so the linked share is a property of the edit that shipped.
    """
    out = [None]
    for a, b in zip(order, order[1:]):
        lk = L.between(a, b)
        out.append({"from_unit": a["id"], "to_unit": b["id"],
                    "cross": a.get("src") != b.get("src"),
                    "kind": lk[0] if lk else "none",
                    "via": lk[1] if lk else None})
    return out


# --------------------------------------------------------------- audio
def build_audio(rng, src, plan, tone, dur_limit, trigger_word_ids, words,
                cfg=None, srcs=None):
    """One continuous voice line: units in arc order, breaths between beats.

    The 30s is filled by widening the breaths between beats, not by dumping
    the remainder as a dead tail - so the piece still closes on the refrain.
    """
    order = plan["order"]
    # srcs maps a source id to {"video","duration"}; without it this is the
    # single-source path and every unit comes out of `src`
    media_cache = {}
    for u in order:
        if u["id"] in media_cache:
            continue
        if srcs and u.get("src") in srcs:
            s = srcs[u["src"]]
            media_cache[u["id"]] = M.unit_media(s["video"], u, s["duration"])
        else:
            media_cache[u["id"]] = M.unit_media(src, u, dur_limit)

    n_open = 1 if plan["refrain"] else 0
    # breath slots sit after the opening refrain, between beats, and before
    # the closing refrain
    slots, k = [], n_open
    if n_open:
        slots.append(k)
    for beat in plan["beats"]:
        k += len(beat)
        slots.append(k)
    slots = sorted(set(i for i in slots if 0 < i < len(order)))

    speech_frames = sum(media_cache[u["id"]]["n_frames"] for u in order)
    deficit = OUT_FRAMES - speech_frames

    breaths = {}
    if slots and deficit > 0:
        base = int(round(BREATH_MIN * M.FPS))
        for i in slots:
            breaths[i] = base
        left = deficit - base * len(slots)
        cap = int(round(BREATH_MAX * M.FPS))
        while left > 0:
            grew = False
            for i in rng.sample(slots, len(slots)):
                if left <= 0:
                    break
                if breaths[i] < cap:
                    step = min(left, max(1, int(round(0.05 * M.FPS))))
                    breaths[i] += step
                    left -= step
                    grew = True
            if not grew:
                break
        tail = max(0, min(left, int(round(TAIL_MAX * M.FPS))))
    else:
        tail = max(0, deficit)

    blocks, placement, cursor = [], [], 0
    for idx, u in enumerate(order):
        um = media_cache[u["id"]]
        blocks.append(um["audio"])
        placement.append({"unit": u["id"], "text": u["text"], "frame": cursor,
                          "src": u.get("src"),
                          "n_frames": um["n_frames"],
                          "seconds": round(um["n_frames"] / M.FPS, 3)})
        cursor += um["n_frames"]
        bn = breaths.get(idx + 1, 0)
        if bn:
            blocks.append(M.room_tone_block(tone, bn, rng))
            cursor += bn

    voice = np.concatenate(blocks, axis=0) if blocks else \
        np.zeros((0, M.CHANNELS), np.int16)
    if cursor < OUT_FRAMES:
        voice = np.concatenate(
            [voice, M.room_tone_block(tone, OUT_FRAMES - cursor, rng)], axis=0)
    voice = M.fit_samples(voice, OUT_FRAMES * M.SAMPLES_PER_FRAME)

    # ---- where a trigger word is heard, in output frames
    # trigger_word_ids and words are per source: {src_id: [...]} in the
    # multi-source path, or a bare list/dict in the single-source one
    def _per_src(x, sid):
        return x[sid] if isinstance(x, dict) and sid in x else x

    hits = []
    for p, u in zip(placement, order):
        if p["frame"] >= OUT_FRAMES:
            break
        sid = u.get("src")
        tw = set(_per_src(trigger_word_ids, sid) or [])
        ws = _per_src(words, sid)
        for w in [w for w in u["word_ids"] if w in tw]:
            t = ws[w]["start"]
            acc, off = 0.0, None
            for a, b in u["spans"]:
                if a <= t <= b:
                    off = acc + (t - a)
                    break
                acc += b - a
            fr = p["frame"] + int(round((off if off is not None else 0.0) * M.FPS))
            if 0 <= fr < OUT_FRAMES:
                hits.append(fr)
    triggers = []
    for t in sorted(set(hits)):
        if not triggers or t - triggers[-1] > 8:
            triggers.append(t)

    # config/triggers.json declares how many triggers a render may carry, and
    # until now nothing read it: an edit that happened to say the word five
    # times fired five times. The word count is a property of the selection,
    # so the cap is applied here by thinning rather than by re-rolling the
    # edit - a random subset, so the kept triggers are not all early ones.
    cap = ((cfg or {}).get("triggers_per_render") or {}).get("max")
    if cap and len(triggers) > cap:
        triggers = sorted(rng.sample(triggers, cap))
    return voice, placement, triggers, media_cache


# --------------------------------------------------------------- picture
def build_video(plan, placement, media_cache):
    """The picture, locked to the voice.

    One segment per phrase: the frames of that phrase's own unit, from that
    phrase's own source, over exactly the output frames its audio occupies.
    `unit_media` extracts a unit's frames and its audio from the same spans
    and fits the samples to the frame count, so frame i of a segment carries
    the samples of frame i of the same phrase - the offset is zero by
    construction rather than by correction.

    This replaces a picture cut on its own rhythm from a random unit in the
    bank at a random offset inside it. Replayed against the 30 shipped
    renders' own seeds, that put a different source on screen than the one
    speaking for 57.0% of speech frames, and a different phrase for 90.1%.
    A continuous voice over a continuous picture of someone else is a
    different piece; this one is an exchange, and a cut only means anything
    if it lands where the speaker changes.

    Through a breath the picture holds the last frame of whoever just spoke.
    A pause belongs to the speaker who earned it, and cutting early to the
    next source would put its picture over the previous source's silence -
    the same fault in miniature. The hold is also why no segment is ever
    shorter than its phrase: the gap is padded, never filled from elsewhere.

    Returns (frames, segments) where segments tile the whole output and carry
    the provenance verify_renders.py checks.
    """
    by_uid = {u["id"]: u for u in plan["order"]}
    frames, segs = [], []

    def hold(n, why):
        """Freeze the current picture for n frames, still that source's."""
        if n <= 0 or not frames:
            return
        last = segs[-1] if segs else None
        segs.append({"kind": why, "frame": len(frames), "n_frames": n,
                     "seconds": round(n / M.FPS, 3),
                     "src": (last or {}).get("src"),
                     "audio_src": None,
                     "unit": (last or {}).get("unit"),
                     "video_span": None, "audio_span": None,
                     "av_offset_frames": 0})
        frames.extend([frames[-1]] * n)

    for p in placement:
        if len(frames) >= OUT_FRAMES:
            break
        hold(min(p["frame"], OUT_FRAMES) - len(frames), "hold")
        if len(frames) >= OUT_FRAMES:
            break
        um = media_cache[p["unit"]]
        fr = um["frames"]
        if not fr:
            continue
        n = min(len(fr), OUT_FRAMES - len(frames))
        u = by_uid.get(p["unit"], {})
        segs.append({"kind": "speech", "frame": len(frames), "n_frames": n,
                     "seconds": round(n / M.FPS, 3),
                     "src": p.get("src"), "audio_src": p.get("src"),
                     "unit": p["unit"],
                     "video_span": u.get("spans"), "audio_span": u.get("spans"),
                     "av_offset_frames": 0,
                     "text": p.get("text")})
        frames.extend(fr[:n])

    hold(OUT_FRAMES - len(frames), "tail")
    if not frames:
        raise RuntimeError("no frames in the picture bank")
    while len(frames) < OUT_FRAMES:          # a render must be exactly 30s
        frames.append(frames[-1])
    return frames[:OUT_FRAMES], segs
