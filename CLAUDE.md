# Neon Megacity Portfolio

A 3D portfolio where visitors fly through a rain-soaked neon cyberpunk megacity at night. Scrolling moves the camera along a cinematic flight path; each portfolio section lives at a landmark.

## Workflow rules
- Work milestone by milestone (M1–M7 below). After each one: run the dev server, check it in a browser, commit, then **stop and wait for the user's feedback**.
- Don't start the next milestone without the user's go-ahead.

## Originality rule (strict)
Inspired by the cyberpunk *genre* only. Never use names, logos, brands, characters, text or assets from Cyberpunk 2077, Edgerunners or any other game or film. All billboards, signs and holograms are original: the user's name and projects, invented brand names, made-up Japanese/English-style signage.

## Visual style
Anime-cinematic cyberpunk: high contrast, deep blacks, glowing emissives, heavy bloom, haze, depth fog, light rain, wet reflections.
- Aerial: dense dark city grid with glowing edges, huge circular holographic plaza at the center, roads radiating like spokes, traffic light trails, red blinking rooftop lights, giant billboards.
- Street: massive vertical megatowers in purple/blue/pink neon, holographic ads, an original floating hologram creature (a jellyfish).

## Palette (`src/theme.ts`, mirrored in `src/index.css` @theme)
| Token | Hex | Use |
|---|---|---|
| bg | #05060f | background, fog |
| cyan | #00f0ff | dominant glow, HUD |
| teal | #00ffc8 | secondary glow, links |
| magenta | #ff2bd6 | accents, ads |
| purple | #8a2be2 | tower neon |
| orange | #ff6b1a | warm accents |
| red | #ff1e3c | rooftop aviation lights only |

Fonts: Chakra Petch (display), JetBrains Mono (HUD/data).

## Tech decisions
- Vite + React 19 + TypeScript; three + @react-three/fiber + drei + @react-three/postprocessing.
- **Scroll:** native page scroll + Lenis (smoothing) + GSAP ScrollTrigger. One progress value (0..1) in the zustand store drives the camera and world. Not drei ScrollControls, because the real HTML sections must stay in the normal document for SEO and screen readers.
- **State:** zustand (`src/store.ts`). Per-frame values (progress) are read with `useApp.getState()` inside `useFrame`; never select them in components.
- **Chapters:** `src/sections/chapters.ts` is the single table of section progress ranges; HTML section heights and camera keyframes derive from it.
- **Camera:** `src/camera/flightPath.ts`, two CatmullRom curves (position + lookAt) with keyframes pinned to progress values.
- **Content:** everything personal is in `src/content.ts`.
- **No heavy assets:** windows, holograms, billboards are shaders or runtime canvas textures; ambient audio is generated with Web Audio. Any external asset must be CC0/free-licensed and listed in this file.
- Tailwind v4 via `@tailwindcss/vite`; colors defined as `@theme` tokens.
- Note: macOS is case-insensitive. Don't create files whose names differ only in case (e.g. `sections.ts` vs `Sections.tsx`).

## World layout (meters, plaza at origin)
About tower (170,−150) · project avenue along +X from x=240 to 660 · Skills tower (780,0) · Contact mast (820,220) · Orbit epilogue climbs to ~2400 m.

## Chapters (scroll progress)
hero 0–0.10 · dive 0.10–0.20 · about 0.20–0.34 · projects 0.34–0.60 · skills 0.60–0.74 · contact 0.74–0.88 · orbit 0.88–1.0
The orbit epilogue (user-approved): rise above the clouds to a planet horizon; no characters.

## Performance budget
60fps on a mid-range laptop. Draw calls < 100 (high) / < 50 (low). DPR cap 1.5. Instancing everywhere. Quality tiers via drei PerformanceMonitor: lower DPR, reflections, rain, bloom before removing landmarks. Mobile: ~40% buildings, bloom only. Respect prefers-reduced-motion.

## Milestones
- [x] M1 setup, empty scene, scroll camera on placeholder path
- [x] M2 procedural city, shader windows, edge glow, fog, bloom
- [ ] M3 plaza hologram, traffic trails, rooftop lights, rain, flying vehicles
- [ ] M4 full flight path, landmarks, banking/sway/parallax
- [ ] M5 HUD, loader, nav, content wiring, project panels
- [ ] M6 jellyfish, glitch transitions, sound, orbit epilogue, polish
- [ ] M7 quality tiers, mobile, reduced motion, SEO/OG, Vercel deploy

## Shader rules (learned the hard way)
- Every emissive shader must output finite HDR: clamp distances used in `exp()` to >= 0 and cap the final color (`min(color, vec3(24.0))`). With MSAA, fragments can be evaluated slightly outside a face, extrapolated values overflow the half-float buffers, and Bloom smears the resulting NaN over the entire frame (symptom: the whole screen goes black at certain camera positions).
- The city is ONE InstancedMesh (`src/world/City.tsx`) with per-instance `aDims`, `aSeed`, `aAccent`. Add new building variety in the shader, not as new meshes.
- Dev aids: `?nofx` disables post-processing; `window.__gl` exposes the renderer in dev.

## Known follow-ups
- HTML chapter text timing vs camera (text for the next chapter scrolls in early) → fix with the HUD overlay in M5.
- `THREE.Clock` deprecation warning comes from R3F internals; harmless.
