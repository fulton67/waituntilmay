"""All of step 7, in one run:  python checks.py [glb-for-7.1]
Writes case-check/results.json, hinge curves as CSV, and the three comparison images."""
import sys, subprocess, csv, statistics
from checks_lib import *
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
GLB = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'site', 'assets', 'case', 'sie-case-v10.glb')
R = {'checks': {}}


def check(k, target, measured, ok):
    R['checks'][k] = dict(target=target, measured=measured, passed=bool(ok))
    print(('PASS ' if ok else 'FAIL ') + k, '|', target, '|', measured, flush=True)


# ---- 7.1 hinge node, 7.8 size ------------------------------------------------
j = json.loads(subprocess.run(['node', os.path.join(HERE, 'inspect.mjs'), GLB],
                              capture_output=True, text=True, cwd=HERE).stdout)
kids = sorted(n['name'] for n in j['nodes'] if n['parent'] == 'hinge')
need = ['A_front_cover', 'B_inside_cover', 'lid_clear', 'lid_knuckle_0', 'lid_knuckle_1']
disc = [n for n in j['nodes'] if n['name'] == 'F_disc']
keep = ['base_back_clear', 'base_wall_top', 'base_wall_bottom', 'base_wall_right', 'tray_black', 'hub',
        'C_back_traycard', 'D_spine_hinge', 'E_spine_open', 'F_disc', 'hinge'] + need
names = [n['name'] for n in j['nodes']]
check('7.1 hinge node',
      'hinge has lid_clear, lid_knuckle_0/1, A_front_cover, B_inside_cover; F_disc its own node; original names kept',
      dict(hinge_children=kids, F_disc_parent=disc[0]['parent'] if disc else 'MISSING',
           missing=[n for n in keep if n not in names]),
      all(n in kids for n in need) and disc and disc[0]['parent'] is None and all(n in names for n in keep))
R['glb'] = dict(file=os.path.basename(GLB), bytes=j['bytes'], tris=j['tris'], textures=j['textures'])
check('7.8 size', '<= 1.0 MB target, 1.5 MB cap', '%d B (%.3f MB)' % (j['bytes'], j['bytes'] / 1e6), j['bytes'] <= 1_000_000)
check('3 triangles', '< 60k', j['tris'], j['tris'] < 60000)

SAMPLER = """new Promise(res=>{const o=[],t0=performance.now();(function f(){const s=window.__case.state();
  o.push([+(performance.now()-t0).toFixed(1),s.theta_deg,s.omega_dps]);
  if(performance.now()-t0<%d) requestAnimationFrame(f); else res(o)})()})"""


def write_csv(name, rows):
    with open(os.path.join(OUT, name), 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['t_ms', 'theta_deg', 'omega_dps']); w.writerows(rows)


with Harness() as h:
    def sample(seconds): return h.js(SAMPLER % int(seconds * 1000))
    R['gl'] = h.gl(); R['config'] = h.js(D + ".config()")
    chosen = R['config']['plastic']

    # ---- 7.2 / 7.3 for both plastics, 7.4 --------------------------------------
    for opt in 'AB':
        h.js(D + ".plastic('%s')" % opt)
        a = cover(h, 'A_front_cover', 0, 'cmp_A_' + opt); c = cover(h, 'C_back_traycard', 180, 'cmp_C_' + opt)
        s = highlight(h, 35)
        R['plastic_' + opt] = dict(A=a, C=c, streak_pct_yaw35=float(s['streak_pct']))
    h.js(D + ".plastic('%s')" % chosen)
    P = R['plastic_' + chosen]
    for k, nm in (('A', 'front'), ('C', 'back')):
        check('7.2 haze ' + nm, '< 1.0 %', float(P[k]['haze_pct']), P[k]['haze_pct'] < 1.0)
        check('7.3 luminance ' + nm, '0.90 - 1.10', P[k]['lum_ratio'], 0.90 <= P[k]['lum_ratio'] <= 1.10)
        check('7.3 dE76 ' + nm, '< 8', P[k]['dE76'], P[k]['dE76'] < 8)
    check('7.4 highlight at 35 deg yaw', '0.5 - 8 % of case area', P['streak_pct_yaw35'], 0.5 <= P['streak_pct_yaw35'] <= 8)

    # ---- 7.5 tap: real pointer events on the canvas ---------------------------
    h.js(D + ".pose({theta:0})"); h.p.locator('#case3d canvas').scroll_into_view_if_needed()
    bb = h.js("(()=>{const r=document.querySelector('#case3d canvas').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")

    def click():
        h.p.mouse.move(*bb); h.p.mouse.down(); h.p.wait_for_timeout(40); h.p.mouse.up()

    click(); o = sample(1.4); write_csv('hinge_tap_open.csv', o)
    peak = max(r[1] for r in o)
    t_in = next((r[0] for i, r in enumerate(o) if all(abs(q[1] - 160) <= 1 for q in o[i:])), None)
    check('7.5 tap open', '160 +/-1 deg within 1.0 s, overshoot <= 3 deg',
          dict(settled_ms=t_in, peak_deg=peak, overshoot_deg=round(peak - 160, 3), end_deg=o[-1][1],
               gesture=h.js(D + ".state().gesture")),
          t_in is not None and t_in <= 1000 and peak - 160 <= 3)
    R['frames_per_s_during_tap'] = round(len(o) / 1.4, 1)
    h.js(D + ".clearEvents()"); click(); c2 = sample(1.4); write_csv('hinge_tap_close.csv', c2)
    t0 = next((r[0] for i, r in enumerate(c2) if all(abs(q[1]) <= 0.2 for q in c2[i:])), None)
    ev = h.js(D + ".events()")
    check('7.5 tap close', '0.0 +/-0.2 deg within 1.0 s, detent engages',
          dict(settled_ms=t0, end_deg=c2[-1][1], events=ev, locked=h.js(D + ".state().locked")),
          t0 is not None and t0 <= 1000 and 'seated' in ev)

    # ---- 7.6 drag 0 -> 90 with a slow release (real pointer, at the free edge) -
    h.js(D + ".pose({theta:0})")
    p0 = h.js(D + ".lidPoint(0.5, 0.96)"); pin = h.js(D + ".lidPoint(0.5, 0.0)")
    h.p.mouse.move(*p0); h.p.mouse.down(); h.p.wait_for_timeout(30)
    ux = -1 if pin[0] < p0[0] else 1
    for i in range(1, 7): h.p.mouse.move(p0[0] + ux * 2 * i, p0[1]); h.p.wait_for_timeout(16)   # 12 px toward the pin: commits
    start = h.js(D + ".state()")
    track = []
    th0 = start['theta_deg']
    for i in range(1, 61):
        th = th0 + (90 - th0) * (1 - (1 - i / 60) ** 2)   # eases out: the finger is nearly still at the end
        q = h.js(D + ".grabPointAt(%f)" % th); h.p.mouse.move(*q); h.p.wait_for_timeout(16)
        track.append([i * 16, h.js(D + ".state().theta_deg"), round(th, 2)])
    for i in range(6):                                    # the camera re-fits as the lid opens; settle on 90
        q = h.js(D + ".grabPointAt(90)"); h.p.mouse.move(*q); h.p.wait_for_timeout(30)
    h.p.wait_for_timeout(200); before = h.js(D + ".state()"); h.p.mouse.up()
    rel = sample(1.0); write_csv('hinge_drag_release.csv', rel)
    with open(os.path.join(OUT, 'hinge_drag_track.csv'), 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['t_ms', 'lid_deg', 'finger_deg']); w.writerows(track)
    lag = max(abs(t[1] - t[2]) for t in track[5:])
    check('7.6 drag follows the finger', 'lid angle tracks finger angle (1:1)',
          dict(gesture=before['gesture'], angle_after_commit=start['theta_deg'], max_error_deg=round(lag, 2), at_release=before['theta_deg']),
          str(before['gesture']).startswith('hinge') and lag <= 3)
    check('7.6 slow release holds', '90 +/-2 deg', dict(end_deg=rel[-1][1], omega_end=rel[-1][2]),
          abs(rel[-1][1] - 90) <= 2 and rel[-1][2] == 0)
    # flick: 600 deg/s toward open
    h.js(D + ".throwLid(90, 600)"); f = sample(1.6); write_csv('hinge_flick_600.csv', f)
    ev = h.js(D + ".events()"); ipk = max(range(len(f)), key=lambda i: f[i][1])
    back = round(180 - min(r[1] for r in f[ipk:]), 3) if 'stop' in ev else None
    check('7.6 flick 600 deg/s', 'hits the 180 stop, bounces back <= 6 deg, settles',
          dict(hit_stop='stop' in ev, bounce_back_deg=back, end_deg=f[-1][1], omega_end=f[-1][2]),
          'stop' in ev and back is not None and back <= 6 and f[-1][2] == 0)
    h.js(D + ".throwLid(6, 0)"); s6 = sample(0.8); write_csv('hinge_release_at_6.csv', s6)
    check('7.6 release at 6 deg', 'snaps shut to 0', dict(end_deg=s6[-1][1], events=h.js(D + ".events()")), s6[-1][1] == 0)

    # ---- 7.7 frame rate, both plastics -----------------------------------------
    for opt in 'AB':
        h.js(D + ".plastic('%s')" % opt); h.js(D + ".pose({theta:0})")
        h.js(D + ".logFrames(true)"); h.js(D + ".spin(360, 10, true)")
        h.p.wait_for_timeout(2000); h.js(D + ".tap()"); h.p.wait_for_timeout(3000); h.js(D + ".tap()"); h.p.wait_for_timeout(5000)
        fl = h.js(D + ".frameLog"); h.js(D + ".logFrames(false)"); fl = fl[2:]
        med = statistics.median(fl); p95 = sorted(fl)[int(len(fl) * 0.95)]
        R['plastic_' + opt]['fps'] = dict(frames=len(fl), median_fps=round(1000 / med, 1), p95_frame_ms=round(p95, 2),
                                          draw_calls=h.js(D + ".info().calls"))
    h.js(D + ".plastic('%s')" % chosen)
    F = R['plastic_' + chosen]['fps']
    check('7.7 frame rate (headless desktop GPU, NOT an iPhone)', '>= 50 fps median', F, F['median_fps'] >= 50)
    R['materials'] = h.js(D + ".materials()")

    # ---- 7.9 the three comparisons ---------------------------------------------
    def photo(path):
        im = cv2.imread(os.path.join(ROOT, path), cv2.IMREAD_UNCHANGED)
        return (im[..., :3] * (im[..., 3:4] / 255.0)).astype(np.uint8) if im.shape[2] == 4 else im

    def side(name, pose, src):
        h.js(D + ".backdrop(false)"); h.js(D + ".pose(%s)" % json.dumps(pose)); r = h.shot(); h.js(D + ".backdrop(true)")
        ys, xs = np.where(r.max(axis=2) > 8); r = r[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        ph = photo(src); H = 900
        a = cv2.resize(r, (int(r.shape[1] * H / r.shape[0]), H), interpolation=cv2.INTER_AREA)
        b = cv2.resize(ph, (int(ph.shape[1] * H / ph.shape[0]), H), interpolation=cv2.INTER_AREA)
        canvas = np.zeros((H + 60, a.shape[1] + b.shape[1] + 60, 3), np.uint8)
        canvas[50:50 + H, 20:20 + a.shape[1]] = a; canvas[50:50 + H, 40 + a.shape[1]:40 + a.shape[1] + b.shape[1]] = b
        cv2.putText(canvas, 'render (case.v7)', (20, 34), 0, 0.9, (255, 255, 255), 2)
        cv2.putText(canvas, 'photo', (40 + a.shape[1], 34), 0, 0.9, (255, 255, 255), 2)
        p = os.path.join(OUT, 'compare', name); cv2.imwrite(p, canvas); return p

    R['compare'] = [side('closed_front_vs_photo1.png', dict(theta=0), 'site/assets/cd-front.webp'),
                    side('closed_back_vs_photo2.png', dict(theta=0, yaw=180), 'site/assets/cd-back.webp'),
                    side('open_disc_vs_photo3.png', dict(theta=180), 'site/assets/cd-open.webp')]

R['all_passed'] = all(c['passed'] for c in R['checks'].values())
json.dump(R, open(os.path.join(OUT, 'results.json'), 'w'), indent=1, default=float)
print('ALL PASSED' if R['all_passed'] else 'SOME FAILED')
for o in 'AB':
    p = R['plastic_' + o]
    print(o, 'haze A/C', p['A']['haze_pct'], p['C']['haze_pct'], 'ratio', p['A']['lum_ratio'], p['C']['lum_ratio'],
          'dE', p['A']['dE76'], p['C']['dE76'], 'streak', p['streak_pct_yaw35'], p['fps'])
