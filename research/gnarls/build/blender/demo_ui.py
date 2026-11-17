"""Open the Gnarls rig in Blender's UI with a control panel (sidebar N > Gnarls).
blender renders/actions/gnarls_actions.blend -P blender/demo_ui.py   (the rig with the action reel baked in)
blender renders/rig_v10/gnarls_rig.blend -P blender/demo_ui.py        (the rig alone)

Panel: Pose (jumps to the keyed pose frame); Eyes / Mouth expression presets (any eyes with any mouth, keyed on the
current frame); every face control as a slider (brows, lids, pupils, mouth: drag to see the rig move, right-click >
Insert Keyframe to animate); Play poses (2-key holds at ~1.5 poses/s). The viewport opens in EEVEE Rendered shading with the bones shown, so
you can orbit, pick the rig in Pose mode and rotate bones (R) yourself. Nothing is saved unless you save."""
import json
import bpy

sc = bpy.context.scene
ARM = next(o for o in sc.objects if o.type == "ARMATURE")
BODY = bpy.data.objects["Gnarls"]
PRE = json.loads(sc["gnarls_face_presets"]); CTRL = list(PRE["controls"])
ORDER = list(PRE["eyes"])
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
        vals = PRE[zone][ORDER[int(getattr(self, "gn_" + zone))]]
        for k, v in vals.items():
            ARM[k] = float(v); ARM.keyframe_insert(f'["{k}"]', frame=ctx.scene.frame_current)
        _refresh()
    return upd


def _set_pose(self, ctx):
    ctx.scene.frame_set(int(self.gn_pose)); _sync(ctx.scene)


def _sync(scene):
    pass  # presets are applied on choice; the sliders always show the live control values


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


class GNARLS_OT_reel(bpy.types.Operator):
    bl_idname = "gnarls.reel"; bl_label = "Play action reel"
    @staticmethod
    def span(scene):
        if scene.get("gnarls_reel"): return tuple(scene["gnarls_reel"])
        act = ARM.animation_data.action if ARM.animation_data else None
        if act and act.frame_range[1] > 3000: return 3001, int(act.frame_range[1])
        return None
    @classmethod
    def poll(cls, ctx): return cls.span(ctx.scene) is not None
    def execute(self, ctx):
        s = ctx.scene; a, b = self.span(s); s.frame_start, s.frame_end = a, b
        s.render.fps, s.render.fps_base = 24, 1.0
        if not (a <= s.frame_current <= b): s.frame_set(a)
        bpy.ops.screen.animation_play(); return {"FINISHED"}


class GNARLS_PT_panel(bpy.types.Panel):
    bl_label = "Gnarls rig"; bl_space_type = "VIEW_3D"; bl_region_type = "UI"; bl_category = "Gnarls"
    def draw(self, ctx):
        L = self.layout; s = ctx.scene
        L.prop(s, "gn_pose"); L.operator("gnarls.play", icon="PLAY")
        L.operator("gnarls.reel", icon="PLAY")
        L.separator(); L.label(text="Face (keyed on this frame)")
        L.prop(s, "gn_eyes"); L.prop(s, "gn_mouth")
        box = L.box(); box.label(text="Face controls")
        for k in CTRL: box.prop(ARM, f'["{k}"]', text=k.replace("_", " "), slider=True)
        L.separator(); L.label(text=f"Frame {s.frame_current}")
        L.label(text="Pose mode: click a bone, R to rotate")


for c in (GNARLS_OT_play, GNARLS_OT_reel, GNARLS_PT_panel): bpy.utils.register_class(c)
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
print("gnarls demo ui ready:", len(POSES), "poses,", len(ORDER), "expression presets,", len(CTRL), "face controls")
