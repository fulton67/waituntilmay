import sys, json
from checks_lib import *
with Harness() as h:
    h.js(D + ".env(1.15)")
    for spec in sys.argv[1:]:
        h.js(D + ".envLevels('reflect', %s)" % spec)
        r = [highlight(h, y, p)['streak_pct'] for (y, p) in [(35, 0), (20, 0), (50, 0), (0, 25), (0, 45), (0, -30), (0, 0)]]
        print(f"{spec:60s} lifted% y35 {r[0]} y20 {r[1]} y50 {r[2]} p25 {r[3]} p45 {r[4]} p-30 {r[5]} head-on {r[6]}", flush=True)
