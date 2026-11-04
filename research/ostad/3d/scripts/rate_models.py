"""Headless Blender: a 4-angle clay turntable for every downloaded survey model, so quality can be rated by eye.
run: blender -b -P rate_models.py      (then `python rate_models.py sheets` in plain Python to tile the views)
in : models_candidates.json (downloaded entries), base/face.glb (stands in for Z-Anatomy)
out: renders/survey/{slug}_{0..3}.png -> renders/survey/{slug}.jpg, renders/survey/index.json
"""
import json, math, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parents[1]
OUT = HERE / "renders/survey"
SLUG = lambda s: re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")[:48]


def targets():
    M = json.load(open(HERE / "models_candidates.json", encoding="utf-8"))
    seen, rows = set(), []
    for m in M:
        p = m.get("path")
        if m.get("downloaded") and p and "z-anatomy" not in p.lower() and p not in seen:
            seen.add(p); rows.append({"name": m["name"], "source": m["source"], "path": p})
    rows.append({"name": "Z-Anatomy head (as built into face.glb)", "source": "Z-Anatomy", "path": str(HERE / "base/face.glb")})
    for r in rows:
        r["slug"] = SLUG(r["name"])
    return rows


if __name__ == "__main__" and "sheets" in sys.argv:
    from PIL import Image
    idx = []
    for r in targets():
        views = [OUT / f"{r['slug']}_{i}.png" for i in range(4)]
        if not all(v.exists() for v in views):
            idx.append({**r, "rendered": False}); continue
        S = Image.new("RGB", (720, 720), (232, 232, 232))
        for i, v in enumerate(views):
            S.paste(Image.open(v).convert("RGBA").resize((360, 360)), ((i % 2) * 360, (i // 2) * 360), Image.open(v).convert("RGBA").resize((360, 360)))
        S.save(OUT / f"{r['slug']}.jpg", quality=86)
        idx.append({**r, "rendered": True, "sheet": f"renders/survey/{r['slug']}.jpg"})
    json.dump(idx, open(OUT / "index.json", "w"), indent=1)
    print(sum(i["rendered"] for i in idx), "of", len(idx), "sheets")
    sys.exit(0)

import bpy
from mathutils import Vector

OUT.mkdir(parents=True, exist_ok=True)
for r in targets():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    p = pathlib.Path(r["path"])
    files = sorted(p.glob("*.obj")) if p.is_dir() else [p]
    try:
        for f in files:
            ext = f.suffix.lower()
            if ext == ".stl": bpy.ops.wm.stl_import(filepath=str(f))
            elif ext == ".obj": bpy.ops.wm.obj_import(filepath=str(f))
            elif ext in (".glb", ".gltf"): bpy.ops.import_scene.gltf(filepath=str(f))
            elif ext == ".fbx": bpy.ops.import_scene.fbx(filepath=str(f))
    except Exception as e:
        print("IMPORT FAIL", r["slug"], e); continue
    meshes = [o for o in sc.objects if o.type == "MESH"]
    if not meshes:
        print("NO MESH", r["slug"]); continue
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector([min(q[i] for q in pts) for i in range(3)]); hi = Vector([max(q[i] for q in pts) for i in range(3)])
    ctr, size = (lo + hi) / 2, max(hi - lo)
    piv = bpy.data.objects.new("piv", None); sc.collection.objects.link(piv)
    clay = bpy.data.materials.new("clay"); clay.use_nodes = True
    clay.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.75, 0.72, 0.68, 1)
    keepmat = r["source"] == "Z-Anatomy" or any(len(o.data.materials) and o.data.materials[0] for o in meshes if o.data.materials)
    for o in meshes:
        mw = o.matrix_world.copy(); o.parent = piv; o.matrix_world = mw
        o.location = o.location - ctr
        if not o.data.materials or not keepmat:
            o.data.materials.clear(); o.data.materials.append(clay)
    piv.scale = (1 / size,) * 3
    ext = hi - lo
    upright = math.radians(90) if ext.y > 1.4 * ext.z else 0.0   # Y-up files lie flat: stand them on their long axis
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 50; cam.data.clip_start = 0.01; cam.location = (0, -2.4, 0.25)
    cam.rotation_euler = (Vector((0, 0, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    for nm, loc, e in (("key", (1.5, -2, 2), 90), ("fill", (-2, -1.5, 0.5), 30), ("rim", (0, 2, 2), 60)):
        L = bpy.data.lights.new(nm, "AREA"); L.energy = e; L.size = 1.5
        lo_ = bpy.data.objects.new(nm, L); sc.collection.objects.link(lo_); lo_.location = loc
        lo_.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.render.engine = "BLENDER_EEVEE"; sc.render.film_transparent = True; sc.view_settings.view_transform = "Standard"
    sc.render.resolution_x = sc.render.resolution_y = 480
    tris = sum(len(o.data.polygons) for o in meshes)
    for i in range(4):
        piv.rotation_euler = (upright, 0, math.radians(90 * i - 30))
        sc.render.filepath = str(OUT / f"{r['slug']}_{i}.png"); bpy.ops.render.render(write_still=True)
    print("RATED", r["slug"], "meshes", len(meshes), "faces", tris)
