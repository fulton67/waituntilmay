/* case.v2.js — the sie jewel case, slide 1 of the gallery.
   three.js r169 + the hand-written one-degree-of-freedom hinge from v1.

   WHAT CHANGED FROM v1, AND WHY
   -----------------------------
   v1 ran on sie-case-web.glb, whose clear shell had been welded into frame_5..43
   and needed a hard-coded hinge line and a 22-name reparenting list. This runs on
   sie-case.glb (505,824 B), which ships the parts the brief names and a real
   `hinge` node already parenting lid_clear, lid_knuckle_0/1, A_front_cover and
   B_inside_cover. So nothing is reparented by name any more: the pivot is placed
   on the line through the two knuckle centres, which IS the hinge pin, and
   measured rather than assumed.

   The case ships CLOSED in this asset (every lid part sits at +z, the base and
   tray at -z), so theta = 0 is the shipped pose and the open stop is a number we
   choose; the brief asks for 120 degrees, so that is thetaOpen.

   THE GLOSS
   ---------
   v1 lit the case with RoomEnvironment, which is a bright room: its walls land in
   the clear plastic as a grey haze across the whole face, which reads as fake
   gloss. This builds a dark studio instead — black scene, one large softbox
   above-left, one thin strip right, baked through PMREM — so the plastic is
   almost invisible face-on and the reflections are clean soft strips at the
   edges. Tone mapping moves ACES -> Neutral: ACES desaturates and lifts the
   cover colours, which on printed card is exactly wrong. */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const HOST = document.getElementById('case3d');
const SLIDE = HOST && HOST.closest('.slide');
const TILT_BTN = document.getElementById('case-tilt');
/* relative locally; on Webflow the host carries data-model="https://assets.sie.market/..." */
const MODEL = (HOST && HOST.dataset.model) || 'assets/case/sie-case.glb';

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEG = THREE.MathUtils.degToRad;
const RAD = THREE.MathUtils.radToDeg;

/* the parts, by the names the asset actually ships */
const IS_CLEAR = n => /^lid_clear$|^base_|^lid_knuckle_/.test(n);
const IS_COVER = n => /^[A-E]_/.test(n);
const IS_DISC = n => n === 'F_disc';
const IS_BLACK = n => n === 'tray_black' || n === 'hub';
/* the clear parts whose geometry is rebuilt with rounded edges */
const ROUND_ME = n => /^lid_clear$|^base_/.test(n);

const EDGE_RADIUS = 0.008;     /* model units, per the brief */
const EDGE_SEGMENTS = 4;
const THETA_OPEN_DEG = 120;
const ENV_INTENSITY = 0.6;

const diag = { ok: false, reduce: REDUCE };
window.__case = diag;

/* ------------------------------------------------------------------ helpers */
const wrap180 = d => { while (d > 180) d -= 360; while (d < -180) d += 360; return d; };

function signedAngle(a, b, axis) {
  const x = a.dot(b);
  const y = new THREE.Vector3().crossVectors(a, b).dot(axis);
  return Math.atan2(y, x);
}

function worldCentre(obj) {
  return new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
}

/* A dark studio, baked through PMREM. Two emitters only: a big soft source
   above-left and a thin bright strip on the right. Everything else is black, so
   the plastic has nothing to pick up except those two shapes. */
function studioEnv() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x000000);

  const emitter = (w, h, level, pos) => {
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    m.color.setRGB(level, level, level);              /* >1 is allowed: PMREM is float */
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.lookAt(0, 0, 0);
    return mesh;
  };

  /* large softbox, upper left and slightly in front */
  s.add(emitter(7.0, 4.5, 2.6, [-3.4, 4.4, 2.6]));
  /* thin strip light, right, nearly edge-on: this is what draws the edge highlight */
  s.add(emitter(0.35, 6.0, 5.0, [4.2, 0.5, 1.1]));
  /* a very dim fill behind, so the back edges are not pure void */
  s.add(emitter(5.0, 3.0, 0.18, [1.2, 0.4, -4.5]));
  return s;
}

/* Multiply a soft dark frame into the outer edge of a cover texture, so the
   printed card reads as tucked into the plastic rather than floating level with
   it.

   The brief asks for 2 px. Taken literally against the texture that is a no-op:
   the front cover's map is ~2000 px across and draws about 470 px wide in the
   hero, so 2 texture px is 0.47 of a screen pixel and never shows. The band is
   therefore proportional — 0.4% of the texture's short side — which lands at
   8 px on that 2000 px map, i.e. 1.9 screen px at the hero size: the brief's
   number, measured where it is actually seen. basePx is the floor, so a small
   map still gets its 2 px. */
function tuckEdge(tex, basePx) {
  const img = tex && tex.image;
  if (!img || !img.width) return null;
  const w = img.width, h = img.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (!x) return null;
  x.drawImage(img, 0, 0);
  const band = Math.max(basePx, Math.round(Math.min(w, h) * 0.004));
  x.globalCompositeOperation = 'multiply';
  for (let i = 0; i < band; i++) {
    const a = 0.55 * Math.pow(1 - i / band, 1.6);
    x.strokeStyle = 'rgba(0,0,0,' + a.toFixed(4) + ')';
    x.lineWidth = 1;
    x.strokeRect(i + 0.5, i + 0.5, w - 2 * i - 1, h - 2 * i - 1);
  }
  const out = new THREE.CanvasTexture(c);
  /* GLTFLoader hands textures over with flipY false; CanvasTexture defaults true,
     and getting this wrong flips every cover upside down. */
  out.flipY = false;
  out.colorSpace = THREE.SRGBColorSpace;
  out.wrapS = tex.wrapS; out.wrapT = tex.wrapT;
  out.minFilter = tex.minFilter; out.magFilter = tex.magFilter;
  out.anisotropy = tex.anisotropy;
  out.needsUpdate = true;
  return { tex: out, band: band, w: w, h: h };
}

/* ===========================================================================
   THE HINGE  (unchanged from v1 — it was tuned against five logged scenarios)
   theta = 0 closed, theta = thetaOpen the open stop. Fixed 1/240 s substeps,
   semi-implicit Euler, gravity torque recomputed every substep from the case's
   CURRENT world rotation, so tipping the case swings the lid.
   =========================================================================== */
class Hinge {
  constructor() {
    this.theta = 0; this.omega = 0;
    this.thetaOpen = DEG(THETA_OPEN_DEG);
    this.I = 1;
    this.g = 40.17;               /* re-solved per geometry in calibrateG() */
    this.cVisc = 5.0;
    this.rest = 0.18;
    this.detentZone = DEG(7);
    this.sleep = 0.12;
    this.tap = 9.0;
    this.d = 1; this.tauMax = 1;
    this.mus = 0; this.muk = 0; this.kDetent = 0; this.seat = 0;
    this.axisW = new THREE.Vector3(0, 1, 0);
    this.hingeW = new THREE.Vector3();
    this.hingeLocal = new THREE.Vector3();
    this.comPivot = new THREE.Vector3();
    this.parentM = new THREE.Matrix4();
    this.sign = -1;
    this.closedY = 0;
    this.drag = null;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._one = new THREE.Vector3(1, 1, 1);
    this._up = new THREE.Vector3(0, 1, 0);
  }

  calibrate() {
    this.tauMax = this.g * this.d * this.I;
    this.mus = 0.35 * this.tauMax;
    this.muk = 0.25 * this.tauMax;
    this.kDetent = 1.4 * this.tauMax;
    /* -k*theta is zero AT theta = 0 and so cannot hold a shut lid against
       gravity on its own; a real case has a snap, so the detent zone also
       raises the static threshold. */
    this.seat = 0.9 * this.tauMax;
    this.kDrag = 6 * this.tauMax;
    this.cDrag = 1.2;
  }

  comAt(theta) {
    this._q.setFromAxisAngle(this._up, this.closedY + this.sign * theta);
    this._m.compose(this.hingeLocal, this._q, this._one);
    return this._v.copy(this.comPivot).applyMatrix4(this._m).applyMatrix4(this.parentM).clone();
  }

  /* torque about the hinge EXPRESSED IN THE +theta DIRECTION. The raw
     (r x F).axis is about the pivot's local +Y; theta runs the other way when
     sign is -1, and forgetting that makes a tipped case swing the wrong way. */
  gravityTorque(theta) {
    const r = this.comAt(theta).sub(this.hingeW);
    const F = new THREE.Vector3(0, -this.g * this.I, 0);
    return r.cross(F).dot(this.axisW) * this.sign;
  }

  step(h) {
    let net = this.gravityTorque(this.theta);
    if (this.drag) net += this.drag.k * (this.drag.target - this.theta) - this.drag.c * this.omega;
    if (this.theta < this.detentZone) net -= this.kDetent * this.theta;
    net -= this.cVisc * this.omega;

    if (this.omega === 0) {
      const hold = this.mus + (this.theta < this.detentZone ? this.seat : 0);
      if (Math.abs(net) <= hold) return;
      net -= Math.sign(net) * hold;
    }
    this.omega += (net / this.I) * h;

    const dv = (this.muk / this.I) * h;                   /* Coulomb, never reverses */
    if (Math.abs(this.omega) <= dv) this.omega = 0;
    else this.omega -= Math.sign(this.omega) * dv;

    this.theta += this.omega * h;

    if (this.theta <= 0) {
      this.theta = 0;
      if (this.omega < 0) this.omega = -this.omega * this.rest;
      if (Math.abs(this.omega) < this.sleep) this.omega = 0;
    } else if (this.theta >= this.thetaOpen) {
      this.theta = this.thetaOpen;
      if (this.omega > 0) this.omega = -this.omega * this.rest;
      if (Math.abs(this.omega) < this.sleep) this.omega = 0;
    }
  }

  advance(dt) {
    const h = 1 / 240;
    let n = Math.min(12, Math.max(1, Math.round(dt / h)));
    while (n--) this.step(h);
  }
}

/* --------------------------------------------------------------------- boot */

function boot() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { diag.error = 'webgl: ' + e; return; }
  if (!renderer || !renderer.getContext()) { diag.error = 'no webgl context'; return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  /* The transmission pass re-renders the scene into an offscreen target: on v1
     that measured 43 -> 85 draw calls per frame. Half resolution on that target
     is the cheapest thing that buys the glass back on a phone. */
  /* Half-res transmission would halve the cost of the opacity pass, but
     WebGLRenderer.transmissionResolutionScale does not exist in r169 (it lands
     in r171), so the guard never fires and the transmission pass runs at the
     full drawing-buffer size. Left in place for when the pin moves. */
  if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = 0.5;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.cssText =
    'display:block;width:100%;height:100%;touch-action:none;cursor:grab;outline:none';
  HOST.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = studioEnv();
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  scene.environmentIntensity = ENV_INTENSITY;

  /* one key light: warm-neutral, upper left, soft shadows */
  const key = new THREE.DirectionalLight(0xfff4e8, 1.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 4;
  key.shadow.bias = -0.0012;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.ShadowMaterial({ opacity: 0.28 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);

  /* pitch outside, yaw inside, so yaw stays about the case's own vertical */
  const rig = new THREE.Object3D();
  const yawObj = new THREE.Object3D();
  rig.add(yawObj); scene.add(rig);

  const hinge = new Hinge();
  let root = null, pivot = null, discSpinner = null, disc = null;
  let lidMeshes = [], radius = 1, faceYaw = 0, radiusSamples = null;

  let casePitch = 0, caseYaw = 0, pitchVel = 0, yawVel = 0;
  let swayT = 0, sway = !REDUCE;
  let discOmega = 0, motorOn = false;

  /* The lid sweeps a much wider silhouette open than closed, so one framing
     fitted to the closed pose crops the open one. radiusSamples holds, per 10°
     of hinge travel, the case's own bounding sphere in yawObj-local space: a
     centre and a radius. The camera lerps between the two bracketing samples,
     points at that centre in world space, and dollies to fit that radius.

     Fitting a sphere rather than a box is what makes this safe: a sphere is
     invariant under rotation, so the idle sway and the user's own pitch and yaw
     cannot swing a corner out of frame at any angle. Tracking the sphere's
     CENTRE rather than the rig origin is what keeps the open case large — the
     lid swings well off-centre, and a sphere about the origin would have to be
     2.1× the closed one where a sphere about the centre is 1.5×. */
  const camC = new THREE.Vector3();
  function fitNow() {
    if (!radiusSamples) { camC.set(0, 0, 0); return radius; }
    const span = radiusSamples.length - 1;
    const f = THREE.MathUtils.clamp(hinge.theta / DEG(THETA_OPEN_DEG), 0, 1);
    const x = f * span, i = Math.min(span - 1, Math.floor(x)), t = x - i;
    const a = radiusSamples[i], b = radiusSamples[i + 1];
    camC.set(a.c[0] * (1 - t) + b.c[0] * t,
             a.c[1] * (1 - t) + b.c[1] * t,
             a.c[2] * (1 - t) + b.c[2] * t);
    return a.r * (1 - t) + b.r * t;
  }
  function placeCamera() {
    const r = fitNow();
    camC.applyMatrix4(yawObj.matrixWorld);
    const vfov = DEG(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const d = r / Math.sin(Math.min(vfov, hfov) / 2) * 1.08;
    camera.position.set(camC.x, camC.y, camC.z + d);
    camera.lookAt(camC);
  }
  function size() {
    const w = Math.max(1, HOST.clientWidth), h = Math.max(1, HOST.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    placeCamera();
    camera.updateProjectionMatrix();
  }

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  loader.load(MODEL, gltf => {
    root = gltf.scene;
    root.updateMatrixWorld(true);

    const hingeNode = root.getObjectByName('hinge');
    const k0 = root.getObjectByName('lid_knuckle_0');
    const k1 = root.getObjectByName('lid_knuckle_1');
    if (!hingeNode || !k0 || !k1) { diag.error = 'hinge node or knuckles missing'; return; }

    /* ---- materials, overriding whatever the GLB carries ------------------- */
    const matReport = {};
    const covers = [];
    root.traverse(o => {
      if (!o.isMesh) return;
      const name = o.name;
      const old = o.material;
      const map = old && old.map ? old.map : null;
      if (map) map.colorSpace = THREE.SRGBColorSpace;
      let m;

      if (IS_CLEAR(name)) {
        /* almost invisible face-on; catches light at the edges and at angles */
        m = new THREE.MeshPhysicalMaterial({
          color: 0xffffff, metalness: 0, roughness: 0.06,
          transmission: 1, ior: 1.59, thickness: 0.02,
          specularIntensity: 0.35, clearcoat: 0,
          attenuationColor: new THREE.Color(0xf4f8f8), attenuationDistance: 3,
          transparent: true, side: THREE.DoubleSide,
        });
      } else if (IS_COVER(name)) {
        /* matte printed card: no clearcoat, no sheen, no specular boost */
        m = new THREE.MeshStandardMaterial({
          map: map, color: 0xffffff, roughness: 0.85, metalness: 0,
          side: THREE.DoubleSide,
        });
        covers.push(o);
      } else if (IS_DISC(name)) {
        m = new THREE.MeshStandardMaterial({
          map: map, color: 0xffffff, roughness: 0.4, metalness: 0.1,
          side: THREE.DoubleSide,
        });
      } else if (IS_BLACK(name)) {
        /* must read black, not grey */
        m = new THREE.MeshStandardMaterial({
          color: 0x0b0b0c, roughness: 0.55, metalness: 0, side: THREE.DoubleSide,
        });
      } else {
        return;
      }
      o.material = m;
      if (old && old.dispose && old !== m) old.dispose();
    });

    /* the printed covers get a dark tuck line multiplied into their border */
    const tucked = [];
    for (const o of covers) {
      if (!o.material.map) continue;
      const v = tuckEdge(o.material.map, 2);
      if (!v) continue;
      o.material.map = v.tex;
      o.material.needsUpdate = true;
      tucked.push({ part: o.name, band_px: v.band,
                    map_px: v.w + 'x' + v.h,
                    band_pct: +(100 * v.band / Math.min(v.w, v.h)).toFixed(3) });
    }

    /* ---- rounded edges on the clear shell, same sizes ---------------------
       RoundedBoxGeometry is built in the node's LOCAL space, and these nodes
       carry a scale, so the radius has to be divided by it to land at 0.008 in
       model units. A wall thinner than twice that gets the radius clamped, and
       the clamp is reported rather than hidden. */
    const rounded = [];
    root.traverse(o => {
      if (!o.isMesh || !ROUND_ME(o.name)) return;
      const g = o.geometry;
      g.computeBoundingBox();
      const sz = g.boundingBox.getSize(new THREE.Vector3());
      const ct = g.boundingBox.getCenter(new THREE.Vector3());
      const s = Math.max(1e-6, Math.abs(o.scale.x));
      const want = EDGE_RADIUS / s;
      const cap = Math.min(sz.x, sz.y, sz.z) * 0.49;
      const r = Math.min(want, cap);
      const ng = new RoundedBoxGeometry(sz.x, sz.y, sz.z, EDGE_SEGMENTS, r);
      ng.translate(ct.x, ct.y, ct.z);
      g.dispose();
      o.geometry = ng;
      rounded.push({
        part: o.name,
        size_local: [+sz.x.toFixed(4), +sz.y.toFixed(4), +sz.z.toFixed(4)],
        node_scale: +s.toFixed(4),
        radius_local: +r.toFixed(5),
        radius_model: +(r * s).toFixed(5),
        clamped: r < want - 1e-9,
      });
    });
    diag.rounded = rounded;
    diag.tucked = tucked;

    /* ---- the pivot, on the line through the two knuckle centres ----------- */
    const c0 = worldCentre(k0), c1 = worldCentre(k1);
    const axisDir = c1.clone().sub(c0).normalize();
    const axisPoint = c0.clone().add(c1).multiplyScalar(0.5);

    pivot = new THREE.Object3D();
    /* add(), not attach(): attach() would compose the inverse of the hinge
       node's world matrix into a pivot that is still identity. The hinge axis is
       expressed in the hinge node's own local space instead. */
    hingeNode.add(pivot);
    pivot.position.copy(hingeNode.worldToLocal(axisPoint.clone()));
    root.updateMatrixWorld(true);
    const moved = [];
    for (const child of [...hingeNode.children]) {
      if (child === pivot) continue;
      pivot.attach(child);
      moved.push(child.name);
    }
    root.updateMatrixWorld(true);
    hinge.hingeLocal.copy(pivot.position);
    diag.lid_parts = moved;

    /* which way opens? Rotating about +Y maps (x,z) -> (x cos a + z sin a,
       -x sin a + z cos a), so for the lid's free edge (large +x) the z
       derivative at a = 0 is -x: positive Y rotation drives the front cover
       backwards, into the tray. Measure it rather than trust the algebra. */
    const freeEdge = (() => {
      const b = new THREE.Box3().setFromObject(pivot);
      return new THREE.Vector3(b.max.x, axisPoint.y, b.getCenter(new THREE.Vector3()).z);
    })();
    const openY = pivot.rotation.y;
    hinge.closedY = openY;
    const probe = DEG(12);
    const localEdge = pivot.worldToLocal(freeEdge.clone());
    const zFor = y => {
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), y);
      const m = new THREE.Matrix4().compose(pivot.position, q, new THREE.Vector3(1, 1, 1));
      return localEdge.clone().applyMatrix4(m).applyMatrix4(hingeNode.matrixWorld).z;
    };
    const zPlus = zFor(openY + probe), zMinus = zFor(openY - probe), z0 = zFor(openY);
    hinge.sign = (zPlus > zMinus) ? 1 : -1;     /* open = the lid swings forward */
    diag.opening = {
      knuckle_0: c0.toArray().map(n => +n.toFixed(4)),
      knuckle_1: c1.toArray().map(n => +n.toFixed(4)),
      axis_dir: axisDir.toArray().map(n => +n.toFixed(4)),
      axis_point: axisPoint.toArray().map(n => +n.toFixed(4)),
      free_edge_z_closed: +z0.toFixed(4),
      free_edge_z_at_plus_12: +zPlus.toFixed(4),
      free_edge_z_at_minus_12: +zMinus.toFixed(4),
      sign_chosen: hinge.sign > 0 ? '+' : '-',
      theta_open_deg: THETA_OPEN_DEG,
    };

    /* ---- the lid's centre of mass, in the pivot's frame ------------------- */
    pivot.rotation.y = hinge.closedY;
    root.updateMatrixWorld(true);
    const comW = worldCentre(pivot);
    hinge.comPivot.copy(pivot.worldToLocal(comW.clone()));

    /* ---- the disc turns about its own normal, through the hub centre ------ */
    disc = root.getObjectByName('F_disc');
    const hub = root.getObjectByName('hub');
    if (disc) {
      const centre = worldCentre(hub || disc);
      /* the tray faces +z in this asset: every lid part is at +z of the base */
      const trayIn = new THREE.Vector3(0, 0, 1)
        .transformDirection(root.matrixWorld).normalize();
      const holder = new THREE.Object3D();
      holder.position.copy(centre);
      holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), trayIn);
      discSpinner = new THREE.Object3D();
      holder.add(discSpinner);
      root.add(holder);
      root.updateMatrixWorld(true);
      discSpinner.attach(disc);
      diag.disc = { axis: trayIn.toArray().map(n => +n.toFixed(4)) };
    }

    /* ---- shadows, and the lid meshes the raycaster needs ------------------ */
    root.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      if (!o.geometry.getAttribute('normal')) o.geometry.computeVertexNormals();
    });
    pivot.traverse(o => { if (o.isMesh) lidMeshes.push(o); });

    /* ---- front cover to the viewer, then frame it ------------------------- */
    faceYaw = 0;                       /* A_front_cover already faces +z */

    const box = new THREE.Box3().setFromObject(root);
    const centre = box.getCenter(new THREE.Vector3());
    root.position.sub(centre);
    yawObj.add(root);
    yawObj.rotation.y = faceYaw;
    rig.updateMatrixWorld(true);

    /* Sample the framing radius across the whole hinge travel, not just the
       closed pose. The ground and the shadow frustum are sized from the widest
       sample so the open lid neither clips the shadow camera nor hangs below
       the plane it casts onto. */
    const savedTheta = hinge.theta;
    const STEPS = 12;
    radiusSamples = [];
    let minY = Infinity;
    for (let i = 0; i <= STEPS; i++) {
      hinge.theta = DEG(THETA_OPEN_DEG) * (i / STEPS);
      applyHinge();
      rig.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(rig);
      minY = Math.min(minY, b.min.y);
      const sp = b.getBoundingSphere(new THREE.Sphere());
      radiusSamples.push({ c: sp.center.toArray().map(n => +n.toFixed(5)),
                           r: +sp.radius.toFixed(5) });
    }
    hinge.theta = savedTheta;
    applyHinge();
    rig.updateMatrixWorld(true);

    radius = radiusSamples[0].r;
    const radiusMax = radiusSamples.reduce(
      (m, s) => Math.max(m, s.c.reduce((q, v) => q + v * v, 0) ** 0.5 + s.r), 0);
    ground.position.y = minY - 0.004;

    const sh = radiusMax * 1.6;
    key.shadow.camera.left = -sh; key.shadow.camera.right = sh;
    key.shadow.camera.top = sh; key.shadow.camera.bottom = -sh;
    key.shadow.camera.near = 0.01; key.shadow.camera.far = radiusMax * 12;
    key.position.set(-radiusMax * 2.2, radiusMax * 2.8, radiusMax * 1.8);
    key.shadow.camera.updateProjectionMatrix();
    diag.framing = { radius_closed: radius, radius_open: radiusSamples[STEPS].r,
                     dolly_ratio: +(radiusSamples[STEPS].r / radius).toFixed(4),
                     world_extent: +radiusMax.toFixed(5),
                     samples: radiusSamples, ground_y: +ground.position.y.toFixed(5) };

    /* ---- the hinge's frame constants, then calibration ------------------- */
    refreshFrame();
    const r = hinge.comAt(0).sub(hinge.hingeW);
    hinge.d = r.clone().sub(hinge.axisW.clone().multiplyScalar(r.dot(hinge.axisW))).length();
    hinge.calibrate();

    applyHinge();
    diag.ok = true;
    diag.tris = 0;
    root.traverse(o => {
      if (!o.isMesh) return;
      diag.tris += (o.geometry.index ? o.geometry.index.count
        : o.geometry.getAttribute('position').count) / 3;
    });

    /* ---- the material report the brief asks for -------------------------- */
    const num = v => (v === undefined || v === null) ? null : +(+v).toFixed(4);
    root.traverse(o => {
      if (!o.isMesh || !o.material) return;
      const m = o.material;
      matReport[o.name] = {
        type: m.type,
        roughness: num(m.roughness), metalness: num(m.metalness),
        transmission: num(m.transmission), ior: num(m.ior),
        thickness: num(m.thickness),
        specularIntensity: num(m.specularIntensity),
        clearcoat: num(m.clearcoat), sheen: num(m.sheen),
        colour: '#' + m.color.getHexString(),
        attenuationColor: m.attenuationColor ? '#' + m.attenuationColor.getHexString() : null,
        attenuationDistance: m.attenuationDistance === Infinity ? 'Infinity'
          : num(m.attenuationDistance),
        map: !!m.map,
        map_colorSpace: m.map ? m.map.colorSpace : null,
        side: m.side === THREE.DoubleSide ? 'double' : m.side === THREE.FrontSide ? 'front' : 'back',
      };
    });
    diag.materials = matReport;
    diag.render = {
      toneMapping: 'NeutralToneMapping',
      toneMappingExposure: renderer.toneMappingExposure,
      outputColorSpace: renderer.outputColorSpace,
      environment: 'dark studio, 2 emitters + dim back fill, PMREM sigma 0.02',
      environmentIntensity: scene.environmentIntensity,
      keyLight: { colour: '#' + key.color.getHexString(), intensity: key.intensity,
                  shadowRadius: key.shadow.radius, mapSize: key.shadow.mapSize.x },
      shadowMap: 'PCFSoftShadowMap',
      groundShadowOpacity: ground.material.opacity,
      transmissionResolutionScale: ('transmissionResolutionScale' in renderer)
        ? renderer.transmissionResolutionScale
        : 'absent in three r' + THREE.REVISION + ' (added r171) — full-res pass',
      pixelRatio: renderer.getPixelRatio(),
    };
    diag.physics = {
      theta_open_deg: +RAD(hinge.thetaOpen).toFixed(2),
      com_arm_d: +hinge.d.toFixed(4),
      g: hinge.g, I: hinge.I,
      tau_max: +hinge.tauMax.toFixed(4),
      mus: +hinge.mus.toFixed(4), muk: +hinge.muk.toFixed(4),
      c: hinge.cVisc, k_detent: +hinge.kDetent.toFixed(4),
      seat: +hinge.seat.toFixed(4), restitution: hinge.rest,
      substep_hz: 240,
    };

    SLIDE && SLIDE.classList.add('has3d');
    size();
    wake();
  }, undefined, e => { diag.error = 'load: ' + e; });

  /* ----------------------------------------------------------- frame upkeep */
  function refreshFrame() {
    rig.updateMatrixWorld(true);
    hinge.parentM.copy(pivot.parent.matrixWorld);
    hinge.hingeW.copy(hinge.hingeLocal).applyMatrix4(hinge.parentM);
    hinge.axisW.set(0, 1, 0).transformDirection(hinge.parentM).normalize();
  }
  function applyHinge() {
    pivot.rotation.y = hinge.closedY + hinge.sign * hinge.theta;
  }

  /* ------------------------------------------------------------- the loop */
  let running = false, raf = 0, last = 0;
  let frames = 0, fpsT0 = 0, fps = 0;
  let pending = 0;

  function busy() {
    return dragging || Math.abs(hinge.omega) > 0.001 || hinge.drag
      || Math.abs(discOmega) > 0.001 || motorOn
      || Math.abs(pitchVel) > 0.001 || Math.abs(yawVel) > 0.001
      || (sway && !REDUCE) || pending;
  }
  function wake() {
    pending = 2;
    if (!running && visible && diag.ok) { running = true; last = 0; raf = requestAnimationFrame(frame); }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;

    if (!dragCase) {
      casePitch += pitchVel * dt; caseYaw += yawVel * dt;
      const k = Math.exp(-4 * dt);
      pitchVel *= k; yawVel *= k;
    }
    casePitch = THREE.MathUtils.clamp(casePitch, -DEG(55), DEG(55));
    if (tilt.on) {
      casePitch += (tilt.pitch - casePitch) * 0.15;
      caseYaw += (tilt.yaw - caseYaw) * 0.15;
    }
    swayT += dt;
    const swayY = (sway && !REDUCE) ? DEG(10) * Math.sin(swayT * (Math.PI * 2) / 16) : 0;
    rig.rotation.x = casePitch;
    yawObj.rotation.y = faceYaw + caseYaw + swayY;

    refreshFrame();
    if (REDUCE && !hinge.drag) { hinge.omega = 0; } else hinge.advance(dt);
    applyHinge();
    placeCamera();

    motorOn = !REDUCE && hinge.theta > hinge.thetaOpen * 0.6 && !discDragging;
    if (discSpinner) {
      if (motorOn) discOmega += ((Math.PI * 2 / 12) - discOmega) * Math.min(1, 0.9 * dt);
      discOmega *= Math.exp(-0.15 * dt);
      discSpinner.rotation.z += discOmega * dt;
    }

    renderer.render(scene, camera);
    frames++;
    if (!fpsT0) fpsT0 = now;
    else if (now - fpsT0 >= 500) {
      fps = +(frames * 1000 / (now - fpsT0)).toFixed(1);
      diag.fps = fps; frames = 0; fpsT0 = now;
    }
    if (pending > 0) pending--;
    if (!busy()) { running = false; cancelAnimationFrame(raf); }
  }

  let visible = true;
  if ('IntersectionObserver' in window && SLIDE) {
    visible = false;
    new IntersectionObserver(es => es.forEach(en => {
      visible = en.isIntersecting;
      if (visible) wake(); else { running = false; cancelAnimationFrame(raf); }
    }), { threshold: 0.12 }).observe(SLIDE);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); } else wake();
  });
  new ResizeObserver(() => { if (diag.ok) { size(); wake(); } }).observe(HOST);

  /* -------------------------------------------------------------- the input */
  const el = renderer.domElement;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane();
  let dragging = false, dragCase = false, discDragging = false;
  let px = 0, py = 0, moved = 0, downAt = 0, lastMove = 0, discTanVel = 0;

  function setNDC(e) {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  }
  function pointerTheta() {
    plane.setFromNormalAndCoplanarPoint(hinge.axisW, hinge.hingeW);
    const hit = ray.ray.intersectPlane(plane, new THREE.Vector3());
    if (!hit) return null;
    const v = hit.sub(hinge.hingeW);
    v.sub(hinge.axisW.clone().multiplyScalar(v.dot(hinge.axisW)));
    if (v.lengthSq() < 1e-9) return null;
    const ref = hinge.comAt(0).sub(hinge.hingeW);
    ref.sub(hinge.axisW.clone().multiplyScalar(ref.dot(hinge.axisW))).normalize();
    const a = signedAngle(ref, v.normalize(), hinge.axisW) * hinge.sign;
    return THREE.MathUtils.clamp(a, 0, hinge.thetaOpen);
  }

  el.addEventListener('pointerdown', e => {
    if (!diag.ok) return;
    dragging = true; px = e.clientX; py = e.clientY; moved = 0;
    downAt = performance.now(); lastMove = downAt;
    sway = false;
    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';
    setNDC(e);
    const onLid = ray.intersectObjects(lidMeshes, false).length > 0;
    const onDisc = disc ? ray.intersectObject(disc, false).length > 0 : false;
    if (onDisc && !onLid) { discDragging = true; discTanVel = 0; }
    else if (onLid) { hinge.drag = { target: hinge.theta, k: hinge.kDrag, c: hinge.cDrag }; }
    else { dragCase = true; }
    wake();
  });

  el.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - px, dy = e.clientY - py;
    const now = performance.now(), dtm = Math.max(8, now - lastMove) / 1000;
    px = e.clientX; py = e.clientY; lastMove = now;
    moved += Math.abs(dx) + Math.abs(dy);
    setNDC(e);
    if (hinge.drag) {
      const t = pointerTheta();
      if (t !== null) hinge.drag.target = t;
    } else if (discDragging) {
      discTanVel = (dx * 0.03) / dtm;
      discOmega = THREE.MathUtils.clamp(discTanVel, -40, 40);
    } else if (dragCase) {
      caseYaw += dx * 0.008;
      casePitch = THREE.MathUtils.clamp(casePitch + dy * 0.006, -DEG(55), DEG(55));
      yawVel = (dx * 0.008) / dtm;
      pitchVel = (dy * 0.006) / dtm;
    }
    wake();
  });

  function up(e) {
    if (!dragging) return;
    dragging = false; el.style.cursor = 'grab';
    try { el.releasePointerCapture(e.pointerId); } catch (_) {}
    const quick = performance.now() - downAt < 500;
    if (moved < 6 && quick) tap();
    hinge.drag = null;              /* release keeps omega: a flick follows through */
    dragCase = false; discDragging = false;
    wake();
  }
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);

  function tap() {
    const open = hinge.theta < hinge.thetaOpen * 0.5;
    if (REDUCE) { hinge.theta = open ? hinge.thetaOpen : 0; hinge.omega = 0; applyHinge(); return; }
    hinge.omega = open ? hinge.tap : -hinge.tap;
  }
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', 'the jewel case — tap to open, drag to turn');
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sway = false; tap(); wake(); }
  });

  /* ------------------------------------------------------------------ tilt */
  const tilt = { on: false, pitch: 0, yaw: 0 };
  if (TILT_BTN) {
    if (REDUCE) TILT_BTN.hidden = true;
    TILT_BTN.addEventListener('click', async () => {
      if (tilt.on) { tilt.on = false; TILT_BTN.setAttribute('aria-pressed', 'false'); return; }
      try {
        const D = window.DeviceOrientationEvent;
        if (D && typeof D.requestPermission === 'function') {
          const r = await D.requestPermission();
          if (r !== 'granted') { diag.tilt = 'denied'; return; }
        }
        window.addEventListener('deviceorientation', ev => {
          if (!tilt.on) return;
          tilt.pitch = THREE.MathUtils.clamp(DEG((ev.beta || 0) - 45), -DEG(55), DEG(55));
          tilt.yaw = DEG(THREE.MathUtils.clamp(ev.gamma || 0, -60, 60));
          sway = false; wake();
        });
        tilt.on = true; TILT_BTN.setAttribute('aria-pressed', 'true');
        diag.tilt = 'on'; wake();
      } catch (e) { diag.tilt = 'error: ' + e; }
    });
  }

  /* ------------------------------------------------- the measurement surface */
  diag.phys = hinge;
  diag.setCase = (pitchDeg, yawDeg) => {
    casePitch = DEG(pitchDeg); caseYaw = DEG(yawDeg);
    pitchVel = yawVel = 0; sway = false;
    rig.rotation.x = casePitch; yawObj.rotation.y = faceYaw + caseYaw;
    refreshFrame();
  };
  /* park the case in an exact pose and draw one frame — for stills */
  diag.pose = (o) => {
    const p = Object.assign({ theta: 0, pitch: 0, yaw: 0, spin: 0 }, o || {});
    sway = false; motorOn = false; discOmega = 0;
    hinge.theta = DEG(p.theta); hinge.omega = 0; hinge.drag = null;
    if (discSpinner) discSpinner.rotation.z = DEG(p.spin);
    diag.setCase(p.pitch, p.yaw);
    applyHinge();
    size();
    renderer.render(scene, camera);
    return { theta_deg: +RAD(hinge.theta).toFixed(2), pitch: p.pitch, yaw: p.yaw,
             calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
  };
  diag.sim = (opts) => {
    const o = Object.assign({ theta: 0, omega: 0, pitch: 0, yaw: 0, seconds: 2, hz: 240 }, opts);
    diag.setCase(o.pitch, o.yaw);
    hinge.theta = DEG(o.theta); hinge.omega = o.omega; hinge.drag = null;
    const h = 1 / o.hz, n = Math.round(o.seconds * o.hz), log = [];
    for (let i = 0; i < n; i++) {
      hinge.step(h);
      if (i % Math.round(o.hz / 120) === 0)
        log.push([+(i * h).toFixed(4), +RAD(hinge.theta).toFixed(3), +hinge.omega.toFixed(3)]);
    }
    applyHinge();
    return { log, theta_end_deg: +RAD(hinge.theta).toFixed(3), omega_end: +hinge.omega.toFixed(4) };
  };
  diag.tauCurve = (pitchDeg) => {
    diag.setCase(pitchDeg, 0);
    const out = [];
    for (let d = 0; d <= RAD(hinge.thetaOpen); d += 5)
      out.push([d, +hinge.gravityTorque(DEG(d)).toFixed(4)]);
    return out;
  };
  diag.setParams = (p) => {
    const h = hinge;
    if (p.g !== undefined) { h.g = p.g; h.calibrate(); }
    if (p.c !== undefined) h.cVisc = p.c;
    if (p.rest !== undefined) h.rest = p.rest;
    if (p.tap !== undefined) h.tap = p.tap;
    if (p.seatK !== undefined) h.seat = p.seatK * h.tauMax;
    if (p.musK !== undefined) h.mus = p.musK * h.tauMax;
    if (p.mukK !== undefined) h.muk = p.mukK * h.tauMax;
    return { g: h.g, c: h.cVisc, rest: h.rest, tap: h.tap, tauMax: +h.tauMax.toFixed(4),
             mus: +h.mus.toFixed(4), muk: +h.muk.toFixed(4), seat: +h.seat.toFixed(4),
             kDetent: +h.kDetent.toFixed(4) };
  };
  diag.camZ = () => camera.position.z;
  diag.radiusNow = () => fitNow();
  diag.renderOnce = () => { refreshFrame(); applyHinge(); renderer.render(scene, camera); };
  diag.info = () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles });
  /* ---- probe hooks: these exist so the look can be attributed by measurement
     rather than argued about. Each one changes exactly one term. ---------- */
  diag.forEach = (which, fn) => {
    let n = 0;
    root.traverse(o => {
      if (!o.isMesh || !o.material) return;
      const hit = which === 'all'
        || (which === 'clear' && IS_CLEAR(o.name))
        || (which === 'cover' && IS_COVER(o.name))
        || o.name === which;
      if (!hit) return;
      fn(o.material); o.material.needsUpdate = true; n++;
    });
    return n;
  };
  diag.env = (v) => { scene.environmentIntensity = v; return v; };
  diag.bg = (hex) => { scene.background = new THREE.Color(hex); return hex; };
  diag.noShadow = () => { renderer.shadowMap.enabled = false; ground.visible = false; };
  diag.clearToBlack = () => diag.forEach('clear', m => {
    m.transmission = 0; m.color.setHex(0x000000); m.roughness = 1; m.metalness = 0;
  });
  diag.key = (v) => { key.intensity = v; return v; };
  diag.hideClear = (on) => {
    let n = 0;
    root.traverse(o => { if (o.isMesh && IS_CLEAR(o.name)) { o.visible = !on; n++; } });
    return n;
  };
  diag.setTransmission = (on) => {
    root.traverse(o => {
      if (!o.isMesh || !o.material) return;
      if (o.userData.t === undefined) o.userData.t = o.material.transmission || 0;
      o.material.transmission = on ? o.userData.t : 0;
      o.material.needsUpdate = true;
    });
  };
}

if (HOST) boot();
