/* case.v6.js — the sie jewel case, the FIRST slide of the gallery.

   WHAT CHANGED FROM v5
   --------------------
   1. THE PLASTIC. "When it's open the clear doesn't look as realistic as I
      would like... it's this weird gray."

      It was grey because it was barely reflecting anything. v4 measured that
      specularIntensity is the single dial controlling the clear material's
      reflections in r169 (envMapIntensity does not reach the specular lobe of
      a transmissive material at all), and it took that dial down to 0.10 to
      stop the lid laying a veil over the printed cover underneath.

      That trade is only real while the lid is OVER the print. Open, there is
      nothing behind the lid to veil, and 0.10 buys nothing but a dull sheet.
      So the dial is a function of the hinge angle now: CLEAR_SPEC_SHUT while
      the cover is under it, ramping to CLEAR_SPEC_OPEN as it swings clear.
      The closed pose keeps v4's measured colour match exactly; the open pose
      gets plastic that reflects the studio.

      Two more things that read as "not plastic": roughness 0.05 blurs every
      reflection into haze, and a jewel case is polished, so it is 0 now. And
      the edges had no colour -- real polystyrene goes green-cyan where you
      look through a long path of it, which is almost entirely an edge effect.
      attenuationDistance drops 3 -> 0.35 so the 0.02-thick faces stay clear
      while the edges pick the tint up.

   2. A BACKDROP. Clear plastic photographed against nothing looks like
      nothing. There is a graded panel behind the case now -- unlit, so it
      cannot disturb the cover calibration, but the transmission pass sees it,
      so there is something to see THROUGH the lid and something for the edges
      to catch.

   3. 360. "It should spin kind of like 360-ish." Dragging always could, but
      tilt could not: v5 lerped caseYaw toward tilt.yaw every frame, and
      tilt.yaw is clamped to +/-60 degrees, so the device orientation dragged
      every spin the user gave it back to the middle. Tilt is an OFFSET added
      to the user's own yaw now, never a target for it.

   4. THE TOUCH. "The sensitivity on it right now is really, really, really
      bad." Three separate causes, all fixed -- see THE GESTURE.

   5. Shake to spin, flick to flip, and tap opens the whole way.

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
/* v5 left 7% of slack around the fitted box. Asked for the case to be
   bigger, and the box fit is already exact every frame, so most of that slack
   was just unused frame. 1.02 keeps enough for perspective at the corners. */
const FIT_MARGIN = 1.02;
/* 120 showed the tray but not much of it. "If I tap it open, it should open
   all the way up where I can see the inside of the CD." */
const THETA_OPEN_DEG = 135;
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

   0.10 drops the veil by 83% and keeps 73% of the rim.

   AND WHY IT IS NOT ONE NUMBER ANY MORE

   Every row of that table was measured with the lid CLOSED, over the print.
   That is the only pose where the veil exists: it IS the cover seen through
   the lid. Swing the lid open and there is nothing behind it to wash out --
   the veil column stops meaning anything, and all 0.10 does is make a sheet
   of polished plastic look like a grey sheet of nothing.

   So the dial follows the hinge. Shut, it is the measured 0.10 and the cover
   renders exactly as v4 calibrated it. Open, it is 0.55 -- near the brief's
   original 0.5 -- and the lid reflects the softbox and the edge strip the way
   plastic does. The ramp runs from SHUT_FRAC to 55% of the open angle, by
   which point the lid has cleared the print entirely. */
const CLEAR_SPEC_SHUT = 0.10;
const CLEAR_SPEC_OPEN = 0.55;
const SPEC_RAMP_END = 0.55;        /* fraction of thetaOpen where it tops out */

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
    /* true while a tap's spring is carrying the lid to a stop; cleared the
       moment it arrives, so the case goes loose in the hand again */
    this.auto = false;
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

  /* THE BACKDROP. Clear plastic against nothing photographs as nothing: the
     transmission pass renders what is behind the lid, and behind the lid was
     an empty black scene, so looking THROUGH the case showed the same black
     as looking past it. That flatness is half of "weird gray".

     A graded panel fixes it without touching the light. MeshBasicMaterial is
     unlit and is not part of the PMREM environment, so it adds exactly zero
     to the covers and the exposure calibrated against the print in v4 still
     holds -- diag.coverY() is here to prove that rather than assert it. It is
     parented to the SCENE, never to the rig, because placeCamera() fits the
     rig's box every frame and a backdrop inside it would blow the framing
     out completely. */
  const backdrop = (() => {
    /* It fades out in ALPHA, not down to black, and it does so well inside
       the frame.

       The first cut was an opaque plane with a dark gradient on it. Measured
       across the canvas it was opaque edge to edge at rgb(0,3,8) -- a lift of
       almost nothing, but the page behind the canvas is pure black and the
       canvas is transparent everywhere else, so that almost-nothing was
       enough to draw the OUTLINE OF THE CANVAS ELEMENT on the page. The case
       sat in a faint visible box. Scanning a row of pixels is what found it;
       it is far too subtle to trust a screenshot for, and a JPEG of a dark
       scene invents edges like that on its own.

       So the texture carries its falloff in the alpha channel and reaches
       fully transparent at 0.72 of the radius. The corners and edges of the
       canvas composite to nothing at all, exactly as they did before there
       was a backdrop, and what is left is a soft pool behind the case. */
    const S = 256;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const x = c.getContext('2d');
    /* Alpha has to reach zero by 0.45 of the texture radius, because the
       plane is sized to exactly fill the frame: texture radius 0.5 lands on
       the left and right edges of the canvas, and anything still opaque there
       paints the canvas outline onto the page. The corners sit at 0.707 and
       are long gone by then. */
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
      new THREE.MeshBasicMaterial({ map: tex, transparent: true,
                                    depthWrite: false }));
    mesh.renderOrder = -1;
    scene.add(mesh);
    return mesh;
  })();

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
  /* every clear material, so the hinge can drive their specular together */
  const clearMats = [];
  let specNow = CLEAR_SPEC_SHUT;

  let casePitch = 0, caseYaw = 0, pitchVel = 0, yawVel = 0;
  /* the device's contribution, kept apart from the user's so it can be added
     rather than imposed -- see the frame loop */
  let tiltPitch = 0, tiltYaw = 0;
  /* a scripted turn: the shake spin and the flick flip both run through it */
  let spin = null;
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

    /* The backdrop is sized to the frame, every time the frame changes.

       Sizing it by a multiple of the model instead -- which is what the first
       two attempts did -- means its falloff lands wherever the camera happens
       to be: too small and you see a panel with edges, too large and you see
       only its opaque middle, which paints the canvas rectangle onto a black
       page. Fitting it to the frustum at its own depth puts texture radius
       0.5 exactly on the canvas edge, where the gradient is already fully
       transparent. */
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
          color: 0xffffff, metalness: 0,
          /* polished, not satin: 0.05 blurs every reflection into the haze
             that reads as grey plastic */
          roughness: 0.0,
          transmission: 1, ior: 1.59, thickness: 0.02,
          specularIntensity: CLEAR_SPEC_SHUT, clearcoat: 0,
          /* the green-cyan a real case shows where you look along a long path
             of polystyrene. At 0.02 thick the faces barely tint; the edges,
             which run the whole length of the shell, do. */
          attenuationColor: new THREE.Color(0xc8e4de), attenuationDistance: 0.35,
          transparent: true, side: THREE.DoubleSide,
        });
        clearMats.push(m);
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

    /* behind everything, and big enough to fill the frame at that distance */
    backdrop.position.set(0, 0, -radiusMax * 2.2);
    backdropReady = true;

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

  /* THE CLEAR SHELL'S SPECULAR FOLLOWS THE HINGE. Low while the lid is over
     the print, because that is the only pose where a reflection becomes a
     veil over the artwork; high once it has swung clear, because that is the
     pose where 0.10 made polished plastic look like grey card. See
     CLEAR_SPEC_SHUT for the measurements behind both numbers.

     It lives here rather than inline in the loop because diag.pose() renders
     a still WITHOUT running a frame, and a still of the open case has to show
     the same plastic the animation does. */
  function applySpec() {
    const f = hinge.thetaOpen > 0 ? hinge.theta / hinge.thetaOpen : 0;
    const u = THREE.MathUtils.clamp((f - SHUT_FRAC) / (SPEC_RAMP_END - SHUT_FRAC), 0, 1);
    const s = CLEAR_SPEC_SHUT +
              (CLEAR_SPEC_OPEN - CLEAR_SPEC_SHUT) * (u * u * (3 - 2 * u));
    if (Math.abs(s - specNow) > 1e-4) {
      specNow = s;
      for (const m of clearMats) m.specularIntensity = s;
    }
  }

  /* ------------------------------------------------------------- the loop */
  let running = false, raf = 0, last = 0;
  let frames = 0, fpsT0 = 0, fps = 0;
  let pending = 0;

  function busy() {
    return dragging || discDragging || Math.abs(hinge.omega) > 0.001 || hinge.drag
      || spin || Math.abs(discOmega) > 0.001 || motorOn
      || Math.abs(pitchVel) > 0.001 || Math.abs(yawVel) > 0.001
      || (sway && !REDUCE) || pending;
  }
  function wake() {
    pending = 2;
    if (!running && visible && diag.ok) { running = true; last = 0; raf = requestAnimationFrame(frame); }
  }

  /* Everything one frame does to the model, with the clock handed in rather
     than read off the wall. frame() drives it from requestAnimationFrame;
     diag.advance() drives it from a plain loop, which is the only way to
     exercise the momentum, the tilt blend and the scripted spin on a machine
     where rAF is throttled -- an occluded window ticks once a second, and a
     0.8s turn then gets exactly one frame to happen in. */
  function tick(dt) {
    /* A scripted turn owns the yaw while it runs -- the shake's full circle
       and the flick's half one both come through here -- so momentum has
       nothing to fight it with. Eased, because a linear turn reads as a
       texture sliding rather than an object being spun. */
    if (spin) {
      spin.t += dt;
      const u = Math.min(1, spin.t / spin.dur);
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      caseYaw = spin.from + (spin.to - spin.from) * e;
      yawVel = 0;
      if (u >= 1) spin = null;
    } else if (!dragCase) {
      casePitch += pitchVel * dt; caseYaw += yawVel * dt;
      const k = Math.exp(-4 * dt);
      pitchVel *= k; yawVel *= k;
    }
    casePitch = THREE.MathUtils.clamp(casePitch, -DEG(55), DEG(55));

    /* TILT IS AN OFFSET, NOT A TARGET.

       v5 lerped casePitch and caseYaw themselves toward the device angles:

           caseYaw += (tilt.yaw - caseYaw) * 0.15;

       and tilt.yaw is clamped to +/-60 degrees. So with tilt switched on,
       every spin the user gave the case was hauled back inside that window
       within a few frames and a full turn was simply not reachable --
       reported as "when it's on tilt you can't spin it 360". The device
       contributes its own pair of angles now, added at render time, and
       caseYaw stays entirely the user's. */
    const kt = Math.min(1, 6 * dt);
    tiltPitch += ((tilt.on ? tilt.pitch : 0) - tiltPitch) * kt;
    tiltYaw += ((tilt.on ? tilt.yaw : 0) - tiltYaw) * kt;

    swayT += dt;
    const swayY = 0;                      /* see THE FLOATING above */
    rig.rotation.x = THREE.MathUtils.clamp(casePitch + tiltPitch, -DEG(62), DEG(62));
    yawObj.rotation.y = faceYaw + caseYaw + tiltYaw + swayY;

    refreshFrame();
    if (REDUCE && !hinge.drag) { hinge.omega = 0; } else hinge.advance(dt);
    /* a tap's spring lets go once the lid has arrived, so what is left is a
       case resting at its stop rather than one held open by a servo */
    if (hinge.auto && hinge.drag &&
        Math.abs(hinge.theta - hinge.drag.target) < DEG(1.5) &&
        Math.abs(hinge.omega) < 0.6) {
      hinge.drag = null; hinge.auto = false;
    }
    applyHinge();
    placeCamera();

    applySpec();

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
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    tick(dt);

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
  /* ====================================================================
     THE GESTURE

     "The touch sensitivity on mobile for the 3D disc right now is still not
     optimal in any capacity... the sensitivity on it right now is really,
     really, really bad."

     Three causes, all of them here.

     ONE, and the big one: v5 committed to a branch on pointerDOWN, from
     whatever the ray happened to hit. An open case is almost entirely lid
     when seen from the front, so nearly every drag was handed to the hinge --
     and pointerTheta() clamps its result to [0, thetaOpen], so a sideways
     drag moved the lid by nothing at all while also locking out the rotation
     it was plainly asking for. The case felt like it ignored you. Nothing is
     committed now until the gesture has travelled DECIDE_PX, and the decision
     is then made on DIRECTION, compared against where the lid actually
     travels on screen at the angle the case is currently at.

     TWO: the rotation rate was a fixed radians-per-pixel. A pixel is not a
     fixed fraction of a canvas, so the same swipe turned the case by very
     different amounts on a 390px phone and a 900px desktop. It is a fraction
     of the canvas now -- a drag the full width is half a turn, wherever it
     is running.

     THREE: momentum was (dx * rate) / dtm with dtm floored at 8ms, so a
     single 20px pointermove became about 1,100 degrees per second, and
     against the 4/s decay that is most of a turn of coast off one twitch.
     This is the same bug v4 diagnosed and fixed for the disc and left
     standing here for the case. The rate is smoothed across moves and clamped
     to VEL_MAX now.
     ==================================================================== */
  const DECIDE_PX = 8;      /* travel before a drag commits to meaning anything */
  const TAP_PX = 10;        /* a fingertip is not a mouse; 6 rejected real taps */
  const VEL_MAX = 7.0;      /* rad/s, a little over one turn a second */
  const FLICK_MS = 320;
  const FLICK_PX = 36;

  let dragging = false, dragCase = false, discDragging = false;
  let decided = false, hitLid = false, hitDisc = false, shutAtDown = true;
  let px = 0, py = 0, sx = 0, sy = 0, moved = 0, downAt = 0, lastMove = 0;

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

  /* Where the lid's own mass travels on screen when the hinge opens a
     little, as a unit vector in screen space. Comparing a drag against this
     is what makes "along the lid's swing" mean the same thing at every hinge
     angle and at every orientation of the case, rather than being guessed at
     from the raw dx and dy. */
  const _sa = new THREE.Vector3(), _sb = new THREE.Vector3();
  function lidScreenDir() {
    if (!pivot) return null;
    _sa.copy(hinge.comAt(hinge.theta)).project(camera);
    _sb.copy(hinge.comAt(Math.min(hinge.thetaOpen, hinge.theta + DEG(8)))).project(camera);
    /* NDC y runs up, screen y runs down */
    const dx = _sb.x - _sa.x, dy = -(_sb.y - _sa.y);
    const L = Math.hypot(dx, dy);
    return L < 1e-6 ? null : { x: dx / L, y: dy / L };
  }

  function startSpin(delta, dur) {
    spin = { from: caseYaw, to: caseYaw + delta, t: 0, dur: dur };
    yawVel = 0;
    wake();
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
    if (!shutAtDown && hitLid) {
      const lid = lidScreenDir();
      const along = lid ? Math.abs(ux * lid.x + uy * lid.y) : 0;
      /* within about 53 degrees of the lid's own swing: you are working the
         hinge. Anything else is someone turning the case that the lid happens
         to be the front of, and v5 gave those to the hinge too. */
      if (along > 0.6) {
        hinge.auto = false;
        hinge.drag = { target: hinge.theta, k: hinge.kDrag, c: hinge.cDrag };
        diag.lastGesture = 'hinge(' + along.toFixed(2) + ')';
        return;
      }
      diag.lastGesture = 'case(off-swing ' + along.toFixed(2) + ')';
    } else {
      diag.lastGesture = shutAtDown ? 'case(shut)' : 'case';
    }
    dragCase = true;
  }

  el.addEventListener('pointerdown', e => {
    if (!diag.ok) return;
    dragging = true; decided = false;
    px = sx = e.clientX; py = sy = e.clientY; moved = 0;
    downAt = performance.now(); lastMove = downAt;
    sway = false; spin = null;
    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';
    setNDC(e);
    /* what is under the finger is RECORDED here, not acted on. The pose it
       was recorded in matters too: shut, the whole thing is one object you
       turn in your hand and the lid is not a separate target. */
    shutAtDown = hinge.theta < hinge.thetaOpen * SHUT_FRAC;
    hitLid = ray.intersectObjects(lidMeshes, false).length > 0;
    hitDisc = disc ? ray.intersectObject(disc, false).length > 0 : false;
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
      /* a drag the full width of the canvas is half a turn, at any size */
      const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
      const dYaw = dx * (Math.PI / w);
      const dPitch = dy * (DEG(110) / h);
      caseYaw += dYaw;
      casePitch = THREE.MathUtils.clamp(casePitch + dPitch, -DEG(55), DEG(55));
      /* smoothed across moves and clamped: one fast sample against a dtm
         floored at 8ms must not become a full turn of coast. See THREE. */
      yawVel = yawVel * 0.55 +
               THREE.MathUtils.clamp(dYaw / dtm, -VEL_MAX, VEL_MAX) * 0.45;
      pitchVel = pitchVel * 0.55 +
                 THREE.MathUtils.clamp(dPitch / dtm, -VEL_MAX, VEL_MAX) * 0.45;
    }
    wake();
  });

  function up(e) {
    if (!dragging) return;
    dragging = false; el.style.cursor = 'grab';
    try { el.releasePointerCapture(e.pointerId); } catch (_) {}
    const held = performance.now() - downAt;
    const tx = e.clientX - sx, ty = e.clientY - sy;
    const wasCase = dragCase;

    /* this has to come before tap(), not after: v5 called tap() and then
       cleared hinge.drag on the very next line, which is fine while a tap is
       an impulse and fatal now that it is a spring */
    if (!hinge.auto) hinge.drag = null;   /* release keeps omega: a flick follows through */
    dragCase = false; discDragging = false; discLastA = null;

    if (!decided && moved < TAP_PX && held < 500) { tap(); wake(); return; }

    /* FLICK TO FLIP. "If I do like a swipe, I should be able to flip it to the
       back." A fast, mostly horizontal throw that was turning the case snaps
       it half a turn, so the back cover is one gesture away instead of a
       careful 180 degrees of dragging. A slower drag still just turns it, and
       keeps its momentum. */
    if (wasCase && held < FLICK_MS && Math.abs(tx) > FLICK_PX &&
        Math.abs(tx) > Math.abs(ty) * 1.6) {
      startSpin(Math.sign(tx) * Math.PI, 0.55);
      diag.lastGesture = 'flip';
    }
    wake();
  }
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);

  function tap() {
    const open = hinge.theta < hinge.thetaOpen * 0.5;
    if (REDUCE) { hinge.theta = open ? hinge.thetaOpen : 0; hinge.omega = 0; applyHinge(); return; }
    /* v5 gave the lid an impulse and let gravity, friction and the detent
       decide where it came to rest, which on a tipped case could stall it
       well short of the stop. "If I tap it open, it should open all the way
       up where I can see the inside of the CD." So a tap springs the hinge to
       the stop and lets go once it arrives -- the physics still runs, it just
       has somewhere to be. The release is in the frame loop. */
    hinge.drag = { target: open ? hinge.thetaOpen : 0,
                   k: hinge.kDrag * 0.55, c: hinge.cDrag * 2.2 };
    hinge.auto = true;
    hinge.omega = (open ? hinge.tap : -hinge.tap) * 0.4;
    diag.lastGesture = open ? 'tap-open' : 'tap-shut';
  }
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', 'the jewel case — tap to open, drag to turn');
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sway = false; tap(); wake(); }
  });

  /* ------------------------------------------------------------------ tilt

     Permission is only ever asked for on a press of this button -- "so you
     press tilt and then it asks to use your thing" -- never on load. The
     button itself only appears on this slide; that is the gallery's job, in
     sie.*.js, which puts .on-case on the stage.

     The device's angles are stored RELATIVE to however the phone was being
     held at the moment tilt was switched on, so turning it on does not snap
     the case to some absolute pose, and they are added to the user's own
     rotation rather than replacing it. See the frame loop for why that
     matters to spinning. */
  const tilt = { on: false, pitch: 0, yaw: 0, base: null };
  let motionBound = false;

  function onOrient(ev) {
    if (!tilt.on) return;
    const beta = ev.beta || 0, gamma = ev.gamma || 0;
    if (!tilt.base) tilt.base = { beta: beta, gamma: gamma };
    tilt.pitch = THREE.MathUtils.clamp(DEG(beta - tilt.base.beta), -DEG(45), DEG(45));
    tilt.yaw = THREE.MathUtils.clamp(DEG(gamma - tilt.base.gamma), -DEG(70), DEG(70));
    sway = false; wake();
  }

  /* SHAKE TO SPIN. "If you shake your phone, it should do a full 360 around."
     accelerationIncludingGravity carries a steady ~9.8 whichever way the phone
     is held, so an absolute threshold would fire on a brisk tilt and never on
     a gentle shake. The magnitude is high-passed against its own running mean
     instead, and it is the DEPARTURE from that which counts. */
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

  /* iOS gates orientation and motion behind two separate prompts, and both
     have to be asked for from inside the click. */
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
        /* bound once: v5 added a fresh listener on every press */
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

  /* ------------------------------------------------- the measurement surface */
  diag.phys = hinge;
  /* v4 exposed no way to read the pose back, so a regression in the input could
     only be caught by diffing pixels. */
  diag.state = () => ({
    theta_deg: +RAD(hinge.theta).toFixed(2),
    theta_open_deg: +RAD(hinge.thetaOpen).toFixed(2),
    shut: hinge.theta < hinge.thetaOpen * SHUT_FRAC,
    pitch_deg: +RAD(casePitch).toFixed(2),
    yaw_deg: +RAD(caseYaw).toFixed(2),
    yaw_turns: +(caseYaw / (2 * Math.PI)).toFixed(3),
    tilt_on: tilt.on,
    tilt_pitch_deg: +RAD(tiltPitch).toFixed(2),
    tilt_yaw_deg: +RAD(tiltYaw).toFixed(2),
    spinning: !!spin,
    clear_specular: +specNow.toFixed(4),
    gesture: diag.lastGesture || null,
    hinge_auto: hinge.auto,
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
    applySpec();
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

  /* ---- the v6 claims, as numbers -------------------------------------- */

  /* Mean rendered colour of everything that is not the black sweep, in a
     given pose. The point of it is the claim that the backdrop and the
     roughness change leave v4's calibration against the printed cover alone:
     this is how that gets checked rather than asserted. The canvas has no
     preserveDrawingBuffer, so the render and the read have to happen in the
     same task -- which is exactly what this does. */
  diag.coverY = (o) => {
    const p = Object.assign({ theta: 0, pitch: 0, yaw: 0 }, o || {});
    diag.pose(p);
    const c = document.createElement('canvas');
    c.width = el.width; c.height = el.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(el, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0, sr = 0, sg = 0, sb = 0, y = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue;
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      if (r + gg + b < 36) continue;                 /* the sweep, not the case */
      sr += r; sg += gg; sb += b;
      y += 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      n++;
    }
    if (!n) return null;
    return { pose: p, px: n,
             srgb: [+(sr / n).toFixed(2), +(sg / n).toFixed(2), +(sb / n).toFixed(2)],
             luma: +(y / n).toFixed(3),
             clear_specular: +specNow.toFixed(4) };
  };

  /* the specular ramp, sampled across the whole hinge travel */
  diag.specCurve = () => {
    const out = [];
    for (let d = 0; d <= RAD(hinge.thetaOpen) + 0.001; d += 5) {
      const f = DEG(d) / hinge.thetaOpen;
      const u = THREE.MathUtils.clamp((f - SHUT_FRAC) / (SPEC_RAMP_END - SHUT_FRAC), 0, 1);
      out.push([d, +(CLEAR_SPEC_SHUT +
        (CLEAR_SPEC_OPEN - CLEAR_SPEC_SHUT) * (u * u * (3 - 2 * u))).toFixed(4)]);
    }
    return out;
  };

  /* drive the scripted turn without a phone to shake */
  diag.spin = (deg, dur) => { startSpin(DEG(deg === undefined ? 360 : deg),
                                        dur === undefined ? 1.15 : dur);
                              return { to_deg: +RAD(spin.to).toFixed(2) }; };
  diag.shake = () => { startSpin(2 * Math.PI, 1.15);
                       diag.shakes = (diag.shakes || 0) + 1;
                       return diag.shakes; };
  /* pretend to be a phone held at these angles, so the tilt path can be
     exercised on a desktop: the real listener writes the same two fields */
  diag.tiltSim = (on, pitchDeg, yawDeg) => {
    tilt.on = !!on;
    tilt.base = { beta: 0, gamma: 0 };
    tilt.pitch = DEG(pitchDeg || 0);
    tilt.yaw = DEG(yawDeg || 0);
    wake();
    return { on: tilt.on, pitch_deg: pitchDeg || 0, yaw_deg: yawDeg || 0 };
  };
  /* what a drag of (dx, dy) screen pixels starting on this point would be
     taken to MEAN, without actually doing it */
  diag.wouldDo = (dx, dy) => {
    const lid = lidScreenDir();
    const L = Math.hypot(dx, dy) || 1;
    const along = lid ? Math.abs((dx / L) * lid.x + (dy / L) * lid.y) : 0;
    return { lid_screen_dir: lid ? [+lid.x.toFixed(3), +lid.y.toFixed(3)] : null,
             along: +along.toFixed(3),
             verdict: along > 0.6 ? 'hinge' : 'case' };
  };
  diag.backdrop = (on) => { backdrop.visible = on !== false; return backdrop.visible; };
  /* run the frame update on a fixed clock, with no rAF involved */
  diag.advance = (seconds, hz) => {
    const f = hz || 60, h = 1 / f, n = Math.max(1, Math.round((seconds || 1) * f));
    for (let i = 0; i < n; i++) tick(h);
    renderer.render(scene, camera);
    return diag.state();
  };
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
    /* these probes read the alpha channel as an exact mask; an opaque
       backdrop would fill it in and every silhouette would come back solid */
    backdrop.visible = false;
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
