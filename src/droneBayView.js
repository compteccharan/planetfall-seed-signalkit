import * as THREE from "three";
import { makeBeamTexture, makeIceBlock, makeIdSprite } from "./memoryProps.js";

// LEVEL 2 ("The Drone Bay") — a COMMAND PASS / order-ticket rush.
// (Full design notes live above createDroneBayView, further down this file.)
//
// You stand at the ship's command pass. Six subagents rebuild the ship in
// parallel; each finished job rides up the pass as a sealed checkpoint slate:
//
//   tap a slate          → `entire checkpoint explain <id>` runs, the card opens
//   read what it did      → press Y / ADD TO SHIP → it flies to the hull, online
//   all twelve online     → type `entire dispatch` — the day's report writes itself
//
// The LAUNCH WINDOW (clock) runs the whole time, so clearing the pass with
// `explain` IS the rush. Records never expire — the pressure is the flood: the
// bigger your unreviewed pile, the FASTER the window drains (the ship can't
// stabilise on work nobody has accounted for).

const TOTAL_TIME = 75;       // launch window, seconds (tunable)
const N_WORKERS = 6;         // subagents working in parallel
const WORK_TIME = 6.5;       // base seconds a subagent spends on a job (tunable)
const WORK_JITTER = 2.5;     // ± so finished jobs don't all arrive in lockstep
const VISIBLE_SLOTS = 5;     // slate positions on the pass; extra finishes back up
const RAIL_DRAIN = 0.14;     // each waiting ticket makes the window drain this much faster
const BACKLOG_PANIC = 5;     // unreviewed pile at/over this = "ship unstable"
const LOW_TIME = 22;         // clock turns urgent under this
const CRIT_TIME = 10;        // clock goes CRITICAL under this
const PANIC_TIME = 30;       // the SKY starts shifting toward panic-red
const MELT_DUR = 1.2;        // seconds the ice takes to melt on ADD TO SHIP

const SLOT_X0 = -16;         // leftmost (front-most) pass slot, x
const SLOT_DX = 8;           // spacing between pass slots
const BELT_Y = 3.0;          // slate resting height on the belt
const ENTRANCE_X = 26;       // where a finished slate slides in from

const FLY_DUR = 1.1;         // seconds a drone takes to fly out / back
const DRONE_Z = -8;          // the drone bay row (resting), z
const SITE_Y = 8.0;          // a drone rises to this height to work on the hull
const SITE_Z = -16;          // ...and pushes back toward the ship to do it

// Onboarding — two load-bearing beats (problem → action), advanced with Space.
const BRIEFING_BEATS = [
  "Your six subagents are rebuilding the ship in parallel. Finished work rides up the pass faster than you can glance at it.",
  "Tap a checkpoint to run `entire checkpoint explain`, see what the subagent did, then add it to the ship before the launch window closes.",
];

// Sky panic palette — same dread as Level 1's clock.
const SKY_CALM  = new THREE.Color(0x2a2350);
const SKY_PANIC = new THREE.Color(0x6e0f16);
const FOG_PANIC = new THREE.Color(0x4a0a0e);
const DOME_CALM = new THREE.Color(0x3a3168);
const DOME_PANIC = new THREE.Color(0x7a141c);
const SUN_CALM  = new THREE.Color(0xfff1dc);
const SUN_PANIC = new THREE.Color(0xff5a3c);

// The five HERO systems — rich cards, fixed ids. Exported and FROZEN: Level 3
// quizzes the player on this exact record (and uses sys.pos on its own island).
// Level 2 lays out its own grid and never touches sys.pos.
export const SYSTEMS = [
  {
    ckpt: "a1c9e4f72b05", name: "IGNITION COILS",
    pos: { x: -34, z: -28 },
    broken: "buildBrokenCoils", upgrade: "buildPlasmaRing",
    became: "Plasma Ring",
    card: [
      ["subagent", "subagent-1"],
      ["system", "ignition coils"],
      ["did", "coils beyond saving — rebuilt as a plasma ring from salvaged hull plate"],
      ["session", "2 attempts · parts scavenged: hull plate ×3"],
    ],
  },
  {
    ckpt: "3d7b0f9c61ae", name: "NAV CORE",
    pos: { x: 40, z: -18 },
    broken: "buildBrokenNav", upgrade: "buildStarDome",
    became: "Star Dome",
    card: [
      ["subagent", "subagent-2"],
      ["system", "nav core"],
      ["did", "core unrecoverable — remapped from scratch; starfield calibrated to the lavender belt"],
      ["session", "1 attempt · 412 stars plotted"],
    ],
  },
  {
    ckpt: "f25c8b30d971", name: "LONG-RANGE ANTENNA",
    pos: { x: 28, z: 38 },
    broken: "buildBrokenDish", upgrade: "buildSignalSpire",
    became: "Signal Spire",
    card: [
      ["subagent", "subagent-3"],
      ["system", "long-range antenna"],
      ["did", "dish unsalvageable — respun the mast into a signal spire; relay handshake at full strength"],
      ["session", "3 attempts · the first two fell over"],
    ],
  },
  {
    ckpt: "62e0a9d4c8f3", name: "LIFE SUPPORT",
    pos: { x: -30, z: 36 },
    broken: "buildBrokenVent", upgrade: "buildGardenPod",
    became: "Garden Pod",
    card: [
      ["subagent", "subagent-4"],
      ["system", "life support scrubbers"],
      ["did", "filters dead — replaced with a living filter; two vines scavenged from the crash"],
      ["session", "1 attempt · the vines approved"],
    ],
  },
  {
    ckpt: "8b47f1e62da0", name: "LANDING STRUTS",
    pos: { x: 8, z: -44 },
    broken: "buildBrokenStrut", upgrade: "buildGravSkid",
    became: "Grav Skid",
    card: [
      ["subagent", "subagent-5"],
      ["system", "landing struts"],
      ["did", "strut seized solid — swapped for grav skids; technically the ship floats now"],
      ["session", "2 attempts · torque spec: vibes"],
    ],
  },
];

// Seven GENERIC repair jobs — lighter cards, but still gated by explain + add.
// These are Level-2-only; Level 3 never sees them. Prop builders are reused.
const GENERIC_JOBS = [
  {
    ckpt: "7c1d4a9e3f20", name: "COOLANT LOOP",
    broken: "buildBrokenVent", upgrade: "buildGardenPod", became: "Frost Lattice",
    card: [
      ["subagent", "subagent-6"],
      ["system", "coolant loop"],
      ["did", "loop cracked — rerouted into a frost lattice that self-seals"],
      ["session", "1 attempt · pressure nominal"],
    ],
  },
  {
    ckpt: "b93f0e7a15cc", name: "CARGO CLAMP",
    broken: "buildBrokenStrut", upgrade: "buildGravSkid", became: "Mag Cradle",
    card: [
      ["subagent", "subagent-7"],
      ["system", "cargo clamp"],
      ["did", "clamp sheared — replaced with a mag cradle; cargo floats in place"],
      ["session", "2 attempts · zero drift"],
    ],
  },
  {
    ckpt: "2e6c8b04d7a1", name: "HULL PLATING",
    broken: "buildBrokenCoils", upgrade: "buildPlasmaRing", became: "Weave Patch",
    card: [
      ["subagent", "subagent-8"],
      ["system", "hull plating"],
      ["did", "plate burned through — wove a patch from spare filament"],
      ["session", "1 attempt · airtight"],
    ],
  },
  {
    ckpt: "5a0f3d2c9b88", name: "SENSOR MAST",
    broken: "buildBrokenDish", upgrade: "buildSignalSpire", became: "Spindle Array",
    card: [
      ["subagent", "subagent-9"],
      ["system", "sensor mast"],
      ["did", "mast snapped — respun as a spindle array; wider field of view"],
      ["session", "2 attempts · recalibrated twice"],
    ],
  },
  {
    ckpt: "e4717c5a0d63", name: "WATER RECLAIM",
    broken: "buildBrokenNav", upgrade: "buildStarDome", became: "Dew Still",
    card: [
      ["subagent", "subagent-10"],
      ["system", "water reclaim"],
      ["did", "reclaimer fouled — rebuilt as a dew still pulling from the fog"],
      ["session", "1 attempt · the first cup was awful"],
    ],
  },
  {
    ckpt: "9d28b6f1e470", name: "DOCKING RING",
    broken: "buildBrokenStrut", upgrade: "buildGravSkid", became: "Halo Collar",
    card: [
      ["subagent", "subagent-11"],
      ["system", "docking ring"],
      ["did", "ring warped — reformed into a halo collar; soft-dock only"],
      ["session", "3 attempts · the seal finally held"],
    ],
  },
  {
    ckpt: "c6053a8e2f19", name: "POWER CELL",
    broken: "buildBrokenCoils", upgrade: "buildPlasmaRing", became: "Cell Bloom",
    card: [
      ["subagent", "subagent-12"],
      ["system", "power cell"],
      ["did", "cell dead — regrew it as a bloom of smaller cells in series"],
      ["session", "2 attempts · output up 12%"],
    ],
  },
];

// The full job board: 5 hero + 7 generic = 12 tracks.
const JOBS = [...SYSTEMS, ...GENERIC_JOBS];

function normalizeCmd(s) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// ---------- prop builders: the broken systems ----------
const CHARRED = () => new THREE.MeshStandardMaterial({ color: 0x2a2e38, roughness: 0.9, metalness: 0.3 });
const SCORCH = () => new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.85, metalness: 0.25 });

function withWarnLight(g) {
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x401512, emissive: 0xff3b2e, emissiveIntensity: 1.6 })
  );
  bulb.position.y = g.userData.warnY ?? 3.2;
  g.add(bulb);
  g.userData.warn = bulb;
  return g;
}
function buildBrokenCoils() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(1.1 - i * 0.18, 1.2 - i * 0.18, 1.0, 10), i ? CHARRED() : SCORCH());
    c.position.y = 0.5 + i * 1.05;
    c.rotation.z = (i % 2 ? -1 : 1) * 0.12 * (i + 1);
    g.add(c);
  }
  g.userData.warnY = 3.6;
  return withWarnLight(g);
}
function buildBrokenNav() {
  const g = new THREE.Group();
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 1.4, 8), SCORCH());
  ped.position.y = 0.7;
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 0), CHARRED());
  core.position.y = 2.6;
  core.rotation.set(0.4, 0.2, 0.5);
  g.add(ped, core);
  g.userData.warnY = 4.4;
  return withWarnLight(g);
}
function buildBrokenDish() {
  const g = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 3.2, 8), SCORCH());
  mast.position.y = 1.4;
  mast.rotation.z = 0.5;
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.5, 0.4, 12), CHARRED());
  dish.position.set(1.6, 0.5, 0);
  dish.rotation.z = 1.2;
  g.add(mast, dish);
  g.userData.warnY = 3.0;
  return withWarnLight(g);
}
function buildBrokenVent() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.0, 2.0), SCORCH());
  box.position.y = 1.0;
  for (let i = 0; i < 3; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.1), CHARRED());
    slat.position.set(0, 0.6 + i * 0.5, 1.06);
    slat.rotation.x = 0.5;
    g.add(slat);
  }
  g.add(box);
  g.userData.warnY = 2.8;
  return withWarnLight(g);
}
function buildBrokenStrut() {
  const g = new THREE.Group();
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.2, 0.8), SCORCH());
  leg.position.set(0, 1.6, 0);
  leg.rotation.z = 0.55;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.5, 10), CHARRED());
  foot.position.set(1.6, 0.25, 0);
  g.add(leg, foot);
  g.userData.warnY = 3.4;
  return withWarnLight(g);
}

// ---------- prop builders: what the cars improvise them into ----------
function buildPlasmaRing() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.7, 10), SCORCH());
  base.position.y = 0.35;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.8, 0.3, 12, 36),
    new THREE.MeshStandardMaterial({ color: 0x6b4a16, emissive: 0xffb86b, emissiveIntensity: 1.4, roughness: 0.4 })
  );
  ring.position.y = 3.4;
  g.add(base, ring);
  g.userData.anim = { type: "ring", ring };
  return g;
}
function buildStarDome() {
  const g = new THREE.Group();
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 1.2, 8), SCORCH());
  ped.position.y = 0.6;
  const stars = new THREE.BufferGeometry();
  const pts = new Float32Array(120 * 3);
  for (let i = 0; i < 120; i++) {
    const r = 1.2 + Math.random() * 1.4;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.random() * Math.PI * 0.5;
    pts[i * 3] = Math.cos(th) * Math.sin(ph) * r;
    pts[i * 3 + 1] = 3.2 + Math.cos(ph) * r * 0.9;
    pts[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * r;
  }
  stars.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  const field = new THREE.Points(stars, new THREE.PointsMaterial({
    color: 0xbfe9ff, size: 0.16, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const orbit = new THREE.Mesh(
    new THREE.TorusGeometry(2.0, 0.05, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0x6fe3ff, transparent: true, opacity: 0.7 })
  );
  orbit.position.y = 3.6;
  orbit.rotation.x = Math.PI / 2.4;
  g.add(ped, field, orbit);
  g.userData.anim = { type: "dome", field, orbit };
  return g;
}
function buildSignalSpire(beamTex) {
  const g = new THREE.Group();
  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 7.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a4150, metalness: 0.7, roughness: 0.3, emissive: 0x123a4a, emissiveIntensity: 0.8 })
  );
  spire.position.y = 3.75;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 70, 10, 1, true),
    new THREE.MeshBasicMaterial({
      map: beamTex, color: 0x9af0ff, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    })
  );
  beam.position.y = 42;
  beam.visible = false;
  g.add(spire, beam);
  g.userData.anim = { type: "spire", beam };
  return g;
}
function buildGardenPod() {
  const g = new THREE.Group();
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 0.6, 12), SCORCH());
  tray.position.y = 0.3;
  for (let i = 0; i < 5; i++) {
    const plant = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.9 + (i % 3) * 0.35, 6),
      new THREE.MeshStandardMaterial({ color: 0x1d4a2c, emissive: 0x35d97a, emissiveIntensity: 0.7, roughness: 0.7 })
    );
    const a = (i / 5) * Math.PI * 2;
    plant.position.set(Math.cos(a) * 1.0, 1.0, Math.sin(a) * 1.0);
    g.add(plant);
  }
  const domeGlass = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0xd8ffe9, metalness: 0, roughness: 0.05, transmission: 0.7,
      thickness: 1.2, transparent: true, opacity: 0.4,
    })
  );
  domeGlass.position.y = 0.6;
  g.add(tray, domeGlass);
  g.userData.anim = { type: "pod" };
  return g;
}
function buildGravSkid() {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 1.9, 0.5, 12),
    new THREE.MeshStandardMaterial({ color: 0x2c3140, metalness: 0.6, roughness: 0.35, emissive: 0x123a4a, emissiveIntensity: 0.7 })
  );
  pad.position.y = 1.6;
  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(1.5, 0.12, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0x6fe3ff, transparent: true, opacity: 0.65 })
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.5;
  g.add(pad, glow);
  g.userData.anim = { type: "skid", pad, glow };
  return g;
}

// Level 3 places the finished upgrades on its own island.
export const UPGRADE_BUILDERS = {
  buildPlasmaRing, buildStarDome, buildSignalSpire, buildGardenPod, buildGravSkid,
};

// ====================================================================
// LEVEL 2 — "The Drone Bay", rebuilt as a COMMAND PASS (order-ticket rush).
//
// You don't run the island any more. You stand at the ship's command pass.
// Six subagents rebuild the ship in parallel behind you; every job they finish
// rides UP THE PASS toward you as a sealed checkpoint slate, carrying the thing
// they improvised (a star dome, a plasma ring) so you wonder "what did it DO?".
//
//   tap a slate         → `entire checkpoint explain <id>` runs, the card opens
//   read what it did    → press Y / ADD TO SHIP → it flies to the hull, a light
//                          comes on, the next ticket slides up
//   all twelve online   → type `entire dispatch` right there — the day's report
//                          writes itself. Finish line.
//
// THE CLOCK IS THE LAUNCH WINDOW and it runs the WHOLE time — clearing the pass
// with `explain` IS the timed game (the old build made review calm; this one
// makes it the rush). Records never expire — a checkpoint is permanent. The
// pressure is the flood: subagents finish faster than you can glance, the pass
// floods, and the bigger your unreviewed pile the FASTER the launch window
// drains (the ship can't stabilise on work nobody has accounted for).
// ====================================================================

// ---------- canvas-texture text label (system name over a slate) ----------
function makeLabelSprite(text, { color = "#dff1ff", weight = 700, px = 52 } = {}) {
  const pad = 24;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  ctx.font = `${weight} ${px}px "Segoe UI", system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = px + pad * 2;
  c.width = w; c.height = h;
  ctx.font = `${weight} ${px}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  spr.scale.set(w / h * 1.4, 1.4, 1);
  return spr;
}

// ---------- the scrolling pass belt texture (chevrons) ----------
function makeBeltTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#10151f";
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = "rgba(111,227,255,0.5)";
  ctx.lineWidth = 9;
  for (let x = -64; x < 128; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 8); ctx.lineTo(x + 24, 32); ctx.lineTo(x, 56);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  return tex;
}

// ---------- a finished-work slate that rides the belt ----------
function buildSlate(job, upgradeModel, beamTex) {
  const g = new THREE.Group();
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.5, 4.6),
    new THREE.MeshStandardMaterial({ color: 0x1b2230, metalness: 0.6, roughness: 0.4, emissive: 0x0c2030, emissiveIntensity: 0.5 })
  );
  slab.position.y = 0.25;
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 0.16, 4.9),
    new THREE.MeshBasicMaterial({ color: 0x6fe3ff, transparent: true, opacity: 0.55 })
  );
  rim.position.y = 0.02;
  g.add(slab, rim);

  upgradeModel.scale.setScalar(0.52);
  upgradeModel.position.y = 0.5;
  g.add(upgradeModel);

  const ice = makeIceBlock();
  ice.scale.setScalar(1.05);
  ice.position.y = 2.1;
  g.add(ice);

  const idSprite = makeIdSprite(job.ckpt);
  idSprite.position.y = 5.0;
  g.add(idSprite);
  const nameSprite = makeLabelSprite(job.name);
  nameSprite.position.y = 6.0;
  g.add(nameSprite);

  g.userData = { job, slab, rim, ice, idSprite, nameSprite, upgradeModel };
  return g;
}

// ---------- a subagent: the original Drone Bay drone (octahedron + halo ring) ----------
// Restored from commit 0553cd7 ("Add Level 2 'The Drone Bay'"): a dark metallic
// octahedron body wrapped in a spinning cyan torus — a hovering repair probe.
function buildDrone() {
  const group = new THREE.Group();
  const craft = new THREE.Group();        // the flying body (bobs locally)
  craft.position.y = 2.6;                  // resting hover height above the pad

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2c3140, metalness: 0.6, roughness: 0.3, emissive: 0x2a8aa6, emissiveIntensity: 1.0,
  });
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), bodyMat);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.11, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0x6fe3ff, transparent: true, opacity: 0.85 })
  );
  halo.rotation.x = Math.PI / 2;
  craft.add(body, halo);

  // hover underglow
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({ color: 0x6fe3ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.05;
  group.add(glow, craft);

  // landing pad
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.4, 0.3, 12),
    new THREE.MeshStandardMaterial({ color: 0x191320, metalness: 0.5, roughness: 0.7 })
  );
  pad.position.y = 0.15;
  group.add(pad);

  // "ready to send" cue — a pulsing ground ring + a SEND label, shown while idle
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.12, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.8 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.32;
  const sendLabel = makeLabelSprite("SEND ▸", { px: 44, color: "#ffd27a" });
  sendLabel.position.y = 4.4;
  // a generous invisible hit target so the whole drone is easy to click
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 5.4, 3.6),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.y = 2.4;
  group.add(ring, sendLabel, hit);

  group.userData = { craft, bodyMat, halo, glow, ring, sendLabel };
  return group;
}

// ---------- the ship hull status board (one pip per system) ----------
function buildShipBoard(jobs) {
  const group = new THREE.Group();
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(34, 9, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x141a26, metalness: 0.5, roughness: 0.6 })
  );
  group.add(panel);
  const head = makeLabelSprite("SHIP SYSTEMS", { px: 44, color: "#8fb6d6" });
  head.position.set(0, 3.3, 0.6);
  group.add(head);
  const pips = jobs.map((job, idx) => {
    const col = idx % 6, row = Math.floor(idx / 6);
    const pip = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0x2a1010, emissive: 0xff3b2e, emissiveIntensity: 0.5, roughness: 0.5 })
    );
    pip.position.set(-13.5 + col * 5.4, 1.0 - row * 2.6, 0.7);
    group.add(pip);
    return pip;
  });
  return { group, pips };
}

export function createDroneBayView(renderer, { onExit, onComplete, onNext, onNewGame } = {}) {
  const canvas = renderer.domElement;

  // ---------- scene & sky ----------
  const scene = new THREE.Scene();
  scene.background = SKY_CALM.clone();
  scene.fog = new THREE.Fog(SKY_CALM.clone(), 70, 220);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 11.5, 27);
  camera.lookAt(0, 3.2, -1);

  // ---------- lighting ----------
  scene.add(new THREE.HemisphereLight(0xcdbcff, 0x3a2f5e, 0.8));
  const sun = new THREE.DirectionalLight(SUN_CALM, 1.4);
  sun.position.set(40, 80, 50);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x6a5a92, 0.35));

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    new THREE.MeshBasicMaterial({ color: DOME_CALM.clone(), side: THREE.BackSide, fog: false })
  );
  scene.add(dome);

  // ---------- the deck the pass sits on ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    new THREE.MeshStandardMaterial({ color: 0x171420, metalness: 0.4, roughness: 0.85 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  const beamTex = makeBeamTexture();

  const BUILDERS = {
    buildPlasmaRing, buildStarDome, buildGardenPod, buildGravSkid,
    buildSignalSpire: () => buildSignalSpire(beamTex),
  };

  // ---------- the pass belt ----------
  const beltTex = makeBeltTexture();
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(54, 0.9, 6.4),
    new THREE.MeshStandardMaterial({ map: beltTex, color: 0x8fb6d6, metalness: 0.3, roughness: 0.6, emissive: 0x16384a, emissiveIntensity: 0.5 })
  );
  belt.position.set(0, BELT_Y - 1.0, 2);
  scene.add(belt);
  // glowing pickup lip nearest the player (front edge of the pass)
  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(54, 0.2, 0.4),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.5 })
  );
  lip.position.set(0, BELT_Y - 0.5, 5.2);
  scene.add(lip);

  // ---------- the ship status board (behind the workers) ----------
  const board = buildShipBoard(JOBS);
  board.group.position.set(0, 11, -20);
  scene.add(board.group);

  // ---------- the six subagent stations ----------
  const workers = Array.from({ length: N_WORKERS }, (_, i) => {
    const mesh = buildDrone();
    const homeX = -15 + i * 6;
    const home = new THREE.Vector3(homeX, 0, DRONE_Z);
    const site = new THREE.Vector3(homeX * 0.6, SITE_Y, SITE_Z);   // up & back toward the hull
    mesh.position.copy(home);
    mesh.userData.workerIdx = i;
    scene.add(mesh);
    return {
      mesh, home, site, jobIdx: null, queue: [], timer: 0, flyProg: 0,
      // phase: idle (home, has a job to send) → out → work → back → idle/done.
      // "idle" with a queued job = sendable; "done" = no jobs left, parked.
      phase: "idle",
    };
  });
  // round-robin: each subagent owns two jobs (12 jobs / 6 workers)
  JOBS.forEach((_, idx) => workers[idx % N_WORKERS].queue.push(idx));

  // ---------- one record per job ----------
  const slates = JOBS.map((job, idx) => {
    const upgradeModel = BUILDERS[job.upgrade]();
    const slate = buildSlate(job, upgradeModel, beamTex);
    slate.visible = false;
    slate.userData.jobIdx = idx;
    scene.add(slate);
    // surface the live spire beam off (it lights when added)
    const anim = upgradeModel.userData.anim;
    if (anim?.type === "spire") anim.beam.visible = false;
    return {
      job, idx, slate, upgradeModel,
      state: "working",            // working → onpass → added
      explained: false,
      x: ENTRANCE_X, meltT: 0,
      fly: null,                   // {from,to,prog} while flying to the hull
    };
  });

  // jobs currently riding the pass (waiting review), arrival order
  const pass = [];

  // ---------- spark bursts ----------
  const sparks = [];
  function spawnSpark(pos, color = 0x9af0ff, n = 14) {
    const arr = new Float32Array(n * 3);
    const vel = [];
    for (let i = 0; i < n; i++) {
      arr[i * 3] = pos.x; arr[i * 3 + 1] = pos.y; arr[i * 3 + 2] = pos.z;
      vel.push(new THREE.Vector3((Math.random() - 0.5) * 9, Math.random() * 7, (Math.random() - 0.5) * 9));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.45, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    sparks.push({ pts, geo, mat, vel, life: 0, ttl: 0.7 });
  }

  // ---------- HUD elements ----------
  const promptEl = document.getElementById("fp-prompt");
  const controlsEl = document.getElementById("fp-controls");
  const tutorialEl = document.getElementById("tutorial");
  const fpShared = document.getElementById("fp-shared");
  const termEl = document.getElementById("terminal");
  const termHint = document.getElementById("term-hint");
  const termInput = document.getElementById("term-input");
  const termList = document.getElementById("term-list");
  const termMsg = document.getElementById("term-msg");
  const termCta = document.getElementById("term-cta");
  const dbHud = document.getElementById("db-hud");
  const briefingEl = document.getElementById("db-briefing");
  const briefingTextEl = document.getElementById("db-briefing-text");
  const briefingNextEl = document.getElementById("db-briefing-next");
  const countdownEl = document.getElementById("db-countdown");
  const countdownTime = document.getElementById("db-countdown-time");
  const systemsEl = document.getElementById("db-systems-rows");
  const winEl = document.getElementById("db-win");
  const winSub = document.getElementById("db-win-sub");
  const failEl = document.getElementById("db-fail");

  let active = false;
  let started = false;
  let failed = false;
  let reportSent = false;
  let promptText = null;
  const taught = new Set();
  let tutorialTimer = null;
  let msgTimer = null;
  let winTimer = null;
  let briefingIndex = 0;

  let timeLeft = TOTAL_TIME;
  let timerRunning = false;
  let clockStarted = false;

  // review panel (non-blocking) vs report terminal (blocking, at the end)
  let panelMode = null;            // null | "review" | "report"
  let focus = null;                // the slate-record being reviewed
  let buffer = "";
  let reportDismissed = false;

  const addedCount = () => slates.filter((s) => s.state === "added").length;
  const allAdded = () => addedCount() >= slates.length;
  const waitingCount = () => pass.length;

  // ---------- raycasting / pointer ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downX = 0, downY = 0;

  function setNdc(e) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }
  function slateAtPointer(e) {
    setNdc(e);
    raycaster.setFromCamera(ndc, camera);
    const visibleSlates = pass.map((i) => slates[i].slate);
    const hits = raycaster.intersectObjects(visibleSlates, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && o.userData.jobIdx === undefined) o = o.parent;
    return o ? slates[o.userData.jobIdx] : null;
  }
  function idleWorkerAtPointer(e) {
    setNdc(e);
    raycaster.setFromCamera(ndc, camera);
    const idle = workers.filter(sendable);
    if (!idle.length) return null;
    const hits = raycaster.intersectObjects(idle.map((w) => w.mesh), true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && o.userData.workerIdx === undefined) o = o.parent;
    return o ? workers[o.userData.workerIdx] : null;
  }

  // ---------- HUD helpers ----------
  function setPrompt(text) {
    if (!promptEl || text === promptText) return;
    promptText = text;
    if (text) { promptEl.textContent = text; promptEl.classList.remove("hidden"); }
    else promptEl.classList.add("hidden");
  }
  function showTutorial(text, ms = 5500) {
    if (!tutorialEl) return;
    clearTimeout(tutorialTimer);
    tutorialEl.textContent = text;
    tutorialEl.classList.remove("hidden");
    if (ms > 0) tutorialTimer = setTimeout(() => tutorialEl.classList.add("hidden"), ms);
  }
  function teachOnce(key, text, ms) {
    if (taught.has(key)) return;
    taught.add(key);
    showTutorial(text, ms);
  }
  function setControls() {
    if (!controlsEl) return;
    controlsEl.innerHTML = `
      <span class="control-item"><span class="control-label">Review a checkpoint</span><span class="key key-wide">click</span></span>
      <span class="control-item"><span class="control-label">Add to ship</span><span class="key">Y</span></span>
      <span class="control-item"><span class="control-label">Return to orbit</span><span class="key">B</span></span>
    `;
    controlsEl.classList.remove("hidden");
  }
  function hideControls() { controlsEl?.classList.add("hidden"); }

  function updateSystems() {
    if (!systemsEl) return;
    const online = addedCount();
    const waiting = waitingCount();
    const unstable = waiting >= BACKLOG_PANIC;
    systemsEl.innerHTML =
      `<div class="db-jobs"><span class="db-jobs-num">${online} / ${slates.length}</span>` +
      `<span class="db-jobs-lbl">systems online</span></div>` +
      `<div class="db-tally">` +
        `<span class="db-tally-it is-sealed">on the pass ${waiting}</span>` +
        (unstable ? `<span class="db-tally-it is-stalled">ship unstable</span>` : ``) +
      `</div>`;
  }

  // ---------- clock + panic sky ----------
  function fmtTime(s) {
    s = Math.max(0, Math.ceil(s));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  function updateClock() {
    if (countdownTime) countdownTime.textContent = fmtTime(timeLeft);
    countdownEl?.classList.toggle("is-low", timerRunning && timeLeft <= LOW_TIME);
    countdownEl?.classList.toggle("is-critical", timerRunning && timeLeft <= CRIT_TIME);
  }
  function panicFactor() {
    if (failed) return 1;
    if (reportSent || !timerRunning) return 0;
    let p = 0;
    if (timeLeft <= PANIC_TIME) {
      p = (PANIC_TIME - timeLeft) / PANIC_TIME;
      p *= p;
    }
    // a flooding pass also unsettles the sky
    p = Math.max(p, Math.min(1, waitingCount() / (BACKLOG_PANIC + 4)) * 0.6);
    if (timeLeft <= CRIT_TIME) {
      const throb = 0.5 + 0.5 * Math.sin(performance.now() / 85);
      p += 0.14 * throb;
    }
    return Math.min(1, p);
  }
  function applyPanicSky() {
    const p = panicFactor();
    scene.background.copy(SKY_CALM).lerp(SKY_PANIC, p);
    scene.fog.color.copy(SKY_CALM).lerp(FOG_PANIC, p);
    dome.material.color.copy(DOME_CALM).lerp(DOME_PANIC, p);
    sun.color.copy(SUN_CALM).lerp(SUN_PANIC, p * 0.85);
  }

  // ---------- briefing ----------
  function restartTextAnim(el) {
    if (!el) return;
    el.classList.remove("beat-in");
    void el.offsetWidth;
    el.classList.add("beat-in");
  }
  function renderBriefingBeat() {
    if (!briefingTextEl) return;
    briefingTextEl.textContent = BRIEFING_BEATS[briefingIndex] || "";
    restartTextAnim(briefingTextEl);
    if (briefingNextEl) briefingNextEl.textContent =
      briefingIndex < BRIEFING_BEATS.length - 1 ? "to continue" : "to begin";
  }
  function advanceBriefing() {
    if (started) return;
    if (briefingIndex < BRIEFING_BEATS.length - 1) { briefingIndex += 1; renderBriefingBeat(); return; }
    startLevel();
  }
  function showBriefing() {
    timerRunning = false;
    tutorialEl?.classList.add("hidden");
    briefingIndex = 0;
    renderBriefingBeat();
    briefingEl?.classList.remove("hidden");
  }
  function startLevel() {
    if (started) return;
    started = true;
    briefingEl?.classList.add("hidden");
    timeLeft = TOTAL_TIME;
    timerRunning = false;       // the launch window doesn't start until you dispatch
    clockStarted = false;
    updateClock();
    updateSystems();
    showTutorial("Click a subagent to send it out on its work — one at a time, in whatever order you like (Space sends the next one). The launch clock starts the moment you do.", 9000);
  }
  briefingEl?.addEventListener("click", () => { if (active && !started) advanceBriefing(); });

  // ---------- dispatch: the player sends subagents out (the delegate step) ----------
  const sendable = (w) => w.phase === "idle" && w.queue.length > 0;
  function dispatchWorker(w) {
    if (!w || !sendable(w)) return;
    w.jobIdx = w.queue.shift();
    w.phase = "out";                 // lift off and fly to the hull to work
    w.flyProg = 0;
    w.mesh.userData.ring.visible = false;
    w.mesh.userData.sendLabel.visible = false;
    spawnSpark(w.mesh.position.clone().setY(3.2), 0x6fe3ff, 14);
    if (!clockStarted) { clockStarted = true; timerRunning = true; }   // window opens on first dispatch
    updateSystems();
    teachOnce("dispatched", "Sent. Watch it fly out and work — when its checkpoint rides up the pass, tap it to see what it did.", 8000);
  }
  // keyboard convenience — send the NEXT idle drone (still one at a time)
  function dispatchNext() {
    const w = workers.find(sendable);
    if (w) dispatchWorker(w);
  }
  const anyIdle = () => workers.some(sendable);
  // a drone's job is done: its finished work rides up the pass as a slate
  function emitSlate(jobIdx) {
    const rec = slates[jobIdx];
    rec.state = "onpass";
    rec.x = ENTRANCE_X;
    rec.slate.position.set(ENTRANCE_X, BELT_Y, 2);
    rec.slate.visible = true;
    pass.push(rec.idx);
    updateSystems();
    teachOnce("firstpass", "A finished job rode up sealed under a checkpoint. Tap it to run `entire checkpoint explain`.", 8000);
  }

  // ---------- fail / reset ----------
  function failLevel() {
    if (failed || reportSent) return;
    failed = true;
    timerRunning = false;
    closePanel();
    countdownEl?.classList.remove("is-low", "is-critical");
    tutorialEl?.classList.add("hidden");
    failEl?.classList.remove("hidden");
  }
  function resetLevel() {
    failed = false;
    reportSent = false;
    reportDismissed = false;
    clockStarted = false;
    focus = null;
    clearTimeout(winTimer);
    pass.length = 0;
    for (const w of workers) {
      w.jobIdx = null; w.queue = []; w.timer = 0;
      w.phase = "idle"; w.flyProg = 0;
      w.mesh.position.copy(w.home);
      w.mesh.userData.ring.visible = true;
      w.mesh.userData.sendLabel.visible = true;
    }
    JOBS.forEach((_, idx) => workers[idx % N_WORKERS].queue.push(idx));
    for (const s of slates) {
      s.state = "working";
      s.explained = false;
      s.meltT = 0;
      s.fly = null;
      s.x = ENTRANCE_X;
      s.slate.visible = false;
      s.slate.scale.setScalar(1);
      s.slate.userData.ice.visible = true;
      s.slate.userData.ice.material.opacity = 0.62;
      const anim = s.upgradeModel.userData.anim;
      if (anim?.type === "spire") anim.beam.visible = false;
    }
    for (const pip of board.pips) {
      pip.material.color.setHex(0x2a1010);
      pip.material.emissive.setHex(0xff3b2e);
      pip.material.emissiveIntensity = 0.5;
    }
    failEl?.classList.add("hidden");
    winEl?.classList.add("hidden");
    timeLeft = TOTAL_TIME;
    timerRunning = false;       // re-dispatch to reopen the window
    clockStarted = false;
    updateSystems();
    updateClock();
    showTutorial("New launch window — click a subagent to send it out (Space sends the next one).", 6500);
  }

  // ---------- a subagent finishes: its job rides up the pass ----------
  // ---------- review panel (non-blocking; the pass keeps flooding) ----------
  function renderPanel() {
    if (panelMode === "review" && focus) {
      termList?.classList.remove("hidden");
      if (!focus.explained) {
        termHint.textContent = "# what did the subagent actually do? ask the checkpoint";
        termInput.textContent = `entire checkpoint explain ${focus.job.ckpt}`;
        termInput.classList.remove("is-dim");
        if (termList) termList.innerHTML = "";
        if (termCta) termCta.innerHTML =
          `<span class="cta-label">CLICK</span><span class="cta-note">to run it</span>`;
      } else {
        termHint.textContent = "# reviewed — your call";
        termInput.textContent = `entire checkpoint explain ${focus.job.ckpt}`;
        termInput.classList.add("is-dim");
        if (termList) {
          termList.innerHTML =
            `<div class="term-list-row"><span class="tl-key tl-exp-key">checkpoint</span>` +
            `<span class="tl-title">${focus.job.ckpt}</span></div>` +
            focus.job.card.map(([k, v]) =>
              `<div class="term-list-row"><span class="tl-key tl-exp-key">${k}</span>` +
              `<span class="tl-title">${v}</span></div>`
            ).join("");
        }
        if (termCta) termCta.innerHTML =
          `<button id="db-add-btn" type="button">ADD TO SHIP</button>` +
          `<span class="cta-note">or press <kbd class="cta-key cta-key-yes">Y</kbd></span>`;
      }
      termEl?.classList.remove("hidden");
    } else if (panelMode === "report") {
      termHint.textContent = reportSent
        ? "# dispatch sent — the day is on the record"
        : "# twelve systems online — send the day's report";
      termInput.textContent = buffer;
      termInput.classList.remove("is-dim");
      termList?.classList.add("hidden");
      if (termCta) termCta.innerHTML = reportSent ? "" :
        `<span class="cta-label">TYPE</span><span class="cta-cmd">entire dispatch</span>`;
      termEl?.classList.remove("hidden");
    }
  }
  function closePanel() {
    panelMode = null;
    focus = null;
    buffer = "";
    termEl?.classList.add("hidden");
    termList?.classList.add("hidden");
    termMsg?.classList.remove("show-ok", "show-err");
  }
  function flashTerminal(text, ok) {
    if (!termMsg) return;
    clearTimeout(msgTimer);
    termMsg.textContent = text;
    termMsg.classList.remove("show-ok", "show-err");
    termMsg.classList.add(ok ? "show-ok" : "show-err");
    msgTimer = setTimeout(() => termMsg.classList.remove("show-ok", "show-err"), 3600);
  }

  function focusSlate(rec) {
    if (!rec || rec.state !== "onpass") return;
    focus = rec;
    panelMode = "review";
    if (!rec.explained) {
      rec.explained = true;
      spawnSpark(rec.slate.position.clone().setY(rec.slate.position.y + 2), 0x8fe3ff, 12);
      flashTerminal(`explained ${rec.job.ckpt} — ${rec.job.name.toLowerCase()} is now a ${rec.job.became}`, true);
      teachOnce("explained", "That's the story the checkpoint carries — work you never watched, no longer a mystery. Good? Press Y to add it.", 8000);
    }
    renderPanel();
  }

  // ---------- ADD TO SHIP ----------
  function addToShip(rec) {
    if (!rec || rec.state !== "onpass" || !rec.explained) return;
    rec.state = "added";
    rec.meltT = MELT_DUR;
    const i = pass.indexOf(rec.idx);
    if (i >= 0) pass.splice(i, 1);
    // fly the slate to its hull pip
    const pip = board.pips[rec.idx];
    rec.fly = { from: rec.slate.position.clone(), to: pip.getWorldPosition(new THREE.Vector3()), prog: 0 };
    const anim = rec.upgradeModel.userData.anim;
    if (anim?.type === "spire") anim.beam.visible = true;
    if (focus === rec) { focus = null; panelMode = null; termEl?.classList.add("hidden"); termList?.classList.add("hidden"); }
    updateSystems();
    if (allAdded()) {
      timerRunning = false;
      countdownEl?.classList.remove("is-low", "is-critical");
      panelMode = "report"; buffer = ""; reportDismissed = false;
      flashTerminal("all twelve systems online", true);
      showTutorial("Every system online — send the day's report: type `entire dispatch`.", 0);
      renderPanel();
    } else {
      showTutorial(`${rec.job.name} online (${addedCount()} / ${slates.length}).`, 2600);
    }
  }
  termCta?.addEventListener("click", (e) => {
    if (!active) return;
    if (e.target?.id === "db-add-btn" && focus) addToShip(focus);
  });

  // ---------- the finish line: entire dispatch ----------
  function sendDispatch() {
    reportSent = true;
    timerRunning = false;
    countdownEl?.classList.remove("is-low", "is-critical");
    if (termList) {
      termList.innerHTML =
        `<div class="term-list-row"><span class="tl-key tl-exp-key">DISPATCH</span>` +
        `<span class="tl-title">drone bay — day report</span></div>` +
        slates.map((s) =>
          `<div class="term-list-row"><span class="tl-key tl-exp-key">·</span>` +
          `<span class="tl-title">${s.job.name.toLowerCase()} → ${s.job.became} (${s.job.ckpt.slice(0, 6)}…)</span></div>`
        ).join("") +
        `<div class="term-list-row"><span class="tl-key tl-exp-key">filed</span>` +
        `<span class="tl-title">from 12 checkpoints · crew: 1 human, 6 subagents</span></div>`;
      termList.classList.remove("hidden");
    }
    flashTerminal("dispatch sent — look how much got done without you", true);
    renderPanel();
    if (winSub) winSub.textContent = "twelve jobs, six subagents — the report wrote itself";
    winTimer = setTimeout(() => {
      closePanel();
      tutorialEl?.classList.add("hidden");
      winEl?.classList.remove("hidden");
    }, 4000);
    onComplete?.();
  }
  function submitCommand() {
    const n = normalizeCmd(buffer);
    buffer = "";
    if (!n) { renderPanel(); return; }
    if (/^entire dispatch$/.test(n)) { sendDispatch(); return; }
    if (/^entire (checkpoint|cp) list$/.test(n)) {
      if (termList) {
        termList.innerHTML = slates.map((s) =>
          `<div class="term-list-row"><span class="tl-id tl-id-short">${s.job.ckpt}</span>` +
          `<span class="tl-title">subagent fix: ${s.job.name.toLowerCase()} → ${s.job.became}</span></div>`
        ).join("");
        termList.classList.remove("hidden");
      }
      flashTerminal("the raw log — now turn it into the day's report:  entire dispatch", true);
      renderPanel();
      return;
    }
    flashTerminal("command not recognized — try:  entire dispatch", false);
    renderPanel();
  }

  // ---------- input ----------
  function onPointerDown(e) {
    if (!active || !started || failed) return;
    downX = e.clientX; downY = e.clientY;
  }
  function onPointerMove(e) {
    if (!active || !started || failed) { canvas.style.cursor = "default"; return; }
    if (panelMode === "report") { canvas.style.cursor = "default"; return; }
    canvas.style.cursor = (slateAtPointer(e) || idleWorkerAtPointer(e)) ? "pointer" : "default";
  }
  function onPointerUp(e) {
    if (!active || !started || failed) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;   // ignore drags
    if (panelMode === "report") return;
    const rec = slateAtPointer(e);
    if (rec) { focusSlate(rec); return; }
    const w = idleWorkerAtPointer(e);
    if (w) dispatchWorker(w);
  }
  function onKeyDown(e) {
    if (!active) return;

    if (!started) {
      if (e.code === "Enter" || e.code === "Space") { advanceBriefing(); e.preventDefault(); }
      return;
    }
    if (failed) {
      if (e.code === "KeyR") { resetLevel(); e.preventDefault(); }
      if (e.code === "KeyN") { onNewGame?.(); e.preventDefault(); }
      return;
    }
    if (reportSent) {
      if (e.code === "Enter") { onNext?.(); e.preventDefault(); }
      return;
    }
    if (panelMode === "report") {
      if (e.code === "Enter") { submitCommand(); e.preventDefault(); return; }
      if (e.code === "Backspace") { buffer = buffer.slice(0, -1); renderPanel(); e.preventDefault(); return; }
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer += e.key; renderPanel(); e.preventDefault();
      }
      return;
    }
    // review rush
    if (e.code === "Space" && anyIdle()) { dispatchNext(); e.preventDefault(); return; }
    if ((e.key === "y" || e.key === "Y" || e.code === "Enter") && focus && focus.explained) {
      addToShip(focus); e.preventDefault(); return;
    }
    if (e.code === "KeyB") { onExit?.(); e.preventDefault(); }
  }

  // ---------- HUD per-frame ----------
  function refreshHud() {
    if (!started) { setPrompt(null); return; }
    if (reportSent) { setPrompt("The day is dispatched — press Enter to board the ship"); return; }
    if (allAdded()) { setPrompt("All systems online — type `entire dispatch` to send the day's report"); return; }
    if (focus && focus.explained) { setPrompt("Reviewed — press Y to ADD TO SHIP"); return; }
    if (waitingCount() > 0) {
      const w = waitingCount();
      setPrompt(w >= BACKLOG_PANIC
        ? `${w} on the pass — the ship is destabilizing, clear them fast`
        : "Tap a checkpoint on the pass to run `entire checkpoint explain`");
      return;
    }
    if (anyIdle()) {
      setPrompt(clockStarted
        ? "Send another idle drone — click it (or Space for the next one)"
        : "Click a subagent to send it out — one at a time (Space sends the next one)");
      return;
    }
    setPrompt("Your subagents are working — finished jobs ride up the pass");
  }

  // ---------- per-frame ----------
  function update(dt, t) {
    if (active && timerRunning && !failed && !reportSent) {
      const drain = dt * (1 + RAIL_DRAIN * waitingCount());
      timeLeft = Math.max(0, timeLeft - drain);
      updateClock();
      if (timeLeft <= 0) failLevel();
    }
    applyPanicSky();

    // belt scroll
    beltTex.offset.x = (beltTex.offset.x - dt * 0.6) % 1;

    // subagents: drones you click to send → they fly out, weld, ride work up, fly home
    if (started && !failed && !reportSent) {
      for (const w of workers) {
        const ud = w.mesh.userData;
        // the halo ring spins faster the busier the drone is (idle → flight → work)
        const haloSpin = w.phase === "work" ? 9 : (w.phase === "out" || w.phase === "back") ? 6 : 1.2;
        ud.halo.rotation.z += haloSpin * dt;
        // gentle hover bob on the craft body
        ud.craft.position.y = 2.6 + Math.sin((t + w.home.x) * 2.2) * 0.14;

        if (w.phase === "idle") {     // home, waiting to be sent on its next job
          const pulse = 0.5 + 0.5 * Math.sin(t * 4 + w.home.x);
          ud.ring.material.opacity = 0.45 + pulse * 0.45;
          ud.ring.scale.setScalar(1 + pulse * 0.06);
          ud.bodyMat.emissiveIntensity = 0.8 + pulse * 0.5;
          continue;
        }
        if (w.phase === "done") {     // no jobs left — parked, dim
          ud.bodyMat.emissiveIntensity = 0.5 + Math.sin(t * 2 + w.home.x) * 0.1;
          ud.glow.material.opacity = 0.12;
          continue;
        }

        if (w.phase === "out" || w.phase === "back") {
          w.flyProg = Math.min(1, w.flyProg + dt / FLY_DUR);
          const k = w.flyProg * w.flyProg * (3 - 2 * w.flyProg);   // smoothstep
          const a = w.phase === "out" ? w.home : w.site;
          const b = w.phase === "out" ? w.site : w.home;
          w.mesh.position.lerpVectors(a, b, k);
          ud.glow.material.opacity = 0.3;
          if (w.flyProg >= 1) {
            if (w.phase === "out") {
              w.phase = "work"; w.timer = WORK_TIME + Math.random() * WORK_JITTER;
            } else {
              // home again — ready for its next job, or parked if it has none left
              w.mesh.position.copy(w.home);
              if (w.queue.length) {
                w.phase = "idle";
                ud.ring.visible = true;
                ud.sendLabel.visible = true;
                teachOnce("resend", "That drone is back and free — click it to send it out again for its next job.", 7500);
              } else {
                w.phase = "done";
              }
            }
          }
        } else if (w.phase === "work") {
          w.timer = Math.max(0, w.timer - dt);
          const near = 1 - Math.min(1, w.timer / WORK_TIME);
          ud.bodyMat.emissiveIntensity = 1.2 + near * 1.4;
          ud.glow.material.opacity = 0.22;
          // welding sparks under the drone as it works the hull
          if (Math.random() < dt * 14) {
            const tip = ud.craft.getWorldPosition(new THREE.Vector3());
            tip.y -= 0.8;
            spawnSpark(tip, 0xffb86b, 4);
          }
          if (w.timer <= 0) {         // one job done → fly its checkpoint home up the pass
            emitSlate(w.jobIdx);
            spawnSpark(w.mesh.position.clone(), 0x9af0ff, 12);
            w.jobIdx = null;
            w.phase = "back";
            w.flyProg = 0;
          }
        }
      }
    }

    // place slates along the pass (arrival order → slots, front = nearest player)
    for (let i = 0; i < pass.length; i++) {
      const rec = slates[pass[i]];
      const onScreen = i < VISIBLE_SLOTS;
      const targetX = onScreen ? (SLOT_X0 + i * SLOT_DX) : ENTRANCE_X + (i - VISIBLE_SLOTS + 1) * 2.0;
      rec.x += (targetX - rec.x) * Math.min(1, dt * 4);
      rec.slate.visible = onScreen || rec.x < ENTRANCE_X + 0.5;
      const bob = Math.sin((t + i) * 2) * 0.08;
      rec.slate.position.set(rec.x, BELT_Y + bob, 2);
      // focus highlight
      const focused = rec === focus;
      const want = focused ? 1.12 : 1.0;
      rec.slate.scale.x += (want - rec.slate.scale.x) * Math.min(1, dt * 8);
      rec.slate.scale.y = rec.slate.scale.z = rec.slate.scale.x;
      rec.slate.userData.rim.material.opacity = focused ? 0.95 : (rec.explained ? 0.7 : 0.5);
      rec.slate.userData.rim.material.color.setHex(rec.explained ? 0x8fe3ff : 0x6fe3ff);
      // animate the improvised upgrade riding along
      const anim = rec.upgradeModel.userData.anim;
      if (anim?.type === "ring") { anim.ring.rotation.y += dt * 0.8; }
      else if (anim?.type === "dome") { anim.field.rotation.y += dt * 0.25; anim.orbit.rotation.z += dt * 0.6; }
      else if (anim?.type === "skid") { anim.pad.position.y = 1.6 + Math.sin(t * 1.8) * 0.25; }
    }

    // added slates: melt ice, fly to the hull, light the pip
    for (const rec of slates) {
      if (rec.state !== "added") continue;
      if (rec.meltT > 0) {
        rec.meltT = Math.max(0, rec.meltT - dt);
        rec.slate.userData.ice.material.opacity = 0.62 * (rec.meltT / MELT_DUR);
        if (rec.meltT <= 0) rec.slate.userData.ice.visible = false;
      }
      if (rec.fly) {
        rec.fly.prog = Math.min(1, rec.fly.prog + dt * 1.6);
        const k = rec.fly.prog;
        const pos = rec.fly.from.clone().lerp(rec.fly.to, k);
        pos.y += Math.sin(k * Math.PI) * 4;
        rec.slate.position.copy(pos);
        rec.slate.scale.setScalar(1 - 0.7 * k);
        if (k >= 1) {
          rec.fly = null;
          rec.slate.visible = false;
          const pip = board.pips[rec.idx];
          pip.material.color.setHex(0x0c3020);
          pip.material.emissive.setHex(0x35d97a);
          pip.material.emissiveIntensity = 1.4;
          spawnSpark(rec.fly?.to || board.pips[rec.idx].getWorldPosition(new THREE.Vector3()), 0x35d97a, 14);
        }
      }
    }

    // spark bursts
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life += dt;
      const posArr = s.geo.attributes.position.array;
      for (let j = 0; j < s.vel.length; j++) {
        s.vel[j].y -= 14 * dt;
        posArr[j * 3] += s.vel[j].x * dt;
        posArr[j * 3 + 1] += s.vel[j].y * dt;
        posArr[j * 3 + 2] += s.vel[j].z * dt;
      }
      s.geo.attributes.position.needsUpdate = true;
      s.mat.opacity = Math.max(0, 1 - s.life / s.ttl);
      if (s.life >= s.ttl) { scene.remove(s.pts); s.geo.dispose(); s.mat.dispose(); sparks.splice(i, 1); }
    }

    if (active) refreshHud();
  }

  // ---------- lifecycle ----------
  function enter() {
    active = true;
    canvas.addEventListener("mousedown", onPointerDown);
    canvas.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    dbHud?.classList.remove("hidden");
    fpShared?.classList.remove("hidden");
    setControls();
    updateSystems();
    if (!started) {
      showBriefing();
    } else if (reportSent) {
      winEl?.classList.remove("hidden");
    } else if (failed) {
      resetLevel();
    } else {
      timerRunning = clockStarted && !allAdded();
      showTutorial("The subagents kept working while you were in orbit.", 5000);
    }
    updateClock();
    applyPanicSky();
  }
  function exit() {
    active = false;
    timerRunning = false;
    closePanel();
    clearTimeout(winTimer);
    canvas.removeEventListener("mousedown", onPointerDown);
    canvas.removeEventListener("mousemove", onPointerMove);
    window.removeEventListener("mouseup", onPointerUp);
    window.removeEventListener("keydown", onKeyDown);
    canvas.style.cursor = "default";
    setPrompt(null);
    hideControls();
    tutorialEl?.classList.add("hidden");
    termEl?.classList.add("hidden");
    failEl?.classList.add("hidden");
    winEl?.classList.add("hidden");
    briefingEl?.classList.add("hidden");
    dbHud?.classList.add("hidden");
    fpShared?.classList.add("hidden");
  }
  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  return {
    scene,
    get camera() { return camera; },
    update, enter, exit, resize,
  };
}
