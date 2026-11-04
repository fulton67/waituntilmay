"""Build the per-procedure search plan -> refs/cache/queries.json (list of {pid, q})."""
import json, pathlib, re

R = pathlib.Path(__file__).resolve().parents[1]
procs = json.load(open(R / "procedures.json", encoding="utf-8"))

MAKER_SITES = {
    "InMode": "inmodemd.com", "Solta": "solta.com", "Candela": "candelamedical.com", "Cutera": "cutera.com",
    "BTL": "btlaesthetics.com", "Allergan": "allerganaesthetics.com", "Galderma": "galderma.com",
    "Evolus": "evolus.com", "Merz": "merzaesthetics.com", "Cynosure": "cynosure.com", "miraDry": "miradry.com",
    "Lumenis": "lumenis.com", "Revance": "revance.com", "Sinclair": "sinclair.com", "Eclipse": "eclipsemed.com",
    "BeautyHealth": "hydrafacial.com", "Crown": "crownaesthetics.com", "Moderna": "modernatx.com",
}
CAT_Q = {
    "neurotoxin": ["{n} injection points diagram", "{n} muscles anatomy illustration"],
    "filler": ["{n} injection technique diagram", "{n} anatomy layers illustration"],
    "biostimulator": ["{n} collagen stimulation diagram", "{n} injection plane illustration"],
    "regenerative": ["{n} growth factors diagram", "{n} process illustration"],
    "laser": ["{n} skin cross section laser diagram", "{n} wavelength target illustration"],
    "RF/energy": ["{n} skin layers energy depth diagram", "{n} technology illustration"],
    "surgical": ["{n} surgical steps illustration", "{n} incision anatomy diagram"],
    "skin-cancer": ["{n} skin layers diagram", "{n} illustration stages"],
    "medical-derm": ["{n} skin cross section diagram", "{n} pathophysiology illustration"],
    "body": ["{n} cross section diagram", "{n} how it works illustration"],
    "skincare": ["{n} skin penetration diagram", "{n} how it works skin illustration"],
    "wellness": ["{n} how it works diagram", "{n} illustration"],
}

def short(p):
    s = re.split(r"[(:]", p["name"])[0].strip()
    if p["category"] == "neurotoxin" and s.endswith("toxin") and not s.startswith("Neuro"):
        s = s[:-5].strip() + " Botox"
    return s

plan = []
for p in procs:
    n = short(p)
    qs = [f"{n} medical illustration", f"{n} mechanism of action diagram", f"{n} schematic"]
    qs += [t.format(n=n) for t in CAT_Q[p["category"]]]
    extras = p["search_terms"][1 + min(3, len(p["aliases"])):]  # the descriptive phrases written per entry
    for e in extras[:3]:
        qs.append(e if re.search(r"diagram|illustration|anatomy|layers|mechanism", e, re.I) else e + " diagram")
    if p["aliases"] and len(p["aliases"][0]) > 4:
        qs.append(f"{p['aliases'][0]} diagram")
    if p.get("manufacturer"):
        for k, dom in MAKER_SITES.items():
            if k.lower() in p["manufacturer"].lower():
                qs.append(f"{n} site:{dom}")
                break
    qs.append(f"{n} site:my.clevelandclinic.org")
    seen, out = set(), []
    for q in qs:
        k = q.lower()
        if k not in seen:
            seen.add(k); out.append(q)
    plan += [{"pid": p["id"], "q": q} for q in out]

(R / "cache").mkdir(exist_ok=True)
json.dump(plan, open(R / "cache/queries.json", "w", encoding="utf-8"), indent=0)
print(len(plan), "queries for", len(procs), "procedures")
