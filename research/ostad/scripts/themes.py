"""Run 2, phase 2b. The model groups, a reader decides.

python themes.py cluster [k]   embed subject + claim + transcript opening (all-mpnet-base-v2, local) and cut an
                               agglomerative tree into k clusters (default 32): classify2/clusters.md for reading,
                               data/clusters.json {id: cluster}
python themes.py assign        apply the reader's decisions in data/theme_map.json:
                               {"clusters": {"<n>": "<slug>"}, "overrides": {"<video id>": "<slug>"}} -> videos.json `theme`
                               and prints sizes; every video must land in a theme listed in data/themes.json
"""
import json, statistics, sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V, DATA, B = ROOT / "data" / "videos.json", ROOT / "data", ROOT / "classify2"


def load():
    return json.loads(V.read_text(encoding="utf-8"))


def text(r):
    t = " ".join((r.get("transcript") or "").split()[:120])
    return f"{r.get('subject', '')}. {r.get('claim', '')}. {t or (r.get('caption') or '')[:300]}"


def cluster(k=32):
    from sentence_transformers import SentenceTransformer
    from sklearn.cluster import AgglomerativeClustering
    vids = load()
    m = SentenceTransformer("all-mpnet-base-v2", device="cpu")
    X = m.encode([text(r) for r in vids], normalize_embeddings=True, show_progress_bar=False, batch_size=32)
    lab = AgglomerativeClustering(n_clusters=k, linkage="ward").fit_predict(X)  # unit vectors: ward ~ cosine
    by = defaultdict(list)
    for r, c in zip(vids, lab):
        by[int(c)].append(r)
    (DATA / "clusters.json").write_text(json.dumps({r["id"]: int(c) for r, c in zip(vids, lab)}), encoding="utf-8")
    out = [f"# {k} clusters (ward on all-mpnet-base-v2 of subject + claim + transcript opening)\n"]
    for c, rows in sorted(by.items(), key=lambda kv: -len(kv[1])):
        niche = [r for r in rows if r["source"] != "own"]
        mx = statistics.median([r["outlier_score"] for r in niche]) if niche else 0
        out.append(f"\n## cluster {c} · {len(rows)} videos · median × usual {mx:.2f} · makeable {sum(bool(r.get('makeable_by_ostad')) for r in rows)} · own {len(rows) - len(niche)}")
        out.append("genres: " + ", ".join(f"{g} {n}" for g, n in Counter(r.get("genre") for r in rows).most_common(4)))
        for r in sorted(rows, key=lambda r: -r["outlier_score"])[:40]:
            out.append(f"- {r['id']} | {r.get('subject')} | {r.get('claim', '')[:140]}")
        if len(rows) > 40:
            out.append(f"- … {len(rows) - 40} more")
    (B / "clusters.md").write_text("\n".join(out), encoding="utf-8")
    print(f"{k} clusters -> classify2/clusters.md; sizes {sorted((len(v) for v in by.values()), reverse=True)}")


def assign():
    vids = load()
    tm = json.loads((DATA / "theme_map.json").read_text(encoding="utf-8"))
    slugs = {t["slug"] for t in json.loads((DATA / "themes.json").read_text(encoding="utf-8"))}
    cl = json.loads((DATA / "clusters.json").read_text())
    bad = []
    for r in vids:
        s = tm["overrides"].get(r["id"]) or tm["clusters"].get(str(cl[r["id"]]))
        if s not in slugs:
            bad.append((r["id"], cl[r["id"]], s))
        r["theme"] = s
    V.write_text(json.dumps(vids, ensure_ascii=False, indent=0), encoding="utf-8")
    c = Counter(r["theme"] for r in vids if r["source"] != "own")
    print(json.dumps(c.most_common(), indent=0))
    print(f"{len(c)} themes; unassigned/unknown: {len(bad)}", bad[:10])
    return not bad


if __name__ == "__main__":
    if sys.argv[1] == "cluster":
        cluster(int(sys.argv[2]) if len(sys.argv) > 2 else 32)
    else:
        sys.exit(0 if assign() else 1)
