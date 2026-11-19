"""The reel timeline view: every beat of a reel as lanes (footage, captions, titles, plates, objects, markup, SFX) over the transcript
words. Click a beat to edit its words (anchors), text, timing, plate map or notes; Save writes brand/remotion/timelines/<file>.json
back (the previous file is kept in timelines/.history/). Render runs brand/scripts/reel.py for the whole reel or the selected beat.
Local only: a stdlib server on 127.0.0.1, no network, nothing leaves this PC.

  python brand/scripts/timeline_view.py [--port 8765]     then open http://127.0.0.1:8765
Frozen files (timelines/<reel>.<version>.json: a delivered version) open read-only; "Copy to working" starts a new edit from one.
"""
import datetime, json, re, subprocess, sys, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
sys.path.insert(0, str(Path(__file__).parent))
import timeline_lib as T

HTML = Path(__file__).with_name("timeline_view.html")
HIST = T.TL / ".history"
BUILD = {"proc": None, "log": None, "cmd": None}
TAILS = {"undereye": 72}

def safe(name):
    if not re.fullmatch(r"[A-Za-z0-9_.-]+\.json", name or ""): raise ValueError("bad file name")
    return T.TL / name

def payload(name):
    tl = T.load(safe(name)); P = T.transcript(tl)
    frozen = name.count(".") > 1
    return {"file": name, "frozen": frozen, "timeline": tl, "errors": T.validate(tl, P),
            "transcript": {"words": [{"w": w["w"], "f": w["f"], "f1": w["f1"], "piece": w.get("piece")} for w in P["words"]], "cues": P["cues"],
                           "pieces": [{"id": p["id"], "line": p.get("line"), "at": p["at"], "dur": p["dur"]} for p in P["pieces"]], "durationInFrames": P["durationInFrames"],
                           "total": P["durationInFrames"] + TAILS.get(tl["reel"], P.get("tail", 0))}}

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def send(self, code, body, ctype="application/json"):
        b = body if isinstance(body, bytes) else (body if isinstance(body, str) else json.dumps(body, ensure_ascii=False)).encode("utf-8")
        self.send_response(code); self.send_header("Content-Type", ctype + "; charset=utf-8"); self.send_header("Content-Length", str(len(b))); self.send_header("Cache-Control", "no-store"); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        try:
            if u.path == "/": return self.send(200, HTML.read_bytes(), "text/html")
            if u.path == "/api/list": return self.send(200, sorted(p.name for p in T.TL.glob("*.json")))
            if u.path == "/api/timeline": return self.send(200, payload(q["file"][0]))
            if u.path == "/api/build":
                p = BUILD["proc"]
                log = Path(BUILD["log"]).read_text(encoding="utf-8", errors="replace")[-4000:] if BUILD["log"] and Path(BUILD["log"]).exists() else ""
                return self.send(200, {"running": bool(p and p.poll() is None), "exit": p.poll() if p else None, "cmd": BUILD["cmd"], "log": log})
            self.send(404, {"error": "not found"})
        except Exception as e: self.send(400, {"error": str(e)})
    def do_POST(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0)) or 0) or b"{}")
            if u.path == "/api/save":
                name = q["file"][0]; p = safe(name)
                if name.count(".") > 1: return self.send(400, {"error": f"{name} is a frozen, delivered version: use Copy to working"})
                tl = body
                hard = [e for e in T.validate(tl) if ": note:" not in e]
                if hard: return self.send(400, {"error": "not saved: " + "; ".join(hard[:6])})
                if p.exists():
                    HIST.mkdir(exist_ok=True)
                    (HIST / f"{p.stem}.{datetime.datetime.now():%Y%m%d-%H%M%S}.json").write_bytes(p.read_bytes())
                p.write_text(json.dumps(tl, indent=1, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
                return self.send(200, payload(name))
            if u.path == "/api/copy":  # a frozen version -> the working file (the working file's previous state goes to .history)
                src = safe(q["file"][0]); tl = T.load(src); dst = T.TL / f"{tl['reel']}.json"
                if dst.exists():
                    HIST.mkdir(exist_ok=True)
                    (HIST / f"{dst.stem}.{datetime.datetime.now():%Y%m%d-%H%M%S}.json").write_bytes(dst.read_bytes())
                tl["version"] = body.get("version") or tl["version"] + "-edit"
                dst.write_text(json.dumps(tl, indent=1, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
                return self.send(200, payload(dst.name))
            if u.path == "/api/build":
                if BUILD["proc"] and BUILD["proc"].poll() is None: return self.send(400, {"error": "a build is already running"})
                name = q["file"][0]; tl = T.load(safe(name))
                cmd = [sys.executable, str(Path(__file__).with_name("reel.py")), tl["reel"], "--version", tl["version"]]
                if body.get("frames"): cmd += ["--frames", f"{int(body['frames'][0])}-{int(body['frames'][1])}"]
                log = T.ROOT / "brand/remotion/out" / f"timeline_view_build_{datetime.datetime.now():%Y%m%d-%H%M%S}.log"
                log.parent.mkdir(exist_ok=True)
                BUILD.update(proc=subprocess.Popen(cmd, cwd=T.ROOT, stdout=open(log, "w", encoding="utf-8"), stderr=subprocess.STDOUT), log=str(log), cmd=" ".join(cmd[1:]))
                return self.send(200, {"started": BUILD["cmd"]})
            self.send(404, {"error": "not found"})
        except Exception as e: self.send(400, {"error": str(e)})

if __name__ == "__main__":
    port = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 8765
    print(f"timeline view: http://127.0.0.1:{port}   (Ctrl+C stops it)", flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
