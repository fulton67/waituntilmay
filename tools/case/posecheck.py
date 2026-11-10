import sys
from checks_lib import *
def cov(h, name, pose):
    h.js(D + ".pose(%s)" % json.dumps(pose)); img = h.shot(); q = h.js(D + ".corners('%s')" % name)
    return compare(warp_region(img, q), cv2.imread(os.path.join(TEX, name[0] + '.png')))
with Harness() as h:
    env = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
    h.js(D + ".env(%s)" % env)
    if len(sys.argv) > 2: h.js(D + ".envLevels('reflect', %s)" % sys.argv[2])
    poses = [dict(theta=0), dict(theta=0, yaw=35), dict(theta=0, pitch=25), dict(theta=0, pitch=45), dict(theta=0, pitch=-30), dict(theta=0, pitch=-50)]
    print('env', env, 'A ratio/haze/dE by pose:', [(r['lum_ratio'], float(r['haze_pct']), r['dE76']) for r in (cov(h, 'A_front_cover', p) for p in poses)])
    c = cov(h, 'C_back_traycard', dict(theta=0, yaw=180)); print('C head-on:', c['lum_ratio'], float(c['haze_pct']), c['dE76'])
    print('plastic lifted%:', {str(k): float(highlight(h, *k)['streak_pct']) for k in [(35, 0), (20, 0), (50, 0), (0, 25), (0, 45), (0, -30), (0, 0)]})
    ims = []
    for p in [dict(theta=0), dict(theta=0, yaw=20), dict(theta=0, yaw=35), dict(theta=0, pitch=25), dict(theta=0, yaw=180), dict(theta=160), dict(theta=100, yaw=-30, pitch=10), dict(theta=0, pitch=-35, yaw=15)]:
        h.js(D + ".pose(%s)" % json.dumps(p)); ims.append(cv2.resize(h.shot(), (560, 420)))
    cv2.imwrite(OUT + '/renders/pose_sheet.png', np.vstack([np.hstack(ims[:4]), np.hstack(ims[4:])]))
