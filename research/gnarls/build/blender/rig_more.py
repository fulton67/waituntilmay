"""More rig: a glasses bone and a horn bone, so both can follow through on their own (ANIMATION.md 0.2: the glasses
lag 1 f and bounce at most 0.005 on impacts; the horn dips with the head and wobbles a few degrees).
blender -b gnarls_rig.blend --factory-startup -P rig_more.py -- gen/parts_faces.npz OUT.blend

- glasses: a bone at the bridge, child of head; every glasses object is re-parented to it (world transform kept).
- horn: a bone from the horn's base to its tip, child of head. The horn's verts (the horn part from make_parts.py)
  are moved from the head group to a new "horn" group, fading over the bottom 2 cm so the base stays attached.
Full bone list after this: root, hips, spine, chest, head, glasses, horn, fin_L/R_1-3, grip_L/R, tail1, tail2,
fluke_L, fluke_R."""
import sys
import bpy
import numpy as np
from mathutils import Vector

A = sys.argv[sys.argv.index("--") + 1:]
PARTS, OUT = A[0], A[1]
sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == "ARMATURE")
ob = bpy.data.objects["Gnarls"]; me = ob.data
label = np.load(PARTS)["label"]; assert len(label) == len(me.polygons)

co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
hv = set()
for p in me.polygons:
    if label[p.index] == 3: hv.update(p.vertices)
hv = np.array(sorted(hv)); P = co[hv]
tip = P[np.argmax(P[:, 2])]
zlo = np.percentile(P[:, 2], 3); base = P[P[:, 2] < zlo + 0.01].mean(0)
glasses_objs = [o for o in sc.objects if o.name.startswith("glasses_")]
gc = np.mean([np.array(o.matrix_world.translation) for o in glasses_objs if "rim" in o.name], 0)
bridge = Vector((0.0, float(gc[1]) - 0.01, float(gc[2])))
print("horn base", base.round(3), "tip", tip.round(3), "verts", len(hv), "| bridge", tuple(round(x, 3) for x in bridge))

bpy.context.view_layer.objects.active = arm
for o in sc.objects: o.select_set(o == arm)
bpy.ops.object.mode_set(mode="EDIT")
eb = arm.data.edit_bones
for n in ("glasses", "horn"):
    if n in eb: eb.remove(eb[n])
g = eb.new("glasses"); g.head = bridge; g.tail = bridge + Vector((0, 0, 0.06)); g.parent = eb["head"]
h = eb.new("horn"); h.head = Vector(base); h.tail = Vector(tip); h.parent = eb["head"]
bpy.ops.object.mode_set(mode="OBJECT")

# horn weights
vg_h = ob.vertex_groups.get("horn") or ob.vertex_groups.new(name="horn")
vg_head = ob.vertex_groups["head"]
w = np.clip((co[hv, 2] - base[2]) / 0.02, 0, 1)
for vi, wi in zip(hv.tolist(), w.tolist()):
    if wi <= 0: continue
    vg_h.add([vi], wi, "REPLACE")
    try: old = vg_head.weight(vi)
    except RuntimeError: old = 0.0
    if old > 0: vg_head.add([vi], old * (1 - wi), "REPLACE")
print("horn group:", int((w > 0).sum()), "verts")

# glasses follow their own bone
bpy.context.view_layer.update()
for o in glasses_objs:
    mw = o.matrix_world.copy(); o.parent = arm; o.parent_type = "BONE"; o.parent_bone = "glasses"; o.matrix_world = mw
arm.data.pose_position = "POSE"
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("saved", OUT, "bones", [b.name for b in arm.data.bones])
