/* case.v1.js — the sie jewel case, slide 1 of the gallery.
   three.js r169 + a hand-written one-degree-of-freedom hinge. No physics engine:
   one hinge is one angle, and a solver for that is thirty lines.

   WHAT IS MEASURED, NOT ASSUMED
   -----------------------------
   The brief says the model ships open at 104.3 degrees and that theta = 104.3 is
   the open stop. The geometry says otherwise, and the geometry wins because the
   brief itself gives the test (lid normal . tray normal -> -1):

     inside_insert normal  (0.8859, -0.0080, 0.4639)   the lid face, into the case
     back_traycard normal  (0.6681,  0.0010,-0.7441)   out the back of the tray
     angle between them                      104.28 deg
     dihedral the case stands open at         75.72 deg
     rotation about Y that closes the lid    +75.70 deg  -> dot = -1.0000
     the same rotation at +104.3 deg                    -> dot = -0.8781
     the same rotation at -104.3 deg                    -> dot = +1.0000

   So 104.3 is the angle BETWEEN THE PLATE NORMALS when open, not the hinge
   travel; the travel is its supplement. THETA_OPEN below is solved at runtime
   from the two plates so it stays correct if the model is re-exported, and the
   three dot products above are republished on window.__case.closing every load.

   The web GLB's first export welded the whole clear shell into one mesh; this
   one (2.8 MB, "Materials v2") ships frame_5..frame_43 separately, so the hinge
   is built by reparenting named nodes exactly as BREAKDOWN.md describes. */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const HOST = document.getElementById('case3d');
const SLIDE = HOST && HOST.closest('.slide');
const TILT_BTN = document.getElementById('case-tilt');
/* relative locally; on Webflow the host carries data-model="https://assets.sie.market/..." */
const MODEL = (HOST && HOST.dataset.model) || 'assets/case/sie-case-web.glb';

/* the hinge: a vertical line in model space */
const HINGE = new THREE.Vector3(-0.1367, 0, -0.3281);

/* the lid side, from BREAKDOWN.md. Anything absent is skipped. */
const LID_NAMES = ['lid_clear', 'front_insert', 'inside_insert',
  'frame_5', 'frame_7', 'frame_8', 'frame_10', 'frame_19', 'frame_20', 'frame_22',
  'frame_24', 'frame_26', 'frame_27', 'frame_28', 'frame_29', 'frame_33', 'frame_34',
  'frame_35', 'frame_36', 'frame_37', 'frame_38', 'frame_42'];

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEG = THREE.MathUtils.degToRad;
const RAD = THREE.MathUtils.radToDeg;

const diag = { ok: false, reduce: REDUCE };
window.__case = diag;

/* ------------------------------------------------------------------ helpers */

/* the normal of a flat plate, from its first triangle, in world space */
function plateNormal(mesh) {
  const g = mesh.geometry, pos = g.getAttribute('position'), idx = g.index;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const i0 = idx ? idx.getX(0) : 0, i1 = idx ? idx.getX(1) : 1, i2 = idx ? idx.getX(2) : 2;
  a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
  const n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
  return n.applyMatrix3(new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)).normalize();
}
/* XZ bearing: rotating a vector about +Y by d degrees adds d to this */
const bearing = v => RAD(Math.atan2(v.x, v.z));
const wrap180 = d => { while (d > 180) d -= 360; while (d < -180) d += 360; return d; };

/* signed angle from a to b about a unit axis */
function signedAngle(a, b, axis) {
  const x = a.dot(b);
  const y = new THREE.Vector3().crossVectors(a, b).dot(axis);
  return Math.atan2(y, x);
}

/* ===========================================================================
   THE HINGE
   theta = 0 closed, theta = thetaOpen the open stop. One angle, one velocity,
   fixed 1/240 s substeps, semi-implicit Euler. Gravity torque is recomputed
   every substep from the case's CURRENT world rotation, which is the whole
   point: tip the case and the lid swings.
   =========================================================================== */
class Hinge {
  constructor() {
    this.theta = 0; this.omega = 0;
    this.thetaOpen = DEG(75.7);
    this.I = 1;
    this.g = 40.17;               /* tuned: a half-open lid, tipped, shuts in 0.500 s */
    this.cVisc = 5.0;             /* viscous. 0.6 left a 12 rad/s flick rebounding 43 deg;
                                     this is what makes the end stop read as plastic. */
    this.rest = 0.18;             /* end-stop restitution */
    this.detentZone = DEG(7);
    this.sleep = 0.12;            /* |omega| under this at a stop is a stop */
    this.tap = 9.0;               /* tap impulse, rad/s — the brief's value, which
                                     only behaves once cVisc is raised */
    /* set once the geometry is known */
    this.d = 1; this.tauMax = 1;
    this.mus = 0; this.muk = 0; this.kDetent = 0; this.seat = 0;
    /* frame constants, refreshed once per frame */
    this.axisW = new THREE.Vector3(0, 1, 0);
    this.hingeW = new THREE.Vector3();
    this.comPivot = new THREE.Vector3();
    this.parentM = new THREE.Matrix4();
    this.sign = -1;               /* pivot.rotation.y = closedY + sign*theta */
    this.closedY = 0;
    this.drag = null;             /* {target, k, c} while the lid is held */
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._one = new THREE.Vector3(1, 1, 1);
  }

  /* the brief's ratios, against the measured maximum gravity torque */
  calibrate() {
    this.tauMax = this.g * this.d * this.I;
    this.mus = 0.35 * this.tauMax;
    this.muk = 0.25 * this.tauMax;
    this.kDetent = 1.4 * this.tauMax;
    /* A spring that is -k*theta is zero AT theta = 0, so on its own it cannot
       hold a shut lid against gravity (scenario 2). A real case has a snap, so
       the detent zone also raises the static threshold. Measured below. */
    this.seat = 0.9 * this.tauMax;
    this.kDrag = 6 * this.tauMax;
    this.cDrag = 1.2;
  }

  /* world position of the lid's centre of mass at a given theta */
  comAt(theta) {
    this._q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.closedY + this.sign * theta);
    this._m.compose(HINGE, this._q, this._one);
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
      if (Math.abs(net) <= hold) return;                       /* static: stays put */
      net -= Math.sign(net) * hold;
    }
    this.omega += (net / this.I) * h;

    const dv = (this.muk / this.I) * h;                        /* Coulomb, never reverses */
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

  advance(dt) {                                                /* 4 substeps, 240 Hz */
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  /* The transmission pass re-renders the whole scene into an offscreen target:
     measured 43 -> 85 draw calls and 489k -> 978k triangles per frame. Half
     resolution on that target is the single cheapest thing that buys the glass
     back on a phone; r168+ exposes it, older builds ignore the property. */
  if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = 0.5;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.cssText =
    'display:block;width:100%;height:100%;touch-action:none;cursor:grab;outline:none';
  HOST.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(-1.6, 2.2, 1.4);                         /* upper left */
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0012;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.ShadowMaterial({ opacity: 0.35 }));
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
  let lidMeshes = [], radius = 1, faceYaw = 0;

  /* case orientation, with inertia */
  let casePitch = 0, caseYaw = 0, pitchVel = 0, yawVel = 0;
  let swayT = 0, sway = !REDUCE;
  let discOmega = 0, motorOn = false;

  function size() {
    const w = Math.max(1, HOST.clientWidth), h = Math.max(1, HOST.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const vfov = DEG(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    camera.position.set(0, 0, radius / Math.sin(Math.min(vfov, hfov) / 2) * 1.08);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  loader.load(MODEL, gltf => {
    root = gltf.scene;
    root.updateMatrixWorld(true);

    const inside = root.getObjectByName('inside_insert');
    const card = root.getObjectByName('back_traycard');
    disc = root.getObjectByName('disc');
    const hub = root.getObjectByName('hub');
    if (!inside || !card) { diag.error = 'printed plates missing'; return; }

    const insideN = plateNormal(inside);
    const cardN = plateNormal(card);
    const trayIn = cardN.clone().negate();        /* the face the disc sits on */

    /* ---- the hinge, by reparenting, world transforms kept ---------------- */
    pivot = new THREE.Object3D();
    pivot.position.copy(HINGE);
    root.add(pivot);
    root.updateMatrixWorld(true);
    const attached = [];
    for (const n of LID_NAMES) {
      const o = root.getObjectByName(n);
      if (o) { pivot.attach(o); attached.push(n); }
    }
    root.updateMatrixWorld(true);
    diag.lid_parts = attached.length;
    diag.lid_missing = LID_NAMES.filter(n => !attached.includes(n));

    /* ---- solve the closing rotation, then verify it ---------------------- */
    const openY = pivot.rotation.y;
    const delta = wrap180(bearing(cardN) - bearing(insideN));
    hinge.closedY = openY + DEG(delta);
    hinge.sign = -Math.sign(delta);
    hinge.thetaOpen = Math.abs(DEG(delta));

    const dotAt = y => {
      const keep = pivot.rotation.y;
      pivot.rotation.y = y; root.updateMatrixWorld(true);
      const d = plateNormal(inside).dot(trayIn);
      pivot.rotation.y = keep; root.updateMatrixWorld(true);
      return +d.toFixed(4);
    };
    diag.closing = {
      solved_deg: +delta.toFixed(2),
      sign_chosen: delta > 0 ? '+' : '-',
      dot_at_solved: dotAt(hinge.closedY),
      dot_at_plus_104_3: dotAt(openY + DEG(104.3)),
      dot_at_minus_104_3: dotAt(openY - DEG(104.3)),
      open_dihedral_deg: +(180 - RAD(Math.acos(
        THREE.MathUtils.clamp(insideN.dot(trayIn), -1, 1)))).toFixed(2),
      normals_angle_deg: +RAD(Math.acos(
        THREE.MathUtils.clamp(insideN.dot(trayIn), -1, 1))).toFixed(2),
      theta_open_deg: +RAD(hinge.thetaOpen).toFixed(2),
    };

    /* ---- the lid's centre of mass, in the pivot's frame ------------------ */
    pivot.rotation.y = hinge.closedY;
    root.updateMatrixWorld(true);
    const lidBox = new THREE.Box3().setFromObject(pivot);
    const comW = lidBox.getCenter(new THREE.Vector3());
    hinge.comPivot.copy(pivot.worldToLocal(comW.clone()));

    /* ---- the disc turns about the tray normal, through the hub centre ---- */
    if (disc) {
      const centre = (hub ? new THREE.Box3().setFromObject(hub)
        : new THREE.Box3().setFromObject(disc)).getCenter(new THREE.Vector3());
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

    /* ---- shadows, and the lid meshes the raycaster needs ----------------- */
    root.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      if (!o.geometry.getAttribute('normal')) o.geometry.computeVertexNormals();
    });
    pivot.traverse(o => { if (o.isMesh) lidMeshes.push(o); });

    /* ---- front cover to the viewer, then frame it ------------------------ */
    const front = root.getObjectByName('front_insert');
    faceYaw = front ? -DEG(bearing(plateNormal(front))) : 0;

    const box = new THREE.Box3().setFromObject(root);
    const centre = box.getCenter(new THREE.Vector3());
    root.position.sub(centre);
    yawObj.add(root);
    yawObj.rotation.y = faceYaw;
    rig.updateMatrixWorld(true);

    const full = new THREE.Box3().setFromObject(rig);
    radius = full.getBoundingSphere(new THREE.Sphere()).radius;
    ground.position.y = full.min.y - 0.004;

    const sh = radius * 1.6;
    key.shadow.camera.left = -sh; key.shadow.camera.right = sh;
    key.shadow.camera.top = sh; key.shadow.camera.bottom = -sh;
    key.shadow.camera.near = 0.01; key.shadow.camera.far = radius * 12;
    key.position.set(-radius * 2.2, radius * 2.8, radius * 1.8);
    key.shadow.camera.updateProjectionMatrix();

    /* ---- the hinge's frame constants, then calibration ------------------- */
    refreshFrame();
    const r = hinge.comAt(0).sub(hinge.hingeW);
    hinge.d = r.clone().sub(hinge.axisW.clone().multiplyScalar(r.dot(hinge.axisW))).length();
    hinge.calibrate();
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

    applyHinge();
    diag.ok = true;
    diag.tris = 0;
    root.traverse(o => { if (o.isMesh) diag.tris += (o.geometry.index ? o.geometry.index.count : o.geometry.getAttribute('position').count) / 3; });
    diag.transmissive = [];
    root.traverse(o => { if (o.isMesh && o.material && o.material.transmission > 0) diag.transmissive.push(o.name); });

    SLIDE && SLIDE.classList.add('has3d');
    size();
    wake();
  }, undefined, e => { diag.error = 'load: ' + e; });

  /* ----------------------------------------------------------- frame upkeep */
  function refreshFrame() {
    rig.updateMatrixWorld(true);
    hinge.parentM.copy(pivot.parent.matrixWorld);
    hinge.hingeW.copy(HINGE).applyMatrix4(hinge.parentM);
    hinge.axisW.set(0, 1, 0).transformDirection(hinge.parentM).normalize();
  }
  function applyHinge() {
    pivot.rotation.y = hinge.closedY + hinge.sign * hinge.theta;
  }

  /* ------------------------------------------------------------- the loop */
  let running = false, raf = 0, last = 0;
  let frames = 0, fpsT0 = 0, fps = 0;

  function busy() {
    return dragging || Math.abs(hinge.omega) > 0.001 || hinge.drag
      || Math.abs(discOmega) > 0.001 || motorOn
      || Math.abs(pitchVel) > 0.001 || Math.abs(yawVel) > 0.001
      || (sway && !REDUCE) || pending;
  }
  let pending = 0;
  function wake() { pending = 2; if (!running && visible && diag.ok) { running = true; last = 0; raf = requestAnimationFrame(frame); } }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;

    /* case orientation: inertia, damping 4/s, pitch clamped */
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

    /* the disc: angular momentum, friction 0.15/s, a motor while open */
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
  /* the theta the pointer is asking for, about the hinge axis */
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
  /* headless: run the hinge alone and return theta(t) in degrees */
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
  diag.renderOnce = () => { refreshFrame(); applyHinge(); renderer.render(scene, camera); };
  diag.info = () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles });
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
