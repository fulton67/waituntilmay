import json, os, numpy as np, cv2
from harness import Harness, OUT
from measure import warp_region, compare, lum
TEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build', 'tex')
D = "window.__case"
def cover(h, name, yaw, tag=None):
    """head-on render of a cover vs its source texture"""
    h.js(D + ".pose(%s)" % json.dumps(dict(theta=0, yaw=yaw)))
    img = h.shot(); quad = h.js(D + ".corners('%s')" % name)
    w = warp_region(img, quad)
    src = cv2.imread(os.path.join(TEX, name[0] + '.png'))
    if tag: cv2.imwrite(os.path.join(OUT, 'renders', tag + '.png'), np.hstack([w, cv2.resize(src, (1024, 1024))]))
    return compare(w, src)
def highlight(h, yaw=35, pitch=0):
    """7.4: pixels the plastic brightens by > 25 sRGB levels, as a share of the case"""
    h.js(D + ".backdrop(false)")
    h.js(D + ".pose(%s)" % json.dumps(dict(theta=0, yaw=yaw, pitch=pitch))); on = h.shot().astype(int)
    h.js(D + ".hideClear(true)"); h.js(D + ".renderOnce()"); off = h.shot().astype(int)
    h.js(D + ".hideClear(false)"); h.js(D + ".backdrop(true)")
    case = (np.maximum(on, off).max(axis=2) > 6)
    hot = ((on.max(axis=2) - off.max(axis=2)) > 25) & case
    return dict(case_px=int(case.sum()), streak_pct=round(100.0 * hot.sum() / case.sum(), 2))
