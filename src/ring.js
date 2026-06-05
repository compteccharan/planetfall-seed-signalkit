import * as THREE from "three";

// Procedural radial band texture for the ring: cream-gold and pale-lavender
// bands with varying opacity and a couple of clear gaps (à la Cassini).
function makeRingTexture() {
  const w = 1024, h = 2;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;

  const GOLD = [236, 222, 176];
  const LILAC = [202, 190, 226];

  for (let x = 0; x < w; x++) {
    const u = x / w; // 0 inner .. 1 outer

    // Layered bands.
    let a =
      0.55 +
      0.25 * Math.sin(u * 90) +
      0.15 * Math.sin(u * 230 + 1.3) +
      0.12 * Math.sin(u * 37 + 0.6);
    a = Math.max(0, Math.min(1, a));

    // Clear gaps (divisions).
    const gap = (center, width) =>
      Math.max(0, 1 - Math.exp(-((u - center) ** 2) / (2 * width * width)));
    a *= gap(0.42, 0.012);
    a *= gap(0.68, 0.018);

    // Fade the very inner and outer edges to nothing.
    a *= Math.min(1, u / 0.06) * Math.min(1, (1 - u) / 0.12);

    const tint = 0.5 + 0.5 * Math.sin(u * 60 + 2.0);
    const col = [
      GOLD[0] * (1 - tint) + LILAC[0] * tint,
      GOLD[1] * (1 - tint) + LILAC[1] * tint,
      GOLD[2] * (1 - tint) + LILAC[2] * tint,
    ];

    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
      d[i + 3] = a * 235;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * Flat Saturn-style ring. Returns a mesh lying in the planet's equatorial
 * plane — add it to the planetGroup so it shares the axial tilt.
 */
export function makeRing(planetRadius, {
  inner = planetRadius * 1.35,
  outer = planetRadius * 2.25,
} = {}) {
  const geo = new THREE.RingGeometry(inner, outer, 256, 1);

  // Remap UVs so the texture runs radially (u = normalized radius), letting the
  // 1D band texture paint concentric bands instead of RingGeometry's default.
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = v.length();
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  uv.needsUpdate = true;

  const mat = new THREE.MeshBasicMaterial({
    map: makeRingTexture(),
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    opacity: 0.92,
  });

  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = -Math.PI / 2; // lie flat in the equatorial plane
  return ring;
}
