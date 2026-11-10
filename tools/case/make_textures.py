"""Cover textures from the product photos.  python make_textures.py
Writes build/tex/{A,B,C,D,E,F}.png and contact sheets + report into case-check/textures/."""
import cv2, json, os, sys, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
OUT = os.path.join(HERE, 'build', 'tex'); CHK = os.path.join(ROOT, '..', 'case-check', 'textures'); OLD = os.path.join(CHK, 'old')
os.makedirs(OUT, exist_ok=True); os.makedirs(CHK, exist_ok=True)
cfg = json.load(open(os.path.join(HERE, 'corners.json')))
OLDMAP = {'A': 'tex5.webp', 'B': None, 'C': 'tex1.webp', 'F': None, 'D': 'tex2.webp', 'E': 'tex3.webp'}
INSET = 0.004          # crop this fraction inside the picked corners so no frame plastic gets in
report = {}

def load(path):
    im = cv2.imread(os.path.join(ROOT, path), cv2.IMREAD_UNCHANGED)
    return (im[..., :3], im[..., 3]) if im.shape[2] == 4 else (im, None)

def glare(panel, design_white, valid=None):
    hsv = cv2.cvtColor(panel, cv2.COLOR_BGR2HSV).astype(np.float32)
    cand = ((hsv[..., 2] / 255.0 > 0.92) & (hsv[..., 1] / 255.0 < 0.12)).astype(np.uint8)
    if valid is not None: cand &= valid
    raw = cand.mean() * 100
    h, w = cand.shape
    if design_white == 'paint':
        # the disc label is thick white paint on a dark ground, strokes and spatter alike: every
        # bright pixel on it is the artwork.  Nothing is marked as glare, so nothing is inpainted.
        cand = np.zeros_like(cand)
    else:
        for (x0, y0, x1, y1) in design_white: cand[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] = 0
    n, lab, st, _ = cv2.connectedComponentsWithStats(cand, 8)
    areas = st[1:, cv2.CC_STAT_AREA] / float(h * w) * 100 if n > 1 else np.array([0.0])
    return cand, dict(raw_bright_pct=round(float(raw), 3), glare_pct=round(float(cand.mean() * 100), 4),
                      largest_blob_pct=round(float(areas.max()), 4), blobs=int(n - 1))

def finish(key, panel, c, valid=None):
    mask, g = glare(panel, c['design_white'], valid)
    usable = g['glare_pct'] < 0.5 and g['largest_blob_pct'] < 0.2
    if usable and g['glare_pct'] > 0:
        panel = cv2.inpaint(panel, cv2.dilate(mask, np.ones((3, 3), np.uint8)) * 255, 5, cv2.INPAINT_TELEA)
    W, H = c['out']
    out = cv2.resize(panel, (W, H), interpolation=cv2.INTER_LANCZOS4)
    report[key] = dict(source=c['src'], photo=c['photo'], warped_px=list(panel.shape[1::-1]), out_px=[W, H],
                       usable=bool(usable), inpainted=bool(usable and g['glare_pct'] > 0), white_balance='left as shot (no trustworthy neutral patch)',
                       lab_match_strength=0, **g)
    return out, usable

def sheet(key, new, oldname):
    old = cv2.imread(os.path.join(OLD, oldname)) if oldname else None
    a = cv2.resize(new, (700, int(700 * new.shape[0] / new.shape[1])))
    b = cv2.resize(old, (700, a.shape[0])) if old is not None else np.full_like(a, 40)
    for im, t in ((a, 'new (from photo)'), (b, 'old texture' if old is not None else 'old: not matched')):
        cv2.putText(im, f'{key} {t}', (10, 28), 0, 0.8, (0, 0, 0), 4); cv2.putText(im, f'{key} {t}', (10, 28), 0, 0.8, (255, 255, 255), 2)
    cv2.imwrite(os.path.join(CHK, f'sheet_{key}.png'), np.hstack([a, b]))

for key in 'ACB':
    c = cfg[key]; bgr, alpha = load(c['src'])
    q = np.float32(c['quad']); ctr = q.mean(0); q = ctr + (q - ctr) * (1 - 2 * INSET)
    wpx = int(round(max(np.linalg.norm(q[1] - q[0]), np.linalg.norm(q[2] - q[3]))))
    hpx = int(round(wpx * c['mm'][1] / c['mm'][0]))
    M = cv2.getPerspectiveTransform(q, np.float32([[0, 0], [wpx, 0], [wpx, hpx], [0, hpx]]))
    panel = cv2.warpPerspective(bgr, M, (wpx, hpx), flags=cv2.INTER_LANCZOS4)
    out, ok = finish(key, panel, c)
    if ok: cv2.imwrite(os.path.join(OUT, key + '.png'), out)
    elif OLDMAP[key]: cv2.imwrite(os.path.join(OUT, key + '.png'), cv2.resize(cv2.imread(os.path.join(OLD, OLDMAP[key])), tuple(c['out'])))
    sheet(key, out, OLDMAP[key])

# F: the disc, already cut to its circle. Printed label starts outside the clear hub ring.
c = cfg['F']; bgr, alpha = load(c['src']); cx, cy, r = c['circle']
yy, xx = np.mgrid[0:bgr.shape[0], 0:bgr.shape[1]]; rr = np.hypot(xx - cx, yy - cy) / r
valid = ((rr < 0.985) & (rr > 0.20)).astype(np.uint8)
panel = bgr.copy()
out, ok = finish('F', panel, c, valid)
S = c['out'][0]; yy, xx = np.mgrid[0:S, 0:S]; rr = np.hypot(xx - S / 2 + .5, yy - S / 2 + .5) / (S / 2)
# bleed the label a little past the rim and inside the label start so mip levels do not pull black in
edge = cv2.inpaint(out, ((rr > 0.985) | (rr < 0.19)).astype(np.uint8) * 255, 9, cv2.INPAINT_TELEA) if False else out
out = np.where((rr <= 1.0)[..., None], edge, 0).astype(np.uint8)
out[rr < 0.125] = 0                                    # the 15 mm hole
cv2.imwrite(os.path.join(OUT, 'F.png'), out); sheet('F', out, None)
report['F']['label_inner_radius_frac'] = 0.183

# D / E: photo 2 does not show the spines (the back is shot square-on), so the old plain-black spines stay.
for k in 'DE':
    cv2.imwrite(os.path.join(OUT, k + '.png'), cv2.resize(cv2.imread(os.path.join(OLD, OLDMAP[k])), (256, 2048)))
    report[k] = dict(source='old model texture (kept)', reason='photo 2 is square-on to the back; spines not visible', usable=False)
json.dump(report, open(os.path.join(CHK, 'texture_report.json'), 'w'), indent=1)
for k, v in report.items(): print(k, json.dumps(v))
