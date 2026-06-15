import * as THREE from "three";

// Meshes for the Level 1 shooter. Good targets are not random golden props:
// they are a consistent "record core" family. The player should read them by
// silhouette first: smooth capsule, protective ring/cage, clean trail, and a
// camera-facing badge. Wreckage stays jagged, asymmetric, and unlabelled.

const BADGES = [
  { label: "REC", sub: "01" },
  { label: "PATH", sub: "02" },
  { label: "LOG", sub: "03" },
  { label: "CMD", sub: "04" },
];

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

function darkMetal() {
  return new THREE.MeshStandardMaterial({
    color: 0x2f333a,
    metalness: 0.25,
    roughness: 0.95,
    flatShading: true,
  });
}

function burnMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0xff5a3c,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
}

function add(group, geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  group.add(m);
  return m;
}

function makeBadgeTexture({ label, sub }) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d");

  ctx.clearRect(0, 0, c.width, c.height);
  ctx.shadowColor = "rgba(119, 238, 255, 0.9)";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "rgba(127, 234, 255, 0.92)";
  ctx.lineWidth = 8;
  roundRect(ctx, 20, 20, 216, 88, 16);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(9, 23, 34, 0.72)";
  roundRect(ctx, 27, 27, 202, 74, 12);
  ctx.fill();

  ctx.font = label.length > 3 ? "700 44px ui-monospace, SFMono-Regular, Menlo, monospace" : "700 56px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#dffcff";
  ctx.fillText(label, 128, 61);

  ctx.font = "700 18px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = "rgba(255, 216, 136, 0.95)";
  ctx.fillText(sub, 128, 96);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function buildRecordCore(badge) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);

  const shell = shellMaterial();
  const brass = brassMaterial();
  const glass = glassMaterial();

  // Black-box capsule: smooth, symmetrical, and unlike the broken wreckage.
  const capsule = add(body, new THREE.CylinderGeometry(0.42, 0.42, 1.48, 24), shell);
  capsule.rotation.z = Math.PI / 2;
  add(body, new THREE.SphereGeometry(0.42, 24, 12), shell).position.x = -0.74;
  add(body, new THREE.SphereGeometry(0.42, 24, 12), shell).position.x = 0.74;

  // Bright data core running through the centre.
  const core = add(body, new THREE.CylinderGeometry(0.18, 0.18, 1.75, 18), glass);
  core.rotation.z = Math.PI / 2;

  // Protective cage/halo. This is the readable shape, not just a color cue.
  const ring = add(body, new THREE.TorusGeometry(0.78, 0.055, 12, 36), brass);
  ring.rotation.y = Math.PI / 2;
  const ring2 = add(body, new THREE.TorusGeometry(0.58, 0.04, 10, 32), brass);
  ring2.rotation.x = Math.PI / 2;

  for (const y of [-0.32, 0.32]) {
    const rail = add(body, new THREE.CylinderGeometry(0.045, 0.045, 1.9, 10), brass);
    rail.rotation.z = Math.PI / 2;
    rail.position.y = y;
  }

  // A clean signal trail that stays vertical while the capsule itself tumbles.
  const trail = add(g, new THREE.CylinderGeometry(0.05, 0.34, 2.7, 14, 1, true), new THREE.MeshBasicMaterial({
    color: 0x8ff2ff,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  }));
  trail.position.y = 1.75;

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeBadgeTexture(badge),
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    fog: false,
  }));
  sprite.position.set(0, 1.18, 0);
  sprite.scale.set(1.8, 0.9, 1);
  g.add(sprite);

  const beacon = new THREE.PointLight(0x8fe3ff, 2.8, 18, 2);
  beacon.position.y = 0.25;
  g.add(beacon);

  g.userData.spinTarget = body;
  g.userData.badge = sprite;
  g.userData.trail = trail;
  g.userData.beacon = beacon;
  g.userData.spin = randomSpin(1.0);
  return g;
}

function buildWreck(variant = 0) {
  const g = new THREE.Group();
  const metal = darkMetal();
  const hot = burnMaterial();

  const geo = new THREE.IcosahedronGeometry(1.15, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(
      i,
      p.getX(i) * (0.55 + Math.random() * 0.95),
      p.getY(i) * (0.45 + Math.random() * 1.1),
      p.getZ(i) * (0.55 + Math.random() * 0.9)
    );
  }
  geo.computeVertexNormals();
  add(g, geo, metal);

  if (variant === 0) {
    const plate = add(g, new THREE.BoxGeometry(1.9, 0.12, 1.0), metal);
    plate.position.set(0.35, -0.2, 0.45);
    plate.rotation.set(0.6, 0.3, 0.4);
    const shard = add(g, new THREE.ConeGeometry(0.28, 1.3, 4), metal);
    shard.position.set(-0.65, 0.35, -0.3);
    shard.rotation.set(0.7, 0.1, -0.8);
  } else {
    const bar = add(g, new THREE.BoxGeometry(0.22, 1.9, 0.22), metal);
    bar.position.set(-0.3, 0.5, 0.2);
    bar.rotation.set(0.4, 0, 0.5);
    const panel = add(g, new THREE.BoxGeometry(1.25, 0.1, 1.6), metal);
    panel.position.set(0.35, -0.25, -0.35);
    panel.rotation.set(-0.4, 0.55, 0.1);
  }

  // Small ember slash: hot damage, not a clean recoverable signal.
  const ember = add(g, new THREE.CylinderGeometry(0.04, 0.18, 1.5, 8, 1, true), hot);
  ember.position.set(0.45, 0.85, 0.15);
  ember.rotation.set(0.8, 0.35, -0.45);

  g.userData.spin = randomSpin(1.9);
  return g;
}

let recordCursor = Math.floor(Math.random() * BADGES.length);

export function makeRecord() {
  const badge = BADGES[recordCursor % BADGES.length];
  recordCursor += 1;
  return buildRecordCore(badge);
}

export function makeRecordOfType(type) {
  return buildRecordCore(BADGES[type % BADGES.length]);
}

export function makeWreck() {
  return buildWreck(Math.random() < 0.5 ? 0 : 1);
}

function randomSpin(scale) {
  return new THREE.Vector3(
    (Math.random() - 0.5) * scale,
    (Math.random() - 0.5) * scale,
    (Math.random() - 0.5) * scale
  );
}

export const RECORD_TYPE_COUNT = BADGES.length;
