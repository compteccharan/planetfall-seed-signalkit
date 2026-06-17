import * as THREE from "three";
import { LEVEL_ONE_RECORD_TYPES } from "./levelOneRecords.js";

// Meshes for the Level 1 shooter. Good targets are simple ship parts wrapped
// in a shared gold-ring language; wreckage stays plain, ordinary, and unlabelled.

const RECORD_TYPES = LEVEL_ONE_RECORD_TYPES;
const PART_IN_RING_SCALE = 1.35;

function shellMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x171f27,
    metalness: 0.75,
    roughness: 0.42,
    flatShading: true,
  });
}

function brassMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xe0a838,
    emissive: 0x6a4310,
    emissiveIntensity: 0.5,
    metalness: 0.95,
    roughness: 0.28,
  });
}

function glassMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x7feaff,
    emissive: 0x1ca7c7,
    emissiveIntensity: 1.25,
    metalness: 0.1,
    roughness: 0.18,
    transparent: true,
    opacity: 0.86,
  });
}

function add(group, geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  group.add(m);
  return m;
}

function partMaterials() {
  return {
    shell: shellMaterial(),
    brass: brassMaterial(),
    glass: glassMaterial(),
    pale: new THREE.MeshStandardMaterial({ color: 0xdfe8ec, metalness: 0.25, roughness: 0.38 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x17202a, metalness: 0.55, roughness: 0.45 }),
    red: new THREE.MeshStandardMaterial({ color: 0xff5a3c, emissive: 0x7a1410, emissiveIntensity: 0.45, roughness: 0.42 }),
    green: new THREE.MeshStandardMaterial({ color: 0x7fb069, emissive: 0x1c4a2c, emissiveIntensity: 0.25, roughness: 0.5 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x5fb8ff, emissive: 0x0c4f7a, emissiveIntensity: 0.45, roughness: 0.32 }),
  };
}

function buildAntenna(m) {
  const g = new THREE.Group();
  const mast = add(g, new THREE.CylinderGeometry(0.055, 0.055, 0.95, 12), m.brass);
  mast.rotation.z = -0.35;
  mast.position.set(-0.12, -0.08, 0);

  const dish = add(g, new THREE.ConeGeometry(0.48, 0.26, 32, 1, true), m.pale);
  dish.rotation.set(Math.PI / 2, 0, -0.35);
  dish.position.set(0.18, 0.26, 0);

  const rim = add(g, new THREE.TorusGeometry(0.48, 0.03, 8, 32), m.brass);
  rim.rotation.copy(dish.rotation);
  rim.position.copy(dish.position);

  const tip = add(g, new THREE.SphereGeometry(0.07, 16, 12), m.glass);
  tip.position.set(0.5, 0.34, 0);
  return g;
}

function buildBattery(m) {
  const g = new THREE.Group();
  const body = add(g, new THREE.BoxGeometry(1.0, 0.48, 0.42), m.green);
  body.rotation.z = 0.04;

  for (const x of [-0.58, 0.58]) {
    const cap = add(g, new THREE.BoxGeometry(0.14, 0.36, 0.46), m.brass);
    cap.position.x = x;
  }

  const core = add(g, new THREE.BoxGeometry(0.5, 0.12, 0.46), m.glass);
  core.position.y = 0.02;
  return g;
}

function buildCompass(m) {
  const g = new THREE.Group();
  const disk = add(g, new THREE.CylinderGeometry(0.46, 0.46, 0.12, 32), m.pale);
  disk.rotation.x = Math.PI / 2;

  const rim = add(g, new THREE.TorusGeometry(0.47, 0.045, 10, 36), m.brass);
  rim.rotation.x = Math.PI / 2;

  const needle = add(g, new THREE.ConeGeometry(0.09, 0.56, 3), m.red);
  needle.rotation.set(Math.PI / 2, 0, -0.55);
  needle.position.z = 0.08;

  const pin = add(g, new THREE.SphereGeometry(0.075, 16, 12), m.glass);
  pin.position.z = 0.12;
  return g;
}

function buildBulb(m) {
  const g = new THREE.Group();
  const bulb = add(g, new THREE.SphereGeometry(0.34, 24, 18), m.glass);
  bulb.position.y = 0.18;

  const neck = add(g, new THREE.CylinderGeometry(0.18, 0.2, 0.22, 18), m.brass);
  neck.position.y = -0.16;

  const base = add(g, new THREE.CylinderGeometry(0.16, 0.16, 0.22, 18), m.dark);
  base.position.y = -0.36;

  const glow = new THREE.PointLight(0x9af0ff, 1.4, 8, 2);
  glow.position.y = 0.18;
  g.add(glow);
  return g;
}

function buildFilter(m) {
  const g = new THREE.Group();
  const frame = add(g, new THREE.BoxGeometry(1.0, 0.62, 0.14), m.brass);
  frame.position.z = -0.02;

  const cloth = add(g, new THREE.BoxGeometry(0.82, 0.44, 0.16), m.pale);
  cloth.position.z = 0.04;

  for (let i = -3; i <= 3; i++) {
    const pleat = add(g, new THREE.BoxGeometry(0.045, 0.48, 0.2), i % 2 ? m.glass : m.shell);
    pleat.position.x = i * 0.11;
    pleat.position.z = 0.1;
  }
  return g;
}

function buildOxygen(m) {
  const g = new THREE.Group();
  const tank = add(g, new THREE.CylinderGeometry(0.24, 0.24, 1.05, 24), m.blue);
  tank.rotation.z = Math.PI / 2;

  for (const x of [-0.28, 0.28]) {
    const band = add(g, new THREE.TorusGeometry(0.245, 0.022, 8, 24), m.brass);
    band.rotation.y = Math.PI / 2;
    band.position.x = x;
  }

  const valve = add(g, new THREE.CylinderGeometry(0.09, 0.09, 0.18, 14), m.brass);
  valve.rotation.z = Math.PI / 2;
  valve.position.x = 0.62;
  return g;
}

function buildDial(m) {
  const g = new THREE.Group();
  const dial = add(g, new THREE.CylinderGeometry(0.44, 0.44, 0.18, 32), m.dark);
  dial.rotation.x = Math.PI / 2;

  const rim = add(g, new THREE.TorusGeometry(0.45, 0.04, 8, 32), m.brass);
  rim.rotation.x = Math.PI / 2;

  const notch = add(g, new THREE.BoxGeometry(0.1, 0.45, 0.08), m.glass);
  notch.position.set(0.13, 0.12, 0.13);
  notch.rotation.z = -0.75;
  return g;
}

function buildStick(m) {
  const g = new THREE.Group();
  const base = add(g, new THREE.CylinderGeometry(0.34, 0.42, 0.18, 24), m.dark);
  base.position.y = -0.36;

  const stem = add(g, new THREE.CylinderGeometry(0.06, 0.075, 0.75, 12), m.brass);
  stem.rotation.z = -0.42;
  stem.position.set(0.12, -0.02, 0);

  const grip = add(g, new THREE.SphereGeometry(0.18, 18, 14), m.glass);
  grip.position.set(0.28, 0.35, 0);
  return g;
}

function buildBeacon(m) {
  const g = new THREE.Group();
  const base = add(g, new THREE.CylinderGeometry(0.28, 0.34, 0.38, 18), m.dark);
  base.position.y = -0.22;

  const lens = add(g, new THREE.SphereGeometry(0.24, 18, 14), m.glass);
  lens.position.y = 0.12;

  const cap = add(g, new THREE.ConeGeometry(0.2, 0.24, 18), m.brass);
  cap.position.y = 0.42;

  const glow = new THREE.PointLight(0x9af0ff, 1.8, 8, 2);
  glow.position.y = 0.16;
  g.add(glow);
  return g;
}

const PART_BUILDERS = {
  antenna: buildAntenna,
  battery: buildBattery,
  compass: buildCompass,
  bulb: buildBulb,
  filter: buildFilter,
  oxygen: buildOxygen,
  dial: buildDial,
  stick: buildStick,
  beacon: buildBeacon,
};

function wreckMaterials() {
  return {
    cardboard: new THREE.MeshStandardMaterial({ color: 0xb9864f, roughness: 0.92, metalness: 0.02 }),
    cardboardDark: new THREE.MeshStandardMaterial({ color: 0x7a5130, roughness: 0.95, metalness: 0.02 }),
    tape: new THREE.MeshStandardMaterial({ color: 0xd2b27a, roughness: 0.88, metalness: 0.01 }),
    rust: new THREE.MeshStandardMaterial({ color: 0x9a4f2b, roughness: 0.86, metalness: 0.18 }),
    rustDark: new THREE.MeshStandardMaterial({ color: 0x4a2f28, roughness: 0.9, metalness: 0.25 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x77726a, roughness: 0.78, metalness: 0.38 }),
    pipeDark: new THREE.MeshStandardMaterial({ color: 0x333638, roughness: 0.86, metalness: 0.32 }),
  };
}

function buildCardboardBox(m) {
  const g = new THREE.Group();
  const box = add(g, new THREE.BoxGeometry(0.92, 0.74, 0.74), m.cardboard);
  box.rotation.set(0.03, -0.08, 0.04);

  const topTapeA = add(g, new THREE.BoxGeometry(0.98, 0.035, 0.11), m.tape);
  topTapeA.position.y = 0.39;
  const topTapeB = add(g, new THREE.BoxGeometry(0.11, 0.038, 0.8), m.tape);
  topTapeB.position.y = 0.395;

  const frontTapeA = add(g, new THREE.BoxGeometry(0.11, 0.68, 0.035), m.tape);
  frontTapeA.position.z = 0.39;
  const frontTapeB = add(g, new THREE.BoxGeometry(0.96, 0.09, 0.035), m.tape);
  frontTapeB.position.z = 0.395;

  for (const x of [-0.49, 0.49]) {
    const edge = add(g, new THREE.BoxGeometry(0.035, 0.78, 0.78), m.cardboardDark);
    edge.position.x = x;
  }
  return g;
}

function buildBarrel(m) {
  const g = new THREE.Group();
  const barrel = add(g, new THREE.CylinderGeometry(0.34, 0.34, 0.9, 24), m.rust);
  barrel.rotation.z = Math.PI / 2;

  for (const x of [-0.34, 0, 0.34]) {
    const band = add(g, new THREE.TorusGeometry(0.35, 0.028, 8, 24), m.rustDark);
    band.rotation.y = Math.PI / 2;
    band.position.x = x;
  }

  for (const x of [-0.48, 0.48]) {
    const cap = add(g, new THREE.CylinderGeometry(0.31, 0.31, 0.035, 24), m.rustDark);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = x;
  }
  return g;
}

function buildPipe(m) {
  const g = new THREE.Group();
  const elbow = add(g, new THREE.TorusGeometry(0.38, 0.11, 12, 28, Math.PI * 1.25), m.pipe);
  elbow.rotation.set(Math.PI / 2, 0, -0.35);

  const endA = add(g, new THREE.CylinderGeometry(0.13, 0.13, 0.36, 16), m.pipeDark);
  endA.rotation.z = Math.PI / 2;
  endA.position.set(0.4, 0.08, 0);

  const endB = add(g, new THREE.CylinderGeometry(0.13, 0.13, 0.34, 16), m.pipeDark);
  endB.rotation.x = Math.PI / 2;
  endB.position.set(-0.15, -0.39, 0);

  const dent = add(g, new THREE.BoxGeometry(0.18, 0.06, 0.18), m.rustDark);
  dent.position.set(0.05, 0.26, 0.08);
  dent.rotation.set(0.4, 0.2, -0.25);
  return g;
}

const WRECK_BUILDERS = [buildCardboardBox, buildBarrel, buildPipe];

function buildRecordCore(recordType) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);

  const mats = partMaterials();
  const part = (PART_BUILDERS[recordType.kind] || buildBeacon)(mats);
  part.scale.setScalar(PART_IN_RING_SCALE);
  body.add(part);

  // The gold ring is the shared "safe to catch" language across all part shapes.
  const ring = add(body, new THREE.TorusGeometry(0.78, 0.055, 12, 36), mats.brass);
  ring.rotation.y = Math.PI / 2;

  const beacon = new THREE.PointLight(0x8fe3ff, 2.8, 18, 2);
  beacon.position.y = 0.25;
  g.add(beacon);

  g.userData.spinTarget = body;
  g.userData.recordSummary = recordType.summary;
  g.userData.beacon = beacon;
  g.userData.spin = randomSpin(1.0);
  return g;
}

function buildWreck(variant = 0) {
  const mats = wreckMaterials();
  const builder = WRECK_BUILDERS[variant % WRECK_BUILDERS.length];
  const g = builder(mats);
  g.userData.spin = randomSpin(1.9);
  return g;
}

let recordCursor = Math.floor(Math.random() * RECORD_TYPES.length);

export function makeRecord() {
  const recordType = RECORD_TYPES[recordCursor % RECORD_TYPES.length];
  recordCursor += 1;
  return buildRecordCore(recordType);
}

export function makeRecordOfType(type) {
  return buildRecordCore(RECORD_TYPES[type % RECORD_TYPES.length]);
}

export function makeWreck() {
  return buildWreck(Math.floor(Math.random() * WRECK_BUILDERS.length));
}

function randomSpin(scale) {
  return new THREE.Vector3(
    (Math.random() - 0.5) * scale,
    (Math.random() - 0.5) * scale,
    (Math.random() - 0.5) * scale
  );
}

export const RECORD_TYPE_COUNT = RECORD_TYPES.length;
