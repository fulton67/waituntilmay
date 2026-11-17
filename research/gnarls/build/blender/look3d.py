"""The 3D-cartoon look (the Muse hero render as the target): real per-part materials, soft studio light, a contact
shadow, Cycles. Replaces toon_look.py, whose flat emitted cel steps made the figure read as 2D.
blender -b gnarls_rig.blend --factory-startup -P look3d.py -- gen/parts_faces.npz OUT.blend

Parts (from make_parts.py, one label per face): skin, tee, belly band, horn; fins, tail and flukes are skin.
- skin: the baked albedo (spots, lighter flank patches) with the reference painting's baked shine taken out
  (anything brighter than the light flank grey is pulled to it) and stray ink lines lifted to body grey, soft vinyl:
  subsurface, a light clear coat;
- tee: flat as-drawn red #ed1d2f (no painted mistakes: tail stripe, fin cut-outs) with the N logo kept from the
  albedo inside the logo zone only; cloth sheen;
- belly band: #f4f4f4 cloth; horn: the albedo spiral, glossier, a little translucent;
- glasses: glossy brown frame; lenses are clear with a fresnel reflection.
Light: a big soft key from the upper front-left, a cool rim from behind right, a white world for the fill (gives the
ambient occlusion), and a shadow-catcher floor so the figure sits on the ground. Film is transparent; faces_video.py
lays it on white (the soft shadow stays)."""
import math, sys
import bpy
import numpy as np
from mathutils import Vector

A = sys.argv[sys.argv.index("--") + 1:]
PARTS, OUT = A[0], A[1]
sc = bpy.context.scene
ob = bpy.data.objects["Gnarls"]; me = ob.data
P = np.load(PARTS); label = P["label"]
assert len(label) == len(me.polygons), (len(label), len(me.polygons))


def lin(h, a=1.0):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c) + (a,)


SKIN, SKIN_LIGHT, RED, BAND, WHITE = lin("909faa"), lin("b9c4cb"), lin("ed1d2f"), lin("f1f1ef"), lin("f7f7f5")

# ---- parts -> material slots ----
soft = bpy.data.materials["gnarls_soft"]
mats = {"skin": soft}
for n in ("tee", "band", "horn"):
    m = bpy.data.materials.get("gnarls_" + n) or soft.copy(); m.name = "gnarls_" + n; mats[n] = m
names = [m.name for m in me.materials]
for n in ("tee", "band", "horn"):
    if mats[n].name not in names: me.materials.append(mats[n])
slot = {m.name: i for i, m in enumerate(me.materials)}
mi = np.array([slot[soft.name], slot["gnarls_tee"], slot["gnarls_band"], slot["gnarls_horn"]])[label]
me.polygons.foreach_set("material_index", mi.astype(np.int32))
# logo zone (face attribute): the front of the tee where the N is printed
cen = np.empty(len(me.polygons) * 3); me.polygons.foreach_get("center", cen); cen = cen.reshape(-1, 3)
th = np.degrees(np.arctan2(cen[:, 0], -(cen[:, 1] - 0.014)))
zone = ((label == 1) & (np.abs(th) < 35) & (cen[:, 2] > 0.30) & (cen[:, 2] < 0.50)).astype(np.float32)
at = me.attributes.get("logo_zone") or me.attributes.new("logo_zone", "FLOAT", "FACE")
at.data.foreach_set("value", zone)
print("parts:", {n: int((label == k).sum()) for k, n in enumerate(("skin", "tee", "band", "horn"))}, "logo zone faces", int(zone.sum()))


def setup(m, kind):
    nt = m.node_tree; N, L = nt.nodes, nt.links
    b = next(n for n in N if n.bl_idname == "ShaderNodeBsdfPrincipled")
    bc = b.inputs["Base Color"]
    alb = bc.links[0].from_socket if bc.links else None
    for l in list(bc.links): L.remove(l)

    def node(t, **kw):
        n = N.new(t)
        for k, v in kw.items(): setattr(n, k, v)
        return n

    def mix(a, b_, fac):
        x = node("ShaderNodeMix", data_type="RGBA")
        for s, v in ((x.inputs["A"], a), (x.inputs["B"], b_)):
            if isinstance(v, tuple): s.default_value = v
            else: L.new(v, s)
        if isinstance(fac, float): x.inputs["Factor"].default_value = fac
        else: L.new(fac, x.inputs["Factor"])
        return x.outputs["Result"]

    def band_of(sock, lo, hi):
        bw = node("ShaderNodeRGBToBW"); L.new(sock, bw.inputs[0])
        mr = node("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = lo; mr.inputs["From Max"].default_value = hi
        L.new(bw.outputs[0], mr.inputs["Value"]); return mr.outputs["Result"]

    I = b.inputs
    def setp(k, v):
        if k in I: I[k].default_value = v
    setp("Specular IOR Level", 0.5)
    if kind == "skin":
        clean = mix(alb, SKIN_LIGHT, band_of(alb, 0.50, 0.62))  # baked shine -> the light flank grey
        inv = node("ShaderNodeMath", operation="SUBTRACT"); inv.inputs[0].default_value = 1.0
        L.new(band_of(alb, 0.10, 0.18), inv.inputs[1])
        L.new(mix(clean, SKIN, inv.outputs[0]), bc)  # stray ink (no near-black paint on the skin) -> body grey
        setp("Roughness", 0.6); setp("Subsurface Weight", 0.12); setp("Subsurface Scale", 0.02)
        setp("Subsurface Radius", (1.0, 0.6, 0.45)); setp("Coat Weight", 0.18); setp("Coat Roughness", 0.25)
    elif kind == "tee":
        za = node("ShaderNodeAttribute", attribute_type="GEOMETRY", attribute_name="logo_zone")
        mul = node("ShaderNodeMath", operation="MULTIPLY"); L.new(za.outputs["Fac"], mul.inputs[0]); L.new(band_of(alb, 0.30, 0.45), mul.inputs[1])
        L.new(mix(RED, WHITE, mul.outputs[0]), bc)
        setp("Roughness", 0.78); setp("Sheen Weight", 0.35); setp("Sheen Roughness", 0.5); setp("Specular IOR Level", 0.3)
    elif kind == "band":
        bc.default_value = BAND
        setp("Roughness", 0.75); setp("Sheen Weight", 0.3); setp("Specular IOR Level", 0.3)
    elif kind == "horn":
        L.new(alb, bc)
        setp("Roughness", 0.3); setp("Coat Weight", 0.4); setp("Coat Roughness", 0.15); setp("Subsurface Weight", 0.15); setp("Subsurface Scale", 0.01)


for k, m in mats.items(): setup(m, k)

# glasses
fr = bpy.data.materials.get("glasses_frame")
if fr:
    b = next(n for n in fr.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = lin("5e2818"); b.inputs["Roughness"].default_value = 0.28
    b.inputs["Coat Weight"].default_value = 0.5; b.inputs["Coat Roughness"].default_value = 0.1
lens = bpy.data.materials.get("glasses_lens")
if lens:
    nt = lens.node_tree; N, L = nt.nodes, nt.links; N.clear()
    out = N.new("ShaderNodeOutputMaterial"); tr = N.new("ShaderNodeBsdfTransparent"); gl = N.new("ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.04
    lw = N.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.12
    mr = N.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = 0.03; mr.inputs["To Max"].default_value = 0.16
    L.new(lw.outputs["Fresnel"], mr.inputs["Value"])
    mx = N.new("ShaderNodeMixShader"); L.new(mr.outputs["Result"], mx.inputs["Fac"])
    L.new(tr.outputs[0], mx.inputs[1]); L.new(gl.outputs[0], mx.inputs[2]); L.new(mx.outputs[0], out.inputs["Surface"])
    lens.blend_method = "BLEND" if hasattr(lens, "blend_method") else None

# no inverted-hull outline in the 3D look
ol = ob.modifiers.get("outline")
if ol: ol.show_render = ol.show_viewport = False

# ---- light ----
for o in [o for o in sc.objects if o.type == "LIGHT"]: bpy.data.objects.remove(o)


def area(name, loc, power, size, color=(1, 1, 1), target=(0, 0, 0.5)):
    ld = bpy.data.lights.new(name, "AREA"); ld.energy = power; ld.size = size; ld.color = color
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); return o


area("key", (-2.0, -2.6, 5.2), 900, 4.5)  # high: a short, soft floor shadow
area("rim", (2.8, 3.0, 2.4), 700, 2.0, (0.85, 0.92, 1.0))
area("bounce", (0.0, -2.5, -1.2), 120, 3.0, target=(0, 0, 0.6))
w = sc.world.node_tree.nodes.get("Background")
w.inputs["Color"].default_value = (1, 1, 1, 1); w.inputs["Strength"].default_value = 0.65

# shadow-catcher floor at the flukes' base
fl = bpy.data.objects.get("floor")
if not fl:
    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0)); fl = bpy.context.active_object; fl.name = "floor"
fl.is_shadow_catcher = True

# ---- render ----
sc.render.engine = "CYCLES"
cy = sc.cycles; cy.device = "GPU"; cy.samples = 64; cy.use_denoising = True
try: cy.denoiser = "OPTIX"
except Exception: pass
cy.max_bounces = 6; cy.transparent_max_bounces = 12
sc.render.film_transparent = True
vs = sc.view_settings; vs.view_transform = "Khronos PBR Neutral"; vs.look = "None"
vs.exposure = -1.75  # measured: lit skin, tee and band land on the palette (tee 230,28,46 vs #ed1d2f)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("saved", OUT)
