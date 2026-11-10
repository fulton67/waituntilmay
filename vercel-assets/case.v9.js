/* case.v9.js — the sie jewel case, the first slide of the gallery.

   WHAT CHANGED FROM v8
   --------------------
   THE EDGES ARE SOLID. "If I'm looking at it from the bottom I don't want to
   see inside the CD ... making it a bit more thick where it feels more
   physical." The reflection-only shell is right for the two big faces -- it
   is why the cover is clean -- but on the walls it meant there was nothing
   there at all: tip the case and you looked straight in between the lid and
   the tray. The walls (top, bottom, both ends, the hinge arms) are a second
   material now: smoked, nearly opaque, glossy plastic. It hides the inside,
   it catches the same studio as the faces, and it gives the case an outline
   you can read as a jewel case from any angle. sie-case-v9.glb makes those
   walls twice as thick and the case 15 mm deep.


   WHAT CHANGED FROM v7  (asked for after seeing v7 live)
   --------------------
   1. THE EMOJI SIDE IS THE FRONT. sie-case-v8.glb carries the emoji cover on
      the lid and the om cover on the tray card (tools/case/corners.json).
   2. IT TURNS. One full turn as it arrives, then a slow steady spin whenever
      nobody has touched it for a few seconds. Any touch stops it at once.
   3. THE PLASTIC SHOWS. v7's shell was clean to the point of vanishing ("you
      almost can't tell it's a render"). Its studio has wider strips and two
      soft boxes off to the sides now, so the lid carries a moving sheen as
      the case turns -- still nothing on the camera axis, so face-on the
      cover is as clean as v7 measured it.
   4. A HINT. "tap to open - drag to turn", under the case, until it is used.
   5. THICKER: 14 mm deep instead of a true 10.4 (built into the model).
   6. A tap no longer flashes or selects the picture on a phone.


   WHAT CHANGED FROM v6
   --------------------
   1. THE WHITE FILM. Measured on v6 (tools/case/diagnose_v6*.py): the clear
      shell was a white-based transmissive slab, so every wall rendered as
      milky grey, and its studio had a 6x4 fill panel directly BEHIND THE
      CAMERA -- which is exactly what a flat lid mirrors when it faces you.
      With the lid open, switching the lid's reflection off removed about half
      of the lifted pixels.

      So the studio is rebuilt the way glossy packaging is photographed: big
      soft sources above and to the sides, nothing on the camera axis. And the
      plastic no longer has a base colour at all. It is a black, glossy,
      ior-1.59 shell drawn ADDITIVELY: it can add a reflection, it cannot add a
      film. (Thin transmission is kept as PLASTIC 'B' and measured against it.)

   2. THE CASE ITSELF. sie-case-v7.glb is built by tools/case/build_glb.mjs to
      a real case's dimensions -- 142 x 125 x 10.4 mm, 1.3 mm walls with a
      0.4 mm edge radius, hinge arms and pins, four half-moon booklet tabs, a
      twelve-prong hub, a tray with a disc well and the ribbed strip. The
      rounding is in the geometry now, not rebuilt at load.

   3. THE COVERS come from the product photos, flattened (tools/case/
      make_textures.py), and the light is calibrated so the rendered cover
      lands within 10% of the print: Neutral tone mapping, exposure 1.0, one
      dial (ENV_INTENSITY).

   4. THE HINGE is a real one: pin friction holds the lid wherever you leave
      it, a detent snaps it shut inside 8 degrees, a tap is a lightly damped
      spring, a drag is 1:1 under the finger, and a flick coasts and bounces
      off the 180 degree stop. No gravity: the lid weighs under 20 g.

   Kept from v6: the gesture decision (nothing commits before 8 px), 360 spin,
   flick to flip, tilt as an offset, shake to spin, the disc under your finger.

   Measurement hooks live on window.__case ONLY with ?casedebug=1. */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const HOST = document.getElementById('case3d');
const SLIDE = HOST && HOST.closest('.slide');
const TILT_BTN = document.getElementById('case-tilt');
/* relative locally; on Webflow the host carries data-model="https://assets.sie.market/..." */
const MODEL = (HOST && HOST.dataset.model) || 'assets/case/sie-case-v9.glb';
const DEBUG = /[?&]casedebug=1/.test(location.search);

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEG = THREE.MathUtils.degToRad;
const RAD = THREE.MathUtils.radToDeg;

/* the parts, by the names the asset ships */
const IS_CLEAR = n => /^lid_(clear|wall|knuckle|tab)|^base_|_clear$/.test(n);
const IS_COVER = n => /^[A-E]_/.test(n);
/* the clear parts that are EDGES rather than faces: drawn solid (see WALL) */
const IS_WALL = n => /^lid_wall|^base_wall|^lid_knuckle/.test(n);
const IS_LABEL = n => n === 'F_disc_label';
const IS_UNDER = n => n === 'F_disc_under';
const IS_BLACK = n => n === 'tray_black' || n === 'hub';

/* Below this the case counts as shut: a drag turns the whole object unless
   it starts on the lid's free edge. */
const SHUT_DEG = 14;
const FIT_MARGIN = 1.02;

/* ---- the look. Every number here was set by tools/case/checks.py ---------- */
const EXPOSURE = 1.0;
const ENV_INTENSITY = 1.07;       /* the one calibration dial, 0.6 .. 1.8 */
const ENV_SIGMA = 0.04;
/* emitter levels of the procedural studio (float colour through PMREM) */
/* TWO STUDIOS, AND WHY. Measured: with one environment, the layout that keeps
   the lid clean (dark room, thin strips) lights the cover to 10% of the
   print's luminance; the layout that lights the cover to 94% puts a softbox
   in the lid that whites out the whole face at 25 degrees of pitch. A flat
   5%-mirror and a matte card cannot both be right under the same light, which
   is why a photographer flags the light off the glass. So:
     LIGHT    what the paper, tray and disc are lit by (scene.environment):
              an even dome. Measured, softboxes 60 degrees up lit the cover
              4x brighter when the case was tipped toward them; an even room
              gives a card the same irradiance whichever way it faces.
     REFLECT  what the clear plastic mirrors (its own envMap): near-black room,
              thin strips, small soft boxes. Nothing bright on the camera axis
              in either. */
const LIGHT = { room: 1.0, top: 0, topH: 3, front: 0, under: 0, side: 0, sideW: 0.2, rear: 0, camStrip: 0, camW: 0.3, soft: 0 };
const REFLECT = { room: 0.004, top: 3.0, topH: 0.35, front: 0, under: 0, side: 4.0, sideW: 0.12, rear: 0.8,
                  camStrip: 2.5, camW: 0.12, soft: 0.5 };
const REFLECT_INTENSITY = 1.25;
const PLASTIC = 'A';              /* 'A' reflection-only shell, 'B' thin transmission */
/* the walls: smoked plastic you cannot see through */
const WALL = { color: 0x23272b, opacity: 0.9, roughness: 0.16 };

/* ---- the hinge, in degrees ------------------------------------------------ */
const STOP_DEG = 180;             /* a real case has no stop; ours lies flat */
const TAP_OPEN_DEG = 160;
const FRICTION = 1200;            /* deg/s^2 of coasting deceleration */
const REST_SPEED = 5;             /* deg/s: below this the pin friction holds */
const DETENT_DEG = 8;
const DETENT_PULL = 900;          /* deg/s^2 toward shut inside the detent */
const DETENT_REST = 0.15;
const STOP_REST = 0.2;
const SPRING_PERIOD = 0.45;       /* s */
const SPRING_ZETA = 0.85;
const HELD_MAX_DPS = 900;       /* a held lid follows the finger no faster than this */

/* ---- the idle turn --------------------------------------------------------- */
const ARRIVE_TURN_S = 2.2;        /* one full turn as the case arrives */
const IDLE_AFTER_MS = 3500;       /* untouched this long, it starts to turn */
const IDLE_DPS = 16;              /* a turn every 22 seconds: a shelf display, not a spinner */

const diag = { ok: false, reduce: REDUCE };
if (DEBUG) window.__case = diag;

/* ------------------------------------------------------------------ helpers */
function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}
function worldCentre(obj) {
  return new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
}

/* THE STUDIO. A closed near-black room with soft emitters, baked through
   PMREM. The camera looks down -z from +z, and the environment is fixed in
   the world, so "behind the camera" is the +z direction: nothing bright is
   within 25 degrees of it. A flat lid facing the viewer mirrors exactly that
   patch, which is why it has to be dark. Two thin strips sit 40 degrees
   off-axis so a soft reflection slides across the lid as the case turns. */
function studioEnv(L) {
  const s = new THREE.Scene();
  const wall = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
  wall.color.setRGB(L.room, L.room, L.room);          /* linear level, not a hex colour */
  s.add(new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), wall));
  const emitter = (w, h, level, pos, look) => {
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    m.color.setRGB(level, level, level);              /* >1 is allowed: PMREM is float */
    if (!level) return null;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.lookAt(look ? new THREE.Vector3(look[0], look[1], look[2]) : new THREE.Vector3(0, 0, 0));
    s.add(mesh);
    return mesh;
  };
  /* overhead softbox, 4 x 3, three units up: the top walls and edges */
  emitter(4, L.topH, L.top, [0, 3, 0.6]);
  /* THE PAPER'S LIGHT. A card facing the camera is lit by the half of the
     room the camera is in, and the lid mirrors whatever sits on the camera
     axis -- so the big sources go 60 degrees above and below it, where a
     photographer puts them: they light the print and stay out of the lid
     until the case is tipped a long way. */
  if (L.front) emitter(5, 3, L.front, [0, Math.sin(DEG(60)) * 4, Math.cos(DEG(60)) * 4]);
  if (L.under) emitter(5, 2.5, L.under, [0, -Math.sin(DEG(60)) * 4, Math.cos(DEG(60)) * 4]);
  /* left and right strips, thin, 72 degrees round: the streak that crosses
     the lid as the case turns */
  for (const sx of [-1, 1]) emitter(L.sideW, 4, L.side, [sx * Math.sin(DEG(72)) * 4, 0, Math.cos(DEG(72)) * 4]);
  /* v8: two broad, dim boxes 58 degrees round. They are what gives the lid a
     soft sheen as the case turns -- the thing that says "plastic" between
     one bright streak and the next. Dim on purpose: 5% of 0.9 is a veil you
     can see through, not a white-out. */
  for (const sx of [-1, 1]) emitter(2, 3, L.soft, [sx * Math.sin(DEG(58)) * 4, 0.2, Math.cos(DEG(58)) * 4]);
  /* rear fill, behind the case */
  emitter(3, 2, L.rear, [0, 0.3, -4]);
  /* camera side: two thin strips at +/-40 degrees, and a dark axis between */
  for (const sx of [-1, 1]) {
    emitter(L.camW, 3, L.camStrip, [sx * Math.sin(DEG(40)) * 4, 0, Math.cos(DEG(40)) * 4]);
  }
  return s;
}

/* Multiply a soft dark frame into the outer edge of a cover texture, so the
   printed card reads as tucked into the plastic rather than floating level
   with it. Proportional: 0.4% of the short side, floor basePx. */
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
  out.flipY = false;                 /* GLTFLoader's convention; wrong = upside down */
  out.colorSpace = THREE.SRGBColorSpace;
  out.wrapS = tex.wrapS; out.wrapT = tex.wrapT;
  out.minFilter = tex.minFilter; out.magFilter = tex.magFilter;
  out.anisotropy = tex.anisotropy;
  out.needsUpdate = true;
  return { tex: out, band: band, w: w, h: h };
}

/* ===========================================================================
   THE HINGE. One degree of freedom, no physics engine. theta 0 = shut.
   Three modes:
     held    the finger owns theta; step() only records speed
     spring  a tap: a damped spring carries the lid to its target
     free    released: pin friction, the shut detent, the stops
   State is kept in radians because the rest of the file is; every constant
   above is in degrees because that is how a hinge is talked about.
   =========================================================================== */
class Hinge {
  constructor() {
    this.theta = 0; this.omega = 0;
    this.thetaOpen = DEG(STOP_DEG);
    this.mode = 'free';
    this.target = 0;
    this.locked = true;            /* seated in the detent */
    this.events = [];              /* 'click' | 'stop', for the tests */
    this.axisW = new THREE.Vector3(0, 1, 0);
    this.hingeW = new THREE.Vector3();
    this.hingeLocal = new THREE.Vector3();
    this.comPivot = new THREE.Vector3();
    this.parentM = new THREE.Matrix4();
    this.sign = -1;
    this.closedY = 0;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._one = new THREE.Vector3(1, 1, 1);
    this._up = new THREE.Vector3(0, 1, 0);
  }

  /* a point given in the pivot's frame, in world space, with the lid at theta */
  pointAt(local, theta) {
    this._q.setFromAxisAngle(this._up, this.closedY + this.sign * theta);
    this._m.compose(this.hingeLocal, this._q, this._one);
    return this._v.copy(local).applyMatrix4(this._m).applyMatrix4(this.parentM).clone();
  }
  comAt(theta) { return this.pointAt(this.comPivot, theta); }

  get moving() { return this.mode === 'spring' || Math.abs(this.omega) > 1e-6; }

  springTo(deg) { this.mode = 'spring'; this.target = DEG(deg); this.locked = false; }
  hold() { this.mode = 'held'; this.omega = 0; this.locked = false; }
  release(omega) { this.mode = 'free'; this.omega = omega || 0; }

  step(h) {
    if (this.mode === 'held') return;
    const stop = this.thetaOpen, detent = DEG(DETENT_DEG);

    if (this.mode === 'spring') {
      /* closing ends through the detent, not through the spring */
      if (this.target === 0 && this.theta < detent) { this.mode = 'free'; }
      else {
        const wn = 2 * Math.PI / SPRING_PERIOD;
        this.omega += (-wn * wn * (this.theta - this.target) - 2 * SPRING_ZETA * wn * this.omega) * h;
        this.theta += this.omega * h;
        if (Math.abs(this.theta - this.target) < DEG(0.15) && Math.abs(this.omega) < DEG(3)) {
          this.theta = this.target; this.omega = 0; this.mode = 'free';
        }
      }
    }

    if (this.mode === 'free') {
      if (this.locked) { this.theta = 0; this.omega = 0; return; }
      if (this.theta < detent) {
        /* the snap: it beats the pin friction, so friction is not applied here */
        this.omega -= DEG(DETENT_PULL) * h;
      } else if (this.omega !== 0) {
        const dv = DEG(FRICTION) * h;
        if (Math.abs(this.omega) <= dv || Math.abs(this.omega) < DEG(REST_SPEED)) this.omega = 0;
        else this.omega -= Math.sign(this.omega) * dv;
      }
      this.theta += this.omega * h;
    }

    if (this.theta <= 0) {
      this.theta = 0;
      if (this.mode !== 'spring' || this.target === 0) {
        if (this.omega < -DEG(20)) { this.omega = -this.omega * DETENT_REST; this.events.push('click'); }
        else { this.omega = 0; this.locked = true; this.mode = 'free'; this.events.push('seated'); }
      } else if (this.omega < 0) this.omega = 0;
    } else if (this.theta >= stop) {
      this.theta = stop;
      if (this.omega > 0) { this.omega = -this.omega * STOP_REST; this.events.push('stop'); }
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
  renderer.domElement.style.cssText =
    'display:block;width:100%;height:100%;touch-action:none;cursor:grab;outline:none;'
    /* a tap must not flash the grey-blue box iOS paints over anything tappable,
       and a long press must not offer to select or save "the image" */
    + '-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;'
    + '-webkit-user-select:none;user-select:none';
  HOST.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const levels = { light: Object.assign({}, LIGHT), reflect: Object.assign({}, REFLECT) };
  let reflectEnv = null, reflectIntensity = REFLECT_INTENSITY;
  function bakeEnv() {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const bake = L => {
      const envScene = studioEnv(L);
      const t = pmrem.fromScene(envScene, ENV_SIGMA).texture;
      envScene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
      return t;
    };
    const oldL = scene.environment, oldR = reflectEnv;
    scene.environment = bake(levels.light);
    reflectEnv = bake(levels.reflect);
    pmrem.dispose();
    if (oldL) oldL.dispose();
    if (oldR) oldR.dispose();
  }
  bakeEnv();
  scene.environmentIntensity = ENV_INTENSITY;

  /* THE BACKDROP (from v6). An unlit graded panel behind the case: it is not
     part of the environment, so it adds nothing to the covers, and its alpha
     reaches zero well inside the frame so the canvas never draws its own
     outline on the black page. */
  const backdrop = (() => {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(S * 0.5, S * 0.47, 0, S * 0.5, S * 0.47, S * 0.5);
    g.addColorStop(0.00, 'rgba(42,48,57,0.85)');
    g.addColorStop(0.18, 'rgba(32,37,45,0.60)');
    g.addColorStop(0.32, 'rgba(18,21,26,0.30)');
    g.addColorStop(0.45, 'rgba(0,0,0,0)');
    g.addColorStop(1.00, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    mesh.renderOrder = -1;
    scene.add(mesh);
    return mesh;
  })();

  /* THE HINT. "Having some indication on how it works." One quiet line under
     the case that says what it does, gone for good the first time it is used.
     It is ours rather than the page's so it only ever exists when the 3D case
     does, and it sits outside the canvas so it never lands in a measurement. */
  let hintEl = null, hintGone = false;
  function showHint() {
    if (hintEl || hintGone) return;
    if (getComputedStyle(HOST).position === 'static') HOST.style.position = 'relative';
    hintEl = document.createElement('div');
    hintEl.className = 'case-hint';
    hintEl.setAttribute('aria-hidden', 'true');
    hintEl.textContent = 'tap to open \u00b7 drag to turn';
    hintEl.style.cssText = 'position:absolute;left:0;right:0;bottom:2px;text-align:center;'
      + 'font:inherit;font-size:11px;letter-spacing:.08em;line-height:1;color:rgba(237,237,237,.62);'
      + 'pointer-events:none;opacity:0;transition:opacity 600ms ease;'
      + '-webkit-user-select:none;user-select:none';
    HOST.appendChild(hintEl);
    requestAnimationFrame(() => { if (hintEl) hintEl.style.opacity = '1'; });
  }
  function hideHint() {
    if (!hintEl || hintGone) { hintGone = true; return; }
    hintGone = true;
    const h = hintEl; hintEl = null;
    h.style.opacity = '0';
    setTimeout(() => { if (h.parentNode) h.parentNode.removeChild(h); }, 700);
  }

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  /* pitch outside, yaw inside, so yaw stays about the case's own vertical */
  const rig = new THREE.Object3D();
  const yawObj = new THREE.Object3D();
  rig.add(yawObj); scene.add(rig);

  const hinge = new Hinge();
  let root = null, pivot = null, discSpinner = null, disc = null, discLabel = null;
  let lidMeshes = [], faceYaw = 0;
  const clearMeshes = [], wallMeshes = [];
  /* the middle of the lid's free edge, and its two ends, in the pivot's frame */
  const edgeMid = new THREE.Vector3(), edgeA = new THREE.Vector3(), edgeB = new THREE.Vector3();
  let plasticNow = PLASTIC;

  let casePitch = 0, caseYaw = 0, pitchVel = 0, yawVel = 0;
  let tiltPitch = 0, tiltYaw = 0;
  let spin = null;
  /* the idle turn: when it was last touched, and how far the turn has eased in */
  let touchedAt = -1e9, idleEase = 0, arrived = false;
  const nowMs = () => performance.now();
  function touched() { touchedAt = nowMs(); idleEase = 0; hideHint(); }
  let discOmega = 0, motorOn = false;
  const discPlane = new THREE.Plane();
  const discHit = new THREE.Vector3();
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

  /* The camera fits the rig's world box every frame (v3): for a flat panel a
     rotation only ever shrinks the projection, and the box grows on its own
     as the lid opens. */
  let backdropReady = false;
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
    if (backdropReady) {
      const dz = camera.position.z - backdrop.position.z;
      const hB = 2 * Math.tan(DEG(camera.fov) / 2) * dz;
      backdrop.scale.set(hB * camera.aspect, hB, 1);
      backdrop.position.x = camC.x;
      backdrop.position.y = camC.y;
    }
  }
  function size() {
    const w = Math.max(1, HOST.clientWidth), h = Math.max(1, HOST.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    placeCamera();
    camera.updateProjectionMatrix();
  }

  /* THE PLASTIC, both ways.
     A  reflection-only shell. Black, so it has no diffuse term and no base
        colour; additive, so the only thing it can do to the picture is add
        the studio's reflection on top of what is behind it. One draw, no
        transmission pass -- the cheapest glass there is on a phone.
     B  thin-walled transmission: transmission exactly 1 (anything less mixes
        the white base colour in as milk), thickness 0, and everything behind
        it opaque, because r169 shows only opaque objects through it. */
  function clearMaterial(which) {
    if (which === 'B') {
      return new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: 0.05, ior: 1.59,
        transmission: 1.0, thickness: 0, specularIntensity: 1, clearcoat: 0,
        transparent: false, side: THREE.FrontSide,
      });
    }
    return new THREE.MeshPhysicalMaterial({
      color: 0x000000, metalness: 0, roughness: 0.05, ior: 1.59,
      specularIntensity: 1, transmission: 0, clearcoat: 0,
      transparent: true, opacity: 1, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    });
  }
  function setPlastic(which) {
    plasticNow = which;
    const m = clearMaterial(which);
    m.envMap = reflectEnv; m.envMapIntensity = reflectIntensity;
    for (const o of clearMeshes) {
      if (o.material && o.material.dispose && o.material !== m) o.material.dispose();
      o.material = m;
      o.renderOrder = which === 'B' ? 0 : 2;          /* after the paper */
    }
    return which;
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
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const covers = [];
    root.traverse(o => {
      if (!o.isMesh) return;
      const name = o.name;
      const old = o.material;
      const map = old && old.map ? old.map : null;
      if (map) { map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = maxAniso; }
      let m;
      if (IS_WALL(name)) {
        o.material = new THREE.MeshPhysicalMaterial({
          color: WALL.color, metalness: 0, roughness: WALL.roughness, ior: 1.59, specularIntensity: 1,
          transparent: true, opacity: WALL.opacity, side: THREE.FrontSide });
        o.renderOrder = 1;                           /* after the paper, before the clear shell */
        wallMeshes.push(o);
        if (old && old.dispose) old.dispose();
        return;
      }
      if (IS_CLEAR(name)) { clearMeshes.push(o); return; }
      if (IS_COVER(name)) {
        /* printed paper. envMapIntensity 1.0 like everything else: the cover
           is calibrated by the studio, never by boosting the paper. */
        m = new THREE.MeshStandardMaterial({
          map: map, color: 0xffffff, roughness: 0.55, metalness: 0, envMapIntensity: 1.0 });
        covers.push(o);
      } else if (IS_LABEL(name)) {
        m = new THREE.MeshStandardMaterial({ map: map, color: 0xffffff, roughness: 0.5, metalness: 0 });
      } else if (IS_UNDER(name)) {
        m = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.15, metalness: 1 });
      } else if (IS_BLACK(name)) {
        m = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.35, metalness: 0 });
      } else {
        return;
      }
      o.material = m;
      if (old && old.dispose && old !== m) old.dispose();
    });
    setPlastic(PLASTIC);

    /* the printed covers get a dark tuck line multiplied into their border */
    for (const o of covers) {
      if (!o.material.map) continue;
      const v = tuckEdge(o.material.map, 2);
      if (!v) continue;
      o.material.map = v.tex;
      o.material.needsUpdate = true;
    }

    /* ---- the pivot, on the line through the two knuckle centres ----------- */
    const c0 = worldCentre(k0), c1 = worldCentre(k1);
    const axisPoint = c0.clone().add(c1).multiplyScalar(0.5);

    pivot = new THREE.Object3D();
    hingeNode.add(pivot);
    pivot.position.copy(hingeNode.worldToLocal(axisPoint.clone()));
    root.updateMatrixWorld(true);
    for (const child of [...hingeNode.children]) {
      if (child === pivot) continue;
      pivot.attach(child);
    }
    root.updateMatrixWorld(true);
    hinge.hingeLocal.copy(pivot.position);

    /* which way opens? Measured rather than assumed: turn the free edge both
       ways and see which brings it toward the viewer. */
    const lidBox = new THREE.Box3().setFromObject(pivot);
    const freeEdge = new THREE.Vector3(lidBox.max.x, axisPoint.y, lidBox.getCenter(new THREE.Vector3()).z);
    const openY = pivot.rotation.y;
    hinge.closedY = openY;
    const probe = DEG(12);
    const localEdge = pivot.worldToLocal(freeEdge.clone());
    const zFor = y => {
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), y);
      const m = new THREE.Matrix4().compose(pivot.position, q, new THREE.Vector3(1, 1, 1));
      return localEdge.clone().applyMatrix4(m).applyMatrix4(hingeNode.matrixWorld).z;
    };
    hinge.sign = (zFor(openY + probe) > zFor(openY - probe)) ? 1 : -1;

    /* the lid's centre, and its free edge, in the pivot's frame */
    hinge.comPivot.copy(pivot.worldToLocal(worldCentre(pivot)));
    edgeMid.copy(localEdge);
    edgeA.copy(pivot.worldToLocal(new THREE.Vector3(lidBox.max.x, lidBox.min.y, freeEdge.z)));
    edgeB.copy(pivot.worldToLocal(new THREE.Vector3(lidBox.max.x, lidBox.max.y, freeEdge.z)));

    /* ---- the disc turns about its own normal, through the hub centre ------ */
    disc = root.getObjectByName('F_disc');
    discLabel = root.getObjectByName('F_disc_label');
    const hub = root.getObjectByName('hub');
    if (disc) {
      const centre = worldCentre(hub || disc);
      const trayIn = new THREE.Vector3(0, 0, 1).transformDirection(root.matrixWorld).normalize();
      const holder = new THREE.Object3D();
      holder.position.copy(centre);
      holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), trayIn);
      discSpinner = new THREE.Object3D();
      holder.add(discSpinner);
      root.add(holder);
      root.updateMatrixWorld(true);
      discSpinner.attach(disc);

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
    }

    pivot.traverse(o => { if (o.isMesh) lidMeshes.push(o); });

    /* ---- front cover to the viewer, then frame it ------------------------- */
    faceYaw = 0;                       /* A_front_cover already faces +z */
    const box = new THREE.Box3().setFromObject(root);
    const centre = box.getCenter(new THREE.Vector3());
    root.position.sub(centre);
    yawObj.add(root);
    yawObj.rotation.y = faceYaw;
    rig.updateMatrixWorld(true);

    /* the backdrop sits behind the widest pose the lid can reach */
    const reach = box.getSize(new THREE.Vector3()).x * 2.2;
    backdrop.position.set(0, 0, -reach * 2.2);
    backdropReady = true;

    refreshFrame();
    applyHinge();
    diag.ok = true;
    diag.tris = 0;
    root.traverse(o => {
      if (!o.isMesh) return;
      diag.tris += (o.geometry.index ? o.geometry.index.count
        : o.geometry.getAttribute('position').count) / 3;
    });

    SLIDE && SLIDE.classList.add('has3d');
    size();
    showHint();
    /* it arrives turning: one full turn, eased, ending face-on */
    if (!REDUCE) { caseYaw = -Math.PI * 2; startSpin(Math.PI * 2, ARRIVE_TURN_S); }
    arrived = true; touchedAt = nowMs() - IDLE_AFTER_MS + (REDUCE ? 0 : ARRIVE_TURN_S * 1000 + 1200);
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

  function idling() {
    return !REDUCE && arrived && !dragging && !spin && !tilt.on && hinge.mode !== 'held'
      && nowMs() - touchedAt > IDLE_AFTER_MS;
  }
  function busy() {
    /* v8: with the idle turn there is always something moving while the case
       is on screen (the loop still stops when it scrolls away or the tab hides) */
    if (!REDUCE) return true;
    return dragging || discDragging || hinge.moving || hinge.mode === 'held'
      || spin || Math.abs(discOmega) > 0.001 || motorOn
      || Math.abs(pitchVel) > 0.001 || Math.abs(yawVel) > 0.001 || pending;
  }
  function wake() {
    pending = 2;
    if (!running && visible && diag.ok) { running = true; last = 0; raf = requestAnimationFrame(frame); }
  }

  /* Everything one frame does to the model, with the clock handed in. */
  function tick(dt) {
    if (spin) {
      spin.t += dt;
      const u = Math.min(1, spin.t / spin.dur);
      const e = spin.linear ? u : (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
      caseYaw = spin.from + (spin.to - spin.from) * e;
      yawVel = 0;
      if (u >= 1) spin = null;
    } else if (!dragCase) {
      casePitch += pitchVel * dt; caseYaw += yawVel * dt;
      const k = Math.exp(-4 * dt);
      pitchVel *= k; yawVel *= k;
      /* THE IDLE TURN. Left alone, it turns slowly, the way a thing on a
         display stand does; the speed eases in over a second so it never
         lurches. v6 took a +/-10 degree sway OUT because it read as drifting;
         this is a steady turn in one direction, which reads as presented. */
      if (idling()) {
        idleEase = Math.min(1, idleEase + dt / 1.2);
        caseYaw += DEG(IDLE_DPS) * idleEase * idleEase * (3 - 2 * idleEase) * dt;
        /* and it levels itself out, so a pitch someone left it at is not kept forever */
        casePitch += (0 - casePitch) * Math.min(1, 0.6 * dt);
      }
    }
    casePitch = THREE.MathUtils.clamp(casePitch, -DEG(55), DEG(55));

    /* tilt is an offset added to the user's own rotation, never a target */
    const kt = Math.min(1, 6 * dt);
    tiltPitch += ((tilt.on ? tilt.pitch : 0) - tiltPitch) * kt;
    tiltYaw += ((tilt.on ? tilt.yaw : 0) - tiltYaw) * kt;

    rig.rotation.x = THREE.MathUtils.clamp(casePitch + tiltPitch, -DEG(62), DEG(62));
    yawObj.rotation.y = faceYaw + caseYaw + tiltYaw;

    refreshFrame();
    if (REDUCE && hinge.mode !== 'held') {
      if (hinge.mode === 'spring') { hinge.theta = hinge.target; hinge.locked = hinge.target === 0; }
      hinge.omega = 0; hinge.mode = 'free';
    } else hinge.advance(dt);
    applyHinge();
    placeCamera();

    motorOn = !REDUCE && hinge.theta > DEG(100) && !discDragging;
    if (discSpinner) {
      const idle = Math.PI * 2 / 12;
      if (motorOn && discOmega < idle)
        discOmega += (idle - discOmega) * Math.min(1, 0.9 * dt);
      if (!discDragging) discOmega *= Math.exp(-0.15 * dt);
      if (!discDragging) discSpinner.rotation.z += discOmega * dt;
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const raw = last ? (now - last) / 1000 : 1 / 60;
    const dt = Math.min(0.05, raw);
    last = now;
    tick(dt);

    renderer.render(scene, camera);
    if (diag.frameLog) diag.frameLog.push(+(raw * 1000).toFixed(2));
    frames++;
    if (!fpsT0) fpsT0 = now;
    else if (now - fpsT0 >= 500) {
      fps = +(frames * 1000 / (now - fpsT0)).toFixed(1);
      diag.fps = fps; frames = 0; fpsT0 = now;
    }
    if (pending > 0) pending--;
    /* nothing moving, nothing held: stop drawing until something wakes us */
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
    if (document.hidden) {
      running = false; cancelAnimationFrame(raf);
      /* iOS can swallow the pointerup when the page is backgrounded mid-drag */
      dropGesture();
    } else wake();
  });
  new ResizeObserver(() => { if (diag.ok) { size(); wake(); } }).observe(HOST);

  /* -------------------------------------------------------------- the input
     THE GESTURE (v6): nothing is committed on pointerdown. What is under the
     finger is recorded, and the meaning is decided after DECIDE_PX of travel,
     on DIRECTION, against where the lid actually travels on screen.

     v7 changes what happens once the hinge has the gesture: the lid is no
     longer pulled toward the pointer by a spring, it IS where the pointer
     says (1:1, keeping the grab offset), and letting go hands the measured
     speed to the coasting model. */
  const el = renderer.domElement;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const DECIDE_PX = 8;      /* travel before a drag commits to meaning anything */
  const TAP_PX = 10;        /* a fingertip is not a mouse; 6 rejected real taps (v6) */
  const TAP_MS = 300;
  const VEL_MAX = 7.0;      /* rad/s, a little over one turn a second */
  const FLICK_MS = 320;
  const FLICK_PX = 36;
  const SWING_COS = 0.5;    /* more than 60 degrees off the lid's swing = not the hinge */
  const EDGE_IN = 0.12, EDGE_OUT = 0.06;   /* free-edge grab zone: 12 mm in, 6 mm out */

  let dragging = false, dragCase = false, discDragging = false;
  let decided = false, hitLid = false, hitDisc = false, hitEdge = false, shutAtDown = true;
  let px = 0, py = 0, sx = 0, sy = 0, moved = 0, downAt = 0, lastMove = 0;
  let pointerId = null;
  /* the hinge drag: which point of the lid is held, and recent angle samples */
  const grab = { local: new THREE.Vector3(), offX: 0, offY: 0, samples: [] };

  function setNDC(e) {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  }
  const _p = new THREE.Vector3();
  /* a world point, in CSS pixels relative to the viewport */
  function toScreen(v) {
    const r = el.getBoundingClientRect();
    _p.copy(v).project(camera);
    return [r.left + (_p.x * 0.5 + 0.5) * r.width, r.top + (-_p.y * 0.5 + 0.5) * r.height];
  }
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
  function pointerDiscAngle() {
    if (!discFrame()) return null;
    discPlane.setFromNormalAndCoplanarPoint(discNormalW, discCentreW);
    if (!ray.ray.intersectPlane(discPlane, discHit)) return null;
    return angleAboutDisc(discHit);
  }

  /* WHERE THE POINTER SAYS THE LID IS.
     v6 intersected the pointer ray with the plane perpendicular to the hinge
     axis. Seen from the front that plane is edge-on to the camera, so the
     intersection is ill-conditioned and the angle jumps about. Instead: the
     point of the lid that was grabbed can only travel on a circle about the
     pin. Project that circle to the screen and take the angle whose
     projection is nearest the pointer, searching outward from the current
     angle so the lid never jumps to the far side of the arc. */
  function pointerTheta(cx, cy) {
    const tx = cx + grab.offX, ty = cy + grab.offY;
    const cur = RAD(hinge.theta);
    let best = cur, bestD = Infinity;
    const lo = Math.max(0, cur - 45), hi = Math.min(STOP_DEG, cur + 45);
    for (let d = lo; d <= hi + 1e-6; d += 0.5) {
      const s = toScreen(hinge.pointAt(grab.local, DEG(d)));
      /* a small pull toward where the lid already is breaks the tie where the
         arc doubles back on itself on screen */
      const dist = Math.hypot(s[0] - tx, s[1] - ty) + Math.abs(d - cur) * 0.02;
      if (dist < bestD) { bestD = dist; best = d; }
    }
    return DEG(best);
  }

  /* where the lid's free edge travels on screen when the hinge opens a
     little, as a unit vector. Shut and face-on that is almost no travel at
     all (it comes straight at the camera), so it falls back to the direction
     from the free edge toward the pin, which is the way a finger pulls. */
  function lidScreenDir() {
    if (!pivot) return null;
    const a = toScreen(hinge.pointAt(edgeMid, hinge.theta));
    const b = toScreen(hinge.pointAt(edgeMid, Math.min(hinge.thetaOpen, hinge.theta + DEG(8))));
    let dx = b[0] - a[0], dy = b[1] - a[1];
    let L = Math.hypot(dx, dy);
    if (L < 6) {
      const h = toScreen(hinge.hingeW);
      dx = h[0] - a[0]; dy = h[1] - a[1]; L = Math.hypot(dx, dy);
    }
    return L < 1e-6 ? null : { x: dx / L, y: dy / L };
  }

  /* is this screen point within the grab zone along the lid's free edge? */
  function nearFreeEdge(cx, cy) {
    const a = toScreen(hinge.pointAt(edgeA, hinge.theta));
    const b = toScreen(hinge.pointAt(edgeB, hinge.theta));
    const h = toScreen(hinge.hingeW);
    const ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey);
    if (L < 1) return false;
    const pxPerUnit = L / edgeA.distanceTo(edgeB);
    const t = ((cx - a[0]) * ex + (cy - a[1]) * ey) / (L * L);
    if (t < -0.03 || t > 1.03) return false;
    /* signed distance from the edge line, positive toward the pin (inside the lid) */
    let nx = -ey / L, ny = ex / L;
    if ((h[0] - a[0]) * nx + (h[1] - a[1]) * ny < 0) { nx = -nx; ny = -ny; }
    const d = ((cx - a[0]) * nx + (cy - a[1]) * ny) / pxPerUnit;
    return d <= EDGE_IN && d >= -EDGE_OUT;
  }

  function startSpin(delta, dur, linear) {
    spin = { from: caseYaw, to: caseYaw + delta, t: 0, dur: dur, linear: !!linear };
    yawVel = 0;
    wake();
  }

  function takeHinge(cx, cy, why) {
    /* hold the point of the lid under the finger; if the finger is off the
       lid (the 6 mm zone outside the edge), hold the edge itself */
    const hits = ray.intersectObjects(lidMeshes, false);
    const w = hits.length ? hits[0].point.clone() : hinge.pointAt(edgeMid, hinge.theta);
    /* into the pivot's frame AT THE CLOSED POSE, which is what pointAt expects */
    grab.local.copy(pivot.worldToLocal(w.clone()));
    /* a point too near the pin has no leverage and no resolution: push it out */
    const minR = edgeMid.x * 0.35;
    if (Math.abs(grab.local.x) < minR) grab.local.x = minR * Math.sign(edgeMid.x || 1);
    const s = toScreen(hinge.pointAt(grab.local, hinge.theta));
    /* measured against where the gesture STARTED, so the lid does not lurch by
       the 8 px it took to decide */
    grab.offX = s[0] - cx; grab.offY = s[1] - cy;
    grab.samples.length = 0;
    hinge.hold();
    diag.lastGesture = 'hinge(' + why + ')';
  }

  /* Called once the gesture has travelled far enough to have a direction. */
  function decide(dx, dy) {
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) return;
    const ux = dx / L, uy = dy / L;
    decided = true;
    if (!shutAtDown && hitDisc && !hitLid) {
      discDragging = true; discOmega = 0; discLastA = pointerDiscAngle();
      diag.lastGesture = 'disc';
      return;
    }
    /* open: anywhere on the lid works the hinge. Shut: the case is one object
       you turn in your hand, EXCEPT at the lid's free edge, where you would
       put a thumbnail to open a real one. */
    if ((!shutAtDown && hitLid) || (shutAtDown && hitEdge)) {
      const lid = lidScreenDir();
      const along = lid ? Math.abs(ux * lid.x + uy * lid.y) : 0;
      if (along >= SWING_COS) { takeHinge(sx, sy, along.toFixed(2)); return; }
      diag.lastGesture = 'case(off-swing ' + along.toFixed(2) + ')';
    } else {
      diag.lastGesture = shutAtDown ? 'case(shut)' : 'case';
    }
    dragCase = true;
  }

  el.addEventListener('pointerdown', e => {
    if (!diag.ok) return;
    dragging = true; decided = false;
    touched();
    pointerId = e.pointerId;
    px = sx = e.clientX; py = sy = e.clientY; moved = 0;
    downAt = performance.now(); lastMove = downAt;
    spin = null;
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    el.style.cursor = 'grabbing';
    setNDC(e);
    refreshFrame();
    shutAtDown = hinge.theta < DEG(SHUT_DEG);
    hitLid = ray.intersectObjects(lidMeshes, false).length > 0;
    hitEdge = nearFreeEdge(e.clientX, e.clientY);
    if (hitEdge && !shutAtDown) hitLid = true;        /* the 6 mm beyond the edge counts as lid */
    hitDisc = disc ? ray.intersectObject(disc, true).length > 0 : false;
    wake();
  });

  el.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - px, dy = e.clientY - py;
    const now = performance.now(), dtm = Math.max(8, now - lastMove) / 1000;
    px = e.clientX; py = e.clientY; lastMove = now;
    moved += Math.abs(dx) + Math.abs(dy);
    setNDC(e);
    if (!decided) {
      if (Math.hypot(e.clientX - sx, e.clientY - sy) < DECIDE_PX) { wake(); return; }
      decide(e.clientX - sx, e.clientY - sy);
    }

    if (hinge.mode === 'held') {
      /* 1:1, but never faster than a hand: face-on and shut, perspective folds
         the edge's path back over itself on screen, and the first few pixels
         of pull would otherwise pop the lid 20 degrees in a single event. */
      const want = THREE.MathUtils.clamp(pointerTheta(e.clientX, e.clientY), 0, hinge.thetaOpen);
      const lim = DEG(HELD_MAX_DPS) * dtm;
      hinge.theta += THREE.MathUtils.clamp(want - hinge.theta, -lim, lim);
      applyHinge();
      grab.samples.push([now, hinge.theta]);
      while (grab.samples.length > 2 && now - grab.samples[0][0] > 80) grab.samples.shift();
    } else if (discDragging && discSpinner) {
      const a = pointerDiscAngle();
      if (a !== null) {
        if (discLastA === null) discLastA = a;
        const d = wrapPi(a - discLastA);
        discLastA = a;
        discSpinner.rotation.z += d * discSign;
        const rate = THREE.MathUtils.clamp((d * discSign) / dtm, -25, 25);
        discOmega = discOmega * 0.6 + rate * 0.4;
      }
    } else if (dragCase) {
      /* a drag the full width of the canvas is half a turn, at any size */
      const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
      const dYaw = dx * (Math.PI / w);
      const dPitch = dy * (DEG(110) / h);
      caseYaw += dYaw;
      casePitch = THREE.MathUtils.clamp(casePitch + dPitch, -DEG(55), DEG(55));
      yawVel = yawVel * 0.55 +
               THREE.MathUtils.clamp(dYaw / dtm, -VEL_MAX, VEL_MAX) * 0.45;
      pitchVel = pitchVel * 0.55 +
                 THREE.MathUtils.clamp(dPitch / dtm, -VEL_MAX, VEL_MAX) * 0.45;
    }
    wake();
  });

  /* the lid's speed over the last 80 ms of the drag, in rad/s */
  function releaseOmega(now) {
    const s = grab.samples;
    if (s.length < 2) return 0;
    const lastS = s[s.length - 1];
    if (now - lastS[0] > 80) return 0;                /* the finger had stopped */
    const first = s[0];
    const dt = (lastS[0] - first[0]) / 1000;
    return dt < 0.004 ? 0 : (lastS[1] - first[1]) / dt;
  }

  /* put every piece of gesture state back, whatever interrupted it */
  function dropGesture() {
    if (hinge.mode === 'held') hinge.release(0);
    dragging = false; dragCase = false; discDragging = false; discLastA = null;
    if (pointerId !== null) { try { el.releasePointerCapture(pointerId); } catch (_) {} }
    pointerId = null;
    el.style.cursor = 'grab';
  }

  function up(e) {
    if (!dragging) return;
    touched();
    const now = performance.now();
    const held = now - downAt;
    const tx = e.clientX - sx, ty = e.clientY - sy;
    const wasCase = dragCase, wasHinge = hinge.mode === 'held';
    const cancelled = e.type === 'pointercancel';

    /* RELEASE: the measured speed goes to the coasting model. A slow release
       leaves the lid where it is; nothing springs it to an end. */
    if (wasHinge) hinge.release(cancelled ? 0 : releaseOmega(now));
    dropGesture();

    if (!cancelled && !decided && moved < TAP_PX && held < TAP_MS) { tap(); wake(); return; }

    /* FLICK TO FLIP (v6): a fast, mostly horizontal throw that was turning
       the case snaps it half a turn. */
    if (!cancelled && wasCase && held < FLICK_MS && Math.abs(tx) > FLICK_PX &&
        Math.abs(tx) > Math.abs(ty) * 1.6) {
      startSpin(Math.sign(tx) * Math.PI, 0.55);
      diag.lastGesture = 'flip';
    }
    wake();
  }
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', e => { if (dragging && e.pointerId === pointerId) up(e); });

  /* TAP: toggle. Shut (or mostly shut) opens to 160; anything else closes,
     and closing ends through the detent. */
  function tap() {
    const open = hinge.theta < DEG(80);
    hinge.springTo(open ? TAP_OPEN_DEG : 0);
    diag.lastGesture = open ? 'tap-open' : 'tap-shut';
  }
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', 'the jewel case — tap to open, drag to turn');
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); touched(); tap(); wake(); }
  });

  /* ------------------------------------------------------------------ tilt
     Permission is only ever asked for on a press of the button, never on
     load. The device's angles are stored relative to how the phone was held
     when tilt was switched on, and are added to the user's own rotation. */
  const tilt = { on: false, pitch: 0, yaw: 0, base: null };
  let motionBound = false;

  function onOrient(ev) {
    if (!tilt.on) return;
    const beta = ev.beta || 0, gamma = ev.gamma || 0;
    if (!tilt.base) tilt.base = { beta: beta, gamma: gamma };
    tilt.pitch = THREE.MathUtils.clamp(DEG(beta - tilt.base.beta), -DEG(45), DEG(45));
    tilt.yaw = THREE.MathUtils.clamp(DEG(gamma - tilt.base.gamma), -DEG(70), DEG(70));
    wake();
  }

  /* SHAKE TO SPIN: the acceleration magnitude, high-passed against its own
     running mean, so a brisk tilt does not fire it and a gentle shake does. */
  let shakeMean = 9.8, shakeAt = 0;
  function onMotion(ev) {
    if (!tilt.on) return;
    const a = ev.accelerationIncludingGravity;
    if (!a) return;
    const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    shakeMean = shakeMean * 0.92 + m * 0.08;
    const now = performance.now();
    if (Math.abs(m - shakeMean) > 12 && now - shakeAt > 1400) {
      shakeAt = now;
      startSpin(2 * Math.PI, 1.15);
      diag.shakes = (diag.shakes || 0) + 1;
    }
  }

  async function askMotion() {
    const D = window.DeviceOrientationEvent, M = window.DeviceMotionEvent;
    if (D && typeof D.requestPermission === 'function') {
      if ((await D.requestPermission()) !== 'granted') return false;
    }
    if (M && typeof M.requestPermission === 'function') {
      try { await M.requestPermission(); } catch (_) {}
    }
    return true;
  }

  if (TILT_BTN) {
    if (REDUCE) TILT_BTN.hidden = true;
    TILT_BTN.addEventListener('click', async () => {
      if (tilt.on) {
        tilt.on = false; tilt.base = null; tilt.pitch = tilt.yaw = 0;
        TILT_BTN.setAttribute('aria-pressed', 'false');
        diag.tilt = 'off'; wake();
        return;
      }
      try {
        if (!(await askMotion())) { diag.tilt = 'denied'; return; }
        if (!motionBound) {
          window.addEventListener('deviceorientation', onOrient);
          window.addEventListener('devicemotion', onMotion);
          motionBound = true;
        }
        tilt.on = true; tilt.base = null;
        TILT_BTN.setAttribute('aria-pressed', 'true');
        diag.tilt = 'on'; wake();
      } catch (e) { diag.tilt = 'error: ' + e; }
    });
  }

  if (!DEBUG) return;

  /* ===================================================== ?casedebug=1 only
     The measurement surface. None of this exists in production. */
  diag.phys = hinge;
  diag.config = () => ({
    three: THREE.REVISION, model: MODEL, plastic: plasticNow,
    toneMapping: 'NeutralToneMapping', exposure: renderer.toneMappingExposure,
    outputColorSpace: renderer.outputColorSpace, pixelRatio: renderer.getPixelRatio(),
    environmentIntensity: scene.environmentIntensity, envSigma: ENV_SIGMA,
    light: Object.assign({}, levels.light), reflect: Object.assign({}, levels.reflect), reflectIntensity,
    hinge: { STOP_DEG, TAP_OPEN_DEG, FRICTION, REST_SPEED, DETENT_DEG, DETENT_PULL, DETENT_REST,
             STOP_REST, SPRING_PERIOD, SPRING_ZETA, HELD_MAX_DPS },
    idle: { ARRIVE_TURN_S, IDLE_AFTER_MS, IDLE_DPS },
    touchAction: el.style.touchAction, tris: diag.tris,
  });
  diag.materials = () => {
    const out = {};
    root.traverse(o => {
      if (!o.isMesh || !o.material) return;
      const m = o.material, num = v => (v === undefined || v === null) ? null : +(+v).toFixed(4);
      out[o.name] = { type: m.type, colour: '#' + m.color.getHexString(), roughness: num(m.roughness),
        metalness: num(m.metalness), transmission: num(m.transmission), ior: num(m.ior),
        thickness: num(m.thickness), specularIntensity: num(m.specularIntensity),
        envMapIntensity: num(m.envMapIntensity), transparent: m.transparent, depthWrite: m.depthWrite,
        blending: m.blending === THREE.AdditiveBlending ? 'additive' : 'normal',
        side: m.side === THREE.DoubleSide ? 'double' : m.side === THREE.FrontSide ? 'front' : 'back',
        map: !!m.map, map_colorSpace: m.map ? m.map.colorSpace : null,
        anisotropy: m.map ? m.map.anisotropy : null, renderOrder: o.renderOrder };
    });
    return out;
  };
  diag.nodes = () => {
    const out = [];
    root.traverse(o => out.push({ name: o.name, type: o.type, parent: o.parent ? o.parent.name : null }));
    return out;
  };
  diag.state = () => ({
    theta_deg: +RAD(hinge.theta).toFixed(3), omega_dps: +RAD(hinge.omega).toFixed(2),
    mode: hinge.mode, locked: hinge.locked,
    pitch_deg: +RAD(casePitch).toFixed(2), yaw_deg: +RAD(caseYaw).toFixed(2),
    spinning: !!spin, gesture: diag.lastGesture || null, running,
    disc_deg: discSpinner ? +RAD(discSpinner.rotation.z).toFixed(2) : null,
    dragging, dragCase, discDragging, fps: diag.fps, plastic: plasticNow,
  });
  /* tests park the case in exact poses; the idle turn has to stand still for that */
  diag.idle = (on) => { touchedAt = on ? -1e9 : 1e15; idleEase = 0; return on; };
  diag.idleState = () => ({ idling: idling(), ease: +idleEase.toFixed(3), hint: !!hintEl, since_ms: Math.round(nowMs() - touchedAt) });
  diag.setCase = (pitchDeg, yawDeg) => {
    touchedAt = 1e15;                                 /* a parked pose stays parked */
    casePitch = DEG(pitchDeg); caseYaw = DEG(yawDeg);
    pitchVel = yawVel = 0; spin = null;
    rig.rotation.x = casePitch; yawObj.rotation.y = faceYaw + caseYaw;
    refreshFrame();
  };
  /* park the case in an exact pose and draw one frame */
  diag.pose = (o) => {
    const p = Object.assign({ theta: 0, pitch: 0, yaw: 0, spin: 0 }, o || {});
    motorOn = false; discOmega = 0;
    hinge.theta = DEG(p.theta); hinge.omega = 0; hinge.mode = 'free'; hinge.locked = p.theta === 0;
    if (discSpinner) discSpinner.rotation.z = DEG(p.spin);
    diag.setCase(p.pitch, p.yaw);
    applyHinge();
    size();
    renderer.render(scene, camera);
    return { theta_deg: p.theta, calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
  };
  diag.renderOnce = () => { refreshFrame(); applyHinge(); renderer.render(scene, camera); };
  /* run the frame update on a fixed clock, with no rAF involved; returns the
     hinge angle at every step so a test can read the whole curve */
  diag.advance = (seconds, hz) => {
    const f = hz || 60, h = 1 / f, n = Math.max(1, Math.round((seconds || 1) * f)), log = [];
    for (let i = 0; i < n; i++) { tick(h); log.push([+((i + 1) * h).toFixed(4), +RAD(hinge.theta).toFixed(3), +RAD(hinge.omega).toFixed(2)]); }
    renderer.render(scene, camera);
    return log;
  };
  diag.tap = () => { tap(); wake(); return diag.state(); };
  diag.throwLid = (thetaDeg, omegaDps) => {
    hinge.theta = DEG(thetaDeg); hinge.locked = false; hinge.events.length = 0;
    hinge.release(DEG(omegaDps)); applyHinge(); wake(); return diag.state();
  };
  diag.events = () => hinge.events.slice();
  diag.clearEvents = () => { hinge.events.length = 0; };
  /* the four corners of a flat cover on screen, in canvas device pixels,
     ordered as the texture is: TL, TR, BR, BL */
  diag.corners = (name) => {
    const o = root.getObjectByName(name);
    if (!o) return null;
    const pos = o.geometry.getAttribute('position'), uv = o.geometry.getAttribute('uv');
    const want = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const r = el.getBoundingClientRect(), k = el.width / r.width;
    scene.updateMatrixWorld(true);
    return want.map(w => {
      let best = 0, bd = Infinity;
      for (let i = 0; i < uv.count; i++) {
        const d = Math.hypot(uv.getX(i) - w[0], uv.getY(i) - w[1]);
        if (d < bd) { bd = d; best = i; }
      }
      const v = new THREE.Vector3().fromBufferAttribute(pos, best).applyMatrix4(o.matrixWorld).project(camera);
      return [(v.x * 0.5 + 0.5) * r.width * k, (-v.y * 0.5 + 0.5) * r.height * k];
    });
  };
  /* where a point of the lid is on screen (CSS px) at the CURRENT angle:
     u along the hinge axis 0..1, r from the pin 0..1 (1 = the free edge) */
  diag.lidPoint = (u, r) => {
    refreshFrame();
    const l = new THREE.Vector3(edgeMid.x * r, edgeA.y + (edgeB.y - edgeA.y) * u, edgeMid.z);
    return toScreen(hinge.pointAt(l, hinge.theta));
  };
  /* the same point at ANOTHER angle: where to drag to */
  diag.lidPointAt = (u, r, thetaDeg) => {
    refreshFrame();
    const l = new THREE.Vector3(edgeMid.x * r, edgeA.y + (edgeB.y - edgeA.y) * u, edgeMid.z);
    return toScreen(hinge.pointAt(l, DEG(thetaDeg)));
  };
  /* where the finger has to be for the point it is HOLDING to sit at this angle */
  diag.grabPointAt = (thetaDeg) => {
    refreshFrame();
    const q = toScreen(hinge.pointAt(grab.local, DEG(thetaDeg)));
    return [q[0] - grab.offX, q[1] - grab.offY];
  };
  diag.discScreen = () => {
    if (!discLabel || !discFrame()) return null;
    const c = toScreen(discCentreW);
    return { cx: +c[0].toFixed(1), cy: +c[1].toFixed(1) };
  };
  diag.hide = (pattern, hidden) => {
    const re = new RegExp(pattern); let n = 0;
    root.traverse(o => { if (o.isMesh && re.test(o.name)) { o.visible = !hidden; n++; } });
    return n;
  };
  diag.hideClear = (on) => { for (const o of clearMeshes) o.visible = !on; return clearMeshes.length; };
  diag.wall = (o) => { for (const m of wallMeshes) { if (o.color !== undefined) m.material.color.setHex(o.color); if (o.opacity !== undefined) m.material.opacity = o.opacity; if (o.roughness !== undefined) m.material.roughness = o.roughness; } return wallMeshes.length; };
  diag.plastic = (which) => setPlastic(which);
  diag.forEach = (which, fn) => {
    let n = 0;
    root.traverse(o => {
      if (!o.isMesh || !o.material) return;
      const hit = which === 'all' || (which === 'clear' && IS_CLEAR(o.name))
        || (which === 'cover' && IS_COVER(o.name)) || o.name === which;
      if (!hit) return;
      fn(o.material); o.material.needsUpdate = true; n++;
    });
    return n;
  };
  diag.env = (v) => { scene.environmentIntensity = v; return v; };
  diag.envNull = (on) => { if (on) { diag._env = scene.environment; scene.environment = null; } else if (diag._env) scene.environment = diag._env; };
  diag.envLevels = (kind, o) => { Object.assign(levels[kind], o); bakeEnv(); setPlastic(plasticNow); return levels[kind]; };
  diag.reflectIntensity = (v) => { reflectIntensity = v; setPlastic(plasticNow); return v; };
  diag.exposure = (v) => { renderer.toneMappingExposure = v; return v; };
  diag.backdrop = (on) => { backdrop.visible = on !== false; return backdrop.visible; };
  diag.spin = (deg, dur, linear) => { startSpin(DEG(deg === undefined ? 360 : deg), dur === undefined ? 1.15 : dur, linear); return true; };
  diag.tiltSim = (on, pitchDeg, yawDeg) => {
    tilt.on = !!on; tilt.base = { beta: 0, gamma: 0 };
    tilt.pitch = DEG(pitchDeg || 0); tilt.yaw = DEG(yawDeg || 0); wake();
    return { on: tilt.on };
  };
  diag.info = () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles,
                       textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries });
  diag.logFrames = (on) => { diag.frameLog = on ? [] : null; };
}

if (HOST) boot();
