"""Resumable tagging helper for phrases.json.

  dump   --start N --count M      print a batch as "id<TAB>text" for reading
  apply  --file F                 merge "id: tag1,tag2" lines into tags.json (saves at once)
  status                          progress + per-tag counts + next untagged id
  audit                           consistency checks against the tag guide
"""
import argparse
import json
import os
import sys
from collections import Counter

PHRASES = "sources/blum/transcript/phrases.json"
TAGS = "sources/blum/tags.json"

VALID = {"physical", "abstract", "definition", "people", "doubt", "scale",
         "filler", "water", "inside", "real"}


def load_phrases():
    return json.load(open(PHRASES, encoding="utf-8"))


def load_tags():
    if os.path.exists(TAGS):
        with open(TAGS, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_tags(tags):
    tmp = TAGS + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(tags, f, ensure_ascii=False, indent=1, sort_keys=True)
    os.replace(tmp, TAGS)


def cmd_dump(args):
    ph = load_phrases()
    end = min(len(ph), args.start + args.count)
    for p in ph[args.start:end]:
        txt = " ".join(p["text"].split())
        print(f"{p['id']}\t{txt}")
    print(f"\n--- dumped {args.start}..{end-1} of {len(ph)} ---", file=sys.stderr)


def cmd_apply(args):
    ph = load_phrases()
    n = len(ph)
    tags = load_tags()
    added = changed = 0
    errors = []
    with open(args.file, encoding="utf-8") as f:
        for ln, line in enumerate(f, 1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if ":" not in line:
                errors.append(f"line {ln}: no colon -> {line!r}")
                continue
            sid, rest = line.split(":", 1)
            sid = sid.strip()
            if not sid.isdigit():
                errors.append(f"line {ln}: bad id -> {sid!r}")
                continue
            pid = int(sid)
            if not (0 <= pid < n):
                errors.append(f"line {ln}: id {pid} out of range")
                continue
            ts = [t.strip().lower() for t in rest.split(",") if t.strip()]
            bad = [t for t in ts if t not in VALID]
            if bad:
                errors.append(f"line {ln}: unknown tag(s) {bad} on id {pid}")
                continue
            if not ts:
                errors.append(f"line {ln}: no tags for id {pid}")
                continue
            if "filler" in ts and len(ts) > 1:
                errors.append(f"line {ln}: id {pid} filler must be exclusive, got {ts}")
                continue
            ts = sorted(set(ts))
            key = str(pid)
            if key in tags:
                if tags[key] != ts:
                    changed += 1
                tags[key] = ts
            else:
                tags[key] = ts
                added += 1
    if errors:
        print("ERRORS - nothing saved:", file=sys.stderr)
        for e in errors[:40]:
            print("  " + e, file=sys.stderr)
        sys.exit(1)
    save_tags(tags)
    print(f"saved {TAGS}: +{added} new, {changed} changed, {len(tags)}/{n} total")


def cmd_status(args):
    ph = load_phrases()
    tags = load_tags()
    n = len(ph)
    done = len(tags)
    print(f"tagged {done}/{n} ({100*done/n:.1f}%)")
    missing = [p["id"] for p in ph if str(p["id"]) not in tags]
    if missing:
        print(f"next untagged id: {missing[0]}   (remaining {len(missing)})")
        runs = []
        s = missing[0]
        prev = s
        for m in missing[1:]:
            if m != prev + 1:
                runs.append((s, prev))
                s = m
            prev = m
        runs.append((s, prev))
        print("untagged ranges: " + ", ".join(f"{a}-{b}" for a, b in runs[:12]))
    else:
        print("ALL PHRASES TAGGED")
    c = Counter(t for ts in tags.values() for t in ts)
    print("\nper-tag counts:")
    for t in sorted(VALID):
        cnt = c.get(t, 0)
        pct = 100 * cnt / done if done else 0
        print(f"  {t:<11} {cnt:>5}  ({pct:5.1f}% of tagged)")
    per = Counter(len(ts) for ts in tags.values())
    print("\ntags per phrase: " + ", ".join(f"{k}:{v}" for k, v in sorted(per.items())))


def cmd_audit(args):
    ph = load_phrases()
    tags = load_tags()
    by_id = {p["id"]: p for p in ph}
    problems = []
    for k, ts in tags.items():
        pid = int(k)
        if "filler" in ts and len(ts) > 1:
            problems.append(f"id {pid}: filler not exclusive {ts}")
        if not ts:
            problems.append(f"id {pid}: empty")
        bad = [t for t in ts if t not in VALID]
        if bad:
            problems.append(f"id {pid}: invalid {bad}")
    print(f"structural problems: {len(problems)}")
    for p in problems[:30]:
        print("  " + p)

    # non-filler pools the randomizer will draw from
    print("\nselectable pool sizes (phrases, excluding filler):")
    for t in sorted(VALID - {"filler"}):
        ids = [int(k) for k, ts in tags.items() if t in ts and "filler" not in ts]
        secs = sum(by_id[i]["duration"] for i in ids)
        print(f"  {t:<11} {len(ids):>5} phrases   {secs:8.1f}s total")
    nf = [int(k) for k, ts in tags.items() if "filler" not in ts]
    print(f"\n  non-filler total: {len(nf)} phrases, "
          f"{sum(by_id[i]['duration'] for i in nf):.1f}s")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("dump"); d.add_argument("--start", type=int, default=0)
    d.add_argument("--count", type=int, default=150); d.set_defaults(fn=cmd_dump)
    a = sub.add_parser("apply"); a.add_argument("--file", required=True); a.set_defaults(fn=cmd_apply)
    s = sub.add_parser("status"); s.set_defaults(fn=cmd_status)
    au = sub.add_parser("audit"); au.set_defaults(fn=cmd_audit)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
