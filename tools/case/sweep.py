import sys, json
from checks_lib import *
with Harness() as h:
    def row(tag):
        a = cover(h, 'A_front_cover', 0); c = cover(h, 'C_back_traycard', 180); s = highlight(h)
        print(f"{tag:44s} A ratio {a['lum_ratio']:.3f} haze {a['haze_pct']:.2f} dE {a['dE76']:.1f} | C ratio {c['lum_ratio']:.3f} haze {c['haze_pct']:.2f} dE {c['dE76']:.1f} | streak {s['streak_pct']}%", flush=True)
    for spec in sys.argv[1:]:
        o = json.loads(spec); env = o.pop('env', 1.0); r = o.pop('reflect', {})
        h.js(D + ".envLevels('light', %s)" % json.dumps(o)); h.js(D + ".envLevels('reflect', %s)" % json.dumps(r)); h.js(D + ".env(%s)" % env); row(spec)
