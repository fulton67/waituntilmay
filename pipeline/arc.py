"""The five-beat arc, and the L-cut split between audio and picture.

Selection is random inside a fixed structure rather than across the whole
talk: every version walks the same five beats in the same order, but picks
different units inside each one. That is what stops a uniform draw over a
54-minute lecture from landing on setup sentences and dead air.

Audio and picture are then built independently. The voice runs as one
continuous line; the picture cuts underneath it on its own rhythm, drawn from
the same units, so a cut never breaks a thought.
"""
import numpy as np

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
    cands = [u for u in pools["refrain"] if 0.8 <= u["duration"] <= 3.0] \
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


def plan_arc(rng, units, pools, seed_refrain=None):
    used = set()
    refrain = seed_refrain or pick_refrain(rng, pools)
    if refrain:
        used.add(refrain["id"])

    beats = []
    for b in BEATS:
        want = rng.randint(*BEAT_UNITS[b])
        cands = [u for u in pools[b] if u["id"] not in used]
        if not cands:
            beats.append([])
            continue
        ranked = sorted(cands, key=lambda u: -_score(u, rng, b))
        top = ranked[:max(want * 5, 10)]
        rng.shuffle(top)
        chosen = top[:want]
        for u in chosen:
            used.add(u["id"])
        chosen.sort(key=lambda u: u["start"])
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
            cands = [u for u in pools[BEATS[bi]] if u["id"] not in used]
            if not cands:
                continue
            u = max(cands, key=lambda x: _score(x, rng, BEATS[bi]))
            used.add(u["id"])
            beats[bi].append(u)
            beats[bi].sort(key=lambda x: x["start"])
            added = True
            break
        if not added:
            break

    order = ([refrain] if refrain else []) + [u for beat in beats for u in beat] \
            + ([refrain] if refrain else [])
    return {"refrain": refrain, "beats": beats, "order": order,
            "speech_seconds": round(speech(beats), 3)}


# --------------------------------------------------------------- audio
def build_audio(rng, src, plan, tone, dur_limit, trigger_word_ids, words):
    """One continuous voice line: units in arc order, breaths between beats.

    The 30s is filled by widening the breaths between beats, not by dumping
    the remainder as a dead tail - so the piece still closes on the refrain.
    """
    order = plan["order"]
    media_cache = {}
    for u in order:
        if u["id"] not in media_cache:
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
    tw = set(trigger_word_ids)
    hits = []
    for p, u in zip(placement, order):
        if p["frame"] >= OUT_FRAMES:
            break
        for w in [w for w in u["word_ids"] if w in tw]:
            t = words[w]["start"]
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
    return voice, placement, triggers, media_cache


# --------------------------------------------------------------- picture
def build_video(rng, plan, media_cache, spec):
    """Cut the picture on its own rhythm, under the continuous voice.

    Frames come only from the units the audio already paid for, so the source
    footage total does not grow: the picture re-uses what the voice uses.
    """
    bank = [media_cache[u["id"]]["frames"] for u in plan["order"]
            if media_cache[u["id"]]["n_frames"]]
    if not bank:
        raise RuntimeError("no frames in the picture bank")

    cut_lo, cut_hi = spec["cut_frames"]
    frames, ops, guard = [], [], 0
    while len(frames) < OUT_FRAMES and guard < 5000:
        guard += 1
        src_frames = bank[rng.randrange(len(bank))]
        n = min(rng.randint(cut_lo, cut_hi), OUT_FRAMES - len(frames))
        if n <= 0:
            break
        start = rng.randrange(len(src_frames))
        seg = [src_frames[(start + i) % len(src_frames)] for i in range(n)]
        applied = []

        r = rng.random()
        p_f = spec["freeze_p"]
        p_r = p_f + spec["reverse_p"]
        p_s = p_r + spec["stutter_p"]
        p_t = p_s + spec["step_p"]
        if r < p_f:
            seg = [seg[0]] * n
            applied.append("freeze")
        elif r < p_r:
            seg = seg[::-1]
            applied.append("reverse")
        elif r < p_s:
            k = rng.randint(2, 5)
            unit = max(1, n // k)
            seg = (seg[:unit] * k)[:n]
            applied.append(f"stutter:x{k}")
        elif r < p_t:
            st = rng.randint(2, 4)
            out_seg = []
            i = 0
            while len(out_seg) < n:
                out_seg.extend([seg[min(i, len(seg) - 1)]] * st)
                i += st
            seg = out_seg[:n]
            applied.append(f"step:{M.FPS//st}fps")

        ops.append({"frame": len(frames), "n": n, "ops": applied})
        frames.extend(seg[:n])
    frames = frames[:OUT_FRAMES]
    while len(frames) < OUT_FRAMES:
        frames.append(frames[-1])
    return frames, ops
