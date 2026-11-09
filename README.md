# Casey Robinson · 2026 Portfolio

A walkable 3D gallery in the browser. Each project is a room, and each room plays out as a choose-your-own-adventure where you make the same design calls I made.

Every room also has a **Quick read** mode: a clean 2D case study of the same content, for skimming on a phone or using a screen reader.

- Engine: [PlayCanvas](https://playcanvas.com) (WebGPU with WebGL 2 fallback)
- Environments: Gaussian splats generated with World Labs Marble (placeholder geometry for now)
- Hosting: Vercel

See [`docs/PORTFOLIO_HANDOFF.md`](docs/PORTFOLIO_HANDOFF.md) for the full plan, decisions, and content inventory.

## Secrets

API keys live in `.env` (see `.env.example`). `.env` is gitignored. Never commit it.
