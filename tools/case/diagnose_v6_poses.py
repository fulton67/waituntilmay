import json, os
from harness import *
from measure import *
poses = [dict(theta=0,yaw=0,pitch=0), dict(theta=0,yaw=20,pitch=0), dict(theta=0,yaw=35,pitch=0), dict(theta=0,yaw=-35,pitch=0),
         dict(theta=0,yaw=0,pitch=20), dict(theta=0,yaw=0,pitch=-20), dict(theta=0,yaw=180,pitch=0), dict(theta=0,yaw=160,pitch=0),
         dict(theta=60,yaw=0,pitch=0), dict(theta=135,yaw=0,pitch=0), dict(theta=135,yaw=-30,pitch=10)]
rows = []
with Harness() as h:
    D = "window.__case"
    for p in poses:
        tag = f"t{p['theta']}_y{p['yaw']}_p{p['pitch']}"
        out = {}
        for mode, pre, post in [('on', "0", "0"), ('clear_hidden', D + ".hideClear(true)", D + ".hideClear(false)"),
                                ('fill_removed_spec', D + ".forEach('clear', m=>{m.specularIntensity=0}); window.__specLock=1", "0")]:
            h.js(pre); h.js(D + ".pose(%s)" % json.dumps(p))
            if mode == 'fill_removed_spec': h.js(D + ".forEach('clear', m=>{m.specularIntensity=0})")
            img = h.shot(); out[mode] = img
            if mode == 'on': cv2.imwrite(os.path.join(OUT, 'renders', 'v6pose_' + tag + '.png'), img)
            h.js(post)
        case = out['clear_hidden'].max(axis=2) > 10
        on, off, ns = out['on'], out['clear_hidden'], out['fill_removed_spec']
        white_on = ((on.min(axis=2) >= 235) & case).sum(); white_off = ((off.min(axis=2) >= 235) & case).sum()
        # 'film': pixels the plastic lifted by > 25 sRGB levels over the same pixel with no plastic
        lift = (on.astype(int).min(axis=2) - off.astype(int).min(axis=2))
        film = ((lift > 25) & case).sum()
        liftns = (ns.astype(int).min(axis=2) - off.astype(int).min(axis=2)); film_ns = ((liftns > 25) & case).sum()
        r = dict(pose=tag, case_px=int(case.sum()), white_pct_on=round(100*white_on/case.sum(),3), white_pct_noplastic=round(100*white_off/case.sum(),3),
                 film_pct=round(100*film/case.sum(),2), film_pct_specular0=round(100*film_ns/case.sum(),2),
                 lum_on=round(float(lum(on)[case].mean()),4), lum_noplastic=round(float(lum(off)[case].mean()),4))
        r['lum_lift_pct'] = round(100*(r['lum_on']/r['lum_noplastic']-1),1)
        rows.append(r); print(r)
json.dump(rows, open(os.path.join(OUT, 'diagnose_v6_poses.json'), 'w'), indent=1)
