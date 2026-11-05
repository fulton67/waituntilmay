"""metrics/SOURCE.md: declared type rules and font-file metrics (source.json) against the pixel measurements (pixels.json)
for the same blocks. Run after source_metrics.py and pixel_metrics.py."""
import json, pathlib, statistics as st
B = pathlib.Path(__file__).resolve().parents[1]; M = B / "metrics"
src = json.load(open(M / "source.json", encoding="utf-8")); px = json.load(open(M / "pixels.json", encoding="utf-8"))
reg = {}
for r in px["regions"]:
    reg.setdefault(r["image"], []).append(r)
med = lambda v: round(st.median(v), 3) if v else None
L = ["# Source metrics vs pixels", "", "`source.json` holds every board block whose source is a web page: the page and all its stylesheets, the declared font rules, "
     "the @font-face files read with fontTools (unitsPerEm, cap height, x-height, kerning pairs), and any typeface credits in the page text. "
     "LIVE = the board image is a screenshot of that page, so its CSS set the pictured type. HOST = a case study or gallery hosting a raster: its CSS is the host's own.", "",
     "| Block | Kind | Declared / credited | Font files (x/cap from the file) | Pixel x/cap (median, n) | Verdict |", "|---|---|---|---|---|---|"]
for bid, p in src["pages"].items():
    files = p.get("font_files", [])
    fx = [f"{f['metrics']['name']}: {round(f['metrics']['xHeight']/f['metrics']['capHeight'],3) if f['metrics'].get('xHeight') and f['metrics'].get('capHeight') else '—'} (upm {f['metrics']['unitsPerEm']}, {f['metrics']['kern_pairs']} kern pairs)" for f in files if f['metrics'].get('name') not in ('.', None) and len(f['metrics']['name']) > 1]
    pv = [r["x_over_cap"] for r in reg.get(bid, []) if r.get("x_over_cap")]
    decl = ", ".join(list((p.get("families_declared") or {}).keys())[:4]) or "—"
    cred = "; ".join(c[:90] for c in p.get("credits", [])[:1] if "Fonts by" in c or "typeface" in c.lower() or "serif" in c.lower())
    fxv = [round(f['metrics']['xHeight']/f['metrics']['capHeight'], 3) for f in files if f['metrics'].get('xHeight') and f['metrics'].get('capHeight')]
    if p.get("kind") == "LIVE" and pv and fxv:
        diff = min(abs(med(pv) - v) for v in fxv)
        verdict = f"agree within {diff:.3f}" if diff < 0.05 else f"differ by {diff:.3f}: trust the font file (exact), the pixel value carries OCR box and antialiasing error"
    elif p.get("kind") == "LIVE":
        verdict = "declared face only; no file to compare" if not fxv else "no pixel rows (text under the 24 px x-height floor)"
    elif p.get("errors") and not files and not decl.strip("—"):
        verdict = "no usable source: " + p["errors"][0][:60]
    else:
        verdict = "host page: its fonts describe the host, not the image; credits used as a lead only"
    L.append(f"| {bid} | {p.get('kind','?')} | {decl}{(' — ' + cred) if cred else ''} | {'<br>'.join(fx) or '—'} | {med(pv)} (n={len(pv)}) | {verdict} |")
L += ["", "## What the sources say", "",
      "- **24130326 waysintopractice.no (LIVE):** STK Bureau Serif (Book, Light) for text, STK Bureau Sans for UI. The pictured serif in that screenshot is STK Bureau Serif; compare x/cap above.",
      "- **26381730 Zara (LIVE, read in Chrome):** Helvetica Now Text at 300 for body, uppercase at 12 px / 20 px with 0.8 px tracking for nav (+6.7% em).",
      "- **52340827 aaron-meyers.com (LIVE):** Arial, the system default.",
      "- **14664481 SIJO (favourite, HOST):** High Tide's own site uses GT America (Light, Medium) and Lyon. High Tide designed SIJO, and the SIJO serif crop has Lyon-like proportions, but the host CSS is not proof of the brand's face.",
      "- **13828406 Wallace Corp (HOST):** the shot credits 'Fonts by Pangram Pangram Foundry'.",
      "- **16453124 Eadem (HOST):** the case study names no face, only 'a mix of serif and sans serif'.",
      "- **7529470 EQL (favourite):** Behance returned 403, then redirected to Adobe sign-in in Chrome; no face credited in the text read.", "",
      f"## No usable source ({len(src['no_usable_source'])} blocks)", "",
      "Image files, Instagram/Pinterest/LinkedIn pins and CDN links carry no page CSS: " + ", ".join(f"{x['block']}" for x in src["no_usable_source"]) + "."]
(M / "SOURCE.md").write_text("\n".join(L) + "\n", encoding="utf-8")
print("\n".join(L[:30]))
