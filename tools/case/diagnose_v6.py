import json, glob, os, sys
from harness import *
from measure import *
OLD = os.path.join(OUT, 'textures', 'old')
def bbox(mask):
    ys, xs = np.where(mask); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
with Harness() as h:
    h.js("window.__case.pose({theta:0}); window.__case.silhouette('A_front_cover')")
    m = h.shot(); x0, y0, x1, y1 = bbox(m[..., 1] > 128)
quad = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
res = {}
with Harness() as h:
    D = "window.__case"
    def run(tag):
        img = h.shot(); w = warp_region(img, quad)
        cv2.imwrite(os.path.join(OUT, 'renders', 'v6_' + tag + '.png'), img)
        return w
    h.js(D + ".pose({theta:0})")
    base = run('baseline')
    # which old texture is A?  best correlation at 64x64
    best = None
    for f in glob.glob(os.path.join(OLD, '*.webp')):
        s = cv2.imread(f)
        if s is None or s.shape[0] != s.shape[1]: continue
        a = cv2.resize(base, (64, 64)).astype(np.float32).ravel(); b = cv2.resize(s, (64, 64)).astype(np.float32).ravel()
        c = np.corrcoef(a, b)[0, 1]
        if best is None or c > best[0]: best = (c, f, s)
    print('source A:', os.path.basename(best[1]), 'corr', round(float(best[0]), 3)); src = best[2]
    res['baseline'] = compare(base, src)
    tests = [
      ('lid_clear_hidden', "__case.forEach('lid_clear', m=>{}); (()=>{let n=0; return n})()", None),
    ]
    def toggle(tag, on, off):
        h.js(on); h.js(D + ".pose({theta:0})"); res[tag] = compare(run(tag), src); h.js(off); h.js(D + ".pose({theta:0})")
    toggle('all_clear_hidden', D + ".hideClear(true)", D + ".hideClear(false)")
    toggle('env_intensity_0', D + ".env(0)", D + ".env(1)")
    toggle('cover_envMapIntensity_x0.5', D + ".forEach('cover', m=>{m.envMapIntensity=0.5})", D + ".forEach('cover', m=>{m.envMapIntensity=1})")
    toggle('clear_roughness_0.03', D + ".forEach('clear', m=>{m.roughness=0.03})", D + ".forEach('clear', m=>{m.roughness=0})")
    toggle('clear_specular_0', D + ".forEach('clear', m=>{m.specularIntensity=0})", "0")
    toggle('key_light_0', D + ".key(0)", D + ".key(2.4)")
    toggle('lid_transmission_off_black', D + ".forEach('lid_clear', m=>{m.userData.o=[m.transmission,m.color.getHex(),m.roughness]; m.transmission=0;m.color.setHex(0);m.transparent=true;m.blending=2;m.depthWrite=false})", "0")
    res['materials_before'] = h.js(D + ".materials"); res['render_before'] = h.js(D + ".render"); res['physics_before'] = h.js(D + ".physics")
    res['gl'] = h.gl()
json.dump(res, open(os.path.join(OUT, 'diagnose_v6.json'), 'w'), indent=1)
for k, v in res.items():
    if isinstance(v, dict) and 'haze_pct' in v: print(f"{k:32s} haze {v['haze_pct']:7.3f}%  lum ratio {v['lum_ratio']:.3f}  dE {v['dE76']:5.2f}  render {v['mean_srgb_render']} src {v['mean_srgb_source']}")
