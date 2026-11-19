"""The HDR master: the reel with its footage exactly as the iPhone camera roll shows it (10-bit HEVC, HLG, bt2020), not an 8-bit
SDR-labelled re-render. Used by reel.py --hdr; recipe in brand/remotion/REELS.md ("HDR master").

  python brand/scripts/reel.py <reel> --hdr [--version vN] [--frames A-B] [--audio <existing master.mp4>] [--passes under,matte,over,media] [--keep]

How (nothing here converts, tone-maps or grades a footage pixel):
  1 footage   every picture segment is cut straight from the ORIGINAL camera file (brand/remotion/public/originals.json: working file ->
              original, offset, rotation) with ffmpeg in yuv420p10le: cut, retime to 24 fps (frames are picked, never blended), the
              timeline's punch-in (crop + scale), rotation. No colour filter. Lossless FFV1 between steps. A clip whose original is not on
              disk falls back to the 8-bit working file (same HLG coding) and is listed in the manifest.
  2 graphics  the Remotion composition renders its layers WITHOUT footage as transparent PNG sequences (prop `pass`):
                under = what sits behind the people (wall titles, full-frame stills)     matte = the people's RVM key, alpha only
                over  = every other graphic                                              media = the clips shown inside cards
              under / over are sRGB: a 3D LUT takes them to bt2020 primaries + the HLG transfer with graphics white at HLG reference
              white (75 % signal, 203 nits: BT.2408, display-referred, so type and cards look as they do now and do not glare).
              media is footage (already HLG-coded by the working file): matrix only, no LUT.
  3 layers    footage -> under -> the people again (the ORIGINAL footage through the RVM matte: alphamerge + overlay, never keyed 8-bit
              pixels) -> frosted glass (the footage blurred under the cards, as the cards' backdrop blur does) -> over -> media
  4 encode    libx265 main10, yuv420p10le, colour_primaries bt2020, transfer arib-std-b67, matrix bt2020nc, range tv, hvc1.
              Audio: copied from the existing master (--audio), unchanged.
  5 checks    tags equal the original's; footage pixels in graphics-free regions vs the original decoded at the same source time
              (mean |difference| <= 2 code values, 10-bit, after the identical crop/scale); frozen picture; graphics white = HLG 75 % +-3 %.
Intermediate passes are deleted after the build (--keep keeps them). The build folder is always new.
"""
import json, math, re, shutil, subprocess, sys, time
from pathlib import Path
import timeline_lib as T

ROOT, REM, PUB = T.ROOT, T.REM, T.REM / "public"
W, H = 1080, 1920
TAGS = ["-color_primaries", "bt2020", "-color_trc", "arib-std-b67", "-colorspace", "bt2020nc", "-color_range", "tv"]
BUILTIN = {f"undereye-filler/{c}.mp4": {"original": f"C:/Users/naimj/clinic-library/tmp/IMG_{c}.MOV", "offset": 0.0} for c in ("6816", "6817", "6818", "6821")}

def originals():
    p = PUB / "originals.json"
    m = dict(BUILTIN)
    if p.exists():
        j = json.loads(p.read_text(encoding="utf-8"))
        m.update(j.get("files", j) if isinstance(j, dict) else {})
    for k, o in m.items():  # the copies in public/originals/ are the ones to read (clinic-library/tmp may be cleared); never written or deleted here
        loc = PUB / "originals" / Path(o.get("original") or "x").name
        if loc.exists(): m[k] = {**o, "original": str(loc).replace("\\", "/")}
    return m

# ------------------------------------------------------------------------------------------------ picture segments per reel
def segments(reel, tl, P, f0, f1):
    """the picture layer as the composition builds it: [{f0, f1, clip | None, t (working-file s), rate, k, ox, oy}], covering f0..f1"""
    segs = []
    if reel == "undereye":
        speed = P["speed"]
        pics = sorted((q for p in P["pieces"] for q in p["pics"]), key=lambda q: q["f0"])
        last, end = pics[-1], P["durationInFrames"]
        pics = pics + [{**last, "f0": end, "f1": end + 72, "src": (last.get("src") or 0) + (last["f1"] - last["f0"]) / 24 * speed, "rate": P.get("tailRate", speed)}]
        for q in pics:
            segs.append({"f0": q["f0"], "f1": q["f1"], "clip": None if q.get("still") else f"undereye-filler/{q['clip']}.mp4", "t": round((q.get("src") or 0) * 24) / 24,
                         "rate": q.get("rate", speed), "k": q.get("scale", 1), "ox": q.get("ox", 540), "oy": q.get("oy", 960)})
    elif reel == "oct14":  # Oct14ReelV6b's picture layer: props pieces (pictureRole / pictureFrom / punch), PIECE_FIX, stills, the freeze guard, the tail
        speed = P["speed"]
        FIX = {"intro-deflation/b/b": {"pictureRole": "pre1", "pictureFrom": 5.975}}  # = PIECE_FIX in src/oct14/ReelV6b.tsx
        stills = json.loads((PUB / "oct14/stills_v5.json").read_text(encoding="utf-8"))
        still_of = {v["piece"]: v for v in stills.values()}
        nfr = {}
        def live(role, frm):
            if role not in nfr:
                r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", str(PUB / f"oct14/{role}.mp4")], capture_output=True, text=True)
                nfr[role] = int(r.stdout.strip().strip(","))
            return max(0, int((nfr[role] - 1 - round(frm * 24)) // speed))
        pcs = [{**x, **FIX.get(x["id"], {})} for x in P["pieces"]]
        for x in pcs:
            st = still_of.get(x["id"])
            o = x.get("punchO") or [0.4, 0.42]
            base = {"clip": f"oct14/{x['pictureRole']}.mp4", "k": 1 if st else x.get("punch", 1) or 1, "ox": o[0] * W, "oy": o[1] * H}
            if st:  # a held frame of the footage (public/oct14/still_<k>.jpg is that frame as a JPEG): the same frame from the original
                segs.append({**base, "f0": x["at"], "f1": x["at"] + x["dur"], "t": st["src_frame"] / 24, "rate": 0}); continue
            n = max(1, min(x["dur"], live(x["pictureRole"], x["pictureFrom"])))
            segs.append({**base, "f0": x["at"], "f1": x["at"] + n, "t": round(x["pictureFrom"] * 24) / 24, "rate": speed})
            if n < x["dur"]: segs.append({"f0": x["at"] + n, "f1": x["at"] + x["dur"], "clip": None, "t": 0, "rate": 1, "k": 1, "ox": 540, "oy": 960})
        z, end = pcs[-1], P["durationInFrames"]
        n = max(1, min(P["tail"], live(z["pictureRole"], z["to"])))
        segs.append({"f0": end, "f1": end + n, "clip": f"oct14/{z['pictureRole']}.mp4", "t": round(z["to"] * 24) / 24, "rate": speed, "k": 1, "ox": 540, "oy": 960})
        if n < P["tail"]: segs.append({"f0": end + n, "f1": end + P["tail"], "clip": None, "t": 0, "rate": 1, "k": 1, "ox": 540, "oy": 960})
    elif reel == "jan08":  # Jan08ReelV4: talk.mp4 by piece; the b-roll beats (timeline footage beats with a clip) lie over it; the tail is the cream room
        for x in P["pieces"]:
            segs.append({"f0": x["at"], "f1": x["at"] + x["dur"], "clip": "jan08/talk.mp4", "t": round(x["from"] * 24) / 24, "rate": 1, "k": 1, "ox": 540, "oy": 960})
        segs.append({"f0": P["durationInFrames"], "f1": P["durationInFrames"] + P.get("tail", 0), "clip": None, "t": 0, "rate": 1, "k": 1, "ox": 540, "oy": 960})
        over = []
        for b in tl["beats"]:
            src = b.get("source") or {}
            if b["lane"] == "footage" and src.get("clip") and b["id"].startswith("broll"):
                s0, e0 = T.resolve(b["start"], tl, P), T.resolve(b["end"], tl, P)
                over.append({"f0": s0, "f1": e0, "clip": src["clip"].replace("public/", ""), "t": round((src.get("in") or 0) * 24) / 24, "rate": 1, "k": 1, "ox": 540, "oy": 960})
        cuts = sorted({x for q in segs + over for x in (q["f0"], q["f1"])})
        flat = []
        for a, z in zip(cuts, cuts[1:]):
            q = next((o for o in over if o["f0"] <= a < o["f1"]), None) or next((o for o in segs if o["f0"] <= a < o["f1"]), None)
            if q: flat.append({**q, "f0": a, "f1": z, "t": q["t"] + (a - q["f0"]) * q["rate"] / 24})
        segs = flat
    else:  # the timeline's footage beats (source.clip / in / rate, layout.punch + origin or scale + ox, oy); a later beat lies over an earlier one
        B = []
        for b in tl["beats"]:
            if b["lane"] != "footage": continue
            s, e = T.resolve(b["start"], tl, P), T.resolve(b["end"], tl, P)
            src, lay = b.get("source") or {}, b.get("layout") or {}
            k = float(lay.get("punch", lay.get("scale", 1)) or 1)
            o = lay.get("origin")
            ox, oy = (o[0] * W, o[1] * H) if o else (lay.get("ox", 0.4 * W if "punch" in lay else 540), lay.get("oy", 0.42 * H if "punch" in lay else 960))
            B.append({"f0": s, "f1": e, "clip": src.get("clip") if src.get("in") is not None else None, "t": round((src.get("in") or 0) * 24) / 24, "rate": float(src.get("rate", 1)), "k": k, "ox": ox, "oy": oy})
        cuts = sorted({f0, f1 + 1, *[x for b in B for x in (b["f0"], b["f1"]) if f0 < x <= f1]})
        for a, z in zip(cuts, cuts[1:]):
            top = [b for b in B if b["f0"] <= a < b["f1"]]
            if not top: segs.append({"f0": a, "f1": z, "clip": None, "t": 0, "rate": 1, "k": 1, "ox": 540, "oy": 960}); continue
            b = top[-1]
            segs.append({**b, "f0": a, "f1": z, "t": b["t"] + (a - b["f0"]) * b["rate"] / 24})
    out = []
    for q in segs:  # clip to the range
        a, z = max(q["f0"], f0), min(q["f1"], f1 + 1)
        if z > a: out.append({**q, "f0": a, "f1": z, "t": q["t"] + (a - q["f0"]) * q["rate"] / 24})
    pos = f0
    for q in out:
        if q["f0"] != pos: raise SystemExit(f"picture segments do not tile the range at frame {pos} (next starts {q['f0']})")
        pos = q["f1"]
    if pos != f1 + 1: raise SystemExit(f"picture segments end at {pos}, the range at {f1 + 1}")
    return out

def person_segments(reel, tl, P, f0, f1):
    """jan08 only: the footage his key shows, per frame: the same talk frame as the picture, or (a plate with layout.place) that frame scaled
    and set at the bottom of the frame (left = place.x, size = place.scale). None for the other reels: the key shows the picture itself."""
    if reel != "jan08": return None
    pc = {x["id"]: x for x in P["pieces"]}
    keys = []
    def add(pid, s0, e0, place=None):
        x = pc[pid]; e0 = min(e0, x["at"] + x["dur"])
        if e0 > s0: keys.append({"f0": s0, "f1": e0, "clip": "jan08/talk.mp4", "t": (round(x["from"] * 24) + (s0 - x["at"])) / 24, "rate": 1, "k": 1, "ox": 540, "oy": 960, "place": place})
    bid = {b["id"]: b for b in tl["beats"]}
    sec1 = T.resolve(bid["sec01"]["start"], tl, P)
    add("hook", 0, pc["hook"]["dur"]); add("belief", pc["belief"]["at"], sec1)
    for b in tl["beats"]:
        lay = b.get("layout") or {}
        if not isinstance(lay.get("keyed"), str): continue  # the hook's key (two pieces) is added above
        s0 = T.resolve(b["start"], tl, P)
        e0 = s0 + 12 + 60 + 8 + 1 if b["id"].startswith("sec") else T.resolve(b["end"], tl, P)   # SEC.T + SEC.HOLD + SEC.OUT + 1 (ReelV4.tsx)
        add(lay["keyed"], s0, e0, lay.get("place"))
    out, pos = [], f0
    blank = lambda a, z: {"f0": a, "f1": z, "clip": None, "t": 0, "rate": 1, "k": 1, "ox": 540, "oy": 960}
    for q in sorted(keys, key=lambda q: q["f0"]):
        a, z = max(q["f0"], pos), min(q["f1"], f1 + 1)
        if z <= a: continue
        if a > pos: out.append(blank(pos, a))
        out.append({**q, "f0": a, "f1": z, "t": q["t"] + (a - q["f0"]) / 24}); pos = z
    if pos <= f1: out.append(blank(pos, f1 + 1))
    return out

def geometry(q):
    """the punch-in as crop + scale (YUV, no colour change): composition pixel p shows source pixel o + (p - o) / k"""
    k = q["k"]
    pl = q.get("place")
    if pl:  # jan08 placed key: the frame at `scale`, its bottom on the frame's bottom, its left at x (ReelV4.tsx box())
        sc = pl.get("scale", 1); w, h = 2 * round(W * sc / 2), 2 * round(H * sc / 2); x = 2 * round(pl.get("x", 0) / 2)
        cx, px = max(0, -x), max(0, x)
        vis = min(w - cx, W - px)
        return f"scale={w}:{h}:flags=bicubic,crop={vis}:{h}:{cx}:0,pad={W}:{H}:{px}:{H - h}:black,"
    if abs(k - 1) < 1e-6: return ""
    cw, ch = 2 * round(W / k / 2), 2 * round(H / k / 2)
    x = min(max(0, round(q["ox"] * (1 - 1 / k))), W - cw); y = min(max(0, round(q["oy"] * (1 - 1 / k))), H - ch)
    return f"crop={cw}:{ch}:{x}:{y},scale={W}:{H}:flags=bicubic,"

WFPS = {}
FRAMING = {}
def framing(src, o):
    """The filters that bring a source to the 1080x1920 frame before the timeline's own crop: the map's crop, then cover-fit (landscape
    clips, e.g. undereye 6813/6814). Used by the cut and by the checks' reference decode, so both see the same picture."""
    if src not in FRAMING:
        size = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:stream_side_data=rotation", "-of", "json", src], capture_output=True, text=True).stdout
        st = json.loads(size)["streams"][0]
        rot = any(abs(int(float(d.get("rotation", 0)))) % 180 == 90 for d in st.get("side_data_list") or [])
        sw, sh = (st["height"], st["width"]) if rot else (st["width"], st["height"])
        fit = "" if (sw, sh) == (W, H) else f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=bicubic,crop={W}:{H},"
        crop = (o or {}).get("crop")
        FRAMING[src] = (f"crop={crop[2]}:{crop[3]}:{crop[0]}:{crop[1]}," if crop else "", fit)
    return FRAMING[src]

def cut_segment(q, omap, dst, run):
    n = q["f1"] - q["f0"]
    if not q["clip"]:  # a full-frame still or the cream room is on screen: the picture comes from the `under` / `over` pass
        run(["ffmpeg", "-n", "-v", "error", "-f", "lavfi", "-i", f"color=black:s={W}x{H}:r=24,format=yuv420p10le", "-frames:v", str(n), *TAGS, "-c:v", "ffv1", str(dst)])
        return {"source": "none (still / graphic ground)"}
    o = omap.get(q["clip"]) or {}
    orig = o.get("original")
    if orig and Path(orig).exists(): src, how = orig, "original"
    else: src, how = str(PUB / q["clip"]), "FALLBACK: 8-bit working file (original not on disk)"
    pre, fit = framing(src, o)
    # The frame on screen is the one the delivered cut shows, so tracked marks and mattes stay on their picture: Remotion shows working-file
    # frame floor((t0 + n * rate / 24) * wfps); that frame is a pick from the original at its time + offset. So: seek to the first working
    # frame's instant, take the original on the working file's frame grid (nearest frame), then count frames as Remotion does.
    # Frames are picked, never blended; ffmpeg applies the rotation.
    wf = WFPS.get(q["clip"])
    if wf is None:
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", str(PUB / q["clip"])], capture_output=True, text=True).stdout.strip().strip(",")
        a_, b_ = r.split("/"); wf = WFPS[q["clip"]] = float(a_) / float(b_)
    off = (float(o.get("offset") or 0) if how == "original" else 0.0)
    idx0 = math.floor(q["t"] * wf + 1e-6); frac = q["t"] * wf - idx0
    t = max(0.0, idx0 / wf + off)
    tail = f"{pre}{fit}{geometry(q)}format=yuv420p10le"
    if q["rate"] == 0:  # a held frame
        vf = f"select='eq(n,0)',loop=loop=-1:size=1:start=0,setpts=N/24/TB,{tail}"
        run(["ffmpeg", "-n", "-v", "error", "-ss", f"{max(0.0, t - 0.004):.5f}", "-i", src, "-an", "-vf", vf, "-frames:v", str(n), "-r", "24", *TAGS, "-c:v", "ffv1", "-level", "3", str(dst)])
    else:
        step = q["rate"] * wf / 24  # working frames per composition frame
        # measured against Remotion's rule (frame n shows working frame floor(frac + n * step)) on IMG_3640: `select` is exact for
        # step >= 1; the fps filter is one slot late unless shifted by one (and then exact for frac > 0)
        if step >= 1: pick = f"select='eq(floor({frac:.6f}+ceil((n-{frac:.6f})/{step:.6f}-0.000001)*{step:.6f}+0.000001)\,n)',setpts=N/24/TB"
        else: pick = f"setpts=((N-{max(frac, 0.001):.6f})/{step:.6f}+1)/24/TB,fps=24:round=up"
        # a working file can begin before its original does (offset < 0, e.g. undereye 6815 from 0 s): its first frames are then the
        # original's first frame held. Seeking can't go below 0, so shift the original later and let the grid start at 0 (first frame held)
        # (measured on 6815: working frames 0 1 2 3 4 5 = original frames 0 1 2 3 5 7; three held frames in front give 0 0 1 3 5 7)
        lead = -(idx0 / wf + off)
        grid = (f"tpad=start={round(lead * float(o.get('fps') or 60))}:start_mode=clone," if lead > 0.004 else "") + f"fps={wf:.6f}:round=near"
        vf = f"{grid},{pick},{tail}"
        run(["ffmpeg", "-n", "-v", "error", "-ss", f"{max(0.0, t - 0.004):.5f}", "-t", f"{n * q['rate'] / 24 + 0.5:.5f}", "-i", src, "-an", "-vf", vf, "-frames:v", str(n), *TAGS, "-c:v", "ffv1", "-level", "3", str(dst)])
    return {"source": how, "file": src, "at_s": round(t, 4), "vf": vf}

# ------------------------------------------------------------------------------------------------ graphics: sRGB -> HLG, white at 75 %
def hlg_oetf(e):
    a, b, c = 0.17883277, 0.28466892, 0.55991073
    return math.sqrt(3 * e) if e <= 1 / 12 else a * math.log(12 * e - b) + c

def write_lut(path, n=65, white_nits=203.0, peak=1000.0, gamma=1.2):
    """sRGB (the browser's pixels) -> HLG R'G'B' in bt2020. Display-referred (BT.2408): the graphic's light on an SDR screen, scaled so
    its white is `white_nits` on a `peak`-nit HLG display, through the inverse HLG OOTF, then the HLG OETF. White -> 0.75 signal."""
    M = ((0.627404, 0.329283, 0.043313), (0.069097, 0.919540, 0.011362), (0.016391, 0.088013, 0.895595))  # bt709 -> bt2020 (linear light)
    eotf = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    rows = [f"LUT_3D_SIZE {n}"]
    for bi in range(n):
        for gi in range(n):
            for ri in range(n):
                lin = [eotf(x / (n - 1)) for x in (ri, gi, bi)]
                d = [max(0.0, sum(M[i][j] * lin[j] for j in range(3))) * white_nits / peak for i in range(3)]  # display light, 1 = peak
                yd = 0.2627 * d[0] + 0.6780 * d[1] + 0.0593 * d[2]
                s = [x * (yd ** ((1 - gamma) / gamma)) if yd > 0 else 0.0 for x in d]                          # inverse OOTF -> scene light
                rows.append(" ".join(f"{min(1.0, hlg_oetf(x)):.6f}" for x in s))
    Path(path).write_text("\n".join(rows) + "\n")

def seq_input(d):
    """an image-sequence folder as ffmpeg input args (start number and pattern read off the files)"""
    fs = sorted(Path(d).glob("*.png"), key=lambda p: int(re.findall(r"(\d+)", p.stem)[-1]))
    if not fs: return None
    m = re.match(r"(.*?)(\d+)$", fs[0].stem)
    pad = len(m.group(2)) if m.group(2).startswith("0") and len(m.group(2)) > 1 else 0
    pat = f"{m.group(1)}%0{pad}d.png" if pad else f"{m.group(1)}%d.png"
    return ["-framerate", "24", "-start_number", str(int(m.group(2))), "-i", f"{Path(d).name}/{pat}"], fs

# ------------------------------------------------------------------------------------------------ the build
PASSES = {"undereye": "under,matte,frost,over,media", "oct14": "frost,over,media", "jan08": "under,matte,frost,over,media"}
MATTE_FROM = {"jan08": "luma"}  # jan08's matte pass is his grey matte on black (white = him); under-eye's is the key's alpha

def cut_track(segs, omap, out, name, run, man):
    (out / name).mkdir()
    lst = []
    for i, q in enumerate(segs):
        dst = out / name / f"{i:03d}.mkv"
        info = cut_segment(q, omap, dst, run)
        man.append({"frames": [q["f0"], q["f1"] - 1], "clip": q["clip"], "rate": q["rate"], "punch": q["k"], **({"place": q["place"]} if q.get("place") else {}), **info})
        lst.append(f"file '{name}/{dst.name}'")
    (out / f"{name}.txt").write_text("\n".join(lst) + "\n")
    run(["ffmpeg", "-n", "-v", "error", "-f", "concat", "-safe", "0", "-i", f"{name}.txt", "-c", "copy", f"{name}.mkv"], cwd=out)

def build(a, reel, R, tl, P, total, frames, out, run, say, render_cmd, checks_frozen):
    import numpy as np
    f0, f1 = frames or (0, total - 1)
    n = f1 - f0 + 1
    man = {"hdr": True, "passes": {}, "footage": []}
    want = [x for x in (a.passes or PASSES[reel]).split(",") if x]
    # 1 footage from the originals
    omap = originals()
    segs = segments(reel, tl, P, f0, f1)
    # --reuse <build folder>: composite again from that build's kept intermediates (cut footage + passes), into this new folder
    work = Path(a.reuse).resolve() if getattr(a, "reuse", None) else out
    psegs = person_segments(reel, tl, P, f0, f1)
    # --recut (with --reuse): cut the footage again into this folder, reuse only the rendered passes
    tw = out if getattr(a, "recut", False) else work
    if tw != out:
        old = json.loads((work / "manifest.json").read_text(encoding="utf-8")) if (work / "manifest.json").exists() else {}
        man["footage"] = old.get("footage", []); man["reused_intermediates_of"] = str(work)
        if psegs: man["person"] = old.get("person", [])
    else:
        cut_track(segs, omap, out, "footage", run, man["footage"])
        if psegs:
            man["person"] = []
            cut_track(psegs, omap, out, "person", run, man["person"])
    def count(f):
        return int(subprocess.run(["ffprobe", "-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", str(f)], capture_output=True, text=True).stdout.strip().strip(",") or 0)
    # The joined pieces carry their sources' timing (under-eye pieces are tagged 30 fps and the join drifted about 8 ms per piece against
    # the 24 fps passes). So each track is written once more, losslessly, as a plain 24 fps stream numbered by frame count. Retiming
    # inside the big composite graph instead (setpts on every input) made ffmpeg drop frames, differently on each run.
    for f in ["footage", "person"] if psegs else ["footage"]:
        if count(tw / f"{f}.mkv") != n: raise SystemExit(f"{f}.mkv: {count(tw / f'{f}.mkv')} frames, expected {n}")
        # .nut keeps the exact 1/24 timebase (an .mkv rounds to 1 ms: every third frame then sits 0.33 ms BEFORE its graphics frame and
        # the overlay showed the previous graphics frame there: under-eye f1850's caption one word late, fourth build)
        if not (tw / f"{f}24.nut").exists():
            run(["ffmpeg", "-n", "-v", "error", "-i", f"{f}.mkv", "-vf", "settb=1/24,setpts=N", "-r", "24", "-pix_fmt", "yuv420p10le", *TAGS, "-c:v", "ffv1", "-level", "3", f"{f}24.nut"], cwd=tw)
        if count(tw / f"{f}24.nut") != n: raise SystemExit(f"{f}24.nut: {count(tw / f'{f}24.nut')} frames, expected {n}")
    say("  footage:", ", ".join(sorted({m["source"].split(":")[0] for m in man["footage"]})))
    # 2 graphics passes (no footage, transparent)
    seqs = {}
    for name in want:
        pf = out / f"props_{name}.json"
        pf.write_text(json.dumps({**(tl["comp"].get("props") or {}), "timeline": tl, "pass": name}), encoding="utf-8")
        d = work / f"pass_{name}"
        if work == out or not d.exists() or len(list(d.glob("*.png"))) != n: run(render_cmd(tl["comp"]["entry"], tl["comp"]["id"], d, pf, (f0, f1), a.concurrency), cwd=REM)
        si = seq_input(d)
        if not si or len(si[1]) != n: raise SystemExit(f"pass {name}: {len(si[1]) if si else 0} frames, expected {n}")
        # Chrome writes a fully opaque frame as RGB and any other as RGBA, so a pass changes pixel format at cuts. Fed straight into the
        # composite, each change made ffmpeg rebuild the filter graph and lose the frames waiting in it (Jan08: 29 of 2153, at the cuts
        # f336-339, f558-559, f1470-1472, f1549-1551 ...; the encoder then repeated frames to fill, so the picture ran late there).
        # So each pass is first written as one constant-format lossless RGBA track, counted, and only that goes into the composite.
        if not (work / f"pass_{name}.nut").exists():
            run(["ffmpeg", "-n", "-v", "error", *si[0], "-vf", "format=rgba", "-r", "24", "-c:v", "ffv1", "-level", "3", f"pass_{name}.nut"], cwd=work)
        if count(work / f"pass_{name}.nut") != n: raise SystemExit(f"pass_{name}.nut: {count(work / f'pass_{name}.nut')} frames, expected {n}")
        seqs[name] = si
        man["passes"][name] = {"frames": len(si[1]), "bytes": sum(p.stat().st_size for p in si[1])}
    write_lut(work / "gfx.cube")
    # 3 layers + 4 encode
    idx = {}
    inputs = ["-i", str(tw / "footage24.nut")]
    k = 1
    if psegs: inputs += ["-i", str(tw / "person24.nut")]; k = 2
    for name in want:
        inputs += ["-i", f"pass_{name}.nut"]; idx[name] = k; k += 1
    # colour and alpha go separate ways and meet again (alphamerge): converting an RGBA frame in one piece left a little alpha where
    # there was none, and the footage under it came out 3-6 codes darker (measured on the first proof build)
    SRGB = "format=gbrp10le,lut3d=file=gfx.cube:interp=tetrahedral,scale=out_color_matrix=bt2020nc:out_range=tv,format=yuv420p10le"  # sRGB -> HLG bt2020
    HLG = "format=gbrp10le,scale=out_color_matrix=bt2020nc:out_range=tv,format=yuv420p10le"                                           # already HLG-coded
    def layer(i, how, out):
        return f"[{i}:v]format=rgba,split[{out}c][{out}a];[{out}c]{how}[{out}cc];[{out}a]alphaextract,format=gray10le[{out}aa];[{out}cc][{out}aa]alphamerge[{out}]"
    # 4:2:0 10-bit all the way: a footage pixel no graphic touches is never resampled, in luma or chroma
    # every input is laid on the 24 fps grid by FRAME COUNT (settb=1/24,setpts=N: exact, where setpts=N/24/TB in the mkv's 1 ms
    # timebase rounded and the encoder dropped 38 frames of 2224), never by its own timestamps: the cut pieces carry their
    # source's frame-rate tag (30 fps under-eye) and, joined, drifted about 8 ms per piece against the passes (first full under-eye build)
    # .nut carries no colour tags: untagged, ffmpeg converted the footage to the output's bt2020nc as if from another matrix (fifth
    # under-eye build: every footage frame 2-4 codes off, U +1.6 V -1.9). So the tags are stated here; the pixels are untouched.
    TAG = "setparams=colorspace=bt2020nc:color_primaries=bt2020:color_trc=arib-std-b67:range=tv,format=yuv420p10le"
    g, cur = [f"[0:v]{TAG}[base];[1:v]{TAG}[pf]" if psegs else f"[0:v]{TAG},split[base][pf]"], "base"
    mat = "format=gbrp,extractplanes=g,format=gray10le" if MATTE_FROM.get(reel) == "luma" else "format=rgba,alphaextract,format=gray10le"
    if "under" in idx:
        g.append(layer(idx["under"], SRGB, "u") + f";[{cur}][u]overlay=format=yuv420p10[b1]"); cur = "b1"
    if "matte" in idx:  # the people again: the ORIGINAL footage through the RVM matte
        g.append(f"[{idx['matte']}:v]{mat}[m];[pf][m]alphamerge[person];[{cur}][person]overlay=format=yuv420p10[b2]"); cur = "b2"
    else: g.append("[pf]nullsink")
    if "frost" in idx:  # the cards' frosted glass (CSS backdrop blur 26 px): the picture blurred exactly where the `frost` pass is white.
        # (The first builds blurred wherever `over` was mostly opaque: a full-frame room or photo fading out blurred the footage under it.)
        g.append(f"[{idx['frost']}:v]format=rgba,alphaextract,format=gray10le[fm];"
                 f"[{cur}]split[c1][c2];[c2]gblur=sigma=26[bl];[bl][fm]alphamerge[frost];[c1][frost]overlay=format=yuv420p10[b3]"); cur = "b3"
    if "over" in idx:
        g.append(layer(idx["over"], SRGB, "o") + f";[{cur}][o]overlay=format=yuv420p10[b4]"); cur = "b4"
    if "media" in idx:
        g.append(layer(idx["media"], HLG, "md") + f";[{cur}][md]overlay=format=yuv420p10[b5]"); cur = "b5"
    g.append(f"[{cur}]format=yuv420p10le[v]")
    final = out / f"{reel}_{tl['version']}_hdr.mp4"
    audio = []
    amap = []
    if a.audio:
        audio = (["-ss", f"{f0 / 24:.5f}", "-t", f"{n / 24:.5f}"] if frames else []) + ["-i", str(Path(a.audio).resolve())]
        amap = ["-map", f"{k}:a:0", "-c:a", "copy"]
    x265 = "colorprim=bt2020:transfer=arib-std-b67:colormatrix=bt2020nc:range=limited:log-level=error"
    run(["ffmpeg", "-n", "-v", "error", *inputs, *audio, "-filter_complex", ";".join(g), "-map", "[v]", *amap, "-frames:v", str(n), "-fps_mode", "passthrough",
         "-c:v", "libx265", "-profile:v", "main10", "-preset", "medium", "-crf", str(a.crf), "-pix_fmt", "yuv420p10le", "-x265-params", x265, *TAGS, "-tag:v", "hvc1", "-movflags", "+faststart", str(final)], cwd=work)
    if count(final) != n: say(f"  WARNING: the master has {count(final)} frames, expected {n}")
    man["encode"] = {"codec": "libx265 main10", "crf": a.crf, "audio": f"copied from {a.audio}" if a.audio else "none (pass --audio <existing master>)"}

    # 5 checks
    C = {}
    def tags(p):
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,profile,pix_fmt,color_range,color_space,color_transfer,color_primaries,width,height,r_frame_rate,nb_frames", "-of", "json", str(p)], capture_output=True, text=True)
        return json.loads(r.stdout)["streams"][0]
    used = sorted({m["file"] for m in man["footage"] if m.get("source") == "original"})
    to = tags(final)
    keys = ["pix_fmt", "color_range", "color_space", "color_transfer", "color_primaries"]
    ref = tags(used[0]) if used else {"pix_fmt": "yuv420p10le", "color_range": "tv", "color_space": "bt2020nc", "color_transfer": "arib-std-b67", "color_primaries": "bt2020"}
    C["tags"] = {"pass": all(to.get(q) == ref.get(q) for q in keys) and to["codec_name"] == "hevc", "output": {q: to.get(q) for q in ["codec_name", "profile", *keys, "width", "height", "r_frame_rate", "nb_frames"]},
                 "original": {q: ref.get(q) for q in ["codec_name", "profile", *keys]}, "compared_with": used[0] if used else "the expected HLG tags (no original used)"}
    def yuv(src, pre, vf="", size=(W, H)):
        r = subprocess.run(["ffmpeg", "-v", "error", *pre, "-i", str(src), "-vf", (vf + "," if vf else "") + "format=yuv420p10le", "-frames:v", "1", "-f", "rawvideo", "-"], capture_output=True).stdout
        w, h = size
        if len(r) != w * h * 3: return None
        d = np.frombuffer(r, "<u2")
        return d[: w * h].reshape(h, w).astype(np.int32), d[w * h: w * h * 5 // 4].reshape(h // 2, w // 2).astype(np.int32), d[w * h * 5 // 4:].reshape(h // 2, w // 2).astype(np.int32)
    def png(name, j):
        if name not in seqs: return None
        from PIL import Image
        return np.asarray(Image.open(seqs[name][1][j]).convert("RGBA"))
    def grow(mask, r):
        import cv2
        return cv2.dilate(mask.astype(np.uint8), np.ones((2 * r + 1, 2 * r + 1), np.uint8)) > 0
    # footage exactness: the master vs the ORIGINAL decoded at the same source time, where no graphic is
    rows = []
    ok_src = lambda q: q["clip"] and q["rate"] and (omap.get(q["clip"]) or {}).get("original") and Path(omap[q["clip"]]["original"]).exists()
    pieces = [q for q in segs if ok_src(q) and q["f1"] - q["f0"] >= 6]
    pieces = sorted(pieces, key=lambda q: -(q["f1"] - q["f0"]))                       # long pieces first: a drift shows at their far end
    by_clip = {}
    for q in pieces: by_clip.setdefault(q["clip"], q)
    pick = list(by_clip.values()) + [q for q in pieces if q not in by_clip.values()]  # one piece of every clip first
    skipped = {"covered_by_graphics": 0, "decode": 0}
    tried = 0
    for q in pick[:24]:
      for f in (q["f1"] - 3, (q["f0"] + q["f1"]) // 2, q["f0"] + 2):                  # the far end first; the next spot if graphics cover it
          tried += 1
          j = f - f0
          got = yuv(final, ["-ss", f"{(j - 0.25) / 24:.5f}"])
          if got is None: skipped['decode'] += 1; continue
          gfx = np.zeros((H, W), bool)
          for name in ("under", "over", "media"):
              im = png(name, j)
              if im is not None: gfx |= im[..., 3] > 0
          free = ~grow(gfx, 40)  # 40 px clear of any graphic pixel (and of the frosted-glass blur)
          share = float(free.mean())
          if share < 0.05: skipped['covered_by_graphics'] += 1; continue
          o = omap[q["clip"]]
          wf = WFPS.get(q["clip"], 24.0)
          t = max(0.0, math.floor((q["t"] + (f - q["f0"]) * q["rate"] / 24) * wf + 1e-6) / wf + float(o.get("offset") or 0))
          best = None
          for dt in (0.0, -1 / 60, 1 / 60, -2 / 60, 2 / 60, -3 / 60):  # the picked frame is the last one at or before t: try it and its neighbours
              ref_ = yuv(o["original"], ["-ss", f"{max(0, t + dt - 0.004):.5f}"], ("".join(framing(o["original"], o)) + geometry(q)).rstrip(","))
              if ref_ is None: continue
              dy = float(np.abs(got[0] - ref_[0])[free].mean())
              if best is None or dy < best["mean_abs_diff_Y"]:
                  fc = free[::2, ::2]
                  best = {"frame": f, "clip": q["clip"], "original_s": round(t + dt, 4), "graphics_free_share": round(share, 3), "mean_abs_diff_Y": round(dy, 3),
                          "mean_abs_diff_U": round(float(np.abs(got[1] - ref_[1])[fc].mean()), 3), "mean_abs_diff_V": round(float(np.abs(got[2] - ref_[2])[fc].mean()), 3),
                          "mean_shift_YUV": [round(float((got[i] - ref_[i])[free if i == 0 else fc].mean()), 3) for i in range(3)]}
          if best: rows.append(best); break
    if rows:
        worst = max(r["mean_abs_diff_Y"] for r in rows)
        C["footage_vs_original"] = {"pass": worst <= 2.0, "frames_measured": len(rows), "pieces_with_footage": len(pieces), "clips_measured": len({r["clip"] for r in rows}), "clips_in_reel": len(by_clip), "skipped": skipped, "limit_10bit_codes": 2.0, "worst_mean_abs_diff_Y": worst, "worst_chroma": max(max(r["mean_abs_diff_U"], r["mean_abs_diff_V"]) for r in rows), "frames": rows}
    else: C["footage_vs_original"] = {"pass": None, "note": "no frame in this range has footage from an original with a graphics-free region"}
    # graphics white: opaque pure-white graphic pixels must sit at HLG 75 % (Y' = 64 + 0.75 * 876 = 721 in 10-bit tv range)
    vals = []
    if "over" in seqs:
        import cv2
        for j in range(0, n, max(1, n // 12)):
            im = png("over", j)
            white = (im[..., :3].min(2) >= 254) & (im[..., 3] == 255)
            core = cv2.erode(white.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
            if core.sum() < 200: continue
            got = yuv(final, ["-ss", f"{(j - 0.25) / 24:.5f}"])
            if got is not None: vals.append((f0 + j, int(core.sum()), float(got[0][core].mean())))
    if vals:
        sig = [(v - 64) / 876 for _, _, v in vals]
        C["graphics_white"] = {"pass": all(abs(s - 0.75) <= 0.03 for s in sig), "target_signal": 0.75, "tolerance": 0.03, "measured_signal_mean": round(sum(sig) / len(sig), 4), "min": round(min(sig), 4), "max": round(max(sig), 4),
                               "mean_code_10bit": round(sum(v for _, _, v in vals) / len(vals), 1), "frames_measured": len(vals), "white_pixels": sum(c for _, c, _ in vals),
                               "frames": [{"frame": f, "white_px": c, "signal": round((v - 64) / 876, 4)} for f, c, v in vals]}
    else: C["graphics_white"] = {"pass": None, "note": "no opaque pure-white graphic area (>= 200 px after a 3 px erosion) in this range"}
    C["frozen_picture"] = checks_frozen(final)
    man["checks"] = C
    man["output"] = str(final.relative_to(ROOT)).replace("\\", "/")
    # clean up this build's own intermediates
    if not a.keep:
        freed = 0
        for d in [work / "footage", work / "person", tw / "footage", tw / "person", *[work / f"pass_{x}" for x in want]]:
            if d.exists(): freed += sum(p.stat().st_size for p in d.rglob("*") if p.is_file()); shutil.rmtree(d)
        for p in (work / "footage.mkv", work / "footage.txt", work / "person.mkv", work / "person.txt", work / "footage24.mkv", work / "person24.mkv", work / "footage24.nut", work / "person24.nut",
                  *[tw / x for x in ("footage.mkv", "footage.txt", "person.mkv", "person.txt", "footage24.nut", "person24.nut")], *[work / f"pass_{x}.nut" for x in want]):
            if p.exists(): freed += p.stat().st_size; p.unlink()
        man["intermediates_removed_bytes"] = freed
    return man, final


def verify(reel, master, limit=24):
    """A finished full HDR master against the originals, without its graphics passes: for the far end of every footage piece (one
    piece of every clip first), the median |Y difference| over the whole frame (graphics cover the minority of it; a piece under a
    full-frame graphic reads high and is listed as covered) and the share of pixels within 4 codes.
      python brand/scripts/reel_hdr.py verify <reel> <master.mp4>"""
    import numpy as np
    tl = T.load(T.path_for(reel, None)); P = T.transcript(tl)
    total = P["durationInFrames"] + {"jan08": P.get("tail", 0), "oct14": P.get("tail", 0), "undereye": 72}[reel]
    omap = originals(); segs = segments(reel, tl, P, 0, total - 1)
    def y(src, pre, vf=""):
        r = subprocess.run(["ffmpeg", "-v", "error", *pre, "-i", str(src), "-vf", (vf + "," if vf else "") + "format=yuv420p10le", "-frames:v", "1", "-f", "rawvideo", "-"], capture_output=True).stdout
        return np.frombuffer(r[: W * H * 2], "<u2").reshape(H, W).astype(np.int32) if len(r) >= W * H * 2 else None
    pieces = sorted((q for q in segs if q["clip"] and q["rate"] and (omap.get(q["clip"]) or {}).get("original") and q["f1"] - q["f0"] >= 6), key=lambda q: -(q["f1"] - q["f0"]))
    first = {}
    for q in pieces: first.setdefault(q["clip"], q)
    rows = []
    for q in (list(first.values()) + [q for q in pieces if q not in first.values()])[:limit]:
        keep = None
        for f in (q["f1"] - 3, (q["f0"] + q["f1"]) // 2, q["f0"] + 2):  # the far end first; elsewhere in the piece if a graphic covers it
            got = y(master, ["-ss", f"{(f - 0.25) / 24:.5f}"])
            if got is None: continue
            o = omap[q["clip"]]
            if q["clip"] not in WFPS:
                r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", str(PUB / q["clip"])], capture_output=True, text=True).stdout.strip().strip(",")
                a_, b_ = r.split("/"); WFPS[q["clip"]] = float(a_) / float(b_)
            wf = WFPS[q["clip"]]
            t = max(0.0, math.floor((q["t"] + (f - q["f0"]) * q["rate"] / 24) * wf + 1e-6) / wf + float(o.get("offset") or 0))
            best = None
            for dt in (0.0, -1 / 60, 1 / 60, -2 / 60, 2 / 60, -3 / 60):
                ref = y(o["original"], ["-ss", f"{max(0, t + dt - 0.004):.5f}"], ("".join(framing(o["original"], o)) + geometry(q)).rstrip(","))
                if ref is None: continue
                d = np.abs(got - ref)
                m = float(np.median(d))
                if best is None or m < best["median_abs_diff_Y"]:
                    best = {"frame": f, "piece": [q["f0"], q["f1"] - 1], "clip": q["clip"], "median_abs_diff_Y": m, "within_4_codes": round(float((d <= 4).mean()), 3)}
            if best and (keep is None or best["within_4_codes"] > keep["within_4_codes"]): keep = best
            if keep and keep["within_4_codes"] >= 0.5: break
        best = keep
        if best: rows.append(best)
    ok = [r for r in rows if r["within_4_codes"] >= 0.5]
    return {"master": str(master), "pieces_measured": len(rows), "clips_measured": sorted({r["clip"] for r in ok}), "clips_in_reel": sorted(first),
            "worst_median_abs_diff_Y": max((r["median_abs_diff_Y"] for r in ok), default=None), "covered_or_mismatched": [r for r in rows if r["within_4_codes"] < 0.5], "rows": rows}

if __name__ == "__main__" and len(sys.argv) > 3 and sys.argv[1] == "verify":
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(verify(sys.argv[2], sys.argv[3]), indent=1))


def against_delivered(master, delivered, step=6):
    """The HDR master's PICTURE against the delivered SDR master's, frame for frame (every `step`-th): same layers, same frames, same
    sharpness. Grey 270x480, zero-mean correlation r and the ratio of fine detail (Laplacian energy). A missing or extra layer, a wrong
    frame or a blurred picture shows as low r or a low detail ratio; levels are NOT compared (graphics white sits lower in HLG).
      python brand/scripts/reel_hdr.py delivered <master.mp4> <delivered.mp4>"""
    import numpy as np, cv2
    def grey(p):
        r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-an", "-vf", f"select='not(mod(n\,{step}))',scale=270:480:flags=area,format=gray", "-fps_mode", "passthrough", "-f", "rawvideo", "-"], capture_output=True)
        if not r.stdout: raise SystemExit(f"could not decode {p}: {r.stderr.decode(errors='replace')[-300:]}")
        return np.frombuffer(r.stdout[: len(r.stdout) // (480 * 270) * 480 * 270], np.uint8).reshape(-1, 480, 270).astype(np.float32)
    A, B = grey(master), grey(delivered)
    n = min(len(A), len(B))
    rows = []
    for i in range(n):
        a, b = A[i] - A[i].mean(), B[i] - B[i].mean()
        r = float((a * b).sum() / (np.sqrt((a * a).sum() * (b * b).sum()) + 1e-6))
        da, db = float(cv2.Laplacian(A[i], cv2.CV_32F).var()), float(cv2.Laplacian(B[i], cv2.CV_32F).var())
        rows.append((i * step, round(r, 4), round(da / (db + 1e-6), 3)))
    def spans(bad):
        out = []
        for f in bad:
            if out and f - out[-1][1] <= step: out[-1][1] = f
            else: out.append([f, f])
        return out
    low_r = [f for f, r, d in rows if r < 0.90]; soft = [f for f, r, d in rows if d < 0.3]  # graphics sit at 75 % white, so a frame full of cards reads about 0.56; a blurred picture reads far lower
    rs = sorted(r for _, r, _ in rows); ds = sorted(d for _, _, d in rows)
    return {"pass": not low_r and not soft, "frames_compared": n, "frames_in_master": len(A), "frames_in_delivered": len(B), "step": step,
            "correlation": {"min": rs[0], "p01": rs[len(rs) // 100], "median": rs[len(rs) // 2]}, "detail_ratio": {"min": ds[0], "p01": ds[len(ds) // 100], "median": ds[len(ds) // 2]},
            "low_correlation_spans": spans(low_r), "soft_spans": spans(soft), "worst": sorted(rows, key=lambda x: x[1])[:6]}

if __name__ == "__main__" and len(sys.argv) > 3 and sys.argv[1] == "delivered":
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(against_delivered(sys.argv[2], sys.argv[3]), indent=1))
