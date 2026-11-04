"""97 shot plans -> refs/shots/{procedure_id}.md, plus refs/BUILD_LIST.md and refs/shots/index.json.

Each plan: shots with frame (OVERLAY = rendered with alpha, the object floats beside Ostad on the filmed plate;
FULL-FRAME = the camera is inside tissue or at cell scale, edges fill the frame, cut away from him), scene,
visible layers, camera move, what animates, duration, label text; a reference animation from motion.json;
his own sentences matched from the transcripts of mentioned_in videos; missing assets.

Shots come from family templates (toxin, filler, laser, RF ...) filled with each procedure's specifics,
or are written out for one-offs. Assets use one vocabulary so BUILD_LIST can count them; HAVE = already built.
"""
import json, pathlib, re
from collections import Counter, defaultdict

R = pathlib.Path(__file__).resolve().parents[1]
OST = R.parent
OUT = R / "shots"; OUT.mkdir(exist_ok=True)
P = json.load(open(R / "procedures.json", encoding="utf-8"))
MOT = json.load(open(R / "motion.json", encoding="utf-8"))

HAVE = {"face.glb", "skin_block.glb", "lymph_vessel_valve (NIH 3D, downloaded)", "collagen_helix (NIH 3D, downloaded)",
        "eye (NIH 3D, downloaded)", "skull_and_eyes (NIH 3D, downloaded)"}
ASSET_NOTE = {
    "face.glb": "layered head: skin, fat compartments, SMAS, muscles, arteries, veins, eyes, bone",
    "skin_block.glb": "2x2 cm block: epidermis, melanocytes, dermis, capillaries, follicle, glands, vessels, fat lobules",
}

O, F = "OVERLAY", "FULL-FRAME"
REG = {  # face region -> camera
    "glabella": "3/4 left orbit, push in to the glabella",
    "forehead": "frontal, slight high angle, push in to the forehead",
    "crows": "3/4 orbit to the lateral canthus",
    "masseter": "profile orbit to the jaw angle",
    "dao": "3/4 low angle on the mouth corners",
    "neck": "3/4 low angle, tilt from jaw to collarbone",
    "lips": "frontal push in to the lips",
    "cheek": "3/4 orbit to the midface",
    "jaw": "profile-to-3/4 orbit along the mandible",
    "chin": "profile on the chin",
    "nose": "profile push in along the nasal dorsum",
    "undereye": "3/4 push in to the lower lid",
    "temple": "profile orbit to the temple",
    "nlf": "3/4 on the nasolabial fold",
    "lowerface": "3/4 orbit of the lower face and jowl",
    "fullface": "slow 3/4 orbit of the whole face",
}


def S(frame, scene, layers, cam, anim, dur, label, assets=()):
    return dict(frame=frame, scene=scene, layers=layers, camera=cam, animates=anim, dur=dur, label=label, assets=list(assets))


# ---------------- family templates ----------------
def toxin(reg, muscles, points, result, extra=()):
    return [
        S(O, "face.glb", "epidermis", REG[reg], f"injection map fills point by point: {points}", 4, "Injection points", ["face.glb", "injection_point_map"]),
        S(O, "face.glb", "epidermis at 20% + muscle", "hold, skin fades", f"skin fades; {muscles} highlight and contract, creasing the skin above", 4, muscles[0].upper() + muscles[1:], ["face.glb", "muscle_contraction_rig", "wrinkle_blendshapes"]),
        S(F, "nmj_closeup", "nerve terminal, synapse, muscle fibre", "macro push-in to the synapse",
          "acetylcholine vesicles stream across the gap; toxin arrives, cuts the SNARE protein, vesicles stop (signal-cut)", 5, "Signal blocked at the nerve ending", ["nmj_closeup", "signal_cut_fx"]),
        S(O, "face.glb", "epidermis + muscle", "pull back to the start framing", f"contraction amplitude falls to zero; {result}", 4, "Relaxed for ~3–4 months", ["face.glb", "muscle_contraction_rig", "wrinkle_blendshapes", *extra]),
    ]


def filler(reg, problem, plane, layers, tool, vessel, result, product="HA gel", extra=()):
    tool_a = "cannula" if "cannula" in tool else "needle_syringe"
    return [
        S(O, "face.glb", "epidermis", REG[reg], f"surface deflates to show {problem}; region outline glows", 3, problem.capitalize(), ["face.glb", "surface_volume_morph"]),
        S(O, "face.glb", f"cutaway: {layers}", "cutaway sweep, hold at 3/4", f"skin peels back in a wedge; {vessel} pulses red as the danger zone", 4, f"{plane} · avoid the {vessel}", ["face.glb", "cutaway_clip", "artery_pulse_fx"]),
        S(O, "face.glb", f"cutaway: {layers}", "slow push-in on the tip", f"{tool} enters to the {plane}; {product} blooms as a translucent bolus and fills the space", 5, f"{product} in the {plane}", ["face.glb", tool_a, "gel_bolus", *extra]),
        S(O, "face.glb", "epidermis", "pull back, slow orbit", f"wedge closes; surface morphs back: {result}", 3, result.capitalize(), ["face.glb", "surface_volume_morph"]),
    ]


def gel(depth, trait, extra_shot=None):
    sh = [
        S(O, "skin_block.glb", "all layers", "3/4 orbit of the block", f"needle tip draws a depth line at the {depth}", 3, f"Placed in the {depth}", ["skin_block.glb", "needle_syringe", "depth_marker"]),
        S(F, "dermis_macro", "collagen fibres, HA gel", "macro drift through the dermis", f"gel particles land among collagen fibres and swell as water molecules bind to them ({trait})", 5, trait.capitalize(), ["dermis_macro", "ha_gel_particles", "water_binding_fx"]),
        S(O, "skin_block.glb", "all layers", "pull back", "the surface above lifts and smooths", 3, "Lift + hydration", ["skin_block.glb", "surface_volume_morph"]),
    ]
    if extra_shot: sh.insert(2, extra_shot)
    return sh


def biostim(particle, place, now=None):
    sh = [S(O, "skin_block.glb", "all layers", "3/4 orbit", f"{particle} are injected into the {place}", 3, f"{particle.capitalize()} in the {place}", ["skin_block.glb", "needle_syringe", "microparticles_fx"])]
    if now: sh.append(S(O, "skin_block.glb", "all layers", "hold", now, 3, "Volume now", ["skin_block.glb", "surface_volume_morph"]))
    sh += [S(F, "dermis_macro", "fibroblasts, particles, collagen", "macro push-in", "fibroblasts gather round the particles and switch on; new collagen strands spin out", 5, "Fibroblasts wake up", ["dermis_macro", "fibroblast_cell", "collagen_growth_fx"]),
           S(O, "skin_block.glb", "dermis", "slow orbit, week counter in corner", "time-lapse 0 → 12 weeks: dermis thickens, particles dissolve", 4, "Your own collagen, months later", ["skin_block.glb", "collagen_growth_fx", "timelapse_counter"])]
    return sh


def frac_laser(name, depth, kind, result):
    abl = kind == "ablative"
    return [
        S(O, "face.glb", "epidermis", REG["cheek"], f"{name} handpiece glides across the cheek leaving a faint grid", 3, name, ["face.glb", "laser_handpiece", "treatment_grid_fx"]),
        S(O, "skin_block.glb", "all layers", "3/4, slow push-in",
          ("columns of skin vaporise into open channels" if abl else "columns of light heat narrow zones") + f" down to the {depth}; skin between stays intact", 5,
          f"{'Ablative' if abl else 'Non-ablative'} columns to the {depth}", ["skin_block.glb", "laser_column_fx"]),
        S(F, "dermis_macro", "column wall, collagen", "macro inside one column", "the zone heals inward from the untouched skin around it; new collagen fills", 4, "Heals from the edges", ["dermis_macro", "collagen_growth_fx"]),
        S(O, "face.glb", "epidermis", "pull back", f"surface texture morphs: {result}", 3, result.capitalize(), ["face.glb", "skin_texture_morph"]),
    ]


def rf_needle(name, depths, result):
    return [
        S(O, "face.glb", "epidermis", REG["lowerface"], f"{name} tip stamps along the jawline", 3, name, ["face.glb", "needle_array_tip"]),
        S(O, "skin_block.glb", "all layers", "3/4 cutaway", f"needle array pierces to {depths}; RF glow blooms at each tip as orange coagulation zones", 5, f"RF heat at {depths}", ["skin_block.glb", "needle_array_tip", "rf_glow_fx", "coagulation_zone_fx"]),
        S(F, "dermis_macro", "collagen, fibroseptal bands", "macro hold", "heated collagen contracts; fibroseptal bands tighten, then new collagen grows", 4, "Contract, then rebuild", ["dermis_macro", "collagen_growth_fx", "septae_contract_fx"]),
        S(O, "face.glb", "epidermis", "pull back, orbit", f"surface morph: {result}", 3, result.capitalize(), ["face.glb", "surface_volume_morph", "skin_texture_morph"]),
    ]


def block_story(steps):
    """one-offs on the skin block / other scenes: steps = [(frame, scene, layers, cam, anim, dur, label, assets)]"""
    return [S(*s) for s in steps]


B, FM = "skin_block.glb", "dermis_macro"
ALL = "all layers"

# ---------------- per procedure ----------------
SPEC = {
    "neurotoxin": toxin("glabella", "corrugators, procerus and frontalis", "glabella 5, forehead 4–6, crow's feet 3 per side", "frown and forehead lines soften"),
    "jeuveau": toxin("glabella", "corrugators and procerus", "5 points across the glabella", "the 11 lines soften", ["product_vial_card"]),
    "toxin-glabella": toxin("glabella", "corrugator supercilii and procerus", "5 points: procerus + 2 per corrugator", "the vertical 11 lines soften; supratrochlear vessels stay clear"),
    "toxin-forehead": toxin("forehead", "frontalis", "4–6 points in two rows, kept high above the brow", "horizontal lines soften while the brow keeps its height")
                      + [S(O, "face.glb", "epidermis + muscle", "frontal hold", "split screen: dose too low on the forehead → brow drops", 3, "Too low = heavy brow", ["face.glb", "brow_drop_morph"])],
    "toxin-crows-feet": toxin("crows", "lateral orbicularis oculi", "3 points fanning out at each lateral canthus", "squint lines fade at the eye corners"),
    "toxin-masseter": toxin("masseter", "masseter (superficial + deep)", "3–5 points in the lower masseter, away from the risorius", "time-lapse 0 → 8 weeks: masseter shrinks, the lower face slims", ["timelapse_counter"]),
    "toxin-dao": toxin("dao", "depressor anguli oris", "1–2 points low on each DAO, lateral to the mentalis", "mouth corners stop pulling down and rest level"),
    "toxin-neck": toxin("neck", "platysma bands", "points every 1–2 cm along each band, jaw to collarbone", "bands soften and the jawline sharpens"),
    "ha-filler": gel("deep dermis or on the bone, by product", "cross-linked HA holds up to 1,000× its weight in water",
                     S(F, FM, "HA chains, cross-links", "macro orbit of a gel particle", "HA chains shown loose (dissolves in days) then cross-linked into a lattice (lasts months)", 4, "Cross-linking makes it last", ["dermis_macro", "ha_crosslink_model"])),
    "juvederm": gel("superficial, mid or deep dermis / on the bone", "softer gels for lips, firmer for cheeks",
                    S(O, B, ALL, "3/4 hold", "three products drop to three depths, colour-coded by firmness (Volbella, Volift, Voluma)", 4, "Firmness matches depth", ["skin_block.glb", "depth_marker", "product_vial_card"])),
    "restylane": gel("mid dermis to subcutaneous fat", "NASHA firm particles vs OBT flexible gel",
                     S(F, FM, "two gels", "split macro", "NASHA: firm beads hold shape; OBT: flexible gel moves with expression", 4, "NASHA vs OBT", ["dermis_macro", "ha_crosslink_model"])),
    "evolysse": gel("mid dermis of the nasolabial fold", "longer HA chains from cold cross-linking",
                    S(F, FM, "HA chains", "macro", "chains cross-linked cold stay long; chains cross-linked warm break short", 4, "Cold-made, longer chains", ["dermis_macro", "ha_crosslink_model"])),
    "belotero": gel("superficial dermis", "soft gel spreads evenly between collagen, no lumps"),
    "skinvive": [S(O, "face.glb", "epidermis", REG["cheek"], "a grid of tiny droplet points fills across the cheek", 3, "Micro-droplets", ["face.glb", "injection_point_map"])]
                + gel("superficial dermis", "hydration and glow, not volume")[1:],
    "filler-lips": filler("lips", "thin lips and a faded vermilion border", "lip body and vermilion border", "epidermis, orbicularis oris, labial arteries", "a fine needle", "superior and inferior labial arteries", "fuller lips with a crisp border"),
    "filler-cheeks": filler("cheek", "midface deflation", "deep medial cheek fat and on the zygoma", "fat_superficial, fat_deep (SOOF, deep medial cheek), bone", "a cannula", "infraorbital artery", "the midface lifts and the fold above the jaw softens"),
    "filler-jawline": filler("jaw", "a soft jaw edge", "periosteum along the mandible and angle", "masseter, bone, facial artery", "a cannula", "facial artery at the mandibular notch", "a sharper, lifted jaw line"),
    "filler-chin": filler("chin", "a short, retruded chin", "periosteum of the mentum", "mentalis, bone", "a needle on bone", "mental neurovascular bundle", "the chin projects and lengthens the profile"),
    "filler-nose": filler("nose", "a dorsal hump and drooping tip", "deep plane on the nasal dorsum", "nasal skin, dorsum, dorsal nasal and angular arteries", "a needle on the midline", "dorsal nasal and angular arteries", "a straighter bridge and lifted tip"),
    "filler-under-eye": filler("undereye", "a tear trough hollow under the fat-pad bulge", "deep plane on the orbital rim", "orbicularis oculi, fat_superficial (orbital), bone", "a cannula", "infraorbital foramen and angular vein", "the lid-cheek junction smooths", extra=["orbital_fat_pads"]),
    "filler-temples": filler("temple", "temple hollowing", "deep plane on bone under temporalis, or subdermal", "temporal fat, temporalis, superficial temporal artery", "a needle on bone", "superficial temporal artery", "the upper face fills back out"),
    "filler-nasolabial": filler("nlf", "a deep nasolabial fold", "deep fat beside the fold", "fat_superficial (nasolabial), facial and angular arteries", "a cannula", "facial and angular arteries", "the laugh line softens"),
    "filler-hands": block_story([
        (O, "hand_model", "skin", "3/4 orbit of the back of the hand", "the skin thins, showing veins and tendons", 3, "Volume loss on the hand", ["hand_model", "surface_volume_morph"]),
        (O, "hand_model", "cutaway: skin, dorsal fat, veins, extensor tendons", "cutaway hold", "a cannula fans gel into the layer above the tendons", 5, "Gel above the tendons", ["hand_model", "cannula", "gel_bolus"]),
        (O, "hand_model", "skin", "pull back", "the gel is massaged smooth; veins and tendons recede", 3, "Smoother, younger hands", ["hand_model", "surface_volume_morph"])]),
    "filler-safety": block_story([
        (O, "face.glb", "epidermis at 20% + arteries", REG["fullface"], "the facial artery tree lights up branch by branch: facial, angular, supratrochlear, dorsal nasal", 5, "Know the arteries", ["face.glb", "artery_pulse_fx"]),
        (O, "face.glb", "cutaway: arteries, fat", "push in on the angular artery", "a needle tip enters the vessel; gel flows downstream and the skin above blanches", 4, "Vascular occlusion", ["face.glb", "needle_syringe", "gel_bolus", "blanching_fx"]),
        (F, "vessel_lumen", "artery wall, HA plug", "inside the vessel", "hyaluronidase is flooded in; the HA plug dissolves and flow returns", 5, "Hyaluronidase dissolves HA", ["vessel_lumen", "enzyme_dissolve_fx"]),
        (O, "face.glb", "epidermis", "pull back", "colour returns to the skin", 2, "Reversible with HA", ["face.glb"])]),
    "sculptra": biostim("poly-L-lactic acid microparticles", "deep dermis and subcutaneous fat"),
    "radiesse": biostim("calcium hydroxylapatite microspheres", "subdermal plane", now="the gel carrier gives instant lift"),
    "alloclae": block_story([
        (O, "body_model", "skin", "3/4 orbit of the hips", "processed donor fat is injected into the hip dip", 4, "Donor fat as filler", ["body_model", "cannula", "gel_bolus"]),
        (F, "fat_macro", "adipocytes, matrix", "macro", "the donor matrix sits among your own fat cells", 4, "Allograft matrix", ["fat_macro", "adipocyte_cell"]),
        (O, "body_model", "skin", "hold, caption card", "caption card with his view: why he does not use it", 3, "Dr Ostad's take", ["body_model", "caption_card"])]),
    "prfm": block_story([
        (O, "blood_tube", "tube", "static, slight orbit", "a blood tube spins in a centrifuge; layers split, platelet-rich plasma on top", 4, "Spin your own blood", ["blood_tube_centrifuge"]),
        (O, "blood_tube", "tube", "push in", "calcium is added; the plasma sets into a gel", 3, "Gel with calcium", ["blood_tube_centrifuge"]),
        (O, B, ALL, "3/4", "the PRFM gel is injected under the tear trough / fold", 3, "Injected like filler", ["skin_block.glb", "needle_syringe", "gel_bolus"]),
        (F, FM, "platelets, fibroblasts", "macro", "platelets release growth factors over days; fibroblasts lay down collagen", 4, "Slow collagen build", ["dermis_macro", "growth_factor_fx", "fibroblast_cell", "collagen_growth_fx"])]),
    "prp-hair": block_story([
        (O, "blood_tube", "tube", "static", "centrifuge spin separates the plasma", 3, "Platelet-rich plasma", ["blood_tube_centrifuge"]),
        (O, "scalp_model", "scalp skin", "high angle over the crown", "an injection grid fills across the thinning crown", 3, "Scalp injection grid", ["scalp_model", "injection_point_map"]),
        (O, B, "all layers (hair)", "3/4 on the follicle", "PRP lands round the follicle; growth factors glow at the dermal papilla", 4, "Growth factors at the papilla", ["skin_block.glb", "growth_factor_fx"]),
        (O, B, "hair, follicle", "hold, time-lapse", "a miniaturised hair thickens over months", 4, "Thicker hair", ["skin_block.glb", "hair_growth_morph", "timelapse_counter"])]),
    "exosomes": block_story([
        (O, B, ALL, "3/4", "microneedles open channels; exosome serum flows in", 4, "Applied after microneedling", ["skin_block.glb", "needle_array_tip"]),
        (F, FM, "exosome vesicles, fibroblasts", "macro", "vesicles dock on fibroblasts and unload their signals", 5, "Cell-to-cell messages", ["dermis_macro", "exosome_vesicles", "fibroblast_cell"]),
        (O, B, ALL, "pull back", "dermis brightens and thickens", 3, "Repair signals", ["skin_block.glb", "collagen_growth_fx"])]),
    "salmon-dna": block_story([
        (O, B, ALL, "3/4", "PDRN (DNA fragments) is injected into the dermis", 3, "Salmon DNA (PDRN)", ["skin_block.glb", "needle_syringe"]),
        (F, FM, "DNA fragments, fibroblasts", "macro", "fragments bind receptors on fibroblasts; repair signals flicker", 4, "Supports repair", ["dermis_macro", "fibroblast_cell", "growth_factor_fx"]),
        (O, B, ALL, "hold, caption card", "caption with his quote on the trend", 3, "The trend, and the evidence", ["skin_block.glb", "caption_card"])]),
    "aquagold": block_story([
        (O, "face.glb", "epidermis", REG["cheek"], "the gold vial-stamp taps across the cheek", 3, "AquaGold stamp", ["face.glb", "microneedle_stamp"]),
        (O, B, ALL, "3/4 cutaway", "24K-plated needles deposit droplets of the cocktail in the dermis", 4, "HA + micro-toxin + PRP", ["skin_block.glb", "microneedle_stamp", "gel_bolus"]),
        (O, B, ALL, "pull back", "pores tighten, surface glows", 3, "Glass-skin finish", ["skin_block.glb", "skin_texture_morph"])]),
    "fraxel": frac_laser("Fraxel", "mid dermis", "non-ablative", "finer texture, faded pigment"),
    "co2-laser": frac_laser("CO2 laser", "reticular dermis", "ablative", "deep wrinkles and scars resurfaced"),
    "clear-brilliant": frac_laser("Clear + Brilliant", "superficial dermis", "non-ablative", "brighter tone, smaller pores"),
    "picoway": block_story([
        (O, B, "epidermis, melanocytes, dermis", "3/4", "a dark pigment cluster sits in the basal layer", 3, "Pigment target", ["skin_block.glb", "pigment_cluster"]),
        (F, "pigment_macro", "melanin cluster", "macro, slow-mo", "a picosecond pulse hits; the cluster shatters to dust by pressure, no heat glow", 4, "Shattered by pressure, not heat", ["pigment_macro", "pulse_flash_fx", "shatter_fx"]),
        (F, "pigment_macro", "dust, macrophages", "macro", "macrophages engulf the dust and carry it away", 4, "The body clears it", ["pigment_macro", "macrophage_cell"]),
        (O, B, ALL, "pull back", "the spot fades", 2, "Spot fades", ["skin_block.glb"])]),
    "tattoo-removal": block_story([
        (O, B, ALL, "3/4", "tattoo ink sits as clumps in the dermis", 3, "Ink in the dermis", ["skin_block.glb", "ink_particles"]),
        (F, "pigment_macro", "ink clumps", "macro slow-mo", "ultra-short pulse: ink clumps fracture into fine particles", 4, "Ink fractured", ["pigment_macro", "pulse_flash_fx", "shatter_fx", "ink_particles"]),
        (F, "pigment_macro", "particles, macrophages, lymph vessel", "macro track", "macrophages carry particles into a lymph vessel", 4, "Cleared by the immune system", ["pigment_macro", "macrophage_cell", "lymph_vessel_valve (NIH 3D, downloaded)"]),
        (O, B, ALL, "hold, session counter", "ink fades over sessions 1 → 8", 3, "Many sessions", ["skin_block.glb", "timelapse_counter"])]),
    "excel-v": block_story([
        (O, "face.glb", "epidermis", REG["nose"], "red vessels trace over the nose and cheeks", 3, "Visible vessels", ["face.glb", "surface_vessels_decal"]),
        (O, B, "epidermis, dermis, vessels", "3/4 cutaway", "a green 532 nm beam passes the epidermis and lights the vessel", 4, "Haemoglobin absorbs the light", ["skin_block.glb", "laser_beam_fx"]),
        (F, "vessel_lumen", "vessel wall, red cells", "inside the vessel", "the vessel heats, glows and collapses shut", 4, "Vessel closes", ["vessel_lumen", "vessel_heat_fx"]),
        (O, "face.glb", "epidermis", "pull back", "redness fades", 2, "Redness gone", ["face.glb", "surface_vessels_decal"])]),
    "laser-genesis": block_story([
        (O, "face.glb", "epidermis", REG["cheek"], "the handpiece sweeps above the skin, no contact", 3, "Laser Genesis", ["face.glb", "laser_handpiece"]),
        (O, B, "dermis, capillaries, sebaceous", "3/4", "a gentle warm glow spreads through the dermis; capillaries cool down, glands shrink a touch", 5, "Gentle 1064 nm warmth", ["skin_block.glb", "heat_diffuse_fx"]),
        (O, B, ALL, "hold", "collagen thickens slightly", 3, "Calmer, firmer skin", ["skin_block.glb", "collagen_growth_fx"])]),
    "aviclear": block_story([
        (O, B, "all layers (sebaceous)", "3/4 on the pilosebaceous unit", "an oversized sebaceous gland pumps oil into the pore", 3, "Overactive oil gland", ["skin_block.glb", "gland_size_morph"]),
        (O, B, "all layers (sebaceous)", "push in", "1726 nm light passes through; only the gland heats (lipid absorbs)", 4, "Lipid-selective heating", ["skin_block.glb", "laser_beam_fx", "heat_diffuse_fx"]),
        (O, B, "all layers (sebaceous)", "hold", "the gland shrinks; oil flow slows", 3, "Less oil, fewer breakouts", ["skin_block.glb", "gland_size_morph"])]),
    "laser-hair-removal": block_story([
        (O, B, "all layers (hair)", "3/4 on the follicle", "dark hair shaft and bulb in the dermis", 2, "Target: pigment in the hair", ["skin_block.glb"]),
        (O, B, "all layers (hair)", "push in", "light is absorbed by the shaft; heat travels down to the bulb and bulge", 4, "Heat travels down the shaft", ["skin_block.glb", "laser_beam_fx", "heat_diffuse_fx"]),
        (O, B, "all layers (hair)", "hold", "the follicle greys out; the hair sheds and does not regrow", 3, "Follicle disabled", ["skin_block.glb", "hair_growth_morph"])]),
    "juliet": block_story([
        (O, "mucosa_block", "mucosa layers", "3/4 diagrammatic block", "erbium columns micro-ablate the mucosal surface", 4, "Erbium laser", ["mucosa_block", "laser_column_fx"]),
        (F, "mucosa_block", "lamina propria", "macro", "collagen and blood supply rebuild; tissue thickens and hydrates", 4, "Tissue rebuilds", ["mucosa_block", "collagen_growth_fx"])]),
    "morpheus8": rf_needle("Morpheus8", "1–8 mm (dermis into fat)", "tighter jawline, smoother skin"),
    "rf-microneedling": rf_needle("RF microneedling", "a set depth in the dermis", "smoother texture and softer scars"),
    "facetite": block_story([
        (O, "face.glb", "epidermis", REG["neck"], "a thin cannula slides under the jowl skin; an outer electrode rides on top", 4, "FaceTite", ["face.glb", "rf_cannula"]),
        (O, B, ALL, "3/4 cutaway", "RF field glows between internal tip and external electrode; fat melts, septae tighten", 5, "Heat from inside", ["skin_block.glb", "rf_cannula", "rf_field_fx", "septae_contract_fx"]),
        (O, "face.glb", "epidermis", "pull back", "the jowl and neck tighten", 3, "Contracted skin", ["face.glb", "surface_volume_morph"])]),
    "evoke": block_story([
        (O, "face.glb", "epidermis", REG["lowerface"], "a mask-like applicator settles over cheeks and jaw", 3, "Hands-free RF", ["face.glb", "rf_applicator_mask"]),
        (O, B, ALL, "3/4 cutaway", "volumetric RF heat warms dermis and fat evenly", 4, "Volumetric heating", ["skin_block.glb", "rf_field_fx"]),
        (O, "face.glb", "epidermis", "pull back", "lower face lifts slightly over weeks", 3, "Gradual tightening", ["face.glb", "surface_volume_morph", "timelapse_counter"])]),
    "emface": block_story([
        (O, "face.glb", "epidermis", REG["forehead"], "pads attach to forehead and cheeks", 3, "Emface pads", ["face.glb", "emface_pads"]),
        (O, "face.glb", "epidermis at 20% + muscle", "hold", "frontalis and zygomatic muscles pulse with electrical stimulation; dermis warms", 5, "Muscle stim + RF", ["face.glb", "muscle_contraction_rig", "rf_field_fx"]),
        (O, "face.glb", "epidermis", "pull back", "brow and cheeks lift, skin firmer", 3, "Needle-free lift", ["face.glb", "surface_volume_morph"])]),
    "emsculpt-neo": block_story([
        (O, "body_model", "skin", "3/4 orbit of the abdomen", "the applicator straps on the abdomen", 3, "Emsculpt NEO", ["body_model", "body_applicator"]),
        (O, "body_model", "cutaway: skin, fat, rectus abdominis", "cutaway hold", "magnetic field pulses; the muscle contracts supramaximally while RF heats the fat", 5, "20,000 contractions", ["body_model", "magnetic_field_fx", "rf_field_fx", "muscle_contraction_rig"]),
        (F, "fat_macro", "adipocytes", "macro", "heated fat cells break down", 3, "Fat cells cleared", ["fat_macro", "adipocyte_cell", "apoptosis_fx"]),
        (O, "body_model", "skin", "pull back", "muscle thicker, fat thinner", 3, "More muscle, less fat", ["body_model", "surface_volume_morph"])]),
    "ultherapy": block_story([
        (O, "face.glb", "epidermis", REG["lowerface"], "the transducer pulses in lines along the jaw and brow", 3, "Ultherapy", ["face.glb", "ultrasound_transducer"]),
        (O, "face.glb", "cutaway: skin, fat, SMAS, platysma", "cutaway, push in", "a row of focal points ignites at the SMAS depth (4.5 mm), skin above untouched", 5, "Focused points at the SMAS", ["face.glb", "cutaway_clip", "ultrasound_focal_fx"]),
        (O, "face.glb", "epidermis + smas", "pull back", "SMAS contracts upward; the brow and jowl lift over months", 3, "Lift from the SMAS", ["face.glb", "smas_lift_morph", "timelapse_counter"])]),
    "miradry": block_story([
        (O, "body_model", "skin", "3/4 on the underarm", "the handpiece suctions the skin up", 3, "miraDry", ["body_model", "miradry_handpiece"]),
        (O, B, "all layers (sweat gland)", "3/4 cutaway", "microwave field heats the dermis-fat interface; a cooling plate keeps the surface cool", 5, "Microwaves at the gland layer", ["skin_block.glb", "microwave_field_fx", "cooling_plate"]),
        (O, B, "all layers (sweat gland)", "hold", "sweat gland coils shrivel and vanish", 3, "Glands gone for good", ["skin_block.glb", "gland_destroy_fx"])]),
    "coolsculpting": block_story([
        (O, "body_model", "skin", "3/4 on the flank", "the applicator draws the fat roll in and cools", 3, "Controlled cooling", ["body_model", "cryo_applicator"]),
        (F, "fat_macro", "adipocytes", "macro", "fat cells frost and crystallise; skin cells around them stay fine", 4, "Fat freezes first", ["fat_macro", "adipocyte_cell", "crystallize_fx"]),
        (F, "fat_macro", "adipocytes, macrophages", "macro", "dead fat cells are cleared by macrophages over weeks", 4, "Cleared over weeks", ["fat_macro", "macrophage_cell", "timelapse_counter"]),
        (O, "body_model", "skin", "pull back", "the flank flattens", 2, "Fat layer thinner", ["body_model", "surface_volume_morph"])]),
    "facelift": block_story([
        (O, "face.glb", "epidermis", REG["lowerface"], "the incision line draws round the ear", 3, "Incision hidden at the ear", ["face.glb", "incision_line_fx"]),
        (O, "face.glb", "skin flap + smas + muscle", "cutaway orbit", "the skin flap lifts; SMAS shows beneath; facial nerve branches glow as no-go lines", 5, "SMAS under the skin", ["face.glb", "skin_flap_rig", "facial_nerve_branches"]),
        (O, "face.glb", "smas", "hold", "SMAS is lifted along up-and-back vectors; retaining ligaments release", 4, "Lift the deep layer", ["face.glb", "smas_lift_morph", "vector_arrows"]),
        (O, "face.glb", "epidermis", "pull back", "skin re-drapes, excess trimmed; jowl gone", 3, "Jaw restored", ["face.glb", "surface_volume_morph"])]),
    "neck-lift": block_story([
        (O, "face.glb", "epidermis", REG["neck"], "a short incision draws under the chin", 3, "Under-chin incision", ["face.glb", "incision_line_fx"]),
        (O, "face.glb", "cutaway: fat, platysma", "cutaway", "submental fat is removed; the platysma edges are sutured together", 5, "Fat out, platysma tightened", ["face.glb", "skin_flap_rig", "suture_fx", "submental_fat"]),
        (O, "face.glb", "epidermis", "pull back", "the cervicomental angle sharpens", 3, "Sharp neck angle", ["face.glb", "surface_volume_morph"])]),
    "blepharoplasty": block_story([
        (O, "face.glb", "epidermis", REG["undereye"], "excess upper-lid skin and lower-lid bulge show", 3, "Heavy lids, under-eye bags", ["face.glb", "surface_volume_morph"]),
        (O, "face.glb", "cutaway: orbicularis, septum, fat pads", "cutaway on the lower lid", "an inside-the-lid incision opens; fat pads are removed or repositioned", 5, "Fat pads repositioned", ["face.glb", "orbital_fat_pads", "orbital_septum", "incision_line_fx"]),
        (O, "face.glb", "epidermis", "pull back", "lids smooth and open", 3, "Refreshed eyes", ["face.glb", "surface_volume_morph"])]),
    "brow-lift": block_story([
        (O, "face.glb", "epidermis", REG["forehead"], "a low brow sits heavy over the upper lid", 3, "Low brow", ["face.glb", "brow_drop_morph"]),
        (O, "face.glb", "cutaway: frontalis, galea", "cutaway", "the forehead tissue lifts on the galea; supraorbital nerve shown and spared", 4, "Lift on the galea", ["face.glb", "skin_flap_rig", "facial_nerve_branches"]),
        (O, "face.glb", "epidermis", "pull back", "brow rises to a natural arch", 3, "Lifted brow", ["face.glb", "brow_drop_morph"])]),
    "fat-transfer": block_story([
        (O, "body_model", "skin", "3/4 on the abdomen", "fat is suctioned out gently", 3, "Harvest", ["body_model", "cannula"]),
        (O, "blood_tube", "syringe", "static", "the fat is spun and purified in a syringe", 3, "Purify", ["blood_tube_centrifuge"]),
        (O, "face.glb", "cutaway: fat compartments", "cutaway on the cheek", "tiny droplets of fat are threaded into the compartments", 4, "Micro-droplet grafting", ["face.glb", "cannula", "fat_droplets"]),
        (O, "face.glb", "epidermis", "pull back", "the face refills; some fat is reabsorbed over weeks", 3, "Your own fat as volume", ["face.glb", "surface_volume_morph"])]),
    "liposuction": block_story([
        (O, "body_model", "skin", "3/4 on the flank", "tumescent fluid swells the area", 3, "Tumescent fluid", ["body_model", "surface_volume_morph"]),
        (O, "body_model", "cutaway: skin, superficial and deep fat", "cutaway", "a cannula moves back and forth in the deep fat; fat is aspirated", 5, "Cannula in the deep fat", ["body_model", "cannula", "fat_aspirate_fx"]),
        (O, "body_model", "skin", "pull back", "the contour slims", 3, "New contour", ["body_model", "surface_volume_morph"])]),
    "gynecomastia": block_story([
        (O, "body_model", "skin (chest)", "3/4 on the chest", "the chest shows excess fullness", 3, "Male chest", ["body_model"]),
        (O, "body_model", "cutaway: fat, glandular tissue, pectoral", "cutaway", "liposuction removes fat; the firm gland is excised through a small areolar incision", 5, "Fat + gland removed", ["body_model", "cannula", "breast_gland_model", "incision_line_fx"]),
        (O, "body_model", "skin (chest)", "pull back", "a flat chest contour", 3, "Flat chest", ["body_model", "surface_volume_morph"])]),
    "thread-lift": block_story([
        (O, "face.glb", "epidermis", REG["lowerface"], "entry points mark at the temple", 3, "Entry points", ["face.glb", "injection_point_map"]),
        (O, "face.glb", "cutaway: fat, smas", "cutaway", "barbed threads glide through the subcutaneous plane; cogs open and grip", 5, "Barbs grab the tissue", ["face.glb", "barbed_thread"]),
        (O, "face.glb", "epidermis", "hold", "threads are pulled up; tissue lifts; collagen forms round them", 4, "Lift + collagen", ["face.glb", "smas_lift_morph", "vector_arrows"])]),
    "myellevate": block_story([
        (O, "face.glb", "epidermis", REG["neck"], "a lit probe glows through the neck skin", 3, "Light-guided", ["face.glb", "light_probe"]),
        (O, "face.glb", "cutaway: platysma", "cutaway", "a permanent suture loops under the jaw from ear to ear and tightens like a sling", 5, "A sling under the jaw", ["face.glb", "suture_fx"]),
        (O, "face.glb", "epidermis", "pull back", "the neck angle sharpens", 3, "Tighter neck, no open surgery", ["face.glb", "surface_volume_morph"])]),
    "ellacor": block_story([
        (O, "face.glb", "epidermis", REG["cheek"], "a grid of micro-cores appears over the cheek", 3, "Micro-coring", ["face.glb", "treatment_grid_fx"]),
        (O, B, ALL, "3/4 cutaway", "hollow needles punch out tiny cores of skin, up to 8%", 4, "Tiny cores removed", ["skin_block.glb", "coring_needle"]),
        (O, B, ALL, "hold", "the holes close sideways; the skin heals tighter", 3, "Heals tighter, no scar", ["skin_block.glb", "hole_close_fx"])]),
    "earlobe-repair": block_story([
        (O, "ear_model", "skin", "profile on the ear", "a split earlobe", 2, "Split earlobe", ["ear_model"]),
        (O, "ear_model", "skin", "push in", "edges are trimmed fresh and sutured in layers", 4, "Cut fresh, sutured", ["ear_model", "incision_line_fx", "suture_fx"]),
        (O, "ear_model", "skin", "hold", "the lobe heals whole", 2, "Whole again", ["ear_model"])]),
    "scar-revision": block_story([
        (O, B, ALL, "3/4", "a wide scar cuts across the tension lines", 3, "Scar against the lines", ["skin_block.glb", "scar_decal"]),
        (O, B, ALL, "push in", "the scar is excised and re-closed along the relaxed skin tension lines (Z-plasty shown)", 5, "Realigned with the skin's lines", ["skin_block.glb", "incision_line_fx", "suture_fx"]),
        (O, B, ALL, "hold", "a fine, flat line remains", 2, "Flatter, finer scar", ["skin_block.glb"])]),
    "mole-removal": block_story([
        (O, B, ALL, "3/4", "a mole of nevus cells sits in the epidermis and dermis", 3, "A mole", ["skin_block.glb", "nevus_cluster"]),
        (O, B, ALL, "cutaway", "shave: a blade skims it level; or excision: an ellipse is cut and stitched", 4, "Shave or excision", ["skin_block.glb", "scalpel", "suture_fx"]),
        (O, "lab_slide", "tissue section", "static", "the specimen goes to pathology on a slide", 3, "Sent to the lab", ["lab_slide"])]),
    "mohs": block_story([
        (O, "face.glb", "epidermis", REG["nose"], "a tumour shows on the nose; its visible edge is outlined", 3, "Visible tumour", ["face.glb", "tumour_decal"]),
        (O, B, "all layers + tumour roots", "cutaway", "tumour roots spread beyond the visible edge in the dermis", 4, "Roots you can't see", ["skin_block.glb", "tumour_roots"]),
        (O, B, "all layers + tumour roots", "3/4 hold", "stage 1: a thin bowl-shaped layer is removed; its edge is mapped in colours", 4, "Layer 1 removed and mapped", ["skin_block.glb", "excision_layer_rig", "margin_map"]),
        (F, "lab_slide", "frozen section", "microscope view", "100% of the margin is checked; one colour zone still has tumour", 4, "100% of the margin checked", ["lab_slide", "margin_map"]),
        (O, B, "all layers", "hold", "stage 2 removes only that zone; the margin is clear", 4, "Clear margins, tissue saved", ["skin_block.glb", "excision_layer_rig"])]),
    "bcc": block_story([
        (O, B, "epidermis, basal layer, dermis", "3/4", "basal cells multiply into nests that bud down into the dermis", 4, "Basal cell carcinoma", ["skin_block.glb", "tumour_roots"]),
        (O, B, ALL, "time-lapse", "left alone, the nests spread sideways and down toward nerves", 4, "Grows locally", ["skin_block.glb", "tumour_roots", "timelapse_counter"]),
        (O, "face.glb", "epidermis", REG["nose"], "a pearly bump with fine vessels on the nose", 3, "What it looks like", ["face.glb", "tumour_decal"])]),
    "melanoma": block_story([
        (O, B, "epidermis, melanocytes, dermis", "3/4", "one melanocyte turns dark and multiplies along the basal layer", 4, "Pigment cells turn", ["skin_block.glb", "pigment_cluster"]),
        (O, B, ALL, "cutaway, depth ruler", "cells push down into the dermis; a depth ruler reads 0.8 mm, 1 mm, 2 mm", 5, "Depth = stage (Breslow)", ["skin_block.glb", "pigment_cluster", "depth_marker"]),
        (O, B, "all layers + vessels", "hold", "deep cells reach a lymph vessel", 3, "Deeper means it can spread", ["skin_block.glb", "lymph_vessel_valve (NIH 3D, downloaded)"])]),
    "melanoma-vaccine": block_story([
        (F, "cell_scene", "tumour cell, neoantigens", "macro orbit", "tumour mutations are read; neoantigen shapes light up on its surface", 4, "The tumour's own mutations", ["cell_scene", "tumour_cell", "antigen_markers"]),
        (F, "cell_scene", "mRNA, dendritic cell", "macro", "mRNA vaccine enters an immune cell, which displays the same shapes", 4, "Personalised mRNA", ["cell_scene", "mrna_strand", "immune_cell"]),
        (F, "cell_scene", "T cells, tumour cells", "macro track", "trained T cells find and destroy matching tumour cells", 4, "T cells hunt it down", ["cell_scene", "immune_cell", "tumour_cell", "apoptosis_fx"])]),
    "actinic-keratosis": block_story([
        (O, B, "epidermis", "3/4", "rough sun-damaged keratinocytes stack in the epidermis", 3, "Precancerous cells", ["skin_block.glb", "keratinocyte_layer"]),
        (O, B, "epidermis", "hold", "the drug soaks in and gathers in the damaged cells", 3, "Drug collects in damaged cells", ["skin_block.glb", "topical_penetration_fx"]),
        (O, B, "epidermis", "hold", "blue light switches it on; damaged cells flash and peel away", 4, "Light activates it (PDT)", ["skin_block.glb", "light_panel_fx", "apoptosis_fx"])]),
    "skin-check": block_story([
        (O, "body_model", "skin", "slow full-body orbit", "a scan line passes head to toe; spots light up", 4, "Head-to-toe exam", ["body_model", "scan_line_fx"]),
        (O, B, "epidermis, melanocytes", "top view through a lens", "the dermatoscope shows a pigment network", 4, "Dermatoscope view", ["skin_block.glb", "dermoscope_lens"]),
        (O, "caption", "", "static", "ABCDE checklist builds letter by letter", 4, "A B C D E", ["caption_card"])]),
    "skin-cancer-reconstruction": block_story([
        (O, "face.glb", "epidermis", REG["nose"], "a defect after Mohs sits on the nasal sidewall; nasal subunits are outlined", 3, "Nasal subunits", ["face.glb", "subunit_overlay"]),
        (O, "face.glb", "epidermis", "push in", "a local flap is cut, rotated and inset to cover the defect", 5, "Local flap", ["face.glb", "skin_flap_rig", "incision_line_fx"]),
        (O, "face.glb", "epidermis", "pull back", "the scar lies along subunit borders", 3, "Scar hidden at the borders", ["face.glb", "suture_fx"])]),
    "acne": block_story([
        (O, B, "all layers (follicle, sebaceous)", "3/4 on the follicle", "dead cells and oil plug the pore", 3, "Blocked pore", ["skin_block.glb", "pore_plug"]),
        (F, "follicle_macro", "follicle, sebum, bacteria", "inside the follicle", "C. acnes multiply in the trapped oil", 4, "Bacteria multiply", ["follicle_macro", "bacteria_particles"]),
        (O, B, "all layers", "hold", "the follicle wall swells red; inflammation spreads", 3, "Inflammation", ["skin_block.glb", "inflammation_fx"])]),
    "acne-scars": block_story([
        (O, B, ALL, "3/4", "three scar shapes: rolling, boxcar, icepick", 4, "Three scar types", ["skin_block.glb", "scar_profiles"]),
        (O, B, ALL, "cutaway", "fibrous bands tether rolling scars down; a needle cuts them (subcision)", 4, "Subcision frees rolling scars", ["skin_block.glb", "needle_syringe", "septae_contract_fx"]),
        (O, B, ALL, "hold", "icepick: TCA dabbed in; boxcar: laser columns; the surface levels", 4, "Each type, its own fix", ["skin_block.glb", "laser_column_fx", "skin_texture_morph"])]),
    "rosacea": block_story([
        (O, "face.glb", "epidermis", REG["cheek"], "redness flushes over the cheeks and nose", 3, "Rosacea", ["face.glb", "surface_vessels_decal"]),
        (O, B, "epidermis, dermis, capillaries", "3/4", "dermal vessels dilate; Demodex mites crowd the follicle", 4, "Vessels + Demodex", ["skin_block.glb", "demodex_mite", "vessel_heat_fx"]),
        (O, B, ALL, "hold", "inflammation spreads; papules form", 3, "Flares", ["skin_block.glb", "inflammation_fx"])]),
    "melasma": block_story([
        (O, "face.glb", "epidermis", REG["cheek"], "brown patches spread over cheeks and upper lip", 3, "Melasma", ["face.glb", "pigment_decal"]),
        (O, B, "epidermis, melanocytes", "3/4", "sun, heat and hormones switch melanocytes on; melanin pours into keratinocytes", 4, "Melanocytes overwork", ["skin_block.glb", "melanin_transfer_fx"]),
        (O, B, ALL, "push in", "some pigment drops into the dermis, held by melanophages", 3, "Dermal pigment is stubborn", ["skin_block.glb", "macrophage_cell"])]),
    "milia": block_story([
        (O, B, "epidermis", "3/4", "keratin is trapped in a tiny white cyst under the surface", 3, "A keratin cyst", ["skin_block.glb", "milia_cyst"]),
        (O, B, "epidermis", "push in", "a fine needle opens it; the keratin pearl is lifted out", 3, "Extraction", ["skin_block.glb", "needle_syringe"])]),
    "hair-loss": block_story([
        (O, "scalp_model", "scalp skin", "high angle over the crown", "hair density thins at the crown", 3, "Thinning", ["scalp_model", "hair_growth_morph"]),
        (O, B, "all layers (hair)", "3/4 on the follicle", "DHT signals shrink the follicle; the hair gets finer each cycle", 4, "Follicles miniaturise", ["skin_block.glb", "hair_growth_morph"]),
        (O, B, "hair follicle", "hold", "the hair cycle wheel: growth phase shortens", 3, "Hair cycle", ["skin_block.glb", "hair_cycle_diagram"])]),
    "sclerotherapy": block_story([
        (O, "leg_model", "skin", "3/4 down the leg", "spider and reticular veins show on the thigh", 3, "Spider veins", ["leg_model", "surface_vessels_decal"]),
        (O, "leg_model", "cutaway: skin, superficial veins", "cutaway", "a fine needle enters the vein; solution flows in", 4, "Sclerosant injected", ["leg_model", "needle_syringe"]),
        (F, "vessel_lumen", "vein wall", "inside the vein", "the lining irritates, the walls stick together and collapse", 4, "Vein collapses", ["vessel_lumen", "vessel_collapse_fx"]),
        (O, "leg_model", "skin", "pull back", "the vein fades as it is reabsorbed", 2, "Reabsorbed", ["leg_model", "surface_vessels_decal"])]),
    "festoons": block_story([
        (O, "face.glb", "epidermis", REG["undereye"], "a swollen bag sits on the upper cheek below the lid", 3, "Festoons", ["face.glb", "surface_volume_morph"]),
        (O, "face.glb", "cutaway: orbicularis, fat", "cutaway", "fluid pools above the malar septum and the orbicularis retaining ligament", 4, "Fluid trapped above the septum", ["face.glb", "malar_septum", "fluid_fx"]),
        (O, "face.glb", "epidermis", "hold, caption", "why it is hard to treat", 3, "Hard to treat", ["face.glb", "caption_card"])]),
    "skin-aging": block_story([
        (O, "face.glb", "all layers", REG["fullface"], "age slider 30 → 70: skin thins, fat compartments deflate and slide, bone recedes", 6, "Age 30 → 70", ["face.glb", "aging_morph"]),
        (O, "face.glb", "fat_superficial + fat_deep", "3/4 hold", "fat compartments shrink one by one and drop", 4, "Fat deflates", ["face.glb", "aging_morph"]),
        (O, B, "dermis", "3/4", "collagen fibres thin and fragment", 3, "Collagen fades", ["skin_block.glb", "collagen_growth_fx"]),
        (O, "skull_model", "bone", "profile", "the orbit widens and the jaw recedes", 3, "Bone recedes", ["skull_and_eyes (NIH 3D, downloaded)", "aging_morph"])]),
    "skin-laxity-weight-loss": block_story([
        (O, "face.glb", "fat compartments", REG["fullface"], "GLP-1 weight loss: compartments empty fast", 4, "Fat empties fast", ["face.glb", "aging_morph"]),
        (O, "face.glb", "epidermis", "hold", "the skin envelope stays the same size and folds", 3, "Skin can't keep up", ["face.glb", "surface_volume_morph"])]),
    "cellulite": block_story([
        (O, B, ALL, "3/4 cutaway", "fat lobules push up between vertical fibrous septae that pull down", 4, "Bands pull, fat pushes", ["skin_block.glb", "septae_contract_fx"]),
        (O, B, ALL, "hold", "the surface dimples above each band", 3, "Dimples", ["skin_block.glb", "skin_texture_morph"]),
        (O, B, ALL, "hold", "the bands are released; the surface smooths", 3, "Release the bands", ["skin_block.glb", "septae_contract_fx"])]),
    "lymphatic-drainage": block_story([
        (O, "body_model", "skin + lymph", "3/4", "lymph vessels and nodes glow green beneath the skin", 3, "Lymph system", ["body_model", "lymph_network"]),
        (F, "lymph_macro", "vessel, valves", "inside a lymph vessel", "light strokes on the skin push fluid through one-way valves", 4, "One-way valves", ["lymph_vessel_valve (NIH 3D, downloaded)"]),
        (O, "body_model", "skin", "pull back", "swelling drains to the nodes", 3, "Swelling goes down", ["body_model", "surface_volume_morph"])]),
    "retinoids": block_story([
        (O, B, "epidermis, dermis", "3/4", "retinoid soaks into the epidermis and binds receptors in the cells", 3, "Retinoic acid receptors", ["skin_block.glb", "topical_penetration_fx"]),
        (O, B, "epidermis", "time-lapse", "cells turn over faster; old surface cells shed (the purge)", 4, "Faster turnover", ["skin_block.glb", "cell_turnover_fx"]),
        (O, B, "dermis", "hold", "collagen thickens over months", 3, "More collagen", ["skin_block.glb", "collagen_growth_fx", "timelapse_counter"])]),
    "niacinamide": block_story([
        (O, B, "epidermis, melanocytes", "3/4", "niacinamide blocks melanosome hand-off from melanocyte to keratinocyte", 4, "Blocks pigment transfer", ["skin_block.glb", "melanin_transfer_fx"]),
        (O, B, "epidermis", "hold", "barrier lipids rebuild; redness calms", 3, "Stronger barrier", ["skin_block.glb", "barrier_bricks"])]),
    "vitamin-c": block_story([
        (O, B, "epidermis", "3/4", "UV hits and free radicals spark in the skin", 3, "UV free radicals", ["skin_block.glb", "uv_rays_fx", "free_radical_fx"]),
        (O, B, "epidermis, dermis", "hold", "vitamin C neutralises the radicals; collagen synthesis lights up", 4, "Antioxidant + collagen", ["skin_block.glb", "free_radical_fx", "collagen_growth_fx"])]),
    "brighteners": block_story([
        (F, "cell_scene", "melanocyte, tyrosinase", "macro inside a melanocyte", "tyrosinase turns tyrosine into melanin step by step", 4, "How melanin is made", ["cell_scene", "melanocyte_cell"]),
        (F, "cell_scene", "melanocyte", "macro", "brightener molecules block the enzyme; melanin output drops", 4, "Block the enzyme", ["cell_scene", "melanocyte_cell", "enzyme_dissolve_fx"])]),
    "acids-exfoliation": block_story([
        (O, B, "epidermis", "3/4 on the surface", "dead cells cling together at the stratum corneum", 3, "Dead cell build-up", ["skin_block.glb", "barrier_bricks"]),
        (O, B, "epidermis, follicle", "push in", "AHA loosens the bonds at the surface; BHA travels down the oily pore", 4, "AHA on top, BHA in the pore", ["skin_block.glb", "topical_penetration_fx", "pore_plug"]),
        (O, B, "epidermis", "hold", "cells shed; surface smooths; pore clears", 3, "Smoother, clearer", ["skin_block.glb", "cell_turnover_fx"])]),
    "skin-barrier": block_story([
        (O, B, "epidermis", "3/4 push in to the surface", "bricks-and-mortar: corneocytes with lipid mortar", 3, "Bricks and mortar", ["skin_block.glb", "barrier_bricks"]),
        (O, B, "epidermis", "hold", "gaps open; water escapes, irritants get in", 3, "Damaged barrier", ["skin_block.glb", "barrier_bricks", "water_binding_fx"]),
        (O, B, "epidermis", "hold", "ceramides and moisturizer fill the gaps", 3, "Repaired", ["skin_block.glb", "barrier_bricks"])]),
    "sunscreen": block_story([
        (O, B, ALL, "3/4", "UVB stops in the epidermis; UVA reaches the dermis", 4, "UVA vs UVB", ["skin_block.glb", "uv_rays_fx"]),
        (F, "cell_scene", "DNA", "macro", "UV kinks the DNA ladder in a skin cell", 3, "DNA damage", ["cell_scene", "dna_strand"]),
        (O, B, ALL, "hold", "a mineral film on top reflects and absorbs the rays", 3, "Blocked at the surface", ["skin_block.glb", "uv_rays_fx", "sunscreen_film"])]),
    "chemical-peels": block_story([
        (O, B, ALL, "3/4", "the acid front moves down: superficial, medium, deep", 4, "Depth by acid", ["skin_block.glb", "topical_penetration_fx", "depth_marker"]),
        (O, B, "epidermis", "hold", "the damaged layers peel off; new skin grows up from below", 4, "New skin replaces old", ["skin_block.glb", "cell_turnover_fx"])]),
    "diamondglow": block_story([
        (O, "face.glb", "epidermis", REG["cheek"], "the diamond tip sweeps across the cheek", 3, "DiamondGlow", ["face.glb", "facial_tip"]),
        (O, B, "epidermis", "3/4 cutaway", "the tip abrades dead cells while suction lifts debris and serum is pushed in", 4, "Exfoliate, extract, infuse", ["skin_block.glb", "facial_tip", "suction_fx"])]),
    "hydrafacial": block_story([
        (O, "face.glb", "epidermis", REG["nose"], "the vortex tip glides over the nose", 3, "HydraFacial", ["face.glb", "facial_tip"]),
        (O, B, "epidermis, follicle", "3/4 cutaway", "a vortex loosens the pore plug, suction pulls it out, serum fills in", 4, "Cleanse, extract, hydrate", ["skin_block.glb", "facial_tip", "suction_fx", "pore_plug"])]),
    "microneedling": block_story([
        (O, "face.glb", "epidermis", REG["cheek"], "the pen passes in strips across the cheek", 3, "Microneedling", ["face.glb", "needle_array_tip"]),
        (O, B, ALL, "3/4 cutaway", "needles make thousands of micro-channels into the dermis", 4, "Micro-injuries", ["skin_block.glb", "needle_array_tip"]),
        (F, FM, "fibroblasts, collagen", "macro", "the wound signal wakes fibroblasts; collagen fills in", 4, "Collagen repair", ["dermis_macro", "fibroblast_cell", "collagen_growth_fx"])]),
    "led-light": block_story([
        (O, "face.glb", "epidermis", REG["fullface"], "an LED panel bathes the face red, then blue", 3, "LED light", ["face.glb", "light_panel_fx"]),
        (O, B, ALL, "3/4", "blue light stops in the epidermis and kills C. acnes; red reaches the dermis and calms inflammation", 5, "Blue vs red", ["skin_block.glb", "light_panel_fx", "bacteria_particles"])]),
    "exomind": block_story([
        (O, "brain_model", "head shell + brain", "3/4 orbit", "the coil sits on the forehead; magnetic field lines enter the prefrontal cortex", 4, "Magnetic pulses", ["brain_model", "magnetic_field_fx"]),
        (O, "brain_model", "brain", "push in to the DLPFC", "the dorsolateral prefrontal cortex lights with each pulse", 4, "DLPFC stimulated", ["brain_model", "neural_activity_fx"])]),
    "iv-therapy": block_story([
        (O, "arm_model", "skin, vein", "3/4 on the forearm", "a cannula enters the vein; the drip starts", 3, "IV line", ["arm_model", "cannula"]),
        (F, "vessel_lumen", "vein, bloodstream", "inside the vein", "vitamins and NAD+ molecules flow into the bloodstream", 4, "Straight into the blood", ["vessel_lumen", "molecule_particles"])]),
}


# ---------------- his words ----------------
def sentences(vid):
    f = OST / "transcripts" / f"{vid}.txt"
    if not f.exists(): return []
    t = re.sub(r"\s+", " ", f.read_text(encoding="utf-8", errors="ignore"))
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", t) if 6 <= len(s.split()) <= 45]


STOP = {"the", "and", "of", "in", "a", "to", "for", "with", "on", "or", "by", "is", "it", "skin", "face", "dr"}


def terms(p):
    raw = [p["name"], *p["aliases"], *p["search_terms"], *p["anatomy"], p.get("brand_or_device") or ""]
    ws = set()
    for r in raw:
        for w in re.findall(r"[a-z0-9+]{3,}", r.lower()):
            if w not in STOP: ws.add(w)
    phr = {r.lower() for r in raw if r and len(r) > 3}
    return ws, phr


def match(p, k=3):
    ws, phr = terms(p)
    mech = set(re.findall(r"[a-z]{5,}", p["what_it_does"].lower())) - STOP
    cand = []
    for vid in p["mentioned_in"]:
        for s in sentences(vid):
            sl = s.lower()
            sc = 3 * sum(1 for ph in phr if ph in sl) + sum(1 for w in ws if re.search(rf"\b{re.escape(w)}", sl)) + 0.5 * sum(1 for w in mech if w in sl)
            if sc >= 2: cand.append((sc, vid, s))
    cand.sort(key=lambda x: -x[0])
    out, seen = [], set()
    for sc, vid, s in cand:
        if s in seen or sum(1 for o in out if o[0] == vid) >= 2: continue
        seen.add(s); out.append((vid, s))
        if len(out) == k: break
    return out


def refs(p):
    """the two references closest to the mechanism: overlap of what_it_shows/energy text with the procedure's
    terms and mechanism words, then 3D styles first, fragments last"""
    ws, _ = terms(p)
    mech = set(re.findall(r"[a-z]{5,}", p["what_it_does"].lower())) - STOP
    order = {"photoreal-3D": 0, "soft-3D": 0.5, "mixed": 1, "shaded-2D": 1.5, "flat-2D": 2}
    def score(m):
        t = " ".join(str(m.get(k) or "") for k in ("what_it_shows", "energy_effect_how", "reusable_as_reference", "title")).lower()
        return sum(1 for w in ws | mech if re.search(rf"{re.escape(w)}", t)) - order.get(m.get("style"), 2) - (3 if m.get("fragment") else 0)
    ms = sorted((m for m in MOT if m["procedure_id"] == p["id"]), key=lambda m: -score(m))
    return ms[:2]


VID = {v["id"]: v for v in json.load(open(OST / "data/videos.json", encoding="utf-8"))}
VURL = {k: v.get("url") for k, v in VID.items()}


def captions(p, k=2):
    """fallback when no spoken sentence matches (many of his clips are music over footage): his own caption text"""
    out = []
    for vid in p["mentioned_in"]:
        c = re.sub(r"\s+", " ", (VID.get(vid, {}).get("caption") or VID.get(vid, {}).get("title") or "")).strip()
        c = re.sub(r"(#\w+\s*)+$", "", c).strip()
        if len(c.split()) >= 5:
            out.append((vid, c[:220] + ("…" if len(c) > 220 else "")))
        if len(out) == k: break
    return out


def vid_url(vid):
    return VURL.get(vid) or vid


# ---------------- write ----------------
need = defaultdict(set)
index = []
assert len(SPEC) == len(P) and set(SPEC) == {p["id"] for p in P}, set(p["id"] for p in P) ^ set(SPEC)
for p in P:
    shots = SPEC[p["id"]]
    total = sum(s["dur"] for s in shots)
    assets = sorted({a for s in shots for a in s["assets"]})
    missing = [a for a in assets if a not in HAVE]
    for a in missing: need[a].add(p["id"])
    n_o = sum(s["frame"] == O for s in shots)
    L = [f"# {p['name']}", "",
         f"**What it does:** {p['what_it_does']}  ", f"**Anatomy:** {', '.join(p['anatomy'])}  ",
         f"**Runtime:** {total} s across {len(shots)} shots · {n_o} overlay, {len(shots) - n_o} full-frame", "",
         "OVERLAY = rendered with alpha (PNG sequence + WebM VP9 alpha), floats beside Dr Ostad on the filmed plate. "
         "FULL-FRAME = camera inside tissue or at cell scale; cut away from him for these.", "",
         "| # | Frame | Scene | Visible layers | Camera | What animates | s | Label |", "|---|---|---|---|---|---|---|---|"]
    for i, s in enumerate(shots, 1):
        L.append(f"| {i} | **{s['frame']}** | {s['scene']} | {s['layers'] or '—'} | {s['camera']} | {s['animates']} | {s['dur']} | {s['label']} |")
    L += ["", "## Reference animation", ""]
    rs = refs(p)
    if rs:
        for m in rs:
            L.append(f"- [{m['title']}]({m['url']}) — {m.get('maker') or '?'}, {m.get('style')}, {m.get('duration')} s. "
                     f"Best moment {m.get('best') or '—'}. Reuse: {m.get('reusable_as_reference') or '—'}")
    else:
        L.append("- none found (see MOTION_GAPS.md); build from the shot list alone")
    L += ["", "## His words (matched from the transcripts of his videos)", ""]
    ws = match(p)
    cs = [] if ws else captions(p)
    if ws:
        for vid, s in ws: L.append(f"- “{s}” — [{vid}]({vid_url(vid)})")
    elif cs:
        L.append("No spoken sentence matched (these clips are music over footage), so his captions instead:")
        for vid, c in cs: L.append(f"- caption: “{c}” — [{vid}]({vid_url(vid)})")
    else:
        L.append("- no transcript sentence matched" + (" (procedure not in his videos)" if not p["mentioned_in"] else ""))
    L += ["", "## Assets", "", "Have: " + (", ".join(a for a in assets if a in HAVE) or "—"), "",
          "Missing: " + (", ".join(missing) or "—"), ""]
    (OUT / f"{p['id']}.md").write_text("\n".join(L), encoding="utf-8")
    index.append({"id": p["id"], "shots": len(shots), "overlay": n_o, "full_frame": len(shots) - n_o, "seconds": total,
                  "missing": missing, "his_words": len(ws), "his_captions": len(cs), "reference": rs[0]["url"] if rs else None})
json.dump(index, open(OUT / "index.json", "w", encoding="utf-8"), indent=1)

rank = sorted(need.items(), key=lambda kv: (-len(kv[1]), kv[0]))
BL = ["# Build list", "", f"Every asset the 97 shot plans need that does not exist yet, ranked by how many procedures need it. "
      f"Already built: {', '.join(sorted(HAVE))}.", "",
      "| Rank | Asset | Procedures | Which |", "|---|---|---|---|"]
for i, (a, ids) in enumerate(rank, 1):
    ids = sorted(ids)
    BL.append(f"| {i} | `{a}` | {len(ids)} | {', '.join(ids[:12])}{' …' if len(ids) > 12 else ''} |")
(R / "BUILD_LIST.md").write_text("\n".join(BL) + "\n", encoding="utf-8")
tot = len(index); sh = sum(i["shots"] for i in index); ov = sum(i["overlay"] for i in index)
print(f"{tot} plans · {sh} shots · {ov} overlay / {sh - ov} full-frame · his words in {sum(1 for i in index if i['his_words'])} (+captions {sum(1 for i in index if i['his_captions'])}) · "
      f"reference in {sum(1 for i in index if i['reference'])} · {len(rank)} missing assets")
print("top 10:", [(a, len(i)) for a, i in rank[:10]])
