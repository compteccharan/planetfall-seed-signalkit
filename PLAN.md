# Planetfall — Plan & Status

_Last updated: 2026-06-05_

## The pitch

You're a stranded astronaut. Your ship's AI has **amnesia** — it lost all its
context about what happened. To escape, you explore a 3D planet, find debris,
and each piece hides a small puzzle solved by **recovering lost context**.

The hook: reconstructing the ship's memory in-fiction **is the same act** as
recovering a real codebase's history with [Entire](https://docs.entire.io).
Each puzzle teaches a real `entire` command.

> Note: `entire explain` does **not** exist (it was an early guess). The real
> context-recovery commands are `recap`, `checkpoint`, `activity`, `dispatch`.

## Locked decisions

- **3D, web-based.** Three.js + Vite, no downloaded assets — the planet is
  generated procedurally at load.
- **Planet look (approved):** a dreamy **lavender ocean world** with a few
  **gold metallic islands** that shimmer, wrapped in a **Saturn-style ring**.
  Soft, minimal, calm.
  - NOT earthlike. NOT the glowing-magenta-"neural"-vein look (tried it; it
    looked "itchy" — busy land texture fighting bright veins. Removed.)
  - Keep lighting (sun / ambient / env) **low** — the lavender sea washes out
    white if over-lit.
- **Build order:** get the world feeling right **first** (done), then puzzles,
  then the command engine + win/lose.

## Status

### Done ✅ — the 3D world (user-approved)
- Procedural planet: lavender ocean, gold **metallic** islands (PBR
  metalness + low roughness + `RoomEnvironment` IBL → shimmer), soft frost
  poles, drifting clouds.
- Saturn-style banded ring (tilted, two gaps, transparent).
- Soft lavender fresnel atmosphere, violet-tinted starfield.
- Orbit + zoom controls; slow auto-rotation.
- 4 clickable debris on the surface with hover highlight; clicking opens a
  **stub** fragment panel (lore text + the command it will teach).
- Verified rendering in headless Chrome (WebGL2), no console errors.

### Not built yet ⏳
- Puzzle mechanics (panels are lore stubs only).
- The command engine (see open questions).
- Win/lose + checkpoint-collection state.
- Polish backlog: bloom on gold glints, ring shadow cast on planet, recolor
  debris halos from cyan → warm gold/white to match the palette, spread the
  islands out a bit.

## Puzzle design (PROPOSED — not yet reviewed/built)

Arc: **orient → restore → understand → escape**. Each puzzle is small: run a
command → read the recovered context → use one detail from it.

| # | Fragment | Command | What's lost | Puzzle |
|---|----------|-----------|-------------|--------|
| 1 | 🪖 EVA Helmet | `recap` | "What was I doing before the crash?" | Run `recap`; read the summary of recent log entries; pick out the mission. |
| 2 | 📖 Torn Logbook | `checkpoint` | A setting got corrupted in the crash | Search checkpoints, find the last good one before the corruption, rewind to it. |
| 3 | 🖥️ Nav Panel | `activity` | "*When* did it go wrong?" | Read the activity timeline; find when the anomaly started. |
| 4 | 📡 Signal Beacon | `dispatch` | No way to call for help | Generate a dispatch summarizing all recovered context, broadcast it → **win**. |

- **#4 is the ending**: you can only send a complete dispatch after recovering
  the other three. This quietly answers "how do you win / how do checkpoints
  accumulate."

### Open questions (decide before/while building puzzles)
1. **Does the arc + mapping feel right?** (e.g. helmet → recap)
2. **Command engine:** simulated in-game terminal (portable, shareable web demo)
   vs. real CLI execution (authentic, needs a local backend) vs. hybrid.
   _Leaning simulated for a shareable demo; not yet decided._
3. **How literal is the command output?** Real-ish `entire` output vs. softened
   ship-AI flavor text.
4. **Win/lose model:** currently leaning "restore the ship's log" (collect all
   fragments, no hard lose state). Oxygen/timer and branching endings were
   other options.

### Next step
Fully design **#1 (EVA Helmet / `recap`)** end-to-end as the template, then
clone the pattern to the other three.

## Architecture / where things live

```
index.html         # canvas + HUD + stub inspection panel + loader
src/style.css      # HUD / panel / loader styling
src/main.js        # scene, camera, lighting, env (IBL), starfield, planet,
                   #   clouds, atmosphere, ring, debris, raycast hover/click,
                   #   render loop. Tuning knobs live here (light/env levels).
src/noise.js       # seedable 3D simplex + fBm (sampled on the sphere → seamless)
src/planet.js      # bakes color / bump / roughness / metalness maps + clouds.
                   #   Palette constants (DEEP/SHALLOW/SNOW, LAND_STOPS) here.
src/atmosphere.js  # fresnel limb-glow shell shader
src/ring.js        # procedural banded ring (radial-remapped UVs)
src/debris.js      # surface-anchored fragments; FRAGMENTS[] = lore + command
```

Run: `npm install` then `npm run dev` → http://localhost:5173

## History
Repo started as `signalkit` (a Python telemetry CLI), then pivoted to Planetfall
on 2026-06-05. The old code is recoverable via git history + Entire checkpoints.
