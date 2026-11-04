"""Open-access figures from Europe PMC (Open-i is down; DECISIONS 4).

Per procedure: search OA articles 2015+ whose text mentions the procedure and illustration words,
read each article's JATS XML for figure captions + licence, keep figures whose caption reads like a
drawn graphic, and resolve the image URL from the PMC article page. Cache: refs/cache/epmc/{pid}.json
"""
import json, pathlib, re, sys, time, html
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
import requests

R = pathlib.Path(__file__).resolve().parents[1]
OUT = R / "cache/epmc"; OUT.mkdir(parents=True, exist_ok=True)
ART = R / "cache/epmc_art"; ART.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36"}
procs = json.load(open(R / "procedures.json", encoding="utf-8"))

KEEP = re.compile(r"schemat|illustrat|diagram|drawing|cartoon|depict|anatom|mechanism|layer|overview|algorithm|flow ?chart|injection (point|site|technique)|technique|artist|rendering|3D model|model of|summary|strateg|structure|process|pathway|principle|concept|classification|zone|danger|vessel|arter|muscle|nerve|compartment|plane|depth|location|position|landmark|steps?|design|marking", re.I)
DROP = re.compile(r"photograph|clinical (image|photo|appearance)|before and after|pre-?operative|post-?operative|histolog|h&e|hematoxylin|dermoscop|ultrasound (image|scan)|\bMRI\b|\bCT\b|micrograph|patient (at|after|before)|follow-?up|kaplan|forest plot|bar graph|box ?plot|scatter", re.I)

def q_for(p):
    n = re.split(r"[(:]", p["name"])[0].strip()
    terms = [n] + [a for a in p["aliases"][:3] if len(a) > 4]
    ors = " OR ".join(f'TITLE:"{t}" OR ABSTRACT:"{t}"' for t in terms)
    return f'({ors}) AND OPEN_ACCESS:y AND PUB_YEAR:[2015 TO 2026] AND SRC:PMC'

def get(url, **kw):
    for i in range(3):
        try:
            r = requests.get(url, headers=UA, timeout=40, **kw)
            if r.status_code == 200:
                return r
        except Exception:
            pass
        time.sleep(2 + i * 3)
    return None

def article(pmcid):
    f = ART / f"{pmcid}.json"
    if f.exists():
        return json.load(open(f, encoding="utf-8"))
    res = {"pmcid": pmcid, "figs": [], "license": None, "journal": None, "title": None}
    x = get(f"https://www.ebi.ac.uk/europepmc/webservices/rest/{pmcid}/fullTextXML")
    if x is None:
        json.dump(res, open(f, "w", encoding="utf-8")); return res
    try:
        root = ET.fromstring(x.content)
    except ET.ParseError:
        json.dump(res, open(f, "w", encoding="utf-8")); return res
    XL = "{http://www.w3.org/1999/xlink}href"
    lic = root.find(".//license")
    if lic is not None:
        href = lic.get(XL) or ""
        txt = " ".join("".join(lic.itertext()).split())
        m = re.search(r"creativecommons\.org/licenses/([a-z\-]+)/([\d.]+)", ET.tostring(lic, encoding="unicode"))
        res["license"] = (f"CC {m.group(1).upper()} {m.group(2)}" if m else (txt[:120] or href)) or None
    jt = root.find(".//journal-title"); res["journal"] = jt.text if jt is not None else None
    at = root.find(".//article-title"); res["title"] = " ".join("".join(at.itertext()).split()) if at is not None else None
    figs = []
    for fig in root.iter("fig"):
        cap = fig.find("caption")
        captxt = " ".join("".join(cap.itertext()).split()) if cap is not None else ""
        g = [gr.get(XL) for gr in fig.iter("graphic") if gr.get("content-type") != "thumb"]
        if g and g[0]:
            figs.append({"href": g[0], "caption": captxt[:600]})
    want = [fg for fg in figs if KEEP.search(fg["caption"]) and not DROP.search(fg["caption"])]
    paths = dict((pth.rsplit("/", 1)[-1], pth) for pth in re.findall(r"cloudpmc-path (blobs/[^?\s]+)\?", x.text))
    for fg in want:
        stem = re.sub(r"\.\w+$", "", fg["href"])
        hit = [v for k, v in paths.items() if re.fullmatch(re.escape(stem) + r"\.(jpg|png|gif)", k)]
        if hit:
            fg["url"] = "https://cdn.ncbi.nlm.nih.gov/pmc/" + hit[0]
    res["figs"] = [fg for fg in want if fg.get("url")]
    json.dump(res, open(f, "w", encoding="utf-8"))
    return res

def run(p):
    f = OUT / f"{p['id']}.json"
    if f.exists():
        return p["id"], "cached"
    r = get("https://www.ebi.ac.uk/europepmc/webservices/rest/search", params={"query": q_for(p), "format": "json", "pageSize": 20, "resultType": "lite", "sort": "CITED desc"})
    ids = [x["pmcid"] for x in (r.json()["resultList"]["result"] if r is not None else []) if x.get("pmcid")]
    rows = []
    for pmcid in ids[:14]:
        a = article(pmcid)
        for fg in a["figs"]:
            rows.append({"image": fg["url"], "thumb": fg["url"], "page": f"https://pmc.ncbi.nlm.nih.gov/articles/{pmcid}/",
                         "w": None, "h": None, "title": fg["caption"], "src": f"Europe PMC / {a['journal']}",
                         "license": a["license"], "article": a["title"]})
    json.dump({"pid": p["id"], "q": q_for(p), "rows": rows}, open(f, "w", encoding="utf-8"))
    return p["id"], len(rows)

with ThreadPoolExecutor(4) as ex:
    for pid, n in ex.map(run, procs):
        print(pid, n, flush=True)
