"""models_candidates.json (survey) + quality ratings from the clay turntables -> models.json + MODELS.md.

Quality is 1-5, given by eye from renders/survey/{slug}.jpg (4 angles each), only for models actually downloaded.
Priced-only and Sketchfab entries (no token, so no download) carry quality null and say why.
"""
import json, pathlib, re
from collections import Counter, defaultdict

HERE = pathlib.Path(__file__).resolve().parents[1]
REPO = HERE.parents[2]
SLUG = lambda s: re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")[:48]

# by eye, from the survey turntables (renders/survey/*.jpg)
RATED = {
    "visible_human_male_bust": (3, "Real CT-derived half-dissected bust with good surface detail, but one fused mesh: the layers cannot be separated or toggled."),
    "skin_male": (2, "Whole-body Visible Human skin. Clean, but the face is soft and low on detail at head scale."),
    "skin_female": (2, "As the male skin: clean, soft facial detail."),
    "bodyparts3d_skin_fma7163": (3, "Whole-body skin that matches Z-Anatomy's coordinate frame (same source data); usable for neck and body skin."),
    "niosh_anthropometric_digital_headforms_with_base": (2, "Smooth anthropometric headform on a base. Good proportions, no anatomy."),
    "bodyparts3d_platysma_left_right": (3, "The BodyParts3D parts picked for eyelid (tarsal plates, levator), lips, eyebrows and platysma: accurate, named, unrefined surfaces."),
    "3d_nasal_septum": (3, "An averaged septal cartilage, accurate shape, a single part."),
    "eye_male_right": (4, "23 named parts (sclera, cornea, lens, conjunctiva ...), clean topology: the best eye available."),
    "skull_and_eyes_visible_human_male": (4, "17 named bones from CT, clean and light (54k faces); a good swap for Z-Anatomy's skull if needed."),
    "bodyparts3d_hair_of_head_fma54241": (2, "A scalp-hair cap shell, a silhouette only."),
    "lymphatic_vessel_and_valve_theoretical_construct": (3, "A clean theoretical lymph vessel with valve; reusable as a generic vessel segment."),
    "collagen_triple_helix": (3, "A molecular collagen helix, the right look for a collagen-remodelling close-up."),
    "z_anatomy_head_as_built_into_face_glb": (4, "Layered and named; muscles, bone and vessels are real Z-Anatomy meshes. Fat, SMAS and eyes are approximated (face.layers.json)."),
}

M = json.load(open(HERE / "models_candidates.json", encoding="utf-8"))
out = []
for m in M:
    path = m.get("path")
    rel = None
    if path:
        try:
            rel = str(pathlib.Path(path).resolve().relative_to(REPO)).replace("\\", "/")
        except ValueError:
            rel = path
    q, qn = None, ""
    if m.get("downloaded"):
        if "z-anatomy" in (path or "").lower() or m["source"].startswith("Z-Anatomy"):
            q, qn = RATED["z_anatomy_head_as_built_into_face_glb"]; sheet = "renders/survey/z_anatomy_head_as_built_into_face_glb.jpg"
        else:
            slug = SLUG(m["name"]); q, qn = RATED.get(slug, (None, "")); sheet = f"renders/survey/{slug}.jpg" if slug in RATED else None
    else:
        sheet = None
        qn = ("not rated: Sketchfab needs an account token to download" if m["source"] == "Sketchfab"
              else "not rated: priced option, not bought" if m.get("price_usd") is not None or m["source"] in ("Zygote", "TurboSquid", "CGTrader")
              else "not rated: not downloaded (already covered)")
    out.append({"structure": m["structure"], "source": m["source"], "name": m["name"], "url": m["url"], "license": m["license"],
                "format": m["format"], "downloaded": bool(m.get("downloaded")), "path": rel, "polycount": m.get("polycount"),
                "layered": m.get("layered"), "price_usd": m.get("price_usd"), "quality": q,
                "quality_sheet": f"research/ostad/3d/{sheet}" if sheet else None,
                "notes": "; ".join(x for x in (qn, m.get("notes") or "") if x)})
json.dump(out, open(HERE / "models.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)

by = defaultdict(list)
for r in out: by[r["structure"]].append(r)
src = Counter(r["source"] for r in out)
lines = ["# 3D model survey", "",
         f"{len(out)} options across {len(by)} structures. {sum(r['downloaded'] for r in out)} downloadable/downloaded "
         f"(rated by clay turntable, `renders/survey/`), {sum(1 for r in out if r['price_usd'] is not None)} priced-only. "
         "Sources: " + ", ".join(f"{k} {v}" for k, v in src.most_common()) + ".", "",
         "Quality is 1–5 from a headless Blender turntable, given only to files actually downloaded. Licences are as each source states: "
         "CC BY-SA (Z-Anatomy, BodyParts3D) requires attribution and share-alike; NIH 3D licences vary per model (see `ATTRIBUTION.txt` beside each).", "",
         "| Structure | Best free option | q | Best paid option |", "|---|---|---|---|"]
for st in sorted(by):
    rs = by[st]
    free = sorted((r for r in rs if r["downloaded"]), key=lambda r: -(r["quality"] or 0))
    paid = sorted((r for r in rs if r["price_usd"] is not None), key=lambda r: r["price_usd"])
    f = f"{free[0]['name']} ({free[0]['source']})" if free else "—"
    p = f"{paid[0]['name']} ({paid[0]['source']}, ${paid[0]['price_usd']:.0f})" if paid else "—"
    lines.append(f"| {st} | {f} | {free[0]['quality'] if free and free[0]['quality'] else '—'} | {p} |")
lines += ["", "## No real free option", "",
          "- **SMAS and fat compartments:** nothing free exists. The face approximates them (DECISIONS 23). Paid: 3dmi head with fat layers, $169; ask the seller whether the fat is split into named compartments.",
          "- **Micro structures (skin block, follicle, glands, melanocytes, adipocytes):** NIH 3D and BodyParts3D have nothing at histology scale. The skin block is built from primitives instead. Sketchfab has CC models, mostly NC/ND. Zygote's skin cross-section is the paid fallback.",
          "- **Zygote** appears as priced options only (see DECISIONS 9 and 19)."]
(HERE / "MODELS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(len(out), "entries ·", sum(r["quality"] is not None for r in out), "rated ·", len(by), "structures")
