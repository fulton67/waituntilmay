"""Tag a source's phrases.json against the tag guide, without hand reading.

Blum's 1,366 phrases were tagged by hand in batches. Twelve more sources is
not a hand job, so the guide's rules are written out here as lexicon and
grammar tests - one block per tag, in the guide's own words - and the result
is scored against those hand tags to say how far it can be trusted.

The guide's two structural rules are enforced rather than hoped for: every
phrase carries at least one tag, and `filler` is exclusive and is what a
phrase gets when nothing else fires.

Where precision and recall pull against each other the rules lean toward
keeping a phrase selectable: a wrong content tag costs a slightly wrong
selection weight, a wrong `filler` costs the phrase entirely.

  python scripts/autotag.py tag --source sources/swartz
  python scripts/autotag.py validate
"""
import argparse
import json
import os
import re
import sys
from collections import Counter

# the original ten, plus the two this material needs
BASE = ["physical", "abstract", "definition", "people", "doubt", "scale",
        "water", "inside", "real"]
EXTRA = ["attack", "cut"]
VALID = set(BASE + EXTRA + ["filler"])

# --------------------------------------------------------------- the rules
# STRONG: the thing itself, fires on one hit. WEAK: nearby vocabulary, needs
# two. The split is the guide's: "tag on what the words say".
STRONG = {
    "physical": [
        r"\bcable", r"\bfib(er|re)", r"\btube", r"\bconduit", r"\bduct\b",
        r"\brouter", r"\bmanhole", r"\bserver", r"\bmachine", r"\bhardware",
        r"\bbuilding", r"\bwarehouse", r"\bdata cent", r"\bwires?\b",
        r"\bsteel\b", r"\bcopper\b", r"\bconcrete\b", r"\bsatellite",
        r"\bdrone", r"\bmissile", r"\bships?\b", r"\bvessel", r"\bboat",
        r"\bairstrike", r"\bweapon", r"\bstation\b", r"\bairwaves\b",
        r"\btelevision\b", r"\bradio\b", r"\bprinting press\b", r"\btruck",
        r"\bequipment\b", r"\binfrastructur", r"\brepeater", r"\bantenna",
        r"\bdesk\b", r"\bbooks?\b", r"\bdoor\b", r"\bwindow", r"\bwalls?\b",
        r"\btable\b", r"\bcit(y|ies)\b", r"\btown\b", r"\bnew york\b",
        r"\blondon\b", r"\bgoogle\b", r"\bmicrosoft\b", r"\bfloors?\b",
        r"\broof\b", r"\bbasement\b", r"\bstreets?\b", r"\bmap\b",
        r"\bpaper\b", r"\bscreen\b", r"\bcomputer", r"\bphone\b",
        r"\bcamera\b", r"\bbox(es)?\b", r"\bbridge\b", r"\btunnel",
        r"\brailway\b", r"\broad\b", r"\bdirt\b", r"\bsand\b", r"\brock\b",
        r"\bstone\b", r"\bfactory\b", r"\bgenerator\b", r"\bpower plant\b",
        r"\belectricit", r"\bvoltage\b", r"\brack\b", r"\bgrid\b",
    ],
    "abstract": [
        r"\binternet\b", r"\bnetwork", r"\bcloud\b", r"\binformation\b",
        r"\bdata\b", r"\bvirtual", r"\bmetaphor", r"\bideas?\b",
        r"\barchitecture\b", r"\bsystem\b", r"\bdemocra", r"\bpolitic",
        r"\bideolog", r"\bculture\b", r"\bknowledge\b", r"\bfreedom\b",
        r"\bcopyright\b", r"\bcensorship\b", r"\bpower\b", r"\bcontrol\b",
        r"\btranscendent\b", r"\bdistributed\b", r"\bbroadcast",
        r"\bidentity\b", r"\bimagin", r"\babstract", r"\bsymbol",
        r"\bstory\b", r"\bhistory\b", r"\bmemory\b", r"\bthought\b",
        r"\bbelie(f|ve)", r"\bmind\b", r"\bsense of\b", r"\bnotion\b",
        r"\btheory\b", r"\beconom", r"\bmeaning\b", r"\bconcept",
    ],
    "definition": [
        r"\b(is|are|was|were)\b", r"\b(it's|that's|there's|he's|she's)\b",
        r"\b(isn't|aren't|wasn't|weren't)\b",
        r"\bdefinition of\b", r"\bmeans\b", r"\bin other words\b",
        r"\bwhich (is|are|was|were)\b", r"\bcalled\b", r"\bknown as\b",
        r"\bbecomes?\b", r"\bbecame\b", r"\bturns out\b",
        r"\bconsists? of\b", r"\bmade (up )?of\b", r"\bamounts? to\b",
    ],
    "people": [
        r"\bpeople\b", r"\bperson\b", r"\bever(yone|ybody)\b",
        r"\bengineer", r"\bworker", r"\bemployee", r"\baudience\b",
        r"\bhouthis?\b", r"\byemenis?\b", r"\bsoldier", r"\bcivilian",
        r"\bpopulation\b", r"\bgovernment\b", r"\brebel", r"\bmilitia",
        r"\bjournalist", r"\bactivist", r"\bcrew\b", r"\bsailor",
        r"\bI\b", r"\bwe\b", r"\bus\b", r"\bour\b", r"\bmy\b", r"\bme\b",
        r"\bshe\b", r"\bher\b", r"\bhe\b", r"\bhim\b", r"\bhis\b",
        r"\bthey\b", r"\bthem\b", r"\btheir\b", r"\byou\b", r"\byour\b",
        r"\bsaid\b", r"\bsays?\b", r"\btold\b", r"\basked\b", r"\bwrote\b",
        r"\bspoke\b", r"\bguys?\b", r"\bwom[ae]n\b", r"\bm[ae]n\b",
        r"\bfolks\b", r"\bkids\b", r"\bfamil", r"\bcommunity\b",
        r"\bnames?\b", r"\bmr\.", r"\bmrs\.", r"\bdr\.",
    ],
    "doubt": [
        r"\bnot\b", r"n't\b", r"\bnever\b", r"\bnothing\b", r"\bnobody\b",
        r"\bno one\b", r"\bmaybe\b", r"\bperhaps\b", r"\bapparently\b",
        r"\bsupposedly\b", r"\bseem", r"\bhardly\b", r"\bdoubt",
        r"\bunclear\b", r"\bprobably\b", r"\ballegedly\b", r"\bquote\b",
        r"\bclaim", r"\bso-called\b", r"\?",
        r"^\s*(what|where|who|why|how|when|is|are|do|does|did|can|could|would|should)\b",
        r"\bguess\b", r"\bsuppose\b", r"\bstrange\b", r"\bweird\b",
        r"\babsurd\b", r"\bimpossible\b", r"\bnor\b", r"\bbarely\b",
        r"\bsomehow\b",
    ],
    "scale": [
        r"\b\d", r"\bhundred", r"\bthousand", r"\bmillion", r"\bbillion",
        r"\btrillion", r"\bpercent\b", r"\bgigabit", r"\bmegabit",
        r"\bmiles?\b", r"\bkilomet", r"\bmet(re|er)s?\b",
        r"\bhow (many|much|far|long|big)\b", r"\bhalf\b", r"\bdozen",
        r"\bentire\b", r"\bhuge\b", r"\bmassive\b", r"\bgiant\b",
        r"\btiny\b", r"\bper second\b",
        r"\b(two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|thirty|forty|fifty)\b",
        r"\b(first|second|third)\b", r"\byears?\b", r"\bmonths?\b",
        r"\bdays?\b", r"\bweeks?\b", r"\bhours?\b", r"\bminutes?\b",
        r"\bdecade", r"\bcentury\b",
        r"\b(january|february|march|april|june|july|august|september|october|november|december)\b",
        r"\bwhole\b", r"\bbunch\b", r"\bcouple\b", r"\bscale\b", r"\bsize\b",
    ],
    "water": [
        r"\bwater\b", r"\bunderwater\b", r"\bundersea\b", r"\bocean",
        r"\bseas?\b", r"\bred sea\b", r"\bbeach", r"\bshore", r"\bcoast",
        r"\bharbou?r", r"\bisland", r"\bport\b", r"\bmaritime\b",
        r"\bnavals?\b", r"\bnavy\b", r"\bgulf\b", r"\bstrait", r"\bbab al",
        r"\batlantic\b", r"\bpacific\b", r"\blisbon\b", r"\bcornwall\b",
        r"\bshipping\b", r"\bcable ship\b", r"\blanding (point|station)\b",
        r"\bseabed\b", r"\bocean floor\b", r"\btanker", r"\bfreighter",
    ],
    "inside": [
        r"\binside\b", r"\binto\b", r"\bthrough\b", r"\bunder(neath)?\b",
        r"\bbeneath\b", r"\bwithin\b", r"\bcent(er|re)\b", r"\bcore\b",
        r"\bcrossing\b", r"\benter", r"\bbehind\b", r"\binterior\b",
        r"\bburied\b", r"\bdeep", r"\bbelow\b", r"\bacross\b",
        r"\binternal\b", r"\bembedded\b", r"\bin (there|here)\b",
        r"\bmiddle\b", r"\bbottom\b", r"\bout of\b",
        r"\bpass(es|ing|ed)? through\b", r"\bstepped\b", r"\bentrance\b",
        r"\bboundar", r"\bborder\b", r"\bedge\b", r"\bsurface\b", r"\bdug\b",
    ],
    "real": [
        r"\breal\b", r"\breally\b", r"\breality\b", r"\bactual", r"\bphysical",
        r"\btangible\b", r"\bmaterial\b", r"\bconcrete\b", r"\ba place\b",
        r"\ba thing\b", r"\bexist", r"\bliterally\b", r"\bin fact\b",
        r"\btruly\b", r"\bgenuinely\b", r"\bsolid\b", r"\bsubstance\b",
        r"\bflesh\b", r"\bpresence\b", r"\bthere it is\b",
    ],
    # this material's two, from the words the brief named
    "attack": [
        r"\bstrike", r"\bstruck\b", r"\bhits?\b", r"\btarget",
        r"\battack", r"\bdrone", r"\bmissile", r"\bbomb", r"\bshoot",
        r"\bshot\b", r"\bfired? (at|on|upon)\b", r"\blaunch", r"\bwar\b",
        r"\bmilitar", r"\bairstrike", r"\bretaliat", r"\bassault\b",
        r"\boffensive\b", r"\bescalat", r"\bstrikes?\b",
    ],
    "cut": [
        r"\bcable", r"\bcuts?\b", r"\bsever", r"\bdamage", r"\boutage",
        r"\brepair", r"\bdisrupt", r"\bbroken?\b", r"\bconnectivity\b",
        r"\bdisconnect", r"\brestor", r"\bsabotage\b",
        r"\binternet\b.{0,24}\bdown\b", r"\bdown\b.{0,24}\binternet\b",
    ],
}

WEAK = {
    "physical": [r"\bplace\b", r"\bground\b", r"\bhut\b", r"\bdepot\b",
                 r"\broom\b", r"\bland\b", r"\bmetal\b"],
    "abstract": [r"\bonline\b", r"\bweb\b", r"\bdigital\b", r"\bmedia\b",
                 r"\bcommunicat", r"\bsociet"],
    "definition": [r"\bbasically\b", r"\bessentially\b", r"\bkind of\b",
                   r"\bsort of\b", r"\bin a sense\b"],
    "people": [r"\bbody\b", r"\bhands?\b", r"\bvoice\b", r"\bsomeone\b"],
    "doubt": [r"\bbut\b", r"\bhowever\b", r"\balthough\b", r"\bthough\b",
              r"\bwhether\b"],
    "scale": [r"\blots? of\b", r"\bmany\b", r"\bfew\b", r"\bbigger\b",
              r"\bsmaller\b", r"\bevery\b"],
    "water": [r"\bcontinent", r"\byemen\b", r"\barabia", r"\bsuez\b",
              r"\baden\b", r"\bdjibouti\b", r"\bhodeid"],
    "inside": [r"\bbetween\b", r"\bdeeper\b"],
    "real": [r"\bsee it\b", r"\btouch\b"],
    "attack": [r"\bforce", r"\bdefen[cs]e\b", r"\bthreat", r"\bconflict\b",
               r"\bviolen", r"\bkill", r"\bdeath", r"\bdestro"],
    "cut": [r"\bfail", r"\binterrupt", r"\bblackout\b", r"\banchor\b",
            r"\bdrag"],
}

# Logistics and throat-clearing, per the guide's filler examples. These make a
# phrase filler even when a content tag would otherwise fire, because the
# guide puts logistics ahead of content: "filler is for logistics only".
LOGISTICS = [
    r"\bthank you\b", r"\bthanks\b", r"\bgood (morning|afternoon|evening)\b",
    r"\bplease (welcome|join|stand|hold)\b", r"\bany questions\b",
    r"\btake questions\b", r"\bmicrophone\b", r"\bbook sign",
    r"\bwe'll be right back\b", r"\bstay with us\b", r"\bback in a moment\b",
    r"\bdemocracy now\b", r"\bwelcome to\b", r"\bjoining us\b",
    r"\bthat does it for\b", r"\bpleased to welcome\b", r"\bup next\b",
    r"\bthis is .{0,20}reporting\b", r"\bgo ahead\b.{0,12}$",
]

CONTENT_WORD = re.compile(r"[a-z']{4,}")
# A short fragment that ends mid-thought is not about anything on its own,
# which is the guide's "sentence fragment with no content word". units.py
# already drops these at the selection layer; naming them here keeps the tags
# and the pools telling the same story.
DANGLING = {
    "a", "an", "the", "and", "but", "or", "so", "that", "which", "who",
    "of", "to", "in", "on", "at", "by", "for", "with", "from", "as", "if",
    "when", "because", "is", "was", "were", "are", "be", "been", "am",
    "this", "these", "those", "it", "its", "i", "we", "you", "they", "he",
    "she", "there", "kind", "sort", "very", "just", "about", "into", "than",
    "then", "what", "where", "how", "my", "your", "our", "their", "his",
}
# words that do not make a fragment about anything
STOPISH = {
    "that", "this", "these", "those", "there", "then", "than", "with", "from",
    "have", "been", "were", "what", "when", "which", "would", "could",
    "should", "about", "just", "like", "well", "yeah", "okay", "right",
    "very", "going", "kind", "sort", "much", "more", "some", "because",
    "also", "even", "will", "gonna", "actually", "basically", "really",
}

COMPILED = {t: ([re.compile(p, re.I) for p in STRONG.get(t, [])],
                [re.compile(p, re.I) for p in WEAK.get(t, [])])
            for t in BASE + EXTRA}
LOGI = [re.compile(p, re.I) for p in LOGISTICS]


def tags_for(text, tagset):
    """One phrase, judged on its own as a standalone fragment."""
    t = " " + text.lower().strip() + " "
    if any(p.search(t) for p in LOGI):
        return ["filler"]

    raw = text.strip()
    toks = re.findall(r"[a-z']+", raw.lower())
    last = toks[-1] if toks else ""
    if len(toks) < 7 and not raw.endswith((".", "!", "?")) and last in DANGLING:
        return ["filler"]

    out = []
    for tag in tagset:
        strong, weak = COMPILED[tag]
        if any(p.search(t) for p in strong):
            out.append(tag)
            continue
        if sum(1 for p in weak if p.search(t)) >= 2:
            out.append(tag)

    content = [w for w in CONTENT_WORD.findall(t) if w not in STOPISH]
    if out and content:
        return sorted(out)
    return ["filler"]


def tagset_for(source_id):
    """attack/cut only go on the material that has them to find."""
    return BASE + EXTRA if (source_id.startswith("houthi")
                            or source_id == "lackner") else BASE


def cmd_tag(args):
    sid = os.path.basename(args.source.rstrip("/\\"))
    ph = json.load(open(os.path.join(args.source, "transcript/phrases.json"),
                        encoding="utf-8"))
    # Every rule in this file is an English regex, so a source that was not
    # spoken in English has to be tagged on its translation or every phrase
    # comes back `filler`. phrases_en.json is keyed by the same phrase ids and
    # written by build_outputs.py from the translate pass; the phrase keeps its
    # own words and its own timings, and only the text the rules read changes.
    enp = os.path.join(args.source, "transcript/phrases_en.json")
    en = json.load(open(enp, encoding="utf-8")) if os.path.exists(enp) else {}
    if en:
        print(f"  [{sid}] tagging on the English pass "
              f"({len(en)}/{len(ph)} phrases translated)")
    tagset = BASE + EXTRA if args.all_tags else tagset_for(sid)
    tags = {str(p["id"]): tags_for(en.get(str(p["id"])) or p["text"], tagset)
            for p in ph}
    out = args.out or os.path.join(args.source, "tags.json")
    tmp = out + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(tags, f, ensure_ascii=False, indent=1, sort_keys=True)
    os.replace(tmp, out)
    c = Counter(t for ts in tags.values() for t in ts)
    print(f"{sid}: {len(tags)} phrases -> {out}")
    for t in sorted(set(tagset) | {"filler"}):
        print(f"  {t:<11} {c.get(t, 0):>5}  ({100*c.get(t,0)/len(tags):5.1f}%)")


def cmd_validate(args):
    """Score the rules against the 1,366 hand-tagged blum phrases."""
    ph = json.load(open("sources/blum/transcript/phrases.json", encoding="utf-8"))
    hand = json.load(open("sources/blum/tags.json", encoding="utf-8"))
    rows = []
    for p in ph:
        h = set(hand.get(str(p["id"]), []))
        if not h:
            continue
        rows.append((h, set(tags_for(p["text"], BASE))))
    print(f"scored on {len(rows)} hand-tagged phrases\n")
    print(f"{'tag':<11} {'hand':>6} {'auto':>6} {'both':>6} "
          f"{'prec':>6} {'recall':>6} {'F1':>6}")
    for t in sorted(BASE + ["filler"]):
        nh = sum(1 for h, a in rows if t in h)
        na = sum(1 for h, a in rows if t in a)
        nb = sum(1 for h, a in rows if t in h and t in a)
        pr = nb / na if na else 0.0
        rc = nb / nh if nh else 0.0
        f1 = 2 * pr * rc / (pr + rc) if pr + rc else 0.0
        print(f"{t:<11} {nh:>6} {na:>6} {nb:>6} {pr:>6.2f} {rc:>6.2f} {f1:>6.2f}")
    # the numbers that decide whether this is usable: a phrase the hand pass
    # would select must stay selectable, and its filler must stay out
    nf_h = sum(1 for h, a in rows if "filler" not in h)
    nf_both = sum(1 for h, a in rows if "filler" not in h and "filler" not in a)
    fi_h = sum(1 for h, a in rows if "filler" in h)
    fi_both = sum(1 for h, a in rows if "filler" in h and "filler" in a)
    exact = sum(1 for h, a in rows if h == a)
    overlap = sum(1 for h, a in rows if h & a)
    print(f"\nselectable kept selectable  {100*nf_both/nf_h:5.1f}%  "
          f"({nf_both}/{nf_h})")
    print(f"filler kept out of the pool {100*fi_both/fi_h:5.1f}%  "
          f"({fi_both}/{fi_h})")
    print(f"at least one tag agrees     {100*overlap/len(rows):5.1f}%")
    print(f"exact set match             {100*exact/len(rows):5.1f}%")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("tag")
    t.add_argument("--source", required=True)
    t.add_argument("--out", default=None)
    t.add_argument("--all-tags", action="store_true")
    t.set_defaults(fn=cmd_tag)
    v = sub.add_parser("validate")
    v.set_defaults(fn=cmd_validate)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
