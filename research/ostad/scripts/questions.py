"""raw/questions__tiktok-comments.json -> data/questions_raw.json (every comment that asks something).
The topic / service / covered columns are filled by reading (classify step), written to data/questions.json."""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[1]
raw = json.loads((ROOT / "raw/questions__tiktok-comments.json").read_text(encoding="utf-8"))["items"]
vids = {v["url"].split("?")[0]: v for v in json.loads((ROOT / "data/videos.json").read_text(encoding="utf-8"))}
ASK = re.compile(r"\?|^(how|what|why|does|do|is|can|should|which|where|when|will|would|anyone|has anyone|is it|are)\b", re.I)
out = []
for c in raw:
    t = (c.get("text") or "").strip()
    if len(t) < 12 or not ASK.search(t):
        continue
    url = (c.get("videoWebUrl") or c.get("postUrl") or c.get("submittedVideoUrl") or "").split("?")[0]
    v = vids.get(url, {})
    out.append(dict(q=t[:400], likes=int(c.get("diggCount") or c.get("likes") or 0),
                    replies=int(c.get("replyCommentTotal") or c.get("repliesCount") or 0),
                    from_=f"@{v.get('creator_handle', '?')}", video_id=v.get("id"), url=url, query=v.get("query_or_hashtag", "")))
out.sort(key=lambda x: -x["likes"])
for x in out:
    x["from"] = x.pop("from_")
(ROOT / "data/questions_raw.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(raw), "comments ->", len(out), "questions")
