"""The machine registry for videos and posts: every energy device Dr. Ostad offers (research/ostad/refs/procedures.json, categories
laser, RF/energy, body; all on his site), with the words that name it in speech, so scripts/video_edit.cjs can show the machine when he
says it. Images are cutouts (transparent PNG) dropped in by scripts/devices_ingest.py as kit/devices/img/<id>.png; a device with no
image falls back to a chip. EXTRA holds spoken forms the recogniser produces (faster-whisper wrote "XLV" for excel V) and devices named
in his transcripts that procedures.json does not list. -> kit/devices/devices.json. brand-venv python -I."""
import json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parents[2]; K = ROOT / "brand" / "kit" / "devices"; (K / "img").mkdir(parents=True, exist_ok=True)
P = json.load(open(ROOT / "research" / "ostad" / "refs" / "procedures.json", encoding="utf-8"))
LABEL = {  # the name on the card: the machine, not the procedure
    "excel-v": "Excel V", "laser-genesis": "Laser Genesis", "fraxel": "Fraxel", "co2-laser": "Fraxel CO2", "clear-brilliant": "Clear + Brilliant",
    "aviclear": "AviClear", "picoway": "PicoWay", "tattoo-removal": "PicoWay", "laser-hair-removal": "LightSheer", "morpheus8": "Morpheus8",
    "emface": "EMFACE", "emsculpt-neo": "EMSCULPT NEO", "miradry": "miraDry", "ultherapy": "Ultherapy", "facetite": "FaceTite", "evoke": "Evoke",
    "coolsculpting": "CoolSculpting Elite", "juliet": "Juliet", "rf-microneedling": "RF microneedling",
}
EXTRA_SAY = {"excel-v": ["XLV", "Excel V", "excel V plus"], "laser-genesis": ["laser genesis"], "clear-brilliant": ["clear and brilliant"],
             "morpheus8": ["morpheus 8", "morpheus"], "co2-laser": ["CO2 laser"], "picoway": ["pico way", "pico laser"]}
EXTRA = [  # named in his transcripts (research/ostad/transcripts), not in procedures.json
    {"id": "bbl", "label": "BBL", "maker": "Sciton", "say": ["BBL", "broadband light"]},
    {"id": "halo", "label": "Halo", "maker": "Sciton", "say": ["Halo laser", "Halo"]},
    {"id": "thermage", "label": "Thermage", "maker": "Solta Medical", "say": ["Thermage"]},
    {"id": "sofwave", "label": "Sofwave", "maker": "Sofwave", "say": ["Sofwave", "soft wave"]},
    {"id": "moxi", "label": "Moxi", "maker": "Sciton", "say": ["Moxi"]},
    {"id": "ellacor", "label": "Ellacor", "maker": "Cytrellis", "say": ["Ellacor"]},
    {"id": "exomind", "label": "Exomind", "maker": "BTL Aesthetics", "say": ["Exomind", "exo mind"]},
]
devs = []
for p in P:
    if p["category"] not in ("laser", "RF/energy", "body") or p["id"] not in LABEL: continue
    say = {LABEL[p["id"]], *(p.get("aliases") or []), *EXTRA_SAY.get(p["id"], [])}
    if p.get("brand_or_device"): say |= {s.strip() for s in re.split(r"[/,]", p["brand_or_device"]) if s.strip()}
    devs.append({"id": p["id"], "label": LABEL[p["id"]], "maker": p.get("manufacturer"), "procedure": p["name"], "mentions": len(p.get("mentioned_in") or []),
                 "say": sorted(s for s in say if 2 < len(s) < 40)})
devs += [dict(d, procedure=None, mentions=None) for d in EXTRA]
for d in devs:
    img = K / "img" / f"{d['id']}.png"; d["img"] = f"img/{d['id']}.png" if img.exists() else None
json.dump({"source": "research/ostad/refs/procedures.json + EXTRA in scripts/devices.py", "n": len(devs), "with_image": sum(bool(d["img"]) for d in devs), "devices": devs},
          open(K / "devices.json", "w", encoding="utf-8"), indent=1)
print(len(devs), "devices,", sum(bool(d["img"]) for d in devs), "with images ->", K / "devices.json")
# search: python -I brand/scripts/devices.py <words>  -> the matching machines and whether each has a cutout
if len(__import__("sys").argv) > 1:
    q = re.sub(r"[^a-z0-9]", "", " ".join(__import__("sys").argv[1:]).lower())
    for d in devs:
        if any(q in re.sub(r"[^a-z0-9]", "", s.lower()) for s in [d["id"], d["label"], d.get("maker") or "", *d["say"]]):
            print(f"{d['id']:<20} {d['label']:<22} {d.get('maker') or '':<32} image: {d['img'] or 'MISSING - drop a cutout named ' + d['id'] + '.png'}")
