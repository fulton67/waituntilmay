"""Under-eye reel: does any graphic cover a face? (client note 2026-11-19: "The text shouldn't go directly over the face ever.")

Two passes, both measured, nothing judged by eye:
  boxes  : a footage-only pass rebuilt from the props (the same clip, source time, punch-in and still push the composition uses; the hook's
           zoomed wipe stills too), every STEP frames; faces found with OpenCV YuNet (face_detection_yunet_2023mar.onnx) at full size and at 0.4
           (it scores large close-ups low at full size), score >= 0.85 and >= 60 px a side
           (lower kept jackets, gloves and a 35 px speck), overlaps merged. Each box is united with the boxes of the neighbouring samples (+-1 sample, same shot only), so a missed detection between two
           hits is still a face.  -> faces.json
  check  : a graphics-only render of the composition (`bare`: no footage, no surgeon markup; a title behind a person has that person's key
           drawn black over it, so only the visible type counts) at any scale. A frame fails when more than MIN_PX (full-size px) of
           graphics (max channel > 20 on black: the ink type #1d2230 is 48 at most) fall inside a face box grown 10 % each side.  -> face_clear.json
Exceptions (client): titles behind a person under that person's key (the black key removes the covered type from the bare pass) and the pen
markup on her face in the before/after window (markup is not drawn in the bare pass). Everything else counts: cards, plates, labels, captions.

usage (style venv):  python -I face_clear.py boxes <props.json> <faces.json> [step=2]
                     python -I face_clear.py check <bare.mp4> <faces.json> <out.json>
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[4]
PUB = ROOT / "brand/remotion/public/undereye-filler"
MODEL = "C:/Users/naimj/tools/models/face_detection_yunet_2023mar.onnx"
W, H, FPS, TAIL = 1080, 1920, 24, 72
GROW, MIN_PX, THR, KEEP, MIN_SIDE = 0.10, 60, 20, 0.85, 60
STILL = {"after": "ba_after.jpg", "plan": "ba_wipe_before.jpg", "before_ref": "ba_before_ref.jpg", "split": "ba_split.jpg", "eyes": "ba_eyes.jpg"}


class Clips:
    """random access to source frames, sequential where possible"""
    def __init__(self):
        self.cap, self.pos, self.last = {}, {}, {}

    def frame(self, clip, t):
        cap = self.cap.get(clip)
        if cap is None:
            cap = self.cap[clip] = cv2.VideoCapture(str(PUB / f"{clip}.mp4")); self.pos[clip] = -1
        fps = cap.get(cv2.CAP_PROP_FPS)
        i = int(np.floor(t * fps + 1e-6))
        if i < self.pos[clip] or i > self.pos[clip] + 45:
            cap.set(cv2.CAP_PROP_POS_FRAMES, i); self.pos[clip] = i - 1
        while self.pos[clip] < i:
            ok, im = cap.read()
            if not ok: break
            self.pos[clip] += 1; self.last[clip] = im
        im = self.last.get(clip)
        if im is not None and im.shape[1] > im.shape[0]:  # landscape: cover into 1080 x 1920
            s = H / im.shape[0]; im = cv2.resize(im, (int(im.shape[1] * s), H)); x0 = (im.shape[1] - W) // 2; im = im[:, x0:x0 + W]
        elif im is not None and im.shape[:2] != (H, W):
            im = cv2.resize(im, (W, H))
        return im


def scale_about(im, sc, ox, oy):
    if abs(sc - 1) < 1e-4: return im
    M = np.float32([[sc, 0, ox - sc * ox], [0, sc, oy - sc * oy]])
    return cv2.warpAffine(im, M, (W, H))


def footage_frames(props, step):
    pics = sorted([q for pc in props["pieces"] for q in pc["pics"]], key=lambda q: q["f0"])
    for i, q in enumerate(pics):  # run0 as the composition sets it
        prev = pics[i - 1] if i else None
        q["run0"] = prev["run0"] if prev and prev.get("still") and prev.get("still") == q.get("still") and prev["f1"] == q["f0"] else q["f0"]
    end, sp = props["durationInFrames"], props["speed"]
    last = dict(pics[-1])
    if "tailRate" in props:  # v5: the tail continues from the last picture's own end at tailRate (UndereyeReelV5)
        last.update(f0=end, f1=end + TAIL, src=(last.get("src") or 0) + ((last["f1"] - last["f0"]) / 24) * sp, rate=props["tailRate"])
    else:
        last.update(f0=end, f1=end + TAIL, src=(last.get("src") or 0) + (props["pieces"][-1]["dur"] / 24) * sp)
    pics.append(last)
    clips, stills = Clips(), {}
    hook = props.get("hook", 44)
    for f in range(0, end + TAIL, step):
        q = next((x for x in pics if x["f0"] <= f < x["f1"]), None)
        if q is None: continue
        if q.get("still"):
            name = STILL.get(q["still"])
            if name is None: continue
            im = stills.setdefault(name, cv2.imread(str(PUB / name)))
            push = 1 + 0.035 * min(1, (f - q["run0"]) / 120)
        else:
            t = round(q["src"] * 24) / 24 + (f - q["f0"]) * q.get("rate", sp) / 24
            im = clips.frame(q["clip"], t); push = 1
            if im is None: continue
        im = scale_about(im, (q.get("scale") or 1) * push, q.get("ox", 540), q.get("oy", 960))
        out = [im]
        if f < hook:  # the hook: the registered wipe stills, zoomed on her eyes, over the first shot
            wb = stills.setdefault("wb", cv2.imread(str(PUB / "ba_wipe_before.jpg")))
            out = [scale_about(cv2.resize(wb, (W, H)), 2.0 + f * 0.002, 540, 1050)] + ([im] if f >= hook - 8 else [])
        yield f, out, (f < hook, id(q))


def detect(det, im):
    """two scales (full and 0.4: YuNet scores big close-ups low at full size), score >= KEEP, overlapping boxes merged (NMS)"""
    out = []
    for s in (1.0, 0.4):
        x = im if s == 1 else cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        det.setInputSize((x.shape[1], x.shape[0]))
        _, faces = det.detect(x)
        if faces is not None: out += [[float(v) / s for v in r[:4]] + [float(r[-1])] for r in faces if r[-1] >= KEEP and min(r[2], r[3]) / s >= MIN_SIDE]
    out.sort(key=lambda b: -b[4])
    keep = []
    for b in out:
        if all(iou(b, k) < 0.4 for k in keep): keep.append(b)
    return keep


def iou(a, b):
    x0, y0 = max(a[0], b[0]), max(a[1], b[1]); x1, y1 = min(a[0] + a[2], b[0] + b[2]), min(a[1] + a[3], b[1] + b[3])
    i = max(0, x1 - x0) * max(0, y1 - y0)
    return i / (a[2] * a[3] + b[2] * b[3] - i + 1e-6)


def boxes(props_path, out_path, step=2):
    props = json.load(open(props_path))
    det = cv2.FaceDetectorYN.create(MODEL, "", (W, H), 0.55, 0.3, 50)
    raw = {}
    seg = {}
    for f, ims, sg in footage_frames(props, step):
        seg[f] = sg
        fs = []
        for im in ims: fs += detect(det, im)
        raw[f] = fs
        if f % 200 == 0: print(f, len(fs), flush=True)
    keys = sorted(raw)
    merged = {}
    for i, f in enumerate(keys):  # +-1 sample union, within the same shot only (never across a cut)
        merged[f] = raw[f] + [b for j in (i - 1, i + 1) if 0 <= j < len(keys) and seg[keys[j]] == seg[f] for b in raw[keys[j]]]
    json.dump({"step": step, "detector": "YuNet 2023mar, scales 1.0 + 0.4, score>=0.85, side>=60, NMS 0.4", "raw": {str(k): v for k, v in raw.items()},
               "boxes": {str(k): v for k, v in merged.items()}}, open(out_path, "w"))
    n = sum(1 for v in raw.values() if v)
    print(f"{len(raw)} samples, {n} with a face -> {out_path}")


def check(bare, faces_path, out_path, skip=()):
    F = json.load(open(faces_path))
    bx = {int(k): v for k, v in F["boxes"].items()}
    w, h = [int(x) for x in subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", bare],
                                          capture_output=True, text=True).stdout.strip().strip(",").split(",")[:2]]
    k = w / W
    pr = subprocess.Popen(["ffmpeg", "-v", "error", "-i", bare, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    fails, checked, f = [], 0, 0
    while True:
        b = pr.stdout.read(w * h * 3)
        if len(b) < w * h * 3: break
        if f in bx and bx[f] and f not in skip:
            g = np.frombuffer(b, np.uint8).reshape(h, w, 3).max(axis=2) > THR
            checked += 1
            worst = None
            for (x, y, bw, bh, sc) in bx[f]:
                x0, y0 = int(max(0, (x - GROW * bw) * k)), int(max(0, (y - GROW * bh) * k))
                x1, y1 = int(min(w, (x + bw * (1 + GROW)) * k)), int(min(h, (y + bh * (1 + GROW)) * k))
                n = int(g[y0:y1, x0:x1].sum() / (k * k))
                if n > MIN_PX and (worst is None or n > worst[0]): worst = (n, [round(x), round(y), round(bw), round(bh)])
            if worst: fails.append({"f": f, "px": worst[0], "box": worst[1]})
        f += 1
    runs = []
    for x in fails:
        if runs and x["f"] - runs[-1][1] <= F["step"]: runs[-1][1] = x["f"]; runs[-1][2] = max(runs[-1][2], x["px"])
        else: runs.append([x["f"], x["f"], x["px"]])
    res = {"bare": bare, "faces": faces_path, "grow": GROW, "min_px": MIN_PX, "frames_checked": checked, "frames_failing": len(fails),
           "pass": len(fails) == 0, "runs": [{"f0": a, "f1": b, "max_px": m} for a, b, m in runs], "fails": fails}
    json.dump(res, open(out_path, "w"), indent=1)
    print(f"checked {checked} sampled frames with a face; failing {len(fails)} in {len(runs)} runs -> {out_path}")
    for a, b, m in runs: print(f"  {a}-{b}  max {m} px")


if __name__ == "__main__":
    if sys.argv[1] == "boxes": boxes(sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 2)
    else: check(sys.argv[2], sys.argv[3], sys.argv[4], set(int(x) for x in sys.argv[5].split(",")) if len(sys.argv) > 5 and sys.argv[5] else ())
