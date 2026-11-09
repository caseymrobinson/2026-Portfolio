# Casey Robinson · 2026 Portfolio

A walkable 3D gallery in the browser. Each project is a room, and each room plays out as a choose-your-own-adventure where you make the same design calls I made.

Every room also has a **Quick read** mode: a clean 2D case study of the same content, for skimming on a phone or using a screen reader.

- Engine: [PlayCanvas](https://playcanvas.com) (WebGPU with WebGL 2 fallback)
- Environments: Gaussian splats generated with World Labs Marble (placeholder geometry for now)
- Hosting: Vercel

See [`docs/PORTFOLIO_HANDOFF.md`](docs/PORTFOLIO_HANDOFF.md) for the full plan, decisions, and content inventory.

## Secrets

API keys live in `.env` (see `.env.example`). `.env` is gitignored. Never commit it.

## Run it

```bash
npm install
npm run dev
```

`npm run build` outputs a static site to `dist/` (Vite). Vercel detects it automatically.

## How it's built (tech demo)

- **Quick read loads first.** The intro and case studies are plain HTML (~17 KB gzipped). The 3D engine is a separate chunk that loads in the background, so scan mode works instantly and still works if WebGPU/WebGL fails.
- **Rooms load one at a time** (`src/world/index.js`). Leaving a room unloads it. This is where Marble splats will stream in.
- **Placeholder architecture** is code-built geometry (`src/world/hall.js`, `src/world/placesRoom.js`). The Places floor is a real map drawn from Natural Earth data (public domain).
- **Device tiers** (`src/world/engine.js`): WebGPU when a real GPU adapter exists, WebGL 2 otherwise. High tier adds shadows, SSAO, and bloom.
- **All copy is authored** in `src/content/`. Never generate project facts.
- **Visual directions** live in `src/ui/theme.js` and `src/styles/base.css`. Switch them from the Menu.

### URL flags for testing

| Flag | Effect |
|---|---|
| `?look=a` / `b` / `c` | Visual direction: Wall Label, Survey, Afterhours |
| `?tier=low` / `high` | Force the quality tier |
| `?device=webgl2` / `webgpu` | Force the renderer |
| `#/scan`, `#/scan/places`, `#/scan/records` | Quick read views |
| `#/explore/hall`, `#/explore/places` | Jump straight into a room |
