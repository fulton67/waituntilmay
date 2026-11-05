"""FIX Phase 3b (source): for every board block whose source is a web page, fetch the page and every linked stylesheet,
extract the declared type rules and font files, and read the font metrics with fontTools.
-> metrics/source.json (keyed by block id), metrics/fontfiles/ (gitignored: licensed font binaries, read not redistributed).
Two kinds of page: LIVE (the image is a screenshot of this page, so its CSS set the type) and HOST (a case study hosting
a raster; its CSS is the host's, but credits in its text may name the typeface). Run with brand-venv python -I."""
import json, pathlib, re, time, hashlib, io, urllib.request, urllib.error, urllib.parse
from collections import Counter
import tinycss2
from fontTools.ttLib import TTFont

B = pathlib.Path(__file__).resolve().parents[1]
M = B / "metrics"; FF = M / "fontfiles"; FF.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
LIVE = {24130326, 52340827, 26381730}  # blocks that are screenshots of the source page itself
SKIP = re.compile(r"pinterest\.|instagram\.|cdninstagram|fbcdn|linkedin\.com|arena-images|datocms-assets|cmail19|fyleio|tumblr\.com/|behance\.net/project_modules|sanity\.io|itsnicethat\.com/original")
FACE_WORDS = re.compile(r"\b(typeface|typefaces|font|fonts|typography|set in|lettering|type design|typeset)\b", re.I)

def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    r = urllib.request.urlopen(req, timeout=40)
    data = r.read()
    time.sleep(0.6)
    return data if binary else data.decode(r.headers.get_content_charset() or "utf-8", "replace")

def decls(css):
    """font-related declarations per selector, plus @font-face rules"""
    out, faces = [], []
    for rule in tinycss2.parse_stylesheet(css, skip_comments=True, skip_whitespace=True):
        if rule.type == "at-rule" and rule.lower_at_keyword == "font-face" and rule.content:
            d = {x.lower_name: tinycss2.serialize(x.value).strip() for x in tinycss2.parse_declaration_list(rule.content, skip_whitespace=True, skip_comments=True) if x.type == "declaration"}
            faces.append(d)
        elif rule.type == "at-rule" and rule.content and rule.lower_at_keyword in ("media", "supports", "layer"):
            o, f = decls(tinycss2.serialize(rule.content)); out += o; faces += f
        elif rule.type == "qualified-rule":
            sel = tinycss2.serialize(rule.prelude).strip()
            d = {x.lower_name: tinycss2.serialize(x.value).strip() for x in tinycss2.parse_declaration_list(rule.content, skip_whitespace=True, skip_comments=True)
                 if x.type == "declaration" and x.lower_name in ("font-family", "font-size", "font-weight", "letter-spacing", "line-height", "text-transform",
                                                                 "font", "--font", "margin", "padding", "grid-template-columns", "column-gap", "gap", "color", "background-color", "max-width")
                 or (x.type == "declaration" and x.lower_name.startswith("--"))}
            if d:
                out.append({"selector": sel[:160], **d})
    return out, faces

def font_metrics(path):
    f = TTFont(path, fontNumber=0, lazy=True)
    upm = f["head"].unitsPerEm
    os2 = f["OS/2"] if "OS/2" in f else None
    name = f["name"].getDebugName(4) or f["name"].getDebugName(1)
    kern_pairs = 0
    if "kern" in f:
        kern_pairs += sum(len(t.kernTable) for t in f["kern"].kernTables if hasattr(t, "kernTable"))
    if "GPOS" in f and f["GPOS"].table.LookupList:
        for lk in f["GPOS"].table.LookupList.Lookup:
            for st in lk.SubTable:
                st = getattr(st, "ExtSubTable", st)
                if getattr(st, "LookupType", None) == 2 or st.__class__.__name__ == "PairPos":
                    if getattr(st, "Format", 0) == 1:
                        kern_pairs += sum(len(ps.PairValueRecord) for ps in st.PairSet)
                    elif getattr(st, "Format", 0) == 2:
                        kern_pairs += st.Class1Count * st.Class2Count
    cap = getattr(os2, "sCapHeight", None) if os2 else None
    xh = getattr(os2, "sxHeight", None) if os2 else None
    hhea = f["hhea"]
    return {"name": name, "unitsPerEm": upm, "capHeight": cap, "xHeight": xh, "cap_em": round(cap / upm, 3) if cap else None,
            "x_em": round(xh / upm, 3) if xh else None, "ascender": hhea.ascent, "descender": hhea.descent, "lineGap": hhea.lineGap,
            "kern_pairs": kern_pairs, "weight_class": getattr(os2, "usWeightClass", None) if os2 else None}

blocks = json.load(open(B / "board" / "blocks_api.json", encoding="utf-8"))["blocks"]
res, nosource = {}, []
for b in blocks:
    src = b.get("source")
    if not src or SKIP.search(src) or re.search(r"\.(jpe?g|png|gif|webp)(\?|$)", src, re.I):
        nosource.append({"block": b["id"], "source": src, "why": "no source" if not src else "image file / social / pin, no page CSS"}); continue
    row = {"source": src, "kind": "LIVE" if b["id"] in LIVE else "HOST", "stylesheets": [], "rules": [], "font_faces": [], "font_files": [], "credits": [], "errors": []}
    try:
        html = fetch(src)
    except Exception as e:
        row["errors"].append(f"page: {e}"); res[b["id"]] = row; print(b["id"], "page failed", e); continue
    row["html_bytes"] = len(html)
    sheets = re.findall(r'<link[^>]+rel=["\']?stylesheet["\']?[^>]*href=["\']([^"\']+)', html, re.I) + re.findall(r'<link[^>]+href=["\']([^"\']+)["\'][^>]*rel=["\']?stylesheet', html, re.I)
    inline = re.findall(r"<style[^>]*>(.*?)</style>", html, re.S | re.I)
    css_all = [("inline", c) for c in inline]
    for s in dict.fromkeys(sheets):
        u = urllib.parse.urljoin(src, s.replace("&amp;", "&"))
        try:
            css = fetch(u); css_all.append((u, css)); row["stylesheets"].append({"url": u, "bytes": len(css)})
            for imp in re.findall(r'@import\s+(?:url\()?["\']?([^"\')]+)', css):
                iu = urllib.parse.urljoin(u, imp)
                try:
                    c2 = fetch(iu); css_all.append((iu, c2)); row["stylesheets"].append({"url": iu, "bytes": len(c2)})
                except Exception as e:
                    row["errors"].append(f"import {iu}: {e}")
        except Exception as e:
            row["errors"].append(f"css {u}: {e}")
    for base, css in css_all:
        d, faces = decls(css)
        row["rules"] += d
        for fc in faces:
            fc["_base"] = base
            row["font_faces"].append(fc)
    # font files from @font-face src (prefer woff2, then woff, then ttf/otf)
    seen = set()
    for fc in row["font_faces"]:
        urls = re.findall(r'url\(\s*["\']?([^"\')]+)["\']?\s*\)', fc.get("src", ""))
        urls = sorted(urls, key=lambda u: 0 if ".woff2" in u else 1 if ".woff" in u else 2)
        for u in urls[:1]:
            fu = urllib.parse.urljoin(fc["_base"] if fc["_base"] != "inline" else src, u)
            if fu in seen or fu.startswith("data:"):
                continue
            seen.add(fu)
            try:
                data = fetch(fu, binary=True)
                ext = ".woff2" if data[:4] == b"wOF2" else ".woff" if data[:4] == b"wOFF" else ".otf" if data[:4] == b"OTTO" else ".ttf"
                p = FF / f"{b['id']}_{hashlib.md5(fu.encode()).hexdigest()[:8]}{ext}"
                p.write_bytes(data)
                row["font_files"].append({"family": fc.get("font-family"), "weight": fc.get("font-weight"), "style": fc.get("font-style"), "url": fu,
                                          "file": str(p.relative_to(B)).replace("\\", "/"), "metrics": font_metrics(p)})
            except Exception as e:
                row["errors"].append(f"font {fu}: {str(e)[:120]}")
    text = re.sub(r"<script.*?</script>|<style.*?</style>", " ", html, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text); text = re.sub(r"\s+", " ", text)
    for m in FACE_WORDS.finditer(text):
        row["credits"].append(text[max(0, m.start() - 90): m.end() + 120].strip())
    row["credits"] = list(dict.fromkeys(row["credits"]))[:12]
    fams = Counter(r["font-family"].split(",")[0].strip(" '\"") for r in row["rules"] if "font-family" in r)
    row["families_declared"] = dict(fams.most_common(8))
    res[b["id"]] = row
    print(b["id"], row["kind"], len(row["stylesheets"]), "sheets", len(row["rules"]), "rules", len(row["font_files"]), "fonts", row["families_declared"])
json.dump({"pages": res, "no_usable_source": nosource}, open(M / "source.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print("pages", len(res), "no source", len(nosource))
