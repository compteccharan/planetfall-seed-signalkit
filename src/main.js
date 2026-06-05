import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { generatePlanetTextures } from "./planet.js";
import { makeAtmosphere } from "./atmosphere.js";
import { makeRing } from "./ring.js";
import { createDebris } from "./debris.js";

const PLANET_RADIUS = 2;

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07050f); // soft deep-violet void

// Image-based lighting so the gold islands have something to reflect — without
// an environment, metal renders black. A neutral room env gives a clean,
// realistic metallic sheen.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(0, 1.4, 6.5);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 3.0;
controls.maxDistance = 9.0;
controls.rotateSpeed = 0.5;
controls.autoRotate = false;

// ---------- lighting ----------
// Soft warm-white star — bright and gentle for a dreamy, well-lit world.
const sun = new THREE.DirectionalLight(0xfff4e8, 1.8);
sun.position.set(5, 2.5, 4);
scene.add(sun);
// Low lavender ambient — the env map provides most of the fill, so keep this
// small or the sea washes out toward white.
scene.add(new THREE.AmbientLight(0x6a5a92, 0.25));
// Cool lilac rim fill from behind to wrap the limb in light.
const rim = new THREE.DirectionalLight(0x8a7ab8, 0.6);
rim.position.set(-5, -1, -4);
scene.add(rim);

// ---------- starfield ----------
function makeStars() {
  const count = 2400;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const tint = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const r = 200 + Math.random() * 200;
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    positions[i * 3] = r * s * Math.cos(a);
    positions[i * 3 + 1] = r * u;
    positions[i * 3 + 2] = r * s * Math.sin(a);
    const warm = Math.random();
    // Hues drift from icy blue through violet to faint magenta.
    tint.setHSL(0.62 + warm * 0.18, 0.35, 0.62 + Math.random() * 0.3);
    colors[i * 3] = tint.r; colors[i * 3 + 1] = tint.g; colors[i * 3 + 2] = tint.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.1, sizeAttenuation: true, vertexColors: true,
    transparent: true, opacity: 0.9, depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}
scene.add(makeStars());

// ---------- planet ----------
const planetGroup = new THREE.Group();
scene.add(planetGroup);
planetGroup.rotation.z = 0.42; // Saturn-like axial tilt so the ring reads

const { colorMap, bumpMap, roughnessMap, metalnessMap, cloudMap } =
  generatePlanetTextures({ seed: 42 });

const planet = new THREE.Mesh(
  new THREE.SphereGeometry(PLANET_RADIUS, 128, 128),
  new THREE.MeshStandardMaterial({
    map: colorMap,
    bumpMap,
    bumpScale: 0.015, // very gentle relief — keep the surface soft
    roughnessMap,
    roughness: 1.0,
    // Islands are metallic gold (map-driven); the sea stays at metalness 0.
    metalnessMap,
    metalness: 1.0,
    envMapIntensity: 0.3, // low: keeps the lavender sea from washing white
  })
);
planetGroup.add(planet);

const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(PLANET_RADIUS * 1.012, 96, 96),
  new THREE.MeshStandardMaterial({
    map: cloudMap, transparent: true, depthWrite: false,
    color: 0xf2ecff, // soft white-lavender wisps
    opacity: 0.4, roughness: 1.0,
  })
);
planetGroup.add(clouds);

// Soft lavender atmosphere — wide, gentle falloff.
planetGroup.add(makeAtmosphere(PLANET_RADIUS * 1.09, {
  color: new THREE.Color(0xc9a6ff),
  power: 2.2,
  intensity: 0.9,
}));

// Saturn-style ring, sharing the planet's tilt.
planetGroup.add(makeRing(PLANET_RADIUS));

// Debris rides on the planet so it rotates in sync.
const { group: debrisGroup, pickables } = createDebris(PLANET_RADIUS);
const pickSet = new Set(pickables);
planet.add(debrisGroup);

// ---------- interaction ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;
let pointerDownAt = null;

function resolveAnchor(obj) {
  let o = obj;
  while (o) {
    if (pickSet.has(o)) return o;
    o = o.parent;
  }
  return null;
}

function pick(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, true);
  return hits.length ? resolveAnchor(hits[0].object) : null;
}

window.addEventListener("pointermove", (e) => {
  const anchor = pick(e);
  if (anchor !== hovered) {
    hovered = anchor;
    document.body.style.cursor = anchor ? "pointer" : "default";
  }
});

// Distinguish a click from an orbit drag.
window.addEventListener("pointerdown", (e) => {
  pointerDownAt = { x: e.clientX, y: e.clientY };
});
window.addEventListener("pointerup", (e) => {
  if (!pointerDownAt) return;
  const moved = Math.hypot(e.clientX - pointerDownAt.x, e.clientY - pointerDownAt.y);
  pointerDownAt = null;
  if (moved > 6) return; // was a drag
  const anchor = pick(e);
  if (anchor) openPanel(anchor.userData.fragment);
});

// ---------- panel ----------
const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panel-title");
const panelBody = document.getElementById("panel-body");
const panelFoot = document.getElementById("panel-foot");

function openPanel(frag) {
  panelTitle.textContent = frag.title;
  panelBody.textContent = frag.body;
  panelFoot.textContent = `recover with · ${frag.hint}`;
  panel.classList.remove("hidden");
}
function closePanel() { panel.classList.add("hidden"); }

document.getElementById("panel-close").addEventListener("click", closePanel);
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

// ---------- resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- loop ----------
const clock = new THREE.Clock();
let firstFrame = true;

function animate() {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  planet.rotation.y += dt * 0.03;
  clouds.rotation.y += dt * 0.04;

  // Pulse halos; lift & enlarge the hovered fragment.
  for (const anchor of pickables) {
    const { halo, model } = anchor.userData;
    const isHover = anchor === hovered;
    const base = 0.85 + Math.sin(t * 2 + anchor.position.x * 5) * 0.12;
    const target = isHover ? 1.5 : base;
    halo.scale.setScalar(THREE.MathUtils.lerp(halo.scale.x || 1, target, 0.15));
    halo.material.opacity = isHover ? 1.0 : 0.85;
    const ms = isHover ? 1.35 : 1.0;
    model.scale.setScalar(THREE.MathUtils.lerp(model.scale.x || 1, ms, 0.15));
    if (model.userData.pulse) {
      model.userData.pulse.material.emissiveIntensity = 1.0 + Math.sin(t * 4) * 0.6;
    }
  }

  controls.update();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    document.getElementById("loader").classList.add("done");
  }
  requestAnimationFrame(animate);
}
animate();
