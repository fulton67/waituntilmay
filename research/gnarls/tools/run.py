"""Runner: python -I tools/run.py <tool|all|psd|sheets> [--workers N]
Image tools write measure/<tool>.jsonl, one row per image id; already-measured ids are skipped (idempotent).
CPU tools run in a process pool; OCR runs single-process on the GPU. Errors are written as {"id", "error"} rows so verify sees them."""
import os, sys, time, traceback
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from common import MEASURE, corpus, done_ids, dumps as _dumps, load_rgba  # noqa: E402


def dumps(row):
    """Never let one unserialisable value kill the pass: fall back to an error row that verify will flag."""
    try: return _dumps(row)
    except Exception as e: return _dumps({"id": row.get("id"), "path": row.get("path"), "error": f"serialise: {e!r}"})

CPU_TOOLS = ["probe", "color", "silhouette", "hash", "gnarls"]


def _one(args):
    tools, iid, rel, path = args
    from gtools import TOOLS
    out = {}
    try:
        rgba = load_rgba(path)
    except Exception as e:
        return {t: {"id": iid, "path": rel, "error": f"load: {e!r}"} for t in tools}
    for t in tools:
        try:
            out[t] = {"id": iid, "path": rel, **TOOLS[t](rgba, path)}
        except Exception as e:
            out[t] = {"id": iid, "path": rel, "error": repr(e), "tb": traceback.format_exc()[-400:]}
    return out


def run_images(tools, workers):
    os.makedirs(MEASURE, exist_ok=True)
    items = corpus("image")
    done = {t: done_ids(t) for t in tools}
    todo = [(tuple(t for t in tools if iid not in done[t]), iid, rel, p) for iid, rel, p in items]
    todo = [x for x in todo if x[0]]
    print(f"{len(items)} images; {len(todo)} need {tools}", flush=True)
    fhs = {t: open(os.path.join(MEASURE, t + ".jsonl"), "a", encoding="utf8") for t in tools}
    t0 = time.time()
    if workers > 1:
        from concurrent.futures import ProcessPoolExecutor
        with ProcessPoolExecutor(workers) as ex:
            for k, res in enumerate(ex.map(_one, todo, chunksize=4)):
                for t, row in res.items(): fhs[t].write(dumps(row) + "\n")
                if k % 50 == 0:
                    for f in fhs.values(): f.flush()
                    print(f"  {k + 1}/{len(todo)} {time.time() - t0:.0f}s", flush=True)
    else:
        for k, x in enumerate(todo):
            for t, row in _one(x).items(): fhs[t].write(dumps(row) + "\n")
            if k % 50 == 0:
                for f in fhs.values(): f.flush()
                print(f"  {k + 1}/{len(todo)} {time.time() - t0:.0f}s", flush=True)
    for f in fhs.values(): f.close()


def run_psd():
    from gtools import g8_psd
    items = corpus("psd")
    done = done_ids("psd")
    with open(os.path.join(MEASURE, "psd.jsonl"), "a", encoding="utf8") as fh:
        for k, (pid, rel, p) in enumerate(items):
            if pid in done: continue
            try: row = {"id": pid, "path": rel, **g8_psd(p)}
            except Exception as e: row = {"id": pid, "path": rel, "error": repr(e)}
            fh.write(dumps(row) + "\n"); fh.flush()
            print(f"  psd {k + 1}/{len(items)} {pid}", flush=True)


if __name__ == "__main__":
    tool = sys.argv[1]
    workers = int(sys.argv[sys.argv.index("--workers") + 1]) if "--workers" in sys.argv else max(1, (os.cpu_count() or 4) - 2)
    if tool == "all": run_images(CPU_TOOLS, workers)
    elif tool == "ocr": run_images(["ocr"], 1)
    elif tool == "psd": run_psd()
    elif tool == "sheets":
        import sheets; sheets.main()
    else: run_images([tool], workers)
