"""Measured verification of the seven-beat renders - no screenshots, numbers.

Every gate a version has to clear before it ships, in one place, so a version
that joins the live pool unattended has cleared the same bar as the batch.

  output duration    30.000s +/- 1 frame
  frame count        720
  A/V drift          < 1 frame
  beat order         all seven, in arc order, exactly one pick each
  the return         beat 7 is never beat 1's pick
  source order       no source two beats running, except the arc's own pairs
  A/V lock           every beat's picture and voice come from the same source
                     at the same timestamps, and the segments tile all 720
  slots              every beat fills its slot exactly: phrases + breath
  phrases            beats 4 and 5 carry two; none is under the 1.5s floor
  the hold           a hold stays with the speaker who earned it
  overlay            no bright, unchanging pixels in any corner region
  mosh               exactly two cuts, at the first frame of beats 4 and 5,
                     the I-VOP gone at each, bloom 12-24 frames, recovery on
                     a keyframe, and nothing else touched

Exits non-zero on any failure so it can gate a re-run.

    .venv/Scripts/python.exe scripts/verify_arc.py --dir renders_arc
    .venv/Scripts/python.exe scripts/verify_arc.py --dir renders_arc --no-text
    .venv/Scripts/python.exe scripts/verify_arc.py --dir renders_arc --no-overlay
"""
import argparse
import glob
import json
import os
import subprocess
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))
sys.path.insert(0, _HERE)
from pipeline import beats as B
import overlay_check as OVC

FPS = B.FPS
FRAME = 1.0 / FPS
TARGET = B.TARGET_SECONDS
MAX_AV_OFFSET_FRAMES = 1.0
# The floor a played phrase may not go under. assemble.py never trims, so
# its floor is the pool's own band; assemble_bank.py trims at word
# boundaries to fit a beat's two phrases into its slot and names its floor
# in the log. Either way the gate reads it rather than assuming it.
MIN_SEGMENT_S = B.BAND[0]
BLOOM_MIN, BLOOM_MAX = 12, 24


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "stream=codec_type,codec_name,duration,nb_frames,width,height",
         "-show_entries", "format=duration", "-of", "json", path],
        check=True, capture_output=True).stdout
    d = json.loads(out)
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    a = next((s for s in d["streams"] if s["codec_type"] == "audio"), None)

    def f(x):
        try:
            return float(x)
        except (TypeError, ValueError):
            return None
    nb = v.get("nb_frames")
    if not str(nb).isdigit():
        nb = subprocess.run(
            ["ffprobe", "-v", "error", "-count_frames", "-select_streams",
             "v:0", "-show_entries", "stream=nb_read_frames", "-of",
             "default=nw=1:nk=1", path], check=True,
            capture_output=True).stdout.strip()
    return {"v": f(v.get("duration")),
            "a": f(a.get("duration")) if a else None,
            "n": int(nb) if str(nb).isdigit() else None,
            "vcodec": v.get("codec_name"),
            "acodec": a.get("codec_name") if a else None,
            "container": f(d["format"]["duration"]),
            "res": f'{v.get("width")}x{v.get("height")}',
            "size_mb": os.path.getsize(path) / 1e6}


def beat_report(log):
    """Is the arc the arc? Returns (ok, detail).

    Two renderers write these logs and both are gated here. assemble.py
    gives every beat one phrase in an equal slot; assemble_bank.py gives a
    beat one or two in a slot the plan sized, with beats 4 and 5 always
    carrying two. What does not vary is the arc: seven beats in one order,
    each spoken by the source the arc gives it, the return never repeating
    the claim, and no source speaking two beats running outside the two
    pairs the arc is built on.
    """
    bs = log.get("beats") or []
    bad = []
    bank = log.get("renderer") == "assemble_bank.py"
    if len(bs) != len(B.BEAT_NAMES):
        return False, f"{len(bs)} beats, not {len(B.BEAT_NAMES)}"

    for i, (b, name) in enumerate(zip(bs, B.BEAT_NAMES)):
        if b["n"] != i + 1 or b["name"] != name:
            bad.append(f"beat {i+1} is {b['n']}/{b['name']}, not {name}")
    slots = log.get("slot_frames") or B.SLOT_FRAMES
    if sum(slots) != B.OUT_FRAMES:
        bad.append(f"the slots add to {sum(slots)}, not {B.OUT_FRAMES}")
    for b, slot in zip(bs, slots):
        if b["frames"] + b["hold_frames"] != slot:
            bad.append(f"beat {b['n']}: {b['frames']}+{b['hold_frames']} "
                       f"!= slot {slot}")
        if b["frames"] <= 0:
            bad.append(f"beat {b['n']} has no picture")
    want = {n: B.ARC[n - 1]["sources"] for n in range(1, 8)}

    if bank:
        floor = log.get("min_phrase_seconds") or MIN_SEGMENT_S
        two = set(log.get("mosh_beats") or [4, 5])
        for b in bs:
            ph = b.get("phrases") or []
            if not ph:
                bad.append(f"beat {b['n']} has no phrases")
                continue
            if not 1 <= len(ph) <= 2:
                bad.append(f"beat {b['n']} carries {len(ph)} phrases, not 1-2")
            if b["n"] in two and len(ph) != 2:
                bad.append(f"beat {b['n']} carries {len(ph)}, and the arc "
                           f"gives it two")
            for x in ph:
                if x["source"] not in want[b["n"]]:
                    bad.append(f"beat {b['n']} spoken by {x['source']}, which "
                               f"the arc does not give that beat")
                if x["frames"] / FPS + 1e-9 < floor:
                    bad.append(f"beat {b['n']}: a phrase of "
                               f"{x['frames'] / FPS:.2f}s is under the "
                               f"{floor}s floor")
        c1 = {x["clip"] for x in (bs[0].get("phrases") or [])}
        c7 = {x["clip"] for x in (bs[-1].get("phrases") or [])}
        if c1 & c7:
            bad.append(f"the return repeats the claim: {sorted(c1 & c7)}")
        for a, c in zip(bs, bs[1:]):
            if (a["n"], c["n"]) in B.SAME_SOURCE_OK:
                continue
            pa = (a.get("phrases") or [{}])[-1].get("source")
            pc = (c.get("phrases") or [{}])[0].get("source")
            if pa == pc:
                bad.append(f"{pa} speaks beats {a['n']} and {c['n']} running")
        n_ph = sum(len(b.get("phrases") or []) for b in bs)
        detail = f"7 beats, in order, {n_ph} phrases"
    else:
        for b in bs:
            if b["source"] not in want[b["n"]]:
                bad.append(f"beat {b['n']} spoke by {b['source']}, which the "
                           f"arc does not give that beat")
        first, last = bs[0], bs[-1]
        if (first["source"], first["in"]) == (last["source"], last["in"]):
            bad.append("the return is beat 1's own pick")
        for a, c in zip(bs, bs[1:]):
            if a["source"] == c["source"] and (a["n"], c["n"]) \
                    not in B.SAME_SOURCE_OK:
                bad.append(f"{a['source']} speaks beats {a['n']} and {c['n']} "
                           f"running")
        detail = "7 beats, in order"
    return (not bad), "; ".join(bad[:3]) if bad else detail


def align_report(log):
    """Is the picture the same source as the voice, frame for frame?

    Checked against the log's two independently written lists: `segments`
    comes from the picture loop and `audio_track` from the same loop's voice
    side, and the gate compares them against each other and against the
    slot arithmetic rather than trusting either.

    Returns (ok, detail, stats).
    """
    segs = log.get("segments") or []
    track = log.get("audio_track") or []
    if not segs:
        return False, "no per-segment provenance", {}
    bad = []
    floor = log.get("min_phrase_seconds") or MIN_SEGMENT_S
    speech = [s for s in segs if s.get("kind") == "speech"]

    pos = 0
    for s in segs:
        if s.get("frame") != pos:
            bad.append(f"seg at {s.get('frame')} expected {pos}")
            break
        pos += s.get("n_frames") or 0
    total = int(round(TARGET * FPS))
    if pos != total:
        bad.append(f"segments cover {pos} frames, not {total}")

    for s in speech:
        if s.get("src") != s.get("audio_src"):
            bad.append(f"seg {s['frame']}: picture {s.get('src')} over voice "
                       f"{s.get('audio_src')}")
        if s.get("video_span") != s.get("audio_span"):
            bad.append(f"seg {s['frame']}: picture span != voice span")
        if abs(s.get("av_offset_frames") or 0) > MAX_AV_OFFSET_FRAMES:
            bad.append(f"seg {s['frame']}: offset "
                       f"{s.get('av_offset_frames')} frames")
        if (s.get("seconds") or 0) + 1e-9 < floor:
            bad.append(f"seg {s['frame']}: {s.get('seconds')}s under the "
                       f"{floor}s floor")

    # a hold belongs to whoever just spoke, and fills from their own frames
    for i, s in enumerate(segs):
        if s.get("kind") == "hold" and i:
            if s.get("src") != segs[i - 1].get("src"):
                bad.append(f"seg {s['frame']}: hold cut to {s.get('src')}")
            if s.get("beat") != segs[i - 1].get("beat"):
                bad.append(f"seg {s['frame']}: hold left its beat")

    if len(speech) != len(track):
        bad.append(f"{len(speech)} picture segments vs {len(track)} voice")
    else:
        for s, t in zip(speech, track):
            if (s.get("frame") != t.get("frame")
                    or s.get("src") != t.get("src")
                    or s.get("beat") != t.get("beat")):
                bad.append(f"seg {s['frame']}: picture/voice disagree")
                break
            if abs((s.get("seconds") or 0) - (t.get("dur") or 0)) > FRAME:
                bad.append(f"seg {s['frame']}: picture {s.get('seconds')}s vs "
                           f"voice {t.get('dur')}s")
                break

    stats = {"segments": len(segs), "speech": len(speech),
             "holds": sum(1 for s in segs if s.get("kind") == "hold"),
             "held_frames": sum(s["n_frames"] for s in segs
                                if s.get("kind") == "hold"),
             "shortest_s": min((s.get("seconds") or 0 for s in speech),
                               default=0),
             "max_offset_f": max((abs(s.get("av_offset_frames") or 0)
                                  for s in speech), default=0)}
    return (not bad), ("; ".join(bad[:3]) if bad else "locked"), stats


def mosh_report(log):
    """Two cuts, at the right frames, each a real I-frame removal."""
    m = log.get("mosh") or {}
    cuts = m.get("cuts") or []
    bad = []
    # Where the cuts belong: the plan says so for a bank render, because
    # the slots are not equal there; for an equal-slot render it is
    # arithmetic over the arc.
    want = log.get("mosh_cuts_expected") or [
        B.SLOT_START[n - 1] for n in (log.get("mosh_beats")
                                      or list(B.MOSH_BEATS))]
    if len(cuts) != 2:
        bad.append(f"{len(cuts)} mosh cuts, not 2")
    got = [c["cut"] for c in cuts]
    if got != want:
        bad.append(f"cuts at {got}, not {want}")
    for c in cuts:
        if not (BLOOM_MIN <= c["bloom"] <= BLOOM_MAX):
            bad.append(f"cut {c['cut']}: bloom {c['bloom']} outside "
                       f"{BLOOM_MIN}-{BLOOM_MAX}")
        if c.get("was") != "I" or c.get("now") != "P":
            bad.append(f"cut {c['cut']}: {c.get('was')}->{c.get('now')}, "
                       f"not I->P")
        if c.get("recover") != c["cut"] + c["bloom"]:
            bad.append(f"cut {c['cut']}: recovery not at cut+bloom")
    if m.get("total_vops") != log.get("n_frames"):
        bad.append(f"{m.get('total_vops')} VOPs vs {log.get('n_frames')} "
                   f"frames - the frame count moved")
    return (not bad), "; ".join(bad[:3]) if bad else "2 cuts, I->P, recovered"


def check_render(log, m, drift, burn=None):
    checks = {
        "dur==30": abs((m["container"] or 0) - TARGET) <= FRAME,
        "frames==720": m["n"] == int(TARGET * FPS),
        "drift<1f": drift < FRAME,
        "7beats": beat_report(log)[0],
        "av-locked": align_report(log)[0],
        "mosh-2cuts": mosh_report(log)[0],
        "no-overlay": None if burn is None else OVC.clean(burn),
    }
    return {k: v for k, v in checks.items() if v is not None}


def check_one(mp4, log, overlay=True):
    """Every gate for a single render, probed on the spot.

    The nightly pool job calls this, so a version that joins the rotation
    unattended has cleared exactly the gates the hand-run batch did - there
    is one definition of passing and both read it.
    """
    m = probe(mp4)
    drift = abs((m["v"] or 0) - (m["a"] or 0))
    burn = OVC.burnin(mp4) if overlay else None
    return check_render(log, m, drift, burn), m, drift, burn


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="renders_bank")
    ap.add_argument("--renderer", default=None,
                    help="only logs written by this renderer")
    ap.add_argument("--no-text", action="store_true")
    ap.add_argument("--no-overlay", action="store_true",
                    help="skip the corner-region decode (slow)")
    args = ap.parse_args()

    # the mosh audit leaves v_<seed>_clean-mv.json beside the render, which
    # matches the same glob and is not a render log
    # Both renderers write v_<seed>.json here and both are gated. The mosh
    # audit leaves v_<seed>_clean-mv.json beside a render, which matches the
    # same glob and is not a render log at all.
    RENDERERS = ("assemble.py", "assemble_bank.py")
    want_renderer = (args.renderer,) if args.renderer else RENDERERS
    logs = [p for p in sorted(glob.glob(os.path.join(args.dir, "v_*.json")))
            if json.load(open(p, encoding="utf-8")).get("renderer")
            in want_renderer]
    if not logs:
        print("no renders found")
        return 1

    rows, failures = [], []
    for lp in logs:
        log = json.load(open(lp, encoding="utf-8"))
        mp4 = os.path.join(args.dir, log["output"])
        if not os.path.exists(mp4):
            failures.append((log["seed"], "missing mp4"))
            continue
        m = probe(mp4)
        drift = abs((m["v"] or 0) - (m["a"] or 0))
        burn = None if args.no_overlay else OVC.burnin(mp4)
        checks = check_render(log, m, drift, burn)
        if not all(checks.values()):
            failures.append((log["seed"],
                             ",".join(k for k, ok in checks.items() if not ok)))
        rows.append((log, m, drift, checks, burn))
    rows.sort(key=lambda r: r[0]["seed"])

    hdr = (f"{'seed':>8} {'ph':>3} {'per-beat frames':>26} {'trim':>5} "
           f"{'held':>5} {'speech%':>7} "
           f"{'out s':>7} {'drift f':>7} {'frames':>6} {'mosh':>14} "
           f"{'MB':>5}  ok")
    print("=" * len(hdr))
    print("RENDER VERIFICATION  (7-beat arc, breath holds, two real moshes)")
    print("=" * len(hdr))
    print(hdr)
    print("-" * len(hdr))
    for log, m, drift, checks, burn in rows:
        ok = "PASS" if all(checks.values()) else "FAIL:" + ",".join(
            k for k, v in checks.items() if not v)
        per = "/".join(str(b["frames"]) for b in log["beats"])
        held = sum(b["hold_frames"] for b in log["beats"])
        trim = log.get("trimmed_frames", 0)
        nph = log.get("n_phrases", len(log["beats"]))
        cuts = log["mosh"]["cuts"]
        mosh = "+".join(f"{c['cut']}/{c['bloom']}" for c in cuts)
        print(f"{log['seed']:>8} {nph:>3} {per:>26} {trim:>5} {held:>5} "
              f"{log['speech_pct']:>7.1f} {m['container']:>7.3f} "
              f"{drift/FRAME:>7.3f} {m['n']:>6} {mosh:>14} "
              f"{m['size_mb']:>5.1f}  {ok}")

    print(f"\nLIMITS: output 30.000s +/-1 frame | 720 frames | drift <1 frame "
          f"| 7 beats in order, 1-2 phrases each, slots exact and adding to "
          f"{B.OUT_FRAMES} | beats {sorted(B.MOSH_BEATS)} carry two | no "
          f"phrase under its renderer's floor | return shares no clip with "
          f"the claim | no source two beats running outside "
          f"{sorted(B.SAME_SOURCE_OK)} | A/V locked | 2 mosh cuts, at the "
          f"first frame of beats {sorted(B.MOSH_BEATS)}, bloom "
          f"{BLOOM_MIN}-{BLOOM_MAX} | no overlay pixels in any corner")

    # ---- the arc, per render
    print("\n" + "=" * 112)
    print("THE ARC  (seven beats in order, one or two phrases each)")
    print("=" * 112)
    print(f"{'seed':>10}  " + " ".join(f"{n[:7]:>9}" for n in B.BEAT_NAMES)
          + "   result")
    print("-" * 112)
    for log, *_rest in rows:
        ok, detail = beat_report(log)
        print(f"{log['seed']:>10}  "
              + " ".join(f"{b['source'][:9]:>9}" for b in log["beats"])
              + f"   {'OK' if ok else 'FAIL: ' + detail}")

    # ---- A/V alignment
    print("\n" + "=" * 112)
    print("A/V ALIGNMENT  (picture source == voice source, same spans, "
          f"offset <= {MAX_AV_OFFSET_FRAMES:.0f} frame, segment >= "
          f"{MIN_SEGMENT_S}s)")
    print("=" * 112)
    print(f"{'seed':>10} {'seg':>4} {'speech':>7} {'holds':>6} "
          f"{'held f':>7} {'shortest':>9} {'max off':>8}  result")
    print("-" * 112)
    locked = 0
    for log, *_rest in rows:
        ok, detail, st = align_report(log)
        locked += 1 if ok else 0
        print(f"{log['seed']:>10} {st.get('segments', 0):>4} "
              f"{st.get('speech', 0):>7} {st.get('holds', 0):>6} "
              f"{st.get('held_frames', 0):>7} "
              f"{st.get('shortest_s', 0):>8.2f}s {st.get('max_offset_f', 0):>8.0f}"
              f"  {'LOCKED' if ok else 'FAIL: ' + detail}")
    print("-" * 112)
    print(f"{locked}/{len(rows)} renders are A/V locked")

    # ---- the overlay
    if not args.no_overlay:
        names = list(OVC.REGIONS)
        print("\n" + "=" * 96)
        print(f"OVERLAY  (pixels per corner region that are both bright "
              f"> {OVC.BRIGHT:.0f} and static sd < {OVC.STATIC:.0f})")
        print("=" * 96)
        print(f"{'seed':>10} " + " ".join(f"{n:>13}" for n in names)
              + "  result")
        print("-" * 96)
        tot = {n: 0 for n in names}
        for log, m, drift, checks, burn in rows:
            for n in names:
                tot[n] += burn[n]
            print(f"{log['seed']:>10} " + " ".join(f"{burn[n]:>13}" for n in names)
                  + f"  {'CLEAN' if OVC.clean(burn) else 'BURN-IN'}")
        print("-" * 96)
        print(f"{'batch':>10} " + " ".join(f"{tot[n]:>13}" for n in names))

    # ---- the mosh
    print("\n" + "=" * 96)
    print("MOSH  (two cuts: into beat 4 and into beat 5; everything else "
          "is a clean cut)")
    print("=" * 96)
    print(f"{'seed':>10} {'cut 1':>7} {'bloom':>6} {'recover':>8} "
          f"{'cut 2':>7} {'bloom':>6} {'recover':>8} {'VOPs':>6} "
          f"{'suppressed':>11}  result")
    print("-" * 96)
    for log, *_rest in rows:
        ok, detail = mosh_report(log)
        c = log["mosh"]["cuts"]
        sup = sum(len(x["gop_keyframes_suppressed"]) for x in c)
        print(f"{log['seed']:>10} {c[0]['cut']:>7} {c[0]['bloom']:>6} "
              f"{c[0]['recover']:>8} {c[1]['cut']:>7} {c[1]['bloom']:>6} "
              f"{c[1]['recover']:>8} {log['mosh']['total_vops']:>6} "
              f"{sup:>11}  {'OK' if ok else 'FAIL: ' + detail}")

    # ---- the pool, as the batch actually used it
    print("\n" + "=" * 96)
    print("DISTINCT LINES USED PER BEAT  (over the whole batch)")
    print("=" * 96)
    cfg = B.load()
    pools = {b["n"]: len(b["pool"]) for b in cfg["beats"]}
    print(f"{'beat':>5} {'name':<9} {'pool':>5} {'distinct used':>14} "
           f"{'sources':>8}  lines")
    print("-" * 96)
    for i, name in enumerate(B.BEAT_NAMES, start=1):
        used = set()
        for log, *_ in rows:
            for b in log["beats"]:
                if b["n"] != i:
                    continue
                for x in (b.get("phrases") or [b]):
                    used.add((x["source"], x["in"]))
        srcs = {x for x, _ in used}
        print(f"{i:>5} {name:<9} {pools[i]:>5} {len(used):>14} "
              f"{len(srcs):>8}  {100.0*len(used)/max(pools[i],1):>5.0f}% "
              f"of the pool")

    # ---- codecs
    print("\n" + "=" * 96)
    print("CODEC AUDIT")
    print("=" * 96)
    vc = {}
    ac = {}
    rs = {}
    for log, m, *_ in rows:
        vc[m["vcodec"]] = vc.get(m["vcodec"], 0) + 1
        ac[m["acodec"]] = ac.get(m["acodec"], 0) + 1
        rs[m["res"]] = rs.get(m["res"], 0) + 1
    print("  video: " + "  ".join(f"{k} x{v}" for k, v in vc.items()))
    print("  audio: " + "  ".join(f"{k} x{v}" for k, v in ac.items()))
    print("  size:  " + "  ".join(f"{k} x{v}" for k, v in rs.items()))

    n = len(rows)
    print(f"\n{n - len(failures)}/{n} renders pass all checks")
    if failures:
        print("\nFAILURES:")
        for s, why in failures:
            print(f"  seed {s}: {why}")

    if not args.no_text:
        print("\n" + "=" * 96)
        print("THE SCRIPT, PER VERSION  (beat -> source -> text)")
        print("=" * 96)
        for log, *_rest in rows:
            print(f"\n--- seed {log['seed']} ---")
            for b in log["beats"]:
                ph = b.get("phrases")
                if not ph:
                    print(f"  {b['n']} {b['name']:<8} {b['source']:<10} "
                          f"[{b['seconds']:>4.2f}s "
                          f"+{b['hold_frames']/FPS:>4.2f}s] "
                          f"\"{b['text']}\"")
                    continue
                for k, x in enumerate(ph):
                    print(f"  {b['n']}.{k} {b['name']:<8} "
                          f"{x['source']:<10} "
                          f"[{x['frames']/FPS:>4.2f}s "
                          f"+{x['hold']/FPS:>4.2f}s"
                          f"{' -' + format(x['trimmed']/FPS, '.2f') + 's' if x['trimmed'] else ''}] "
                          f"\"{x['text']}\"")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
