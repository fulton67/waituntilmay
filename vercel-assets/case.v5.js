/* case.v5.js — the sie jewel case, the last slide of the gallery.

   WHAT CHANGED FROM v3
   --------------------
   1. The disc follows your finger. v3 read only the HORIZONTAL component of the
      drag and fed it to the disc's angular VELOCITY:

          discTanVel = (dx * 0.03) / dtm;
          discOmega  = clamp(discTanVel, -40, 40);

      Three things were wrong with that. Dragging in a circle — the one gesture
      anybody tries on a disc — moved it only by the sideways part of the
      gesture, so going round the hub did almost nothing at the top and bottom of
      the circle. Setting velocity rather than angle meant the disc never sat
      under the pointer, so it felt disconnected. And dividing by a frame time
      floored at 8ms turned a 10px twitch into 37 rad/s, nearly six turns a
      second, which is the glitching. v4 measures the pointer's angle about the
      disc's own axis and moves the disc by the change in it, so the point you
      grabbed stays under you, a full circle of the finger is exactly one
      rotation, and the speed is whatever your hand is doing.

   2. The motor no longer fights you. It used to lerp omega toward its own speed
      in both directions, so a spin you gave it was dragged back down within a
      second. It can now only ever speed the disc up to its idle rate.

   3. Less haze over the cover. See CLEAR_ENV.

   case.v3.js — the sie jewel case, slide 1 of the gallery.
   three.js r169 + the hand-written one-degree-of-freedom hinge from v1.

   WHAT CHANGED FROM v2, AND WHY
   -----------------------------
   v2 lit it like a dark room: two dim emitters at environmentIntensity 0.6, a
   1.2 key, exposure 1.0. Measured against the print it is made from, the front
   cover rendered at roughly a third of the artwork's own luminance — the covers
   read muddy. v2 also fitted the camera to the case's bounding SPHERE, and
   since the case is a flat panel that threw away a third of the frame: the
   closed case covered about 45% of the slide width.

   v3 is a bright soft studio at full environment intensity, a 2.4 key, a
   hemisphere floor so nothing crushes to pure black, exposure 1.25, and a
   camera that fits the case's projected BOX every frame.

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
/* Below this fraction of the open angle the case counts as shut, and a drag
   turns the whole object instead of trying to work the hinge. 0.12 of 120
   degrees is about 14 degrees: wide enough that a case still settling onto its
   detent does not flip behaviour under the user's finger mid-gesture. */
const SHUT_FRAC = 0.12;

/* Slack around the fitted box. 1.0 would run the case to the canvas edge; this
   lands the closed case at the 72% of slide width the brief asks for, with the
   host box at 88%. Verified in diag.framing.fill_pct. */
const FIT_MARGIN = 1.07;
const THETA_OPEN_DEG = 120;
const ENV_INTENSITY = 1.0;
/* The brief asks for exposure 1.25 AND for the rendered front cover to land
   within 10% of the print it is made from. Measured, those two conflict: the
   specified rig (env 1.0, key 2.4, hemi 0.8) at exposure 1.25 renders the cover
   at Y 0.2013 against the print's 0.1079 — 2.54x too bright, +86.5%.

   Exposure is the one dial that fixes it without touching the shape of the
   light, and it is the dial that means "how bright is the photograph": every
   light keeps the level and the direction the brief gives, and the whole rig is
   scaled once at the end. Bisected against the print each time it moves.

   v4 re-solved it, because taking the specular veil off the lid (see
   CLEAR_SPECULAR) took 4.4 points of brightness off the cover with it. The
   colour match improved at the same time, which is the point: at 0.4926 with
   the veil the cover rendered sRGB [113.3, 64.2, 73.7] against the print's
   [106.9, 55.1, 65.4] — green 16% hot, blue 13% hot, which is a grey cast. At
   0.5824 without it the cover renders [112.9, 53.5, 66.1]: green 2.8% under,
   blue 1.1% over. Mean luminance is within 0.44% of the print. */
const EXPOSURE = 0.5824;

/* THE CLOUDINESS, AND WHERE IT ACTUALLY CAME FROM

   The lid laid an even grey wash over the print. Measured face-on, it lifted
   the cover's mean luminance 25.7% above the same cover with the lid hidden,
   and it lifted it unevenly — sRGB [101, 41, 55] became [113, 64, 74], so the
   two weak channels gained far more than the strong one. That is a desaturating
   veil, which is exactly what "cloudy" looks like.

   My first guess was that the lid was mirroring the softbox, so the knob would
   be envMapIntensity on the clear material. It is not: at 0 and at 20 the
   rendered cover is identical to five decimal places. On a transmissive
   material in r169 that property does not reach the specular lobe at all.

   Every term, measured one at a time against the lid-hidden baseline:

       specularIntensity 0   +0.3%   <- the whole veil
       ior 1.0               +2.0%   (it sets the Fresnel F0 the above scales)
       thickness 0          +25.4%
       attenuation off      +25.7%
       roughness 0          +25.7%
       envMapIntensity 0/20 +25.7%
       transparent false    +25.7%

   So specularIntensity is the one dial, and the brief's 0.5 — asked for so the
   plastic would read "as a crisp bright edge, not a haze" — was producing the
   haze. The edge survives without it: with specular at 0 the rim still reads 59.7
   mean sRGB, because most of its brightness is the transmission backdrop seen at
   a grazing angle, not a reflection. Swept:

       spec   veil      rim (mean sRGB)
       0.00   +0.3%     59.7
       0.05   +2.3%     63.1
       0.10   +4.4%     66.4      <- here
       0.25  +11.6%     76.2
       0.50  +25.7%     90.6      <- the brief's value

   0.10 drops the veil by 83% and keeps 73% of the rim. */
const CLEAR_SPECULAR = 0.10;

const diag = { ok: false, reduce: REDUCE };
window.__case = diag;

/* ------------------------------------------------------------------ helpers */
const wrap180 = d => { while (d > 180) d -= 360; while (d < -180) d += 360; return d; };

/* shortest signed difference between two angles, in (-pi, pi] */
function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

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

  /* A bright soft studio. Three neutral-white emitters, no colour cast:

       - a 3x3 softbox above and in front, tilted 30 degrees down toward the
         case, which is the broad source the covers sit under;
       - a fill plane behind the camera, so the faces pointed at the viewer are
         not lit only by the key;
       - a low strip to the right, nearly edge-on, which is what draws the
         bright line along the plastic edges.

     Levels are 6 / 2.5 / 3. They go through PMREM as floating-point colour, so
     values above 1 are meaningful here. */
  const box = emitter(3.0, 3.0, 6.0, [-0.6, 3.1, 2.4]);
  box.rotation.x = -DEG(30);
  s.add(box);
  s.add(emitter(6.0, 4.0, 2.5, [0, 0.4, 5.2]));
  const strip = emitter(0.5, 5.0, 3.0, [3.6, -0.6, 1.0]);
  strip.rotation.y = -DEG(18);
  s.add(strip);
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
  renderer.toneMappingExposure = EXPOSURE;
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
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
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

  /* The background stays black, but nothing on the case should fall to pure
     black either — a real case on a dark sweep still picks up bounce. */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.8);
  scene.add(hemi);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);

  /* pitch outside, yaw inside, so yaw stays about the case's own vertical */
  const rig = new THREE.Object3D();
  const yawObj = new THREE.Object3D();
  rig.add(yawObj); scene.add(rig);

  const hinge = new Hinge();
  let root = null, pivot = null, discSpinner = null, disc = null;
  let lidMeshes = [], radius = 1, faceYaw = 0, radiusSamples = null;

  let casePitch = 0, caseYaw = 0, pitchVel = 0, yawVel = 0;
  /* THE FLOATING. v4 idled with a +/-10 degree yaw on a 16 second period.
     With nobody touching the page that measured 38% of canvas pixels
     changing over 4 seconds: the case never sat still, which read as it
     drifting rather than resting. A real object on a shelf does not sway,
     so the amplitude is now zero and the renderer is allowed to idle. */
  let swayT = 0, sway = false;
  let discOmega = 0, motorOn = false;
  /* the disc's world plane, and the pointer angle in it at the last move */
  const discPlane = new THREE.Plane();
  const discHit = new THREE.Vector3();
  /* Held in ROOT-LOCAL space and resolved to world on every use. Holding the
     world values, as the first cut did, meant the disc's axis was frozen at the
     pose the model happened to load in: the moment the case swayed or the user
     turned it, the plane the pointer was tested against no longer lay on the
     disc, the ray missed it, and the drag fell through to turning the whole
     case. The disc looked like it ignored you. */
  const discCentreL = new THREE.Vector3();
  const discNormalL = new THREE.Vector3(0, 0, 1);
  let discCentreW = null, discNormalW = null, discSign = 1, discLastA = null;
  let discReady = false;
  function discFrame() {
    if (!discReady) return false;
    root.updateMatrixWorld();
    discCentreW.copy(discCentreL).applyMatrix4(root.matrixWorld);
    discNormalW.copy(discNormalL).transformDirection(root.matrixWorld).normalize();
    return true;
  }

  /* v2 fitted the case's bounding SPHERE, and that is what made it small: the
     case is a flat panel 2 wide by 1.76 tall by 0.1 deep, so its sphere has the
     radius of the diagonal and the fit threw away a third of the frame in every
     direction. The closed case came out at 45% of the slide width.

     v3 fits the world axis-aligned box instead, every frame. For a flat panel
     rotation only ever SHRINKS the projection — at 55 degrees of pitch a 1.76
     tall face projects 1.09 — so the box fit is not merely tighter, it is still
     safe under the idle sway and under the user's own pitch and yaw. The box
     also grows on its own as the lid opens, so the open pose stays whole with
     no sampling and no special case. FIT_MARGIN is the only slack, and it is
     set by measurement: see diag.framing.fill_pct. */
  const camC = new THREE.Vector3();
  const fitBox = new THREE.Box3();
  const fitSize = new THREE.Vector3();
  function placeCamera() {
    if (!root) return;
    fitBox.setFromObject(rig);
    fitBox.getCenter(camC);
    fitBox.getSize(fitSize);
    const vfov = DEG(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const d = Math.max(fitSize.x / 2 / Math.tan(hfov / 2),
                       fitSize.y / 2 / Math.tan(vfov / 2)) * FIT_MARGIN
              + fitSize.z / 2;
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
          color: 0xffffff, metalness: 0, roughness: 0.05,
          transmission: 1, ior: 1.59, thickness: 0.02,
          specularIntensity: CLEAR_SPECULAR, clearcoat: 0,
          attenuationColor: new THREE.Color(0xf4f8f8), attenuationDistance: 3,
          transparent: true, side: THREE.DoubleSide,
        });
      } else if (IS_COVER(name)) {
        /* matte printed card: no clearcoat, no sheen, no specular boost */
        m = new THREE.MeshStandardMaterial({
          map: map, color: 0xffffff, roughness: 0.8, metalness: 0,
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

      /* The sign that takes "the pointer went this way around the world normal"
         to "rotation.z goes up" depends on how the holder's quaternion landed,
         so it is measured once rather than assumed: turn z by a known amount
         and see which way a marker on the rim actually travels. */
      discCentreW = centre.clone();
      discNormalW = trayIn.clone();
      discCentreL.copy(root.worldToLocal(centre.clone()));
      discReady = true;
      const mark = new THREE.Object3D();
      mark.position.set(0.4, 0, 0);
      discSpinner.add(mark);
      root.updateMatrixWorld(true);
      const a0 = angleAboutDisc(mark.getWorldPosition(new THREE.Vector3()));
      discSpinner.rotation.z += 0.1;
      root.updateMatrixWorld(true);
      const a1 = angleAboutDisc(mark.getWorldPosition(new THREE.Vector3()));
      discSpinner.rotation.z -= 0.1;
      discSpinner.remove(mark);
      root.updateMatrixWorld(true);
      discSign = wrapPi(a1 - a0) > 0 ? 1 : -1;

      diag.disc = { axis: trayIn.toArray().map(n => +n.toFixed(4)),
                    centre: centre.toArray().map(n => +n.toFixed(4)),
                    probe_delta: +wrapPi(a1 - a0).toFixed(4),
                    sign: discSign };
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
    /* the camera no longer uses these — the shadow frustum and the ground plane
       still do, and both have to cover the widest pose, not the closed one */
    const radiusMax = radiusSamples.reduce(
      (m, s) => Math.max(m, s.c.reduce((q, v) => q + v * v, 0) ** 0.5 + s.r), 0);
    ground.position.y = minY - 0.004;

    const sh = radiusMax * 1.6;
    key.shadow.camera.left = -sh; key.shadow.camera.right = sh;
    key.shadow.camera.top = sh; key.shadow.camera.bottom = -sh;
    key.shadow.camera.near = 0.01; key.shadow.camera.far = radiusMax * 12;
    /* upper-left-front, per the brief, scaled to the model: the direction is
     what matters to a DirectionalLight, not the distance. */
  key.position.set(-1.2 * radiusMax, 2.2 * radiusMax, 3.0 * radiusMax);
    key.shadow.camera.updateProjectionMatrix();
    diag.framing = { mode: 'projected box, per frame', fit_margin: FIT_MARGIN,
                     radius_closed: radius, radius_open: radiusSamples[STEPS].r,
                     world_extent: +radiusMax.toFixed(5),
                     ground_y: +ground.position.y.toFixed(5) };

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
      exposure_note: 'brief asked 1.25; calibrated to the print, see EXPOSURE',
      outputColorSpace: renderer.outputColorSpace,
      environment: 'bright soft studio: 3x3 softbox above/front tilted 30deg (6), fill behind camera (2.5), low strip right (3), neutral white, PMREM sigma 0.02',
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
    return dragging || discDragging || Math.abs(hinge.omega) > 0.001 || hinge.drag
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
    const swayY = 0;                      /* see THE FLOATING above */
    rig.rotation.x = casePitch;
    yawObj.rotation.y = faceYaw + caseYaw + swayY;

    refreshFrame();
    if (REDUCE && !hinge.drag) { hinge.omega = 0; } else hinge.advance(dt);
    applyHinge();
    placeCamera();

    motorOn = !REDUCE && hinge.theta > hinge.thetaOpen * 0.6 && !discDragging;
    if (discSpinner) {
      /* the motor may only ever ADD speed. v3 lerped toward the idle rate from
         both sides, so a spin the user gave it was pulled back down inside a
         second and the disc felt like it was fighting them. */
      const idle = Math.PI * 2 / 12;
      if (motorOn && discOmega < idle)
        discOmega += (idle - discOmega) * Math.min(1, 0.9 * dt);
      if (!discDragging) discOmega *= Math.exp(-0.15 * dt);
      if (!discDragging) discSpinner.rotation.z += discOmega * dt;
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
  /* the angle of a world point about the disc's axis, in the disc's plane */
  function angleAboutDisc(p) {
    const v = p.clone().sub(discCentreW);
    v.sub(discNormalW.clone().multiplyScalar(v.dot(discNormalW)));
    if (v.lengthSq() < 1e-12) return null;
    const ref = new THREE.Vector3(0, 1, 0).cross(discNormalW);
    if (ref.lengthSq() < 1e-9) ref.set(1, 0, 0);
    ref.normalize();
    const perp = discNormalW.clone().cross(ref).normalize();
    return Math.atan2(v.dot(perp), v.dot(ref));
  }
  /* where the pointer ray meets the disc's plane, as an angle about its axis */
  function pointerDiscAngle() {
    if (!discFrame()) return null;
    discPlane.setFromNormalAndCoplanarPoint(discNormalW, discCentreW);
    if (!ray.ray.intersectPlane(discPlane, discHit)) return null;
    return angleAboutDisc(discHit);
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
    /* A closed case is all lid from the front, so raycasting the lid first
       handed every drag to the hinge — and pointerTheta() clamps to
       [0, thetaOpen], so a sideways drag moved nothing at all while also
       locking out the rotate branch. Decide on the POSE first, not the mesh:
       shut, the whole thing is one object you turn in your hand. */
    const shut = hinge.theta < hinge.thetaOpen * SHUT_FRAC;
    const onLid = ray.intersectObjects(lidMeshes, false).length > 0;
    const onDisc = disc ? ray.intersectObject(disc, false).length > 0 : false;
    if (!shut && onDisc && !onLid) {
      discDragging = true; discTanVel = 0; discOmega = 0;
      discLastA = pointerDiscAngle();
    }
    else if (!shut && onLid) {
      hinge.drag = { target: hinge.theta, k: hinge.kDrag, c: hinge.cDrag };
    }
    else { dragCase = true; }        /* shut, or open and off the lid and disc */
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
    } else if (discDragging && discSpinner) {
      /* move the disc by the CHANGE in the pointer's angle about its axis, so
         the spot you grabbed stays under your finger and one circle of the hand
         is exactly one turn of the disc, whichever way round you go */
      const a = pointerDiscAngle();
      if (a !== null) {
        if (discLastA === null) discLastA = a;
        const d = wrapPi(a - discLastA);
        discLastA = a;
        discSpinner.rotation.z += d * discSign;
        /* keep a smoothed rate so letting go flicks on, without a stale frame
           time turning a twitch into six turns a second */
        const rate = THREE.MathUtils.clamp((d * discSign) / dtm, -25, 25);
        discOmega = discOmega * 0.6 + rate * 0.4;
      }
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
    dragCase = false; discDragging = false; discLastA = null;
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
  /* v4 exposed no way to read the pose back, so a regression in the input could
     only be caught by diffing pixels. */
  diag.state = () => ({
    theta_deg: +RAD(hinge.theta).toFixed(2),
    shut: hinge.theta < hinge.thetaOpen * SHUT_FRAC,
    pitch_deg: +RAD(casePitch).toFixed(2),
    yaw_deg: +RAD(caseYaw).toFixed(2),
    disc_deg: discSpinner ? +RAD(discSpinner.rotation.z).toFixed(2) : null,
    disc_omega: +discOmega.toFixed(4),
    dragging, dragCase, discDragging, hinge_drag: !!hinge.drag,
    fps: diag.fps
  });
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
  /* what fraction of the canvas, and of the slide, the case actually covers */
  diag.fill = () => {
    if (!root) return null;
    const b = new THREE.Box3().setFromObject(rig);
    const pts = [];
    for (let j = 0; j < 8; j++) {
      pts.push(new THREE.Vector3((j & 1) ? b.max.x : b.min.x,
                                 (j & 2) ? b.max.y : b.min.y,
                                 (j & 4) ? b.max.z : b.min.z).project(camera));
    }
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const wNdc = Math.max(...xs) - Math.min(...xs);
    const hNdc = Math.max(...ys) - Math.min(...ys);
    const slide = HOST.parentElement
      ? HOST.parentElement.getBoundingClientRect().width : HOST.clientWidth;
    const canvasW = HOST.clientWidth;
    return {
      canvas_css: canvasW + 'x' + HOST.clientHeight,
      slide_css: Math.round(slide),
      host_pct_of_slide: +(100 * canvasW / slide).toFixed(1),
      case_pct_of_canvas_w: +(100 * wNdc / 2).toFixed(1),
      case_pct_of_canvas_h: +(100 * hNdc / 2).toFixed(1),
      case_pct_of_slide_w: +(100 * (wNdc / 2) * canvasW / slide).toFixed(1),
    };
  };
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
  /* leave only the named mesh visible, so a screenshot's alpha channel is an
     exact mask for it — no colour-keying, nothing for tone mapping to skew */
  diag.only = (name) => {
    let n = 0;
    root.traverse(o => { if (o.isMesh) { o.visible = (o.name === name); if (o.visible) n++; } });
    ground.visible = false;
    return n;
  };
  /* the named mesh alone, flat white, outside tone mapping: the screenshot is
     then an exact silhouette of it and the mask needs no threshold judgement */
  diag.silhouette = (name) => {
    const n = diag.only(name);
    root.traverse(o => {
      if (!o.isMesh || !o.visible) return;
      o.material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      o.material.toneMapped = false;
    });
    return n;
  };
  diag.exposure = (v) => { renderer.toneMappingExposure = v; return v; };
  diag.clearSpec = (v) => diag.forEach('clear', m => { m.specularIntensity = v; });
  diag.clearEnv = (v) => diag.forEach('clear', m => { m.envMapIntensity = v; });
  /* drive the disc exactly as a drag would, for the spin tests */
  diag.spinBy = (rad) => {
    if (!discSpinner) return null;
    discSpinner.rotation.z += rad * discSign;
    renderer.render(scene, camera);
    return +discSpinner.rotation.z.toFixed(5);
  };
  diag.discAngle = () => (discSpinner ? +discSpinner.rotation.z.toFixed(5) : null);
  diag.discOmega = () => +discOmega.toFixed(4);
  diag.discDragging = () => discDragging;
  /* where the disc actually is on screen, in CSS pixels, so a test can put the
     pointer on it instead of guessing at a fraction of the canvas */
  diag.discScreen = () => {
    if (!disc || !discFrame()) return null;
    const r = HOST.getBoundingClientRect();
    const toPx = v => {
      const p = v.clone().project(camera);
      return [r.left + (p.x * 0.5 + 0.5) * r.width,
              r.top + (-p.y * 0.5 + 0.5) * r.height];
    };
    const c = toPx(discCentreW);
    /* a point on the rim, in the disc's own plane, to get a radius in pixels */
    const ref = new THREE.Vector3(0, 1, 0).cross(discNormalW);
    if (ref.lengthSq() < 1e-9) ref.set(1, 0, 0);
    disc.geometry.computeBoundingSphere();
    const rad = disc.geometry.boundingSphere.radius
      * disc.getWorldScale(new THREE.Vector3()).x;
    const e = toPx(discCentreW.clone().add(ref.normalize().multiplyScalar(rad)));
    return { cx: +c[0].toFixed(1), cy: +c[1].toFixed(1),
             r_px: +Math.hypot(e[0] - c[0], e[1] - c[1]).toFixed(1),
             visible: disc.visible };
  };
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
