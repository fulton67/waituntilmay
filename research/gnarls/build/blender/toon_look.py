"""Crisp cartoon look for the rig (CONTEXT 3D spec: toon shader, hard cel steps in the as-drawn colours, dark outline).
blender -b gnarls_rig.blend --factory-startup -P toon_look.py -- OUT.blend [THRESHOLD]

Every opaque material becomes: base colour x a hard 2-step light ramp (lit 1.0 / shade = the guide's shade ratio,
body #909faa -> shade #798e9b), plus a hard-edged specular dot, emitted as-is under the Standard view transform, so
flat areas come out in the exact palette colours with no milky falloff. Lighting: one key sun with a small angle (crisp
shadow edge) and a neutral world; the fill and rim lights are switched off. Lenses: a flat 6% tint (the eyes behind stay dark and crisp). The die-cut
silhouette contour is added in compositing (the inverted-hull outline is left off: it dashes over the glasses patch)."""
import sys
import bpy

A = sys.argv[sys.argv.index("--") + 1:]
OUT = A[0]; THR = float(A[1]) if len(A) > 1 else 0.35
sc = bpy.context.scene


def srgb_lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c]


body, shade = srgb_lin("909faa"), srgb_lin("798e9b")
SHADE = tuple(s / b for s, b in zip(shade, body)) + (1,)  # ~ (0.69, 0.77, 0.81): cooler, as drawn


def toonify(m):
    nt = m.node_tree; N, L = nt.nodes, nt.links
    b = next(n for n in N if n.bl_idname == "ShaderNodeBsdfPrincipled")
    out = next(n for n in N if n.bl_idname == "ShaderNodeOutputMaterial")
    bc = b.inputs["Base Color"]
    src = bc.links[0].from_socket if bc.links else None
    rgb = N.new("ShaderNodeRGB"); rgb.outputs[0].default_value = tuple(bc.default_value)
    base = src or rgb.outputs[0]
    diff = N.new("ShaderNodeBsdfDiffuse"); diff.inputs["Color"].default_value = (1, 1, 1, 1)
    s2r = N.new("ShaderNodeShaderToRGB"); L.new(diff.outputs[0], s2r.inputs[0])
    bw = N.new("ShaderNodeRGBToBW"); L.new(s2r.outputs["Color"], bw.inputs[0])
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = "CONSTANT"
    e = ramp.color_ramp.elements; e[0].position = 0.0; e[0].color = SHADE; e[1].position = THR; e[1].color = (1, 1, 1, 1)
    L.new(bw.outputs[0], ramp.inputs["Fac"])
    mul = N.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1
    L.new(base, mul.inputs["A"]); L.new(ramp.outputs["Color"], mul.inputs["B"])
    gl = N.new("ShaderNodeBsdfGlossy"); gl.inputs["Roughness"].default_value = 0.18
    s2 = N.new("ShaderNodeShaderToRGB"); L.new(gl.outputs[0], s2.inputs[0])
    bw2 = N.new("ShaderNodeRGBToBW"); L.new(s2.outputs["Color"], bw2.inputs[0])
    r2 = N.new("ShaderNodeValToRGB"); r2.color_ramp.interpolation = "CONSTANT"
    e2 = r2.color_ramp.elements; e2[0].color = (0, 0, 0, 1); e2[1].position = 0.75; e2[1].color = (0.22, 0.22, 0.22, 1)
    L.new(bw2.outputs[0], r2.inputs["Fac"])
    add = N.new("ShaderNodeMix"); add.data_type = "RGBA"; add.blend_type = "ADD"; add.inputs["Factor"].default_value = 1
    L.new(mul.outputs["Result"], add.inputs["A"]); L.new(r2.outputs["Color"], add.inputs["B"])
    em = N.new("ShaderNodeEmission"); L.new(add.outputs["Result"], em.inputs["Color"])
    L.new(em.outputs[0], out.inputs["Surface"])


for m in bpy.data.materials:
    if not m.node_tree or m.name == "ink": continue
    if m.name == "glasses_lens":
        nt = m.node_tree; N, L = nt.nodes, nt.links
        out = next(n for n in N if n.bl_idname == "ShaderNodeOutputMaterial")
        tr = N.new("ShaderNodeBsdfTransparent"); em = N.new("ShaderNodeEmission")
        em.inputs["Color"].default_value = tuple(srgb_lin("c9d4da")) + (1,)
        mx = N.new("ShaderNodeMixShader"); mx.inputs["Fac"].default_value = 0.06
        L.new(tr.outputs[0], mx.inputs[1]); L.new(em.outputs[0], mx.inputs[2]); L.new(mx.outputs[0], out.inputs["Surface"])
        continue
    if any(n.bl_idname == "ShaderNodeBsdfPrincipled" for n in m.node_tree.nodes): toonify(m); print("toon:", m.name)

for o in sc.objects:
    if o.type != "LIGHT": continue
    if o.name == "key": o.data.angle = 0.02; o.data.energy = 3.0; o.data.use_shadow = False  # no self-shadow streaks: bands come from N.L
    else: o.data.energy = 0.0
w = sc.world.node_tree.nodes.get("Background")
w.inputs["Color"].default_value = (1, 1, 1, 1); w.inputs["Strength"].default_value = 0.5
vs = sc.view_settings; vs.view_transform = "Standard"; vs.look = "None"; vs.exposure = 0; vs.gamma = 1
ob = bpy.data.objects["Gnarls"]
ol = ob.modifiers.get("outline")
if ol:
    ink = bpy.data.materials["ink"]; ink.use_backface_culling = True
    ink.node_tree.nodes["Emission"].inputs["Color"].default_value = tuple(srgb_lin("100f0d")) + (1,)
    # The inverted hull draws dashes across the glasses patch's coincident layers, so it stays off: the crisp line is
    # the die-cut contour added in compositing (faces_video.py), as on the guide's stickers.
    ol.show_render = ol.show_viewport = False; ol.thickness = 0.004; ol.use_flip_normals = True; ol.offset = 1; ol.use_rim = False  # rims bridge non-manifold patch edges into dashes
    if "outline" in ob.vertex_groups:
        # no ink on the glasses patch: thinning alone leaves a coincident shell that z-fights into dashes, so the ink
        # material also cuts itself out where the "outline" vertex group (readable as an attribute) is below 0.5
        ol.vertex_group = "outline"; ol.thickness_vertex_group = 0.0
        nt = ink.node_tree; N_, L_ = nt.nodes, nt.links
        out = next(n for n in N_ if n.bl_idname == "ShaderNodeOutputMaterial"); em = N_["Emission"]
        at = N_.new("ShaderNodeAttribute"); at.attribute_type = "GEOMETRY"; at.attribute_name = "outline"
        st = N_.new("ShaderNodeMath"); st.operation = "GREATER_THAN"; st.inputs[1].default_value = 0.5
        L_.new(at.outputs["Fac"], st.inputs[0])
        tr = N_.new("ShaderNodeBsdfTransparent"); mx = N_.new("ShaderNodeMixShader")
        L_.new(st.outputs[0], mx.inputs["Fac"]); L_.new(tr.outputs[0], mx.inputs[1]); L_.new(em.outputs[0], mx.inputs[2])
        L_.new(mx.outputs[0], out.inputs["Surface"])
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("saved", OUT, "threshold", THR)
