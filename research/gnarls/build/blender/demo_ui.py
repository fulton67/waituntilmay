"""Open the Gnarls rig in Blender's UI with a control panel (sidebar N > Gnarls).
blender renders/rig_v5/gnarls_rig.blend -P blender/demo_ui.py

Panel: Pose (jumps to the keyed pose frame), Eyes / Mouth (any of the 14 states each, keyed on the current frame so they
stick), Play poses (2-key holds at ~1.5 poses/s). The viewport opens in EEVEE Rendered shading with the bones shown, so
you can orbit, pick the rig in Pose mode and rotate bones (R) yourself. Nothing is saved unless you save."""
import json
import bpy

sc = bpy.context.scene
ARM = next(o for o in sc.objects if o.type == "ARMATURE")
BODY = bpy.data.objects["Gnarls"]
ORDER = ARM.id_properties_ui("eyes").as_dict()["description"].split("index into ", 1)[1].split(",")
FRAMES = json.loads(sc["gnarls_frames"])
POSES = [f for f in FRAMES if f["kind"] == "pose"]
LABEL = lambda s: s.replace("_", " ").replace("+", " + ").capitalize()


def _items_face(self, ctx): return [(str(i), LABEL(n), "") for i, n in enumerate(ORDER)]
def _items_pose(self, ctx):
    return [(str(f["frame"]), LABEL(f["name"]), "") for f in POSES] + \
           [(str(f["frame"]), LABEL(f["name"]), "") for f in FRAMES if f["kind"] == "face"]


def _fcurves(act):  # Blender 5 layered actions keep fcurves in channelbags
    if hasattr(act, "layers"):
        for ly in act.layers:
            for st in ly.strips:
                for cb in st.channelbags: yield from cb.fcurves
    elif hasattr(act, "fcurves"): yield from act.fcurves


def _refresh():
    for o in (ARM, BODY): o.update_tag()
    bpy.context.view_layer.update()


def _set_face(zone):
    def upd(self, ctx):
        ARM[zone] = int(getattr(self, "gn_" + zone))
        ARM.keyframe_insert(f'["{zone}"]', frame=ctx.scene.frame_current)
        for fc in _fcurves(ARM.animation_data.action):
            for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"
        _refresh()
    return upd


def _set_pose(self, ctx):
    ctx.scene.frame_set(int(self.gn_pose)); _sync(ctx.scene)


def _sync(scene):
    # keep the dropdowns showing what the current frame holds (without re-keying)
    for z in ("eyes", "mouth"):
        v = str(int(ARM.get(z, 0)))
        if scene.get("gn_" + z) != int(v): scene["gn_" + z] = int(v)


bpy.types.Scene.gn_pose = bpy.props.EnumProperty(name="Pose", items=_items_pose, update=_set_pose)
bpy.types.Scene.gn_eyes = bpy.props.EnumProperty(name="Eyes", items=_items_face, update=_set_face("eyes"))
bpy.types.Scene.gn_mouth = bpy.props.EnumProperty(name="Mouth", items=_items_face, update=_set_face("mouth"))


class GNARLS_OT_play(bpy.types.Operator):
    bl_idname = "gnarls.play"; bl_label = "Play / stop poses"
    def execute(self, ctx):
        s = ctx.scene; s.frame_start, s.frame_end = 1, len(POSES)
        s.render.fps, s.render.fps_base = 3, 2.0  # 1.5 poses per second: the house 2-key hold, slowed to read
        if not (1 <= s.frame_current <= len(POSES)): s.frame_set(1)
        bpy.ops.screen.animation_play(); return {"FINISHED"}


class GNARLS_PT_panel(bpy.types.Panel):
    bl_label = "Gnarls rig"; bl_space_type = "VIEW_3D"; bl_region_type = "UI"; bl_category = "Gnarls"
    def draw(self, ctx):
        L = self.layout; s = ctx.scene
        L.prop(s, "gn_pose"); L.operator("gnarls.play", icon="PLAY")
        L.separator(); L.label(text="Face (keyed on this frame)")
        L.prop(s, "gn_eyes"); L.prop(s, "gn_mouth")
        L.separator(); L.label(text=f"Frame {s.frame_current}")
        L.label(text="Pose mode: click a bone, R to rotate")


for c in (GNARLS_OT_play, GNARLS_PT_panel): bpy.utils.register_class(c)
bpy.app.handlers.frame_change_post.append(lambda scene, *a: _sync(scene))


def _setup_view():
    sc.render.engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items} else sc.render.engine
    ARM.show_in_front = True; ARM.data.display_type = "STICK"
    sc.frame_set(1); _sync(sc)
    win = bpy.context.window_manager.windows[0]
    for area in win.screen.areas:
        if area.type != "VIEW_3D": continue
        sp = area.spaces.active; sp.shading.type = "RENDERED"; sp.show_region_ui = True
        r3 = sp.region_3d; r3.view_perspective = "PERSP"
        region = next(r for r in area.regions if r.type == "WINDOW")
        with bpy.context.temp_override(window=win, area=area, region=region):
            for o in sc.objects: o.select_set(o == BODY)
            bpy.context.view_layer.objects.active = BODY
            bpy.ops.view3d.view_selected()
            for o in sc.objects: o.select_set(o == ARM)
            bpy.context.view_layer.objects.active = ARM
            bpy.ops.object.mode_set(mode="POSE")
        # sidebar on the Gnarls tab
        for r in area.regions:
            if r.type == "UI":
                try: r.active_panel_category = "Gnarls"
                except Exception: pass
    return None


if not bpy.app.background:
    bpy.app.timers.register(_setup_view, first_interval=0.5)
print("gnarls demo ui ready:", len(POSES), "poses,", len(ORDER), "face states")
