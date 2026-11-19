"""The delivered reels as timelines: brand/remotion/timelines/<reel>.<version>.json, transcribed from the delivered compositions
(Jan08ReelV3.tsx, Oct14ReelV5.tsx with big = v5c, UndereyeReelV4.tsx) and their props. Every time is written the way the composition
computes it (a cue + an offset) and stored as a word anchor (index + text) when the cue is a word's first frame, a piece anchor when it
is a cut, so it survives a retime. Also seeds the working timelines/<reel>.json when a reel has none yet (it never overwrites one).
  python -I brand/scripts/timeline_extract.py [jan08 oct14 undereye]
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import timeline_lib as T
PUB = T.REM / "public"

class X:
    def __init__(s, reel, version, comp, transcript, master, comp_props=None):
        s.P = json.loads((T.REM / transcript).read_text(encoding="utf-8"))
        s.tl = {"schema": 1, "reel": reel, "version": version, "comp": {"entry": f"src/{reel}/index.ts", "id": comp, "props": comp_props or {}}, "fps": 24,
                "transcript": transcript, "master": master, "beats": []}
        s.wf = {}
        for i, w in enumerate(s.P["words"]): s.wf.setdefault(w["f"], i)
    def c(s, name, off=0):
        """the anchor for cue `name` + off frames"""
        P = s.P
        if name == "end": return s._o({"cue": "end"}, off)
        f = P["cues"][name]
        if name.startswith(("start:", "end:")):
            edge, pid = name.split(":", 1)
            a = {"piece": pid, "edge": edge}
            try:
                if T.resolve(a, s.tl, P) == f: return s._o(a, off)
            except KeyError: pass
        if f in s.wf: return s._o({"word": s.wf[f], "text": P["words"][s.wf[f]]["w"]}, off)
        return s._o({"cue": name}, off)
    def f(s, n): return {"frame": n}
    def b(s, bid, edge="start", off=0): return s._o({"beat": bid, "edge": edge}, off)
    def pc(s, pid, edge="start", off=0, exact=False): return s._o({"piece": pid, "edge": edge, **({"exact": True} if exact else {})}, off)
    @staticmethod
    def _o(a, off):
        if off: a["offset"] = off
        return a
    def add(s, bid, lane, device, start, end, **kw):
        s.tl["beats"].append({"id": bid, "lane": lane, "device": device, "start": start, "end": end, **{k: v for k, v in kw.items() if v is not None}})
    def lab(s, text, at, x=None, y=None, anchor=None, out=None, size=None):
        return {k: v for k, v in dict(text=text, at=at, out=out, x=x, y=y, anchor=anchor, size=size).items() if v is not None}
    def write(s):
        errs = [e for e in T.validate(s.tl, s.P) if ": note:" not in e]
        assert not errs, errs
        T.TL.mkdir(exist_ok=True)
        out = T.TL / f"{s.tl['reel']}.{s.tl['version']}.json"
        txt = json.dumps(s.tl, indent=1, ensure_ascii=False) + "\n"
        out.write_text(txt, encoding="utf-8", newline="\n")
        work = T.TL / f"{s.tl['reel']}.json"
        seeded = ""
        if not work.exists(): work.write_text(txt, encoding="utf-8", newline="\n"); seeded = f" (+ seeded {work.name})"
        print(f"{out.name}: {len(s.tl['beats'])} beats{seeded}")

SEC_LEN = 80  # section title: 12 type-in + 60 lit + 8 out (the same in all three reels)
CARD = [{"name": "exo_card", "gain": 0.22}]
CHAP = [{"name": "exo_chapter", "gain": 0.3}]

def jan08():
    x = X("jan08", "v3", "Jan08ReelV3", "public/jan08/props.json", {"lufs": -14, "tp": -1.5, "limiter": False})
    c, P = x.c, x.P
    for p in P["pieces"]:
        x.add(f"talk:{p['id']}", "footage", "Talk", x.pc(p["id"]), x.pc(p["id"], "end"), source={"clip": "jan08/talk.mp4", "in": p["from"], "out": p["to"], "rate": 1}, notes=p.get("why"))
    x.add("captions", "captions", "Captions", x.f(0), c("end"), notes="word-onset captions from the transcript; ink (dark) over the cream-room beats J3, J4, plan, J5, result")
    x.add("hook", "titles", "HookRoom", x.f(2), x.pc("hook", "end", -4), text={"eyebrow": "Dr. Ariel Ostad on", "title": "Filler fatigue"}, events={"strike": c("fatigue0")},
          layout={"x": 88, "y": 318, "px": 132, "keyed": "hook"}, notes="on the wall behind him (his alpha-only key over the type); 'fatigue' struck on the word")
    secs = [("sec01", x.f(78), "01", "The belief", "belief", 118), ("sec02", c("start:aging"), "02", "What aging does", "aging", 108),
            ("sec03", c("start:method"), "03", "On the cheekbones", "method", 108), ("sec04", c("great", 9), "04", "Migration", "cheekbones", 124)]
    for bid, st, num, title, key, px in secs:
        x.add(bid, "titles", "RoomTitle", st, x.b(bid, "start", SEC_LEN), text={"num": num, "title": title}, layout={"y": 352, "px": px, "keyed": key}, sfx=CHAP,
              notes="type on the wall, his key over it; fully lit 60 f")
    keyed = {"x": -250, "scale": 0.8}
    x.add("J1", "plates", "FloraPlate", x.b("sec01", "end"), c("start:cause"), text={"eyebrow": "The belief", "title": "Filler stretches skin?", "labels": [
            x.lab("Stretch?", c("stretch"), 0.06, 0.2), x.lab("Overfilled?", c("overfilled"), 0.46, 0.67, "middle"), x.lab("Migrates?", c("migrate0"), 0.97, 0.88, "end")]},
          plate={"id": "J1", "map": [[x.b("sec01", "end"), 0], [c("stretch", -30), 30], [c("stretch"), 60], [c("stretch", 30), 78], [c("overfilled"), 84], [c("overfilled", 30), 96], [c("migrate0"), 102], [c("start:cause", -7), 128]]},
          layout={"x": 450, "y": 250, "w": 590, "h": 1000, "ground": "cream room", "presenter": {"keyed": "belief", **keyed}}, sfx=CARD, notes="plate exits 7 f before the beat ends")
    x.add("causes", "objects", "CausesV3", c("improper", -12), c("end:cause", -4), text={"caps": "Where the bad results come from", "rows": [
            {"text": "Improper injections", "at": c("improper")}, {"text": "Untrained injectors", "at": c("trained")}, {"text": "Overfilling", "at": c("toomuch")}]},
          source={"still": "jan08/clinic/web/s1_castelanich2025_fig1_patient1_pre_crop.jpg", "pos": "50% 68%"}, events={"image": c("toomuch", 2)},
          layout={"x": 68, "y": 1322, "w": 944, "h": 262}, notes="low card under his face (face_clear band 1322); the real overfilled case arrives on 'too much'")
    x.add("J2", "plates", "FloraPlate", x.b("sec02", "end"), c("aging2"), text={"eyebrow": "What aging does", "title": "Volume and support are lost", "labels": [
            x.lab("Volume", c("volume"), 0.64, 0.6, "middle"), x.lab("Fat", c("fatty"), 0.72, 0.79, "middle"), x.lab("Support", c("support"), 0.33, 0.46, "middle")]},
          plate={"id": "J2", "map": [[x.b("sec02", "end"), 0], [c("volume"), 24], [c("volume", 36), 54], [c("fatty"), 60], [c("fatty", 40), 84]]},
          layout={"x": 450, "y": 250, "w": 590, "h": 1040, "titlePx": 38, "ground": "cream room", "presenter": {"keyed": "aging", **keyed}}, sfx=CARD)
    x.add("bank", "objects", "RowCard", c("aging2"), c("end:sags", -8), text={"caps": "Volume loss · a real example", "title": "We lose volume", "credit": "Hong GW et al., JPRAS Open 2026, CC BY 4.0"},
          source={"still": "jan08/clinic/bank_midcheek.jpg", "pos": "50% 60%"}, layout={"x": 68, "y": 1322, "w": 944, "h": 252})
    x.add("broll1", "footage", "Clip", x.b("sec03", "end"), x.b("sec03", "end", 57), source={"clip": "jan08/clinic/IMG_3453.mp4", "in": 14, "rate": 1}, notes="his treatment b-roll, full frame")
    x.add("broll2", "footage", "Clip", x.b("sec03", "end", 57), c("micro"), source={"clip": "jan08/clinic/IMG_3453.mp4", "in": 27, "rate": 1})
    x.add("name", "titles", "NameCard", x.b("broll1", "start", 4), x.b("broll1", "start", 104), text={"title": "Dr. Ariel Ostad"})
    x.add("clipcard", "objects", "RowCard", c("micro"), c("start:cheekbones", 2), text={"caps": "His method", "title": "Microcannula", "note": "Filler placed on the cheekbone"},
          source={"clip": "jan08/clinic/IMG_3470.mp4", "in": 13, "rate": 1}, layout={"x": 68, "y": 1322, "w": 944, "h": 252})
    x.add("J3", "plates", "FloraPlate", c("start:cheekbones", 10), c("falls"), text={"eyebrow": "His method", "title": "On the cheekbone, by microcannula", "labels": [
            x.lab("Cheekbone", c("cheekbones", 36), 0.34, 0.47, "end", out=c("diminish", -2)), x.lab("Microcannula", c("cheekbones", 10), 0.66, 0.84),
            x.lab("Lift", c("lifting"), 0.56, 0.5, out=c("diminish", -2)), x.lab("Without support it falls", c("diminish"), 0.5, 0.93, "middle")]},
          plate={"id": "J3", "map": [[c("start:cheekbones", 10), 0], [c("cheekbones"), 14], [c("cheekbones", 36), 63], [c("cheekbones", 60), 92], [c("lifting"), 100], [c("falls", -7), 143]],
                 "zoom": {"keys": [[c("cheekbones"), 1.25], [c("diminish"), 1]], "ox": 0.42, "oy": 0.5}},
          layout={"x": 60, "y": 250, "w": 960, "h": 1250, "ground": "cream room"}, sfx=CARD)
    x.add("broll3", "footage", "Clip", c("falls"), c("great", 9), source={"clip": "jan08/clinic/IMG_3470.mp4", "in": 18, "rate": 1})
    x.add("J4", "plates", "FloraPlate", x.b("sec04", "end"), c("start:approach"), text={"eyebrow": "Migration", "title": "Wrong filler, or too much in a lip", "labels": [
            x.lab("Stays on the bone", x.b("sec04", "end", 10), 0.76, 0.32, "middle"), x.lab("Too much: spreads", c("lip", 8), 0.03, 0.78)]},
          plate={"id": "J4", "map": [[x.b("sec04", "end"), 0], [x.b("sec04", "end", 15), 6], [c("lip"), 30], [c("lip", 24), 60], [c("start:approach", -7), 72]]},
          layout={"x": 60, "y": 250, "w": 960, "h": 1250, "ground": "cream room"}, sfx=CARD, notes="clip used to its f84, before the lip turns to skin")
    x.add("web_lip", "objects", "WebCard", c("lip", 30), c("start:approach", -6), text={"eyebrow": "Migration · a real case", "title": "Lip filler spread"},
          source={"still": "jan08/clinic/web/s2_jmir2024_fig2_panelA_crop.jpg", "pos": "60% 50%"}, layout={"x": 582, "y": 1080, "w": 400})
    x.add("plan", "markup", "PhotoPanel+CheekMarks", c("start:approach"), c("golf", -12), source={"still": "jan08/clinic/front_before.jpg"},
          events={"cheek": c("cheekbones2"), "hatch": c("midcheek"), "laugh": c("laugh"), "marionette": c("marionette"), "lids": c("lids")},
          layout={"photo": {"k": 0.56, "x0": 560, "y0": 836, "h": 1290}, "ground": "cream room"}, sfx=CARD,
          notes="surgeon's marks locked to her photo (geometry: src/jan08/planV3.ts from brand/scripts/jan08_plan.py); each zone draws on its word")
    x.add("plan_legend", "objects", "Legend", c("start:approach", 6), c("golf", -16), text={"caps": "His plan · microcannula", "key": "✕ entry · line: cannula path · dot: filler", "rows": [
            {"text": "Cheekbones", "amt": "the most", "at": c("cheekbones2"), "big": True}, {"text": "Laugh lines", "amt": "minimal", "at": c("laugh")},
            {"text": "Marionette lines", "amt": "minimal", "at": c("marionette")}, {"text": "Lower lids", "amt": "a little", "at": c("lids")}]}, layout={"x": 78, "y": 1312, "w": 924})
    x.add("J5", "plates", "FloraPlate", c("golf", -12), c("awkward", 11), text={"eyebrow": "Not this", "title": "Golf-size filling, mid cheek", "labels": [x.lab("Looks awkward", c("awkward"), 0.3, 0.9, "middle")]},
          plate={"id": "J5", "map": [[c("golf", -12), 0], [c("golf"), 30], [c("golf", 50), 70], [c("awkward"), 86]], "strike": {"x": 0.58, "y": 0.527, "r": 0.12, "at": c("awkward")}},
          layout={"x": 60, "y": 250, "w": 960, "h": 1250, "ground": "cream room"}, sfx=CARD)
    x.add("web_cheeks", "objects", "WebCard", c("awkward", -30), c("awkward", 5), text={"eyebrow": "A real case", "title": "Overfilled cheeks"},
          source={"still": "jan08/clinic/web/s1_castelanich2025_fig1_patient2_pre_crop.jpg", "pos": "50% 62%"}, layout={"x": 622, "y": 1060, "w": 360})
    x.add("result", "markup", "BAPanel", c("awkward", 11), c("start:close", -2), source={"still": "jan08/clinic/front_before.jpg", "after": "jan08/clinic/front_after_aligned.jpg"},
          events={"sweep": c("address", 6)}, text={"caps": "The same patient, the same day", "before": "Before", "after": "Right after", "line": "Filler on the cheekbones, by microcannula",
          "credit": "Patient of Dr. Ostad. Individual results vary."}, layout={"photo": {"k": 0.56, "x0": 560, "y0": 836, "h": 1290}, "text_y": 1314, "ground": "cream room"}, sfx=CARD,
          notes="before -> right after wipe (16 f) on 'address' + 6; cheekbone marks locked to both; no measurable change, so no number")
    x.add("endcard", "titles", "EndCard", c("end"), c("end", P["tail"]), text={"title": "Book a consultation."}, layout={"ground": "cream room"})
    x.write()

def oct14():
    x = X("oct14", "v5c", "Oct14ReelV5", "public/oct14/props.json", {"lufs": -14, "tp": -1.5, "limiter": False}, {"big": True})
    c, P = x.c, x.P
    lay = json.loads((PUB / "oct14/layout_v5.json").read_text(encoding="utf-8"))
    stills = json.loads((PUB / "oct14/stills_v5.json").read_text(encoding="utf-8"))
    still_of = {v["piece"]: k for k, v in stills.items()}
    L = lambda k, **over: {**{q: lay[k][q] for q in ("mode", "x", "y", "scale") if q in lay[k]}, "solver": f"layout_v5:{k}", **over}
    S, E = (lambda l, o=0: c("start:" + l, o)), (lambda l, o=0: c("end:" + l, o))
    for p in P["pieces"]:
        src = {"still": f"oct14/still_{still_of[p['id']]}.jpg"} if p["id"] in still_of else {"clip": f"oct14/{p['pictureRole']}.mp4", "in": p["pictureFrom"], "rate": P["speed"]}
        x.add(f"pic:{p['id']}", "footage", "Picture", x.pc(p["id"], exact=True), x.pc(p["id"], "end", exact=True), source={**src, "audio": {"role": p["role"], "in": p["from"], "out": p["to"]}},
              layout={"punch": p.get("punch", 1), **({"origin": p["punchO"]} if p.get("punchO") else {})}, notes=f"line {p['line']} · section {p.get('section')}")
    for k, l in lay.items():
        if l["mode"] == "takeover": x.add(f"room:{k}", "footage", "Room", x.f(l["s"]), x.f(l["e"]), notes=f"cream room replaces the footage under {k} (oct14_layout_v5.py found no face-free spot); frames from layout_v5.json")
    x.add("captions", "captions", "WordCaptions", x.f(0), c("end"), events={"hide_from": S("intro-typical"), "hide_to": E("intro-typical")}, notes="hidden under the title (hideCaps)")
    sg = P["surgeon"]
    x.add("hook", "markup", "Hook", x.f(0), x.f(38), source={"still": "oct14/before.jpg", "after": "oct14/after_aligned.jpg", "crop": sg["crop"]}, notes="full-frame registered before -> after wipe with the measured cheek contour")
    x.add("title", "titles", "Chapter", x.f(46), x.f(46 + SEC_LEN), text={"num": "", "title": "Treat the source,|not the line", "sub": "Dr. Ariel Ostad · injectables"}, layout=L("title", px=110))
    x.add("ch01", "titles", "Chapter", x.b("title", "end", 1), x.b("title", "end", 1 + SEC_LEN), text={"num": "01", "title": "Upper face"}, layout=L("ch01"))
    x.add("name", "titles", "NameCard", x.f(lay["name"]["at"]), x.f(lay["name"]["at"] + 101), text={"title": "Dr. Ariel Ostad"}, layout=L("name"))
    x.add("crows", "markup", "PenT x3", c("crows"), c("these", -9), layout={"track": {"role": "intro", "key": "crowR"}}, notes="three pen strokes on her tracked lateral canthus (tracks_v5.json), 3 f apart")
    for q in P["pips"]:
        n = q["n"]
        take = lay[f"pip{n}"]["mode"] == "takeover"
        big = {2: {"x": 90, "y": 330, "w": 900}, 3: {"x": 40, "y": 800, "w": 1000}}.get(n) if take else None
        extra = {"big": big} if big else {"arrow": {"variant": q.get("arrow", "curved-callout"), "track": {"role": q["anchorRole"], "key": q["key"]}}}
        x.add(f"pip{n}", "objects", "ClipCard" if take else "InjCard", c(q["cue"]), c(q["out"]),
              text={"eyebrow": q.get("eyebrow"), "title": q.get("label"), "depth": q.get("depth")},
              source={"clip": f"oct14/{q['clip']}.mp4", **({"in": q["clipFrom"], "rate": 1} if "clipFrom" in q else {"morphTo": q["morphTo"], "rate": P["speed"]})},
              layout=L(f"pip{n}", **extra), sfx=[{"name": "pop"}] if q["cue"] == "dynamic" else None,
              notes="his injection clip in a card; overlay cards carry an arrow to the tracked point")
    o1 = x.f(lay["O1"]["s"])
    x.add("O1", "plates", "FloraPlate", o1, E("neuro-more-less", -2), text={"eyebrow": "Dynamic lines", "title": "Frown muscles", "note": "Illustration", "labels": [
            x.lab("Frontalis", c("neuromod", 14), 0.5, 0.05, "middle", size=18), x.lab("Corrugator", c("neuromod", 22), 0.02, 0.42, size=18),
            x.lab("Procerus", c("neuromod", 26), 0.5, 0.66, "middle", size=18), x.lab("Orbicularis oculi", c("neuromod", 30), 0.98, 0.86, "end", size=18)]},
          plate={"id": "O1", "map": [[o1, 0], [x.b("O1", "start", 30), 66], [x.b("O1", "start", 60), 108], [x.b("O1", "start", 70), 126], [x.b("O1", "start", 100), 143]]},
          layout=L("O1", w=480, h=540), notes="starts when section 01 and the name card clear (layout_v5 O1.s); map keys 4-5 = max(neuromod, start + 70) (+30): start + 70 wins in v5c")
    x.add("months", "objects", "MonthsRule", S("intro-lasts"), S("intro-lasts", 62), text={"title": "Neuromodulator lasts", "label": "4–5 months"}, events={"four": c("four"), "five": c("five")}, layout=L("months", max=6, fill=[4, 5]))
    x.add("days", "objects", "DayLanes", S("intro-lasts", 68), E("intro-onset-vs-filler", -2), events={"neuro": c("day"), "filler": c("away")}, layout=L("days", big={"x": 40, "y": 410, "w": 1000, "h": 860, "k": 1.45}),
          notes="two lanes on one day axis: filler at day 0, neuromodulator over days 1-2")
    x.add("ch02", "titles", "Chapter", S("intro-midface"), S("intro-midface", SEC_LEN), text={"num": "02", "title": "Mid face"}, layout=L("ch02"))
    x.add("jowl", "markup", "PenT", c("jowling"), E("intro-midface", -8), source={"still": "oct14/still_jowl.jpg"}, notes="jaw contour on a STILL (oct14_still_v5.py): the mark could not be tracked to the bound on the 2x punch-in")
    x.add("compare", "objects", "CompareClips", c("filled"), E("intro-cheekbones", -2), text={"chip": "Not first, here",
            "left": {"caps": "Patients usually ask", "title": "Fill the lines first", "depth": [1, "Into the lines"]}, "right": {"caps": "Here", "title": "Cheekbones first", "depth": [2, "Deep, over the bone"]}},
          source={"left": {"clip": "oct14/inj7.mp4", "in": 70}, "right": {"clip": "oct14/inj3.mp4", "in": 20}}, events={"right": c("cheeks"), "strike": c("filled", 40)},
          layout=L("compare", big={"x": 40, "y": 130, "w": 1000, "grow_at": lay["O2"]["s"] + 2}), notes="strike = max(but, filled + 40)")
    x.add("route", "markup", "TrackedArrow", c("moving", -26), E("intro-deflation", -2), layout={"track": {"role": "intro", "keys": ["malarR", "cheekR", "jawR"]}}, notes="white route cheekbone -> cheek -> below the jaw, tracked; hidden in the cream room")
    x.add("O2", "plates", "FloraPlate", c("deflation"), E("intro-cheekbones", -2), text={"eyebrow": "The source", "title": "Deflation", "note": "Illustration", "labels": [
            x.lab("Cheek fat", c("deflation", 16), 0.2, 0.42, "end", size=26), x.lab("Jowl", c("moving", 10), 0.6, 0.95, size=26), x.lab("Filler on the cheekbone", c("cheeks", 12), 0.02, 0.04, size=26)]},
          plate={"id": "O2", "map": [[c("deflation"), 0], [c("deflation", 54), 30], [c("moving"), 54], [c("moving", 45), 64], [c("cheeks"), 92], [c("cheeks", 14), 100], [c("cheeks", 54), 156]]},
          layout=L("O2", big={"x": 40, "y": 730, "w": 1000, "h": 850, "head": 130, "pad": 30, "titlePx": 46}))
    x.add("laughlines", "markup", "PenT x2", c("laugh3"), E("inj5-less-needed", -9), layout={"track": {"role": "inj5", "keys": ["nasoL", "lipCL", "nasoR", "lipCR"]}}, notes="a pen line along each fold, tracked on her close-up")
    x.add("O3", "plates", "FloraPlate", c("used", 20), S("inj6-bruising", -2), text={"eyebrow": "Two gels, two jobs", "title": "Smooth is not as thick", "note": "Illustration", "labels": [
            x.lab("Evolysse Form · holds its shape", c("used", 40), 0.25, 0.97, "middle", size=22), x.lab("Evolysse Smooth · spreads thin", c("used", 60), 1.0, 0.97, "end", size=22)]},
          plate={"id": "O3", "map": [[c("used", 20), 0], [c("used", 30), 24], [c("used", 90), 84], [c("used", 110), 92], [c("used", 150), 110]]},
          layout=L("O3", big={"x": 40, "y": 150, "w": 1000, "h": 620, "head": 124, "pad": 28, "titlePx": 44}))
    x.add("O4", "plates", "FloraPlate", S("inj6-bruising"), E("inj6-bruising", 40), text={"eyebrow": "Why a cannula", "title": "Less chance of a bruise", "note": "Illustration", "labels": [
            x.lab("Sharp needle: can nick a vessel", S("inj6-bruising", 30), 0.3, 0.06, size=24), x.lab("Blunt cannula: glides in the fat layer", c("cannula", 6), 0.03, 0.97, size=24)]},
          plate={"id": "O4", "map": [[S("inj6-bruising"), 0], [S("inj6-bruising", 14), 6], [S("inj6-bruising", 60), 56], [c("cannula"), 72], [c("cannula", 40), 102], [E("inj6-bruising", 40), 130]]},
          layout=L("O4", big={"x": 40, "y": 400, "w": 1000, "h": 860, "head": 140, "pad": 30, "titlePx": 50}))
    x.add("ch03", "titles", "Chapter", E("inj6-bruising", 42), E("inj6-bruising", 42 + SEC_LEN), text={"num": "03", "title": "The result"}, layout=L("ch03"))
    x.add("marionette", "markup", "PenT x2", c("marionette", 5), c("ba", -9), layout={"track": {"role": "after", "keys": ["lipCL", "marioL", "lipCR", "marioR"]}})
    x.add("surgeon_plan", "markup", "SurgeonPlan", c(sg["cue"]), c("end", 45), source={"still": "oct14/before.jpg", "after": "oct14/after_aligned.jpg", "markup": "oct14/markup_v5.json"},
          events={"wipe": c(sg["wipe"]), "fact_treatment": c("fifteen"), "fact_lasts": c("year")},
          text={"subs": sg["subs"], "facts": [{"k": "Treatment", "v": "about 15 min"}, {"k": "Filler lasts", "v": "1–1½ years"}],
                "legend": ["Evolysse Form · 1 syringe, both cheeks · needle, deep on the cheekbone", "Evolysse Smooth · cannula passes from 3 entries into the laugh and marionette lines", "Treated fold", "Neuromodulator · crow's feet point (plus forehead and frown lines)"]},
          sfx=[{"name": "swish"}, {"name": "yes", "at": c("treatment")}], notes="full-frame technical plan on the registered before/after; every line from oct14_v5_markup.py; legend under her face")
    x.add("endcard", "titles", "EndCard", c("end", 46), c("end", P["tail"]), text={"title": "Book a consultation.", "sub": "Link in bio.", "handle": "@drarielostad"}, layout={"x": 98, "y": 700, "ground": "cream room"})
    x.write()

def undereye():
    x = X("undereye", "v4b", "UndereyeReelV4", "public/undereye-filler/props_v4.json", {"lufs": -14, "tp": -1.5, "limiter": True})
    c, P = x.c, x.P
    S, E = (lambda p, o=0: x.pc(p, "start", o)), (lambda p, o=0: x.pc(p, "end", o - 1))  # the composition's E() is the piece's LAST frame
    n = 0
    for p in P["pieces"]:
        for q in p["pics"]:
            n += 1
            src = {"still": q["still"]} if q.get("still") else {"clip": f"undereye-filler/{q['clip']}.mp4", "in": q.get("src"), "rate": P["speed"]}
            lay = {k: q[k] for k in ("scale", "ox", "oy") if k in q}
            x.add(f"pic{n:02d}:{p['id']}", "footage", "PicLayer", x.pc(p["id"], "start", q["f0"] - p["at"], exact=True), x.pc(p["id"], "start", q["f1"] - p["at"], exact=True), source=src, layout=lay or None,
                  notes=f"piece {p['id']} ({p.get('voice', '')}, audio {p['clip']} {p['from']}-{p['to']} s)")
    x.add("captions", "captions", "Captions", x.f(P["hook"]), c("end"), notes="word-onset; italic for the patient's voice; not over her face in the hook")
    x.add("hook", "markup", "HookWipe", x.f(0), x.f(P["hook"]), source={"still": "undereye-filler/ba_wipe_before.jpg", "after": "undereye-filler/ba_wipe_after.jpg"}, layout={"scale": 2.0, "ox": 540, "oy": 1050},
          notes="registered Sept 20 -> Oct 4 wipe (frames 6-28), then a hard cut")
    hk = x.f(P["hook"])
    secs = [("title", hk, "Dr. Ariel Ostad", "Under-eye filler", {"px": 96, "y": 236}), ("c01", S("P03"), "01", "The concern", {"align": "right", "x": 1000, "px": 104}),
            ("c02", S("P04", -1), "02", "The\nprocedure", {"px": 92}), ("c03", S("P14"), "03", "The decision", {"px": 104}), ("c04", S("P17"), "04", "The result", {"align": "right", "x": 1000, "px": 104})]
    for bid, st, num, title, lay in secs:
        k = P["keys"].get(bid)
        if k: lay = {**lay, "key": {"file": f"undereye-filler/key_{bid}.webm", **k}}
        x.add(bid, "titles", "RoomTitle", st, x.b(bid, "start", SEC_LEN), text={"num": num, "title": title}, layout=lay, sfx=CHAP,
              notes="on the wall behind the people, their RVM key over the type (undereye_key.py)")
    crop = {"x": 250, "y": 830, "w": 580, "h": 420}
    x.add("ba_hook", "objects", "BAWindowV4", hk, E("H1"), source={"still": "undereye-filler/ba_wipe_before.jpg", "after": "undereye-filler/ba_wipe_after.jpg", "crop": crop}, events={"swap": x.f(P["hook"] + 16)},
          text={"before": "Before · Sept 20", "after": "After · Oct 4", "note": "Our patient, Sept 2021"}, layout={"y": 1140})
    CT = 1130
    x.add("eye_card", "objects", "ClipCardStd", c("hollows", -10), E("P03", -2), text={"caps": "Sept 20 · before", "title": "Her under-eye"}, source={"clip": "undereye-filler/6814.mp4", "in": 0.21, "rate": 0.75},
          layout={"x": 88, "y": CT, "w": 420, "h": 315}, notes="rate = min(0.75, 1.5 s / the card's life)")
    x.add("U1_trough", "plates", "ClipCardStd+PlateMedia", c("hollows", -4), E("P03", -2), text={"caps": "Illustration", "title": "The tear trough", "labels": [x.lab("Tear trough", c("hollows", 4), 0.05, 0.62)]},
          plate={"id": "U1", "map": [[c("hollows", -4), 0]], "crop": {"cx": 0.62, "cy": 0.45, "cw": 0.62}}, layout={"x": 552, "y": CT, "w": 420, "h": 315}, sfx=CARD)
    x.add("name", "titles", "NameCard", E("P03", 1), E("P03", 102), text={"title": "Dr. Ariel Ostad"})
    x.add("U4_cannula", "plates", "ClipCardStd+PlateMedia", c("cannula", 8), c("afterwards", -12), text={"caps": "Blunt cannula", "title": "Around, not through", "labels": [x.lab("Needle", c("cannula", 12), 0.36, 0.1), x.lab("Cannula", c("blunt"), 0.04, 0.84)]},
          plate={"id": "U4", "map": [[c("cannula", 8), 0], [c("blunt"), 50], [c("blunt", 24), 72]], "crop": {"cx": 0.42, "cy": 0.5, "cw": 0.75}}, layout={"x": 88, "y": CT, "w": 420, "h": 315}, sfx=CARD, notes="clip cut at f72, before the cannula enters the vein")
    x.add("U5_entry", "plates", "ClipCardStd+PlateMedia", c("advanced"), c("afterwards", -12), text={"caps": "One entry point", "title": "More delicate", "labels": [x.lab("One entry", c("advanced", 4), 0.32, 0.9), x.lab("Threads, fanned", c("delicate", 14), 0.95, 0.62, "end")]},
          plate={"id": "U5", "map": [[c("advanced"), 0], [c("advanced", 6), 46], [c("delicate"), 54], [c("delicate", 14), 66], [c("delicate", 30), 90], [c("delicate", 40), 110], [c("afterwards", -12), 143]], "crop": {"cx": 0.68, "cy": 0.455, "cw": 0.75}},
          layout={"x": 552, "y": CT, "w": 420, "h": 315})
    x.add("afterwards", "titles", "DateLabels", c("afterwards"), c("typically", -1), text={"sub": "Oct 4, 2021", "title": "Afterwards"}, layout={"x": 540, "y": 262})
    x.add("lasts", "objects", "Lasts", c("last"), E("P05"), events={"year": c("year"), "half": c("half")}, layout={"y": 1120}, notes="a year to a year and a half")
    x.add("U6_syringe", "plates", "TallPlateCard", c("anesthetic", -2), E("P08", -16), text={"eyebrow": "In the syringe", "title": "HA filler + lidocaine", "labels": [x.lab("HA gel", c("anesthetic", 4), 0.6, 0.27), x.lab("+ lidocaine", c("lidocaine"), 0.6, 0.36)]},
          plate={"id": "U6", "map": [[c("anesthetic"), 0], [c("anesthetic", 20), 48], [c("lidocaine"), 60], [E("P08"), 119]], "crop": {"cx": 0.3, "cy": 0.52, "cw": 0.83}, "rotate": -90}, layout={"x": 36, "y": 520, "w": 320}, sfx=CARD,
          notes="in the face-free column left of her face")
    x.add("plan", "markup", "PlanMarks", c("deep"), E("P10"), source={"still": "undereye-filler/ba_wipe_before.jpg"},
          events={"rim": c("deep"), "trough": c("deep", 6), "deposit": c("deep", 14), "entry": c("deep", 34), "paths": c("we"), "fan": c("underneath", -10), "fuller": c("fuller"), "deeper": c("deeper")},
          layout={"scale": 1.35, "ox": 386, "oy": 1989}, sfx=CARD, notes="the plan board: her registered Sept 20 face full frame, technical marks locked to it (the still is a footage pic in props_v4: undereye_prep_v4.py PLAN)")
    x.add("plan_legend", "objects", "Legend", c("deep"), E("P10"), text={"head": "His plan · Sept 20 · 1 syringe", "rows": [
            {"glyph": "rim", "text": "Orbital rim (bone)", "at": c("deep")}, {"glyph": "hatch", "text": "The hollow · filled deep", "at": c("deep", 14)}, {"glyph": "x", "text": "Entry · one per side", "at": c("deep", 34)},
            {"glyph": "path", "text": "Cannula path (read)", "at": c("we")}, {"glyph": "fan", "text": "Fan to the trough", "at": c("underneath", -10)}, {"glyph": "trough", "text": "Her right fuller · left deeper", "at": c("fuller")}]},
          layout={"x": 98, "y": 1214, "w": 430})
    x.add("U1_deep", "plates", "ClipCardStd+PlateMedia", c("underneath", -4), E("P10"), text={"caps": "Illustration", "title": "Deep, under the muscle", "labels": [x.lab("Muscle", c("underneath", 8), 0.66, 0.5), x.lab("Filler, on the bone", c("underneath", 30), 0.95, 0.92, "end")]},
          plate={"id": "U1", "map": [[c("underneath", -4), 66], [c("underneath", 40), 120], [E("P10"), 143]], "crop": {"cx": 0.62, "cy": 0.45, "cw": 0.62}}, layout={"x": 552, "y": 1150, "w": 420, "h": 315})
    x.add("one_syringe", "plates", "CardV4+PlateMedia", c("another", -2), c("again", -1), text={"caps": "Done today", "title": "One syringe", "tick": "Used here", "labels": [x.lab("Smooth, deep", c("another", 6), 0.63, 0.95, "middle")]},
          plate={"id": "U7", "map": [[c("another", -2), 0]], "crop": {"cx": 0.43, "cy": 0.67, "cw": 0.52}}, events={"tick": c("beautiful")}, layout={"x": 88, "y": CT, "w": 420, "h": 315})
    x.add("another_syringe", "plates", "CardV4+PlateMedia", c("another", 4), c("again", -1), text={"caps": "The question", "title": "Another syringe", "tick": "Not used: it expands", "labels": [x.lab("Pillowy", c("pillowy"), 0.63, 0.95, "middle")]},
          plate={"id": "U7", "map": [[c("expand"), 0], [c("expand", 50), 84], [c("pillowy"), 96]], "crop": {"cx": 0.43, "cy": 0.67, "cw": 0.52}}, events={"tick": c("beautiful")}, layout={"x": 552, "y": CT, "w": 420, "h": 315})
    x.add("U3_tyndall", "plates", "WidePlateCard", c("bluish", -4), E("P15"), text={"eyebrow": "Too close to the surface", "title": "The Tyndall effect", "labels": [x.lab("Filler too shallow", c("bluish", 2), 0.5, 0.72, "end"), x.lab("Light scatters back", c("tyndall"), 0.3, 0.2, "end")]},
          plate={"id": "U3", "map": [[c("bluish", -4), 0], [c("bluish"), 30], [c("tyndall"), 66], [c("tyndall", 1), 114], [E("P15"), 135]], "crop": {"cx": 0.55, "cy": 0.33, "cw": 0.95}}, layout={"x": 98, "y": 1270, "w": 884, "h": 300}, sfx=CARD)
    win = c("pinprick", -14)
    x.add("needles", "plates", "CardV4+PlateMedia", c("conventional", -2), c("pinprick", -18), text={"caps": "The conventional way", "title": "Needles", "tick": "Not used: bruising", "labels": [x.lab("Bruise", c("bruised"), 0.3, 0.8, "end")]},
          plate={"id": "U8", "map": [[c("conventional", -2), 0], [c("conventional", 32), 32], [c("swelling0"), 60], [c("bruised"), 108], [c("pinprick", -18), 130]], "crop": {"cx": 0.55, "cy": 0.59, "cw": 0.65}}, events={"tick": c("here")},
          layout={"x": 88, "y": 1215, "w": 420, "h": 210}, sfx=CARD)
    x.add("blunt_cannula", "plates", "CardV4+PlateMedia", c("here", -2), c("pinprick", -18), text={"caps": "What he used", "title": "Blunt cannula", "note": "deep, under the muscle", "tick": "One pinprick", "labels": [x.lab("Blunt, rounded tip", c("here", 4), 0.6, 0.18, "end")]},
          plate={"id": "U9", "map": [[c("here", -2), 0], [win, 120]], "crop": {"cx": 0.5, "cy": 0.5, "cw": 1}}, events={"tick": c("here")}, layout={"x": 552, "y": 1215, "w": 420, "h": 210})
    x.add("ba_result", "markup", "BAWindowV4", win, E("P17"), source={"still": "undereye-filler/ba_wipe_before.jpg", "after": "undereye-filler/ba_wipe_after.jpg", "crop": crop},
          events={"marks": c("pinprick", -10), "pulse": c("pinprick"), "swap": c("two", 30), "bars": c("settled")},
          text={"before": "Before · Sept 20", "after": "After · Oct 4", "notes": ["x = the one pinprick · line = cannula", "Same marks, Oct 4", "Bars = lighter under-eye (L*, measured)"], "credit": "Patient of Dr. Ostad. Individual results vary."},
          layout={"y": 1212, "maxw": 460}, sfx=CARD)
    st = P.get("stat") or {"before": 1, "after": 1}
    x.add("stat", "objects", "Stat", c("settled", 6), E("P17"), text={"caps": "Under-eye shadow vs the cheek", "value": f"−{round(100 * (st['before'] - st['after']) / st['before'])} %", "sub": f"{st['before']} → {st['after']} L* · Sept 20 → Oct 4"},
          layout={"x": 98, "y": 880}, notes="measured (research/ostad/style/undereye/measure_v4.json); counts up over 26 f")
    x.add("endcard", "titles", "EndCardLow", c("end"), c("end", 72), layout={"y": 1110})
    x.write()

if __name__ == "__main__":
    for r in sys.argv[1:] or ["jan08", "oct14", "undereye"]: {"jan08": jan08, "oct14": oct14, "undereye": undereye}[r]()
