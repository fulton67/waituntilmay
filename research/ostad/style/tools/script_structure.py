"""M20: script structure from M16. Per video: the first sentence (text, words, seconds); the turn / pivot = the first pivot marker
after the opening 8% of words ("but", "however", "the truth is", "here's the thing", "actually", "instead", "the problem is",
"what most people", "the real", "so what", "that's why", "which means") - word index, share of the script, seconds; question in
the first sentence (bool); numbers spoken (count). Per creator (written to measure/<ref>/_corpus_script.json after every video):
recurring 3- to 5-word phrases counted across all of that creator's transcripts (>= 2 videos), top 40."""
import os
import re
from collections import Counter

from common import MEASURE, load_json, out_path, run, save_json

PIVOTS = ["here's the thing", "the truth is", "the problem is", "what most people", "that's why", "which means", "the real",
          "so what", "however", "instead", "actually", "but"]


def toks(s):
    return re.findall(r"[a-z0-9']+", s.lower())


def m20(ref, vid, path, P):
    tr = load_json(out_path(ref, vid, "transcript.json"))
    if tr is None:
        raise RuntimeError("needs transcript.json")
    W = tr.get("words") or []
    if not W:
        return {"has_speech": False}
    text = " ".join(w["word"] for w in W)
    first = []
    for w in W:
        first.append(w)
        if re.search(r"[.?!]$", w["word"]):
            break
    low = [re.sub(r"[^a-z0-9']", "", w["word"].lower()) for w in W]
    start = int(len(W) * 0.08)
    turn = None
    for i in range(start, len(W)):
        window = " ".join(low[i:i + 4])
        for p in PIVOTS:
            if window.startswith(p):
                turn = {"marker": p, "word_index": i, "share": round(i / len(W), 3), "seconds": W[i]["start"]}
                break
        if turn:
            break
    res = {"has_speech": True, "first_sentence": " ".join(w["word"] for w in first), "first_sentence_words": len(first),
           "first_sentence_seconds": round(first[-1]["end"] - first[0]["start"], 3), "first_sentence_question": first[-1]["word"].endswith("?"),
           "turn": turn, "numbers_spoken": len(re.findall(r"\b\d[\d,.%]*\b", text)), "words": len(W)}
    corpus_update(ref)
    return res


def corpus_update(ref):
    d = os.path.join(MEASURE, ref)
    per_video = {}
    for vid in os.listdir(d):
        t = load_json(os.path.join(d, vid, "transcript.json"))
        if t and t.get("words"):
            tk = toks(" ".join(w["word"] for w in t["words"]))
            grams = set()
            for n in (3, 4, 5):
                grams |= {" ".join(tk[i:i + n]) for i in range(len(tk) - n + 1)}
            per_video[vid] = grams
    c = Counter(g for gs in per_video.values() for g in gs)
    top = [[g, k] for g, k in c.most_common(400) if k >= 2][:40]
    save_json(os.path.join(d, "_corpus_script.json"), {"videos": len(per_video), "recurring_phrases": top})


if __name__ == "__main__":
    run("script.json", m20)
