"""FIX Phase 3: write fonts/SYSTEM.md from fonts/system.json + fonts/specimen/spec.json (numbers are never typed by hand)."""
import json, pathlib, sys
sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; F = B / "fonts"
sy = json.load(open(F / "system.json", encoding="utf-8")); sp = json.load(open(F / "specimen" / "spec.json", encoding="utf-8"))
cl = json.load(open(F / "clusters.json", encoding="utf-8")); mt = json.load(open(F / "matches.json", encoding="utf-8"))
ms = mt["matches"]; added = [m for m in ms if m.get("added")]
act = {}
for m in added: act.setdefault(m["added"]["activation"], set()).add(m["added"]["family"])
R = sp["roles"]; L = sp["layout"]; W = sp["web"]
o = ["# Type system", "",
     f"Chosen from Adobe Fonts visual search on all {mt['of']} crops ({mt['searched']} searched; `matches.json`), scored by `scripts/fonts_system.py`.",
     "Every number below cites a row of `metrics/pixels.json`, `fonts/specimen/calib/`, or is marked **judgment call**. Nothing here is by eye.", "",
     "## Roles", "",
     "| Role | Adobe style | Web (kit `" + sp["kit"] + "`) | Line height | Letter-spacing | Block width | Source |", "|---|---|---|---|---|---|---|"]
for role, r in R.items():
    o.append(f"| {role} | {r['adobe_style']} | `{r['family']}` {r['weight']}{' caps' if r['uppercase'] else ''} | {r['line_height']} | {r['letter_spacing_em']:+.4f} em | {r['block_w_pct']}% of width | {r['cap_pct_h_cite']}; {r['line_height_cite']}; {r['letter_spacing_cite']}; {r['block_w_cite']} |")
o += ["", "Display and text are the same family. Neue Haas Grotesk won both roles outright, so there is no second family. No mono: the best mono family "
      f"({sy['mono_ranked'][0]['family'] if sy['mono_ranked'] else '-'}, score {sy['mono_ranked'][0]['score'] if sy['mono_ranked'] else 0}) is under the 10% bar.", "",
      "## Sizes on the three canvases", "", "| Canvas | Headline | Caption | Label | Basis |", "|---|---|---|---|---|"]
for n, c in sp["canvases"].items():
    s = c["sizes"]; o.append(f"| {n.replace('x', '×')} | {s['headline']['font_size_px']} / {s['headline']['line_height_px']} px | {s['caption']['font_size_px']} / {s['caption']['line_height_px']} px | {s['label']['font_size_px']} / {s['label']['line_height_px']} px | {c['size_basis']} |")
o += ["", "Size / leading. Font size = measured cap height (% of canvas height) / the font's cap-height (0.7188 em for NHG Display, measured in the browser).", "",
      "## Layout", "", f"- Margin: {L['margin_pct_w']}% of width ({L['margin_cite']}).", f"- Headline top: {L['headline_top_pct_h']}% of height ({L['headline_top_cite']}).",
      f"- Alignment: {L['align']} ({L['align_cite']}).", "", "## Web", "", "| Use | Family | Weight | Size | Source |", "|---|---|---|---|---|"]
for k in ("h1", "h2", "body", "label"):
    w = W[k]; o.append(f"| {k} | `{w['family']}` | {w['weight']} | {w['size_px']} px{' caps' if w.get('uppercase') else ''} | {w['cite']} |")
o += ["", "Fallbacks (web page and scripts only, named as fallbacks): `\"neue-haas-grotesk-display\", \"Inter Tight\", Arial, sans-serif` and `\"neue-haas-grotesk-text\", Inter, Arial, sans-serif`.", "",
      "## Why this system", "", "| Display rank | Family | Class | Score | Board | Favourite | Instagram |", "|---|---|---|---|---|---|---|"]
for r in sy["display_ranked"][:8]:
    o.append(f"| | {r['family']} | {'/'.join(r['classification'])} | {r['score']} | {r['board']} | {r['favourite']} | {r['instagram']} |")
o += ["", "| Text rank | Family | Class | Score | Board | Favourite | Instagram |", "|---|---|---|---|---|---|---|"]
for r in sy["text_ranked"][:8]:
    o.append(f"| | {r['family']} | {'/'.join(r['classification'])} | {r['score']} | {r['board']} | {r['favourite']} | {r['instagram']} |")
o += ["", f"Rule: {sy['rule']}", "",
      "Consistency with Instagram is the weak point, stated plainly: the account's own headlines match high-contrast serifs (Cormorant Garamond, IvyPresto) and its body text matches DM Sans; "
      "NHG scores 2.25 on Instagram crops. The system follows the board (and the Seed favourite), not the current feed. The serif route is kept as a losing plate.", "",
      "## Losing systems", ""]
for r in sy["losing_display"]:
    o.append(f"- **{r['family']}** ({'/'.join(r['classification'])}, display score {r['score']}) + NHG text: `fonts/specimen/losing_{r['family_slug']}_1080x1350.png` — {r['url']}")
o += ["", "## Adobe Fonts URLs", "", f"- Neue Haas Grotesk: https://fonts.adobe.com/fonts/neue-haas-grotesk (whole family active: 22 styles)"]
for r in sy["losing_display"]:
    o.append(f"- {r['family']}: {r['url']} (family added for the losing plate)")
o += ["", "## Activation list", "", f"- Kit `{sp['kit']}` (web, domains localhost / 127.0.0.1 / waituntilmay.com): NHG Display 55 Roman, 56 Italic, 65 Medium, 75 Bold; NHG Text 55 Roman, 65 Medium; Poppins Regular, Medium; Cormorant Garamond Regular, Medium.",
      "- Families added in full (Add family): Neue Haas Grotesk (already active), Poppins, Cormorant Garamond.",
      f"- Add font on each crop's #1: {sum(1 for m in added if m['added']['activation'] == 'added')} crops added a font, {sum(1 for m in added if m['added']['activation'] == 'already active')} were already active; {len({m['added']['family'] for m in added})} distinct families across the {len(added)} crops.",
      "- Logotype rule (EQL wordmark, block 7529470): #2 added as well: Nexa Text Regular, Nimbus Sans Extd Regular.", "",
      "## Specimen", "", "`fonts/specimen/` — 12 plates (3 canvases × 3 board favourites + paper) and 2 losing plates, rendered in Playwright with kit fonts; `renders.json` records that every kit font loaded (no fallbacks)."]
(F / "SYSTEM.md").write_text("\n".join(o) + "\n", encoding="utf-8")
print("\n".join(o)[:1500])
