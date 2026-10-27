"""What makes one phrase answer another.

A cut across sources reads as an exchange when the next phrase picks something
up from the last one - the same object, the same idea - and as a shuffle when
it does not. This module is the only place that decides what "picks up" means:

  a shared content word   "cables under the water" -> "the cables were cut"
  or a shared tag         both phrases tagged `water`

Content words are tried first. A tag is the weaker link - `physical` is on a
third of Blum's phrases, so two lines sharing it may have nothing to do with
each other - so the kind of link is recorded per cut and reported separately
rather than counted as one number.

Tags come from the per-source tags.json, which is keyed by phrase id while the
edit is cut from units. Both index the same words.json, so a unit takes the
tags of every phrase it overlaps by word id - exact, with no time fuzz.
"""
import json
import os
import re

# Words that two phrases can share without being about the same thing. Kept
# deliberately short: a long stoplist starts throwing away the nouns that
# carry this material ("water", "network", "people").
STOP = {
    "a", "about", "actually", "after", "all", "also", "am", "an", "and", "any",
    "are", "as", "at", "back", "be", "because", "been", "being", "but", "by",
    "can", "come", "could", "did", "do", "does", "doing", "don", "down",
    "even", "every", "for", "from", "get", "go", "going", "got", "had", "has",
    "have", "he", "her", "here", "him", "his", "how", "i", "if", "in", "into",
    "is", "it", "its", "just", "kind", "know", "like", "little", "lot", "made",
    "make", "many", "me", "mean", "more", "most", "much", "my", "no", "not",
    "now", "of", "off", "on", "one", "only", "or", "other", "our", "out",
    "over", "really", "right", "said", "same", "say", "says", "see", "she",
    "so", "some", "something", "sort", "still", "such", "take", "than", "that",
    "the", "their", "them", "then", "there", "these", "they", "thing",
    "things", "think", "this", "those", "through", "to", "too", "two", "up",
    "us", "very", "want", "was", "way", "we", "well", "went", "were", "what",
    "when", "where", "which", "while", "who", "why", "will", "with", "would",
    "yeah", "you", "your",
}

WORD = re.compile(r"[a-z']+")
MIN_LEN = 3                       # "cut" has to count


# Letters English doubles at the end of a word in its own right. "smelling"
# must not lose one of them, or it stops matching "smells".
_REAL_DOUBLE = "lsfz"


def stem(w):
    """Enough to make cables/cable and cut/cutting the same word.

    Deliberately not a real stemmer - this material turns on a handful of
    concrete nouns - but the plural rule has to be right, because the link
    the piece exists for is Blum's "cables" answering the news' "cable". An
    -es rule applied first got that wrong: it took "cables" to "cabl" while
    "cable" stayed whole, so the two never matched. -es is now only stripped
    after a sibilant, where it is really the plural marker ("watches"), and
    everything else loses a bare -s.
    """
    if len(w) > 4 and w.endswith("ies"):
        return w[:-3] + "y"
    if len(w) > 4 and w.endswith(("sses", "ches", "shes", "xes", "zes")):
        return w[:-2]
    if len(w) > 3 and w.endswith("s") and not w.endswith(("ss", "us", "is")):
        return w[:-1]
    if len(w) > 4 and w.endswith("ing"):
        return _undouble(w[:-3])
    if len(w) > 4 and w.endswith("ed") and not w.endswith("eed"):
        return _undouble(w[:-2])
    return w


def _undouble(s):
    """cutt -> cut, but smell -> smell."""
    if len(s) > 2 and s[-1] == s[-2] and s[-1] not in _REAL_DOUBLE:
        return s[:-1]
    return s


def content_words(text):
    """The words in a phrase that could carry a link, stemmed.

    Everything from an apostrophe on is dropped before anything else looks at
    the word. Without that, "it's" survives as the token `it'` - the bare
    "it" is a stopword but `it'` is not - and since "it's" opens more phrases
    than any other word in this material, it linked almost everything to
    almost everything: one sample edit had three consecutive cuts all
    "linked" on it. Cutting at the apostrophe sends it back to "it", which
    the stoplist already throws away, while "world's" becomes "world" and
    still counts.
    """
    out = set()
    for raw in WORD.findall(text.lower()):
        w = raw.split("'")[0]
        if len(w) < MIN_LEN or w in STOP:
            continue
        s = stem(w)
        if len(s) >= MIN_LEN and s not in STOP:
            out.add(s)
    return out


# Tags narrow enough that sharing one means something. `physical` sits on 442
# of Blum's 1366 phrases and `people` on 254, so two lines sharing either may
# have nothing to do with each other: letting them link made the tag tier fire
# on almost any pair and starved the word tier above it. `filler` is the
# tagger saying it found nothing at all.
# `definition` is out too. It was inside the narrow set and carried 71% of all
# tag links on its own (1835 of 2588) - broad enough in practice to behave
# like `physical`, whatever it is called.
NARROW_TAGS = {"water", "inside", "real", "attack", "cut", "doubt"}
BROAD_TAGS = {"physical", "people", "abstract", "scale", "definition",
              "filler"}


def _tags_by_word(src):
    """word id -> set of linkable tags, for one source.

    tags.json is keyed by phrase id; phrases.json says which words each phrase
    covers. Only NARROW_TAGS survive, so a broad tag still describes a phrase
    in tags.json without ever being able to carry a cut.
    """
    tp, pp = src.get("tags"), src.get("phrases")
    if not (tp and pp and os.path.exists(tp) and os.path.exists(pp)):
        return {}
    tags = json.load(open(tp, encoding="utf-8"))
    phrases = json.load(open(pp, encoding="utf-8"))
    out = {}
    for p in phrases:
        ts = [t for t in tags.get(str(p["id"]), []) if t in NARROW_TAGS]
        if not ts:
            continue
        for w in p["word_ids"]:
            out.setdefault(w, set()).update(ts)
    return out


def _en_by_word(src):
    """word id -> English content words, for a source not spoken in English.

    Without this a translated source can only ever link on a tag: its unit
    text is Arabic, and an Arabic token shares nothing with Blum's English
    however much the two phrases are about the same cable. The English pass is
    keyed by phrase id and phrases say which words they cover, so the words of
    the translation can be hung on the same word ids the unit is built from.
    """
    pp = src.get("phrases")
    if not pp or not os.path.exists(pp):
        return {}
    ep = os.path.join(os.path.dirname(pp), "phrases_en.json")
    if not os.path.exists(ep):
        return {}
    en = json.load(open(ep, encoding="utf-8"))
    phrases = json.load(open(pp, encoding="utf-8"))
    out = {}
    for p in phrases:
        txt = en.get(str(p["id"]))
        if not txt:
            continue
        ws = content_words(txt)
        if not ws:
            continue
        for w in p["word_ids"]:
            out.setdefault(w, set()).update(ws)
    return out


def attach(units, srcs):
    """Give every unit the two key sets the sequencer links on.

    Done once per run rather than per comparison: the sequencer asks "do these
    two share anything" thousands of times while planning a batch.
    """
    by_word = {s["id"]: _tags_by_word(s) for s in srcs}
    en_word = {s["id"]: _en_by_word(s) for s in srcs}
    for u in units:
        ew = en_word.get(u.get("src")) or {}
        if ew:
            ws = set()
            for w in u.get("word_ids", []):
                ws.update(ew.get(w, ()))
            u["link_words"] = ws
        else:
            u["link_words"] = content_words(u["text"])
        tw = by_word.get(u.get("src")) or {}
        ts = set()
        for w in u.get("word_ids", []):
            ts.update(tw.get(w, ()))
        u["link_tags"] = ts
    return units


def shares_word(a, b):
    """A shared content word - the strong link, and the one worth chasing."""
    if a is None or b is None:
        return False
    return bool((a.get("link_words") or set()) & (b.get("link_words") or set()))


def shares_tag(a, b):
    """A shared tag - the weak link, and only from NARROW_TAGS.

    Separated from the word link everywhere - in the tiers the sequencer tries
    and in the numbers the log reports - so a high linked share cannot be read
    as a high share of real connections.
    """
    if a is None or b is None:
        return False
    return bool((a.get("link_tags") or set()) & (b.get("link_tags") or set()))


def between(a, b):
    """How b picks up from a, or None.

    Returns (kind, value): the shared content word if there is one, else the
    shared tag. Where several words are shared the longest wins - it is the
    most specific, and it is the one worth printing in a log a person reads.
    """
    if a is None or b is None:
        return None
    w = (a.get("link_words") or set()) & (b.get("link_words") or set())
    if w:
        return ("word", max(sorted(w), key=len))
    t = (a.get("link_tags") or set()) & (b.get("link_tags") or set())
    if t:
        return ("tag", sorted(t)[0])
    return None
