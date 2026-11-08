"""Square any image for the kit's square tiles (video `tile` / `tile-pair`, posts): a 1:1 crop around the subject, 1080 px.
  cutout (alpha): centred on the opaque box, padded 8%, transparent PNG
  photo: the largest face (OpenCV YuNet, ~/tools/models/face_detection_yunet_2023mar.onnx) sits at 40% of the height; with no face, the crop centres on the
         most detailed region (Laplacian energy, coarse grid), which is where skin close-ups and devices carry their detail
The square keeps the source's own pixels; the kit applies --ok-photo-filter when it shows a photo.
usage: brand-venv python -I brand/scripts/square.py <in...> --out <dir>   -> <dir>/<stem>.jpg|png and <dir>/square.json"""
import json, pathlib, sys
import cv2, numpy as np
from PIL import Image
args = sys.argv[1:]; out = pathlib.Path(args[args.index("--out") + 1]) if "--out" in args else pathlib.Path("squares"); out.mkdir(parents=True, exist_ok=True)
ins = [pathlib.Path(a) for i, a in enumerate(args) if a != "--out" and (i == 0 or args[i - 1] != "--out")]
YUNET = pathlib.Path.home() / "tools" / "models" / "face_detection_yunet_2023mar.onnx"
def faces(rgb):  # [(x, y, w, h, score)] in source pixels; YuNet at 640 px on the long side
    H, W = rgb.shape[:2]; sc = 640 / max(W, H); small = cv2.resize(rgb, (round(W * sc), round(H * sc)))
    det = cv2.FaceDetectorYN.create(str(YUNET), "", (small.shape[1], small.shape[0]), 0.8)
    _, f = det.detect(cv2.cvtColor(small, cv2.COLOR_RGB2BGR)); return [] if f is None else [tuple(r[:4] / sc) + (float(r[-1]),) for r in f]
rows = []
for f in ins:
    im = Image.open(f); im.seek(0)
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        im = im.convert("RGBA"); x0, y0, x1, y1 = im.getchannel("A").point(lambda v: 255 if v > 16 else 0).getbbox()
        s = round(max(x1 - x0, y1 - y0) * 1.08); cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        sq = Image.new("RGBA", (s, s), (0, 0, 0, 0)); sq.paste(im.crop((x0, y0, x1, y1)), (round(s / 2 - (x1 - x0) / 2), round(s / 2 - (y1 - y0) / 2)))
        sq = sq.resize((1080, 1080), Image.LANCZOS); dst = out / f"{f.stem}.png"; sq.save(dst, optimize=True); how = "alpha box"
    else:
        im = im.convert("RGB"); W, H = im.size; s = min(W, H); g = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2GRAY)
        fs = faces(np.asarray(im))
        if fs:
            x, y, w, h, _ = max(fs, key=lambda r: r[2] * r[3]); cx, cy = x + w / 2, y + h / 2 + s * 0.10; how = "face"  # face at 40% of the square
        else:
            e = np.abs(cv2.Laplacian(cv2.GaussianBlur(g, (5, 5), 0), cv2.CV_32F)); n = 12
            gy, gx = np.unravel_index(np.argmax(cv2.resize(cv2.blur(e, (max(1, W // n), max(1, H // n))), (n, n), interpolation=cv2.INTER_AREA)), (n, n))
            cx, cy = (gx + 0.5) * W / n, (gy + 0.5) * H / n; how = "detail"
        x0 = int(min(max(cx - s / 2, 0), W - s)); y0 = int(min(max(cy - s / 2, 0), H - s))
        sq = im.crop((x0, y0, x0 + s, y0 + s)).resize((1080, 1080), Image.LANCZOS); dst = out / f"{f.stem}.jpg"; sq.save(dst, quality=90)
    rows.append({"in": str(f), "out": str(dst), "by": how})
    print(how, "->", dst)
json.dump(rows, open(out / "square.json", "w", encoding="utf-8"), indent=1)
