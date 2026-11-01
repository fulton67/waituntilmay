"""data/questions_raw.json -> data/questions.json.

The 137 question-shaped comments were read by hand (2026-11-01); the map below keeps the ~45 that are real questions a
cosmetic derm could answer, with topic + the Ostad service. Jokes, insults, off-topic and "who's recording" were dropped.
`covered` is computed: how many WINNING corpus videos carry a matching topic tag. 0 = open lane.
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
# index in questions_raw.json -> (topic, Ostad service, tags that would count as an answering video, optional English gloss)
KEEP = {
    0: ("rosacea / demodex", "Rosacea treatment (lasers, Rx)", ["rosacea", "demodex"]),
    75: ("rosacea / demodex", "Rosacea treatment (lasers, Rx)", ["rosacea", "demodex"]),
    4: ("sunscreen: do we need it?", "Skincare line: Sun Shade", ["sunscreen", "spf"]),
    5: ("sunscreen + retinoids", "Skincare line: Ret Nia + Sun Shade", ["sunscreen", "retinoids", "retinol", "tretinoin"]),
    15: ("sunscreen on the body", "Skin cancer prevention", ["sunscreen", "skin cancer"]),
    28: ("reapplying sunscreen over makeup", "Skincare line: Sun Shade tints", ["sunscreen"]),
    64: ("sunscreen for oily skin", "Skincare line: Sun Shade", ["sunscreen"]),
    76: ("which sunscreen", "Skincare line: Sun Shade", ["sunscreen"]),
    7: ("GLP-1 / Ozempic for cosmetic reasons", "GLP-1 skin laxity: Sculptra, Morpheus8, EMFACE", ["glp1", "ozempic", "ozempic face"]),
    8: ("retinol vs tretinoin", "Skincare line: Ret Nia serums", ["retinoids", "retinol", "tretinoin"]),
    9: ("which retinoid, on a budget", "Skincare line: Ret Nia serums", ["retinoids", "retinol", "tretinoin"]),
    16: ("retinoid every day, moisturizer?", "Skincare line: Ret Nia serums", ["retinoids", "retinol", "tretinoin"]),
    108: ("retinoid for textured skin", "Fraxel / Clear + Brilliant", ["retinoids", "texture", "retinol"]),
    22: ("preventative Botox in your 20s", "Botox / Jeuveau", ["botox", "prejuvenation", "baby botox"]),
    98: ("how often to repeat Botox (Tagalog: 'how many months until Botox again?')", "Botox / Jeuveau", ["botox"]),
    24: ("does it hurt?", "Every procedure: consult content", ["pain"]),
    30: ("azelaic acid stings + breakouts", "Acne / rosacea treatment", ["azelaic acid", "acne", "rosacea"]),
    36: ("skincare routine for teens", "Acne, AviClear", ["acne", "teen"]),
    126: ("skincare routine for teen girls", "Acne, AviClear", ["acne", "teen"]),
    38: ("routine for your 30s", "Skincare line regimen sets", ["routine", "anti-aging", "prejuvenation"]),
    18: ("does it work on lighter skin too?", "Laser / pigmentation treatment", ["hyperpigmentation", "laser"]),
    41: ("is it safe on brown skin prone to hyperpigmentation?", "Ethnic Skin Tones: lasers, peels", ["skin of color", "hyperpigmentation", "dark skin"]),
    43: ("breaks out from every product", "Acne / sensitive skin", ["acne", "sensitive skin", "skin barrier"]),
    52: ("perioral dermatitis from a cleanser", "Medical dermatology", ["perioral dermatitis"]),
    19: ("damaged skin barrier routine", "Skincare line", ["skin barrier"]),
    80: ("how long a skin barrier takes to heal", "Skincare line", ["skin barrier"]),
    83: ("tight, dry skin despite moisturizer", "Skincare line", ["skin barrier", "dry skin"]),
    87: ("sunscreen on a damaged barrier", "Skincare line: Sun Shade", ["skin barrier", "sunscreen"]),
    47: ("microneedling aftercare", "Morpheus8 / microneedling", ["microneedling", "morpheus8"]),
    104: ("purging after microneedling", "Morpheus8 / microneedling", ["microneedling", "morpheus8"]),
    91: ("microneedling or HydraFacial?", "Morpheus8, HydraFacial", ["microneedling", "hydrafacial", "morpheus8"]),
    101: ("how many sessions?", "Morpheus8 / lasers", ["microneedling", "morpheus8"]),
    106: ("how often after the first round?", "Morpheus8 / lasers", ["microneedling", "morpheus8"]),
    110: ("recovery time", "Morpheus8 / lasers", ["downtime", "recovery", "morpheus8"]),
    112: ("when can I wear foundation after?", "Morpheus8 / lasers", ["downtime", "recovery"]),
    105: ("what if you scar easily?", "Scar revision, keloids", ["scars", "keloid", "acne scars"]),
    114: ("is it OK with melasma?", "Melasma: PicoWay, peels, LUMA Cream", ["melasma"]),
    127: ("will this work for melasma?", "Melasma: PicoWay, peels, LUMA Cream", ["melasma"]),
    63: ("how much does it cost?", "Every treatment: price content", ["pricing", "cost", "price"]),
    85: ("how long does it last?", "Fillers / Botox / devices", ["longevity", "filler", "botox"]),
    58: ("how deadly is skin cancer?", "Mohs / skin cancer", ["skin cancer", "melanoma", "basal cell"]),
    59: ("basal cell is rarely deadly, so why cut so much?", "Mohs surgery + reconstruction", ["mohs", "basal cell", "skin cancer"]),
    73: ("should I be worried about this spot?", "Skin cancer check", ["melanoma", "skin cancer", "mole"]),
    90: ("should I worry about a spot on my foot?", "Skin cancer check", ["melanoma", "skin cancer", "mole"]),
    134: ("what test catches it?", "Skin cancer check", ["skin cancer", "skin check"]),
    65: ("are LED masks and collagen tablets worth it?", "In-office devices vs at-home", ["led", "collagen", "supplements"]),
    79: ("collagen powder: worth it?", "Skincare line: supplements", ["collagen", "supplements"]),
}


def main():
    raw = json.loads((ROOT / "data/questions_raw.json").read_text(encoding="utf-8"))
    vids = json.loads((ROOT / "data/videos.json").read_text(encoding="utf-8"))
    wins = [v for v in vids if v.get("winning")]
    out = []
    for i, (topic, service, tags) in KEEP.items():
        x = raw[i]
        n = sum(1 for v in wins if any(t in (v.get("topic_tags") or []) for t in tags))
        out.append(dict(q=x["q"], likes=x["likes"], replies=x["replies"], from_=x["from"], url=x["url"], video_id=x["video_id"],
                        topic=topic, service=service, covered=f"yes ({n} winners)" if n >= 2 else ("thin (1 winner)" if n == 1 else "no — open lane"),
                        winners=n))
    for o in out:
        o["from"] = o.pop("from_")
    out.sort(key=lambda o: -o["likes"])
    (ROOT / "data/questions.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(len(out), "questions;", sum(o["winners"] == 0 for o in out), "open lanes")


if __name__ == "__main__":
    main()
