import json, sys
import numpy as np
rows = json.load(open(sys.argv[1])); pip = json.load(open(sys.argv[2])); OUT = sys.argv[3]
R = {r["f"]: r for r in rows}
q = lambda a, p: round(float(np.percentile(a, p)), 2)
def st(a):
    a = np.asarray(a, float)
    return {"n": int(len(a)), "median": q(a, 50), "p95": q(a, 95), "max": round(float(a.max()), 2)} if len(a) else {"n": 0}
res = {}
# 1. arrow tail (the tracked end) vs the measured landmark + the composition's offset
arrows = {"B03": dict(lm="headTop", off=(0, -24), vis=(188, 262), held=(195, 255)),
          "B16": dict(lm="templeR", off=(40, -6), vis=(1655, 1709), held=(1662, 1702))}
per = {}
for k, a in arrows.items():
    e_meas, e_draw, e_meas_all, seq = [], [], [], []
    for f in range(a["vis"][0], a["vis"][1] + 1):
        r = R[f]; t = r.get("tail")
        if not t or a["lm"] not in r: continue
        m = np.array(r[a["lm"]]) + a["off"]; tr = r["track"][a["lm"]]
        em = float(np.hypot(*(np.array(t[:2]) - m)))
        e_meas_all.append(em)
        held = a["held"][0] <= f <= a["held"][1]
        if held:
            e_meas.append(em)
            if tr: e_draw.append(float(np.hypot(*(np.array(t[:2]) - np.array(tr) - a["off"]))))
        seq.append({"f": f, "tail": [round(t[0], 1), round(t[1], 1)], "target_meas": [round(m[0], 1), round(m[1], 1)], "err": round(em, 2), "held": held})
    per[k] = {"landmark": a["lm"], "offset": a["off"], "held_frames": a["held"],
              "tail_vs_measured_landmark_held": st(e_meas), "tail_vs_measured_landmark_all_visible": st(e_meas_all),
              "tail_vs_track_target_held": st(e_draw), "frames": seq}
allh = sum(([s["err"] for s in per[k]["frames"] if s["held"]] for k in per), [])
res["arrow_tail"] = {"per_beat": per, "pooled_held": st(allh), "spec": "median < 6 px, p95 < 15 px"}
# 2. registration over every frame he is on the canvas: measured landmark vs track.json -> LAYER6
reg = {n: [] for n in ("headTop", "templeR", "noseTip")}
for r in rows:
    if "nose" not in r: continue
    for n, key in (("headTop", "headTop"), ("templeR", "templeR"), ("noseTip", "nose")):
        tr = r["track"][n]
        if tr: reg[n].append(float(np.hypot(r[key][0] - tr[0], r[key][1] - tr[1])))
res["registration_all_frames"] = {n: st(v) for n, v in reg.items()}
big = [(r["f"], r["beat"], round(float(np.hypot(r["headTop"][0] - r["track"]["headTop"][0], r["headTop"][1] - r["track"]["headTop"][1])), 1))
       for r in rows if "nose" in r and r["track"]["headTop"]]
res["registration_worst"] = sorted(big, key=lambda x: -x[2])[:12]
# 3. placement consistency per beat: translation residual (measured nose - track nose) and scale (interocular measured / track)
pb = {}
for r in rows:
    if "nose" not in r or not r["track"]["noseTip"] or not r["track"]["eyeOuterL"]: continue
    io_m = np.hypot(*(np.array(r["eyeOR"]) - r["eyeOL"])); io_t = np.hypot(*(np.array(r["track"]["eyeOuterR"]) - r["track"]["eyeOuterL"]))
    pb.setdefault(r["beat"], []).append((r["nose"][0] - r["track"]["noseTip"][0], r["nose"][1] - r["track"]["noseTip"][1], io_m / io_t, r["nose"][0], r["nose"][1], io_m))
place = {}
for b, v in pb.items():
    v = np.array(v)
    place[b] = {"n": len(v), "dx": round(float(np.median(v[:, 0])), 2), "dy": round(float(np.median(v[:, 1])), 2), "scale": round(float(np.median(v[:, 2])), 4),
                "nose_x": round(float(np.median(v[:, 3])), 1), "nose_y": round(float(np.median(v[:, 4])), 1), "interocular_px": round(float(np.median(v[:, 5])), 1)}
res["placement_per_beat"] = place
P = [p for b, p in place.items() if p["n"] >= 10]
res["placement_spread"] = {k: {"min": round(min(p[k] for p in P), 4), "max": round(max(p[k] for p in P), 4), "std": round(float(np.std([p[k] for p in P])), 4)}
                           for k in ("dx", "dy", "scale", "nose_x", "nose_y", "interocular_px")}
# 4. overlay over his face / head: render vs keyed webm, opaque pixels differing > 40
def spans(fs):
    out = []
    for f in sorted(fs):
        if out and f == out[-1][1] + 1: out[-1][1] = f
        else: out.append([f, f])
    return [{"from": a, "to": b, "beat": R[a]["beat"]} for a, b in out]
cnt_face = [(r["f"], r["ov_face"][0], r["ov_face"][3]) for r in rows if r.get("ov_face")]
cnt_head = [(r["f"], r["ov_head"][0], r["ov_head"][3]) for r in rows if r.get("ov_head")]
med_diff = [r["ov_face"][1] for r in rows if r.get("ov_face")]
dsel = [r["ov_face"][2] for r in rows if r.get("ov_face")]
c = np.array([x[1] for x in cnt_face])
res["overlay_diff_calibration"] = {"frames": len(c), "count_p50": q(c, 50), "count_p90": q(c, 90), "count_p99": q(c, 99),
                                   "median_abs_diff_p50": q(med_diff, 50), "median_abs_diff_p99": q(med_diff, 99),
                                   "webm_frame_offset_used": {str(d): int(dsel.count(d)) for d in (-1, 0, 1)}}
for thr in (200, 1000):
    res[f"overlay_face_box_frames_gt{thr}"] = spans([f for f, n, _ in cnt_face if n > thr])
    res[f"overlay_head_box_frames_gt{thr}"] = spans([f for f, n, _ in cnt_head if n > thr])
res["overlay_top_frames"] = sorted([(f, R[f]["beat"], n, o) for f, n, o in cnt_head], key=lambda x: -x[2])[:20]
res["presenter_frames_detected"] = sum(1 for r in rows if "nose" in r)
res["frames"] = len(rows)
res["no_face_frames"] = spans([r["f"] for r in rows if "nose" not in r])
# 5. pip
pr = [p for p in pip if 1185 <= p["f"] <= 1241 and "off_px" in p]
res["pip"] = {"frames": len(pr), "offset_px": st([p["off_px"] for p in pr]), "offset_pct_of_d": st([100 * p["off_px"] / (2 * p["edge_r_med"]) for p in pr]),
              "edge_radius_median": q([p["edge_r_med"] for p in pr], 50), "face_h_px": q([p["face_h"] for p in pr], 50)}
json.dump(res, open(OUT, "w"), indent=1)
s = dict(res); [s.pop(k) for k in ("arrow_tail",)]
print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk != "frames"} for k, v in res["arrow_tail"]["per_beat"].items()}, indent=0))
print(json.dumps(res["arrow_tail"]["pooled_held"]))
print(json.dumps(s, indent=0)[:6000])
