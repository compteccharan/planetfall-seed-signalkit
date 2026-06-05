# Planetfall

A stranded astronaut whose ship's AI has lost its memory. To escape, you
explore a 3D planet, find debris, and **recover lost context** — the same act
that real [Entire](https://docs.entire.io) commands perform on a codebase
(`recap`, `checkpoint`, `activity`, `dispatch`).

This is the **3D world prototype**: an explorable, realistically textured
planet with clickable debris that seed the future context-recovery challenges.
The challenge mechanics and win/lose flow come next.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

- **Drag** to orbit · **Scroll** to zoom · **Click** the glowing debris.

## How it's built

- **Three.js + Vite**, no asset downloads — the planet is generated at load.
- `src/noise.js` — seedable 3D simplex + fBm, sampled on the sphere (seamless,
  no pole pinching).
- `src/planet.js` — bakes equirectangular color / bump / roughness maps (ocean
  glint vs. rough land) plus a cloud layer from the noise field.
- `src/atmosphere.js` — fresnel limb-glow shell.
- `src/debris.js` — surface-anchored fragments; each maps to a real `entire`
  command (`FRAGMENTS`).
- `src/main.js` — scene, lighting, starfield, orbit controls, hover/click
  raycasting, render loop.
