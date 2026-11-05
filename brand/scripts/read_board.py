"""board/keys.txt + the by-eye reading of every block (from board/sheets/*.jpg) -> board/blocks.json, board/READ.md"""
import json, pathlib
from collections import defaultdict

B = pathlib.Path(__file__).resolve().parents[1] / "board"
# id: (group, what it is, why it is probably on the board)
R = {
 "24130326": ("layout", "dark editorial site: a row of portrait cards with episode metadata (duration, location, PLAY / ARTICLE)", "series/episode framing for his videos; small metadata under portraits"),
 "41432513": ("product-ui", "frosted-glass ingredient cards on a soft green botanical photo; pill tags", "clinical-natural: ingredients as tagged cards, glass panels over photography"),
 "52386109": ("markup", "Chesnut MD before/after with hand-drawn surgeon's pen markup (tear trough, fat pads, upper lip)", "what gets marked on a face; the before/after header (name, BEFORE/AFTER)"),
 "38944212": ("editorial", "Wild Nutrition spread: skin close-up, thin rules, tiny serif text blocks", "quiet luxury layout; skin texture as hero; hairline rules"),
 "12400773": ("callout", "capsule held in fingers with thin white leader lines to spaced small-caps claims", "the editorial product callout: hairline leaders + tracked caps"),
 "30940781": ("callout", "profile face on blue with vertical leader lines to rotated step labels; hairline box title", "skin routine as a diagram over a face; vertical type"),
 "52302251": ("type-over-photo", "UdK Berlin poster: extreme close-up smiling face, grotesk headline + small info", "tight face crops; big grotesk over portrait"),
 "52020245": ("type", "foil-texture poster with heavy black grotesk headline, small body text", "heavy grotesk + material texture"),
 "52340827": ("layout", "grey site with tiny highlighted text labels top-left (Aaron Meyers)", "minimal web, highlight boxes on small type"),
 "26381730": ("type-over-photo", "VANILLA: macro flower, bold black grotesk title + small body", "botanical macro + strong grotesk"),
 "28246874": ("type-over-photo", "Embrace What's Natural: full-bleed skin texture, thin serif headline scattered, small sans data", "skin macro as background; serif + sans pairing; scattered headline"),
 "15688099": ("story-format", "three phone mockups (grid feed, gradient story, product)", "story/feed system as one family"),
 "2145281": ("type-over-photo", "FAV Reve Humide: nude skin crop, vertical stacked caps in pale mint on a frosted band", "skin as image; vertical grotesk caps; frosted translucent panel; mint on skin pink"),
 "13902728": ("story-format", "escola.studio IG story: black, serif italic + sans text blocks, rules", "story as editorial page"),
 "12087163": ("motion", "animated story mockup (gif): white card on black", "story motion reference"),
 "27454113": ("carousel", "Pure Finance: black slide, small white sans copy, dot + page count 1/9", "text carousel system with page counter"),
 "27454118": ("carousel", "Pure Finance: dark brown slide, small sans copy, 1/6", "warm dark ground for text slides"),
 "27647159": ("type", "Wanted: Design Intern, huge light grotesk INT, small pill tag, light grey ground", "light-weight huge type + pill tag"),
 "30248124": ("type", "Photobook Awards Finalist: grotesk at two sizes on light grey, corner info", "announcement layout: corners + one huge word"),
 "31223791": ("type-over-photo", "this Friday 11 10 2024: huge grotesk numerals overlapping a small photo; serif info line", "date/event announcement; type over image"),
 "32197302": ("quote", "We believe imperfection...: centred black grotesk quote on light grey, small caps name", "quote card format"),
 "47483045": ("type-over-photo", "ARTAH yoga: glowing skin close-up, tiny serif caption line", "warm sunlit skin; minimal text"),
 "47483050": ("type-over-photo", "ARTAH Take this: lips/fruit macro, big serif wordmark, Step 1 body with rule", "step-by-step instruction card over macro"),
 "13828406": ("story-format", "three phone stories: portraits with mono/condensed caps + barcodes", "story series with tech-mono labels"),
 "13607089": ("type-over-photo", "Eva Habermann site: face close-up, large white grotesk list, round play button", "type list over a face"),
 "34771058": ("story-format", "three stories on beige: 'A place to simply be.' small serif, photos", "calm beige story system"),
 "11460382": ("story-format", "dous.studio story: 'Doctor Otero - Aplicacion de marca' white grotesk on black, pill tags", "a doctor's brand identity: direct precedent"),
 "7529470": ("story-format", "FAV EQL stories: 8 selfie portraits with a huge thin geometric EQL wordmark broken across the frame, tiny caps repeats", "faces + oversized letterforms cut over them; repeated micro-caps grid"),
 "16463981": ("layout", "candle site: mono/typewriter caps, timeline markers over product photo", "mono metadata + timeline device"),
 "23958815": ("markup", "portrait with typewriter annotation fields (eye colour, status...) and leader lines", "face annotated like a form; clinical file aesthetic"),
 "22772082": ("type-over-photo", "Wine Making in a Warming World: grape held in fingers macro, corner words", "macro held object + four-corner type"),
 "31815447": ("markup", "portrait with a vertical ruler of tiny numbers along the face", "measurement marks on a face"),
 "34126462": ("callout", "blurred leaf with dotted constellation line and small caps nodes", "dot-and-line path as a progress device"),
 "41911984": ("product-ui", "FAV Seed DS-01: frosted green glass phone card over green texture, product photo in a rounded rect, pill button", "frosted glass panels, rounded rects, product card; muted green"),
 "38275156": ("motion", "gif: dark cycling jersey, hands pulling fabric", "texture/material motion"),
 "33635746": ("type", "Sat 11th Jan: heavy grotesk + mono line-up list with dotted leaders over teal photo", "event poster, mono list with dot leaders"),
 "30880633": ("type-over-photo", "Deluge: b/w hair from behind, dense white caps text block", "monochrome beauty + text block"),
 "21587531": ("callout", "selfie with product callout boxes and leader lines", "product callouts around a face"),
 "24946075": ("motion", "gif: close-up face, grain", "raw close-up motion"),
 "38155009": ("type-over-photo", "Omni CoLab: face profile with a glowing red laser line across, pale circles", "energy as a light line over skin: a laser device metaphor"),
 "32335068": ("grid", "Typology grid: skincare product, green liquids, hands, faces, white wordmark", "lab-clean product photography system"),
 "47161957": ("motion", "gif: shirt photo inside a perforated stamp frame", "frame/border device"),
 "47311638": ("type-over-photo", "A Facialist's Guide to Summer Skin: calla lily on black, serif + italic", "dark botanical + serif title"),
 "43001699": ("motion", "gif: pattern of beauty tools/products on white", "object pattern animation"),
 "16453124": ("story-format", "four phone stories: skin textures, 'SMART MELANIN Technology', small serif", "skin science stories"),
 "2527310": ("motion", "gif: Helmut Lang velcro vest on black, serif italic + small caps", "product on black, minimal type"),
 "34175362": ("callout", "EADEM: portrait with product, step progress dots across the top, small caps", "routine steps as a dotted progress bar"),
 "14664481": ("story-format", "FAV SIJO stories: big spaced mono letters in corners, serif italic + caps title, mono labels with slashes, serif body columns", "corner letterforms, serif/mono pairing, warm neutral photography"),
 "52313969": ("layout", "Tier list of facial hair styles: portrait with colour tier chips, serif italic", "playful explainer format (tier list)"),
 "50510620": ("editorial", "magazine spread: large serif pull quote, vertical small caps", "editorial serif interview layout"),
 "39832259": ("type", "List of beautiful books: grotesk numerals grid with tiny images", "numeric/index typography"),
 "40898406": ("type-over-photo", "red slip portrait, vertical small caps, line logo", "vertical caps on fashion photo"),
 "36747221": ("type", "Demande Speciale: big grey 7 behind a data table in grotesk", "data sheet typography, big numeral"),
}
FAV = {"7529470", "14664481", "41911984", "2145281"}

blocks = []
for line in (B / "keys.txt").read_text().splitlines():
    if not line.strip():
        continue
    bid, f = line.split()
    g, what, why = R[bid]
    blocks.append({"id": int(bid), "class": "Image", "file": f"img/{bid}_{f}", "source": f"https://www.are.na/block/{bid}",
                   "group": g, "what": what, "why": why, "favourite": bid in FAV, "animated": f.endswith(".gif")})
json.dump(blocks, open(B / "blocks.json", "w", encoding="utf-8"), indent=1)

by = defaultdict(list)
for b in blocks:
    by[b["group"]].append(b)
L = ["# The board, read", "",
     "`dr-ostad` (are.na/naim-johnson/dr-ostad, private): 56 blocks listed, 53 image blocks captured at full size. "
     "★ = one of Naim's four favourites (sent in chat 2026-11-05). Every block was looked at on `sheets/`.", ""]
for g in sorted(by, key=lambda g: -len(by[g])):
    L += [f"## {g} ({len(by[g])})", ""]
    L += [f"- {'★ ' if b['favourite'] else ''}`{b['id']}` {b['what']}: *{b['why']}*" for b in by[g]]
    L.append("")
L += ["## What the board is saying", "",
      "1. **Faces and skin, cropped tight, are the image.** 20+ blocks put a face or a skin macro full-bleed and let type sit on it. For a dermatologist, that is the subject itself.",
      "2. **Grotesk does the shouting, serif does the talking, mono does the data.** Headlines are heavy or huge-and-light grotesk. Warm lines are serif, often italic. Labels and metadata are typewriter/mono (SIJO, the EQL micro-caps, the candle, Sat 11th).",
      "3. **Hairline leaders and tracked small caps** are the callout language (12400773, 30940781, 21587531, 23958815). This is the same register OSTAD_MARKUP.md asks for.",
      "4. **Frosted translucent panels** sit over photography (DS-01, Reve Humide, the ingredient cards): clinical without being cold.",
      "5. **Muted naturals:** warm skin, beige/sand, sage/muted green, black and light-grey grounds, plus one cool accent (pale mint, teal).",
      "6. **Story systems, not one-offs.** Half the board is phones in a row. He wants a family of formats that repeats.",
      "7. **Oversized letterforms broken across the frame** are the identity device (EQL, the SIJO corner letters, INT, the 7).", ""]
(B / "READ.md").write_text("\n".join(L), encoding="utf-8")
print(len(blocks), {g: len(v) for g, v in by.items()})
