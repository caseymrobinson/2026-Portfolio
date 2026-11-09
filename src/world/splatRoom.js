import * as pc from 'playcanvas';
import { EYE_HEIGHT } from './player.js';

// A room rendered from a World Labs Marble splat, prepared by
// scripts/prepare-splat.mjs (SOG splats + a walkability grid from the
// collider mesh). Drafts carry no metric scale, so the room is scaled until
// the capture camera sits at eye height.

export async function buildSplatRoom(app, name, { tier, onProgress, hooks }) {
  const base = `splats/${name}/`;
  const meta = await (await fetch(`${base}room.json`)).json();
  // 500K splats by default (about 4 MB). ?splat=high tries the full set,
  // ?splat=preview the 100K set.
  const quality = new URLSearchParams(location.search).get('splat');
  const file = meta.files[quality] || meta.files.low;

  // Capture camera is at y = 0 in the splat; the floor is at floorY (negative).
  const s = EYE_HEIGHT / Math.max(0.5, -meta.floorY);
  const root = new pc.Entity(`splat-${name}`);
  app.root.addChild(root);

  onProgress?.(0.1, 'Streaming the room');
  const asset = new pc.Asset(`${name}-splat`, 'gsplat', { url: base + file });
  await new Promise((resolve, reject) => {
    asset.once('load', resolve);
    asset.once('error', reject);
    app.assets.add(asset);
    app.assets.load(asset);
  });
  onProgress?.(0.9, 'Placing the room');

  const splat = new pc.Entity('splat');
  splat.addComponent('gsplat', { asset });
  splat.setLocalScale(s, s, s);
  splat.setLocalPosition(0, -meta.floorY * s, 0);
  root.addChild(splat);

  const grid = decodeGrid(meta.grid, s);
  const doors = (meta.doors || []).map((d) => ({ ...d, promptZ: d.promptZ * s, enterZ: d.enterZ * s }));
  const spawn = { x: meta.spawn.x * s, z: meta.spawn.z * s, yaw: meta.spawn.yaw ?? 0, pitch: 0 };
  onProgress?.(1, 'Ready');

  return {
    name: 'hall',
    variant: 'marble',
    colliders: [],
    grid,
    spawn,
    fog: [0.05, 0.05, 0.05],
    clearColor: [0.06, 0.06, 0.06],
    labels: [],
    update(dt, player, roomHooks) {
      // Door zones come from scripts/rooms.json (raw units along -Z).
      for (const d of doors) {
        if (player.z < d.enterZ) return roomHooks.onDoor(d.to);
        if (player.z < d.promptZ) return roomHooks.setPrompt({ label: d.label, action: () => roomHooks.onDoor(d.to) });
      }
      roomHooks.setPrompt(null);
    },
    destroy() {
      root.destroy();
      app.assets.remove(asset);
      asset.unload();
    },
  };
}

// Run-length grid -> lookup with on-demand collision boxes near the player.
function decodeGrid(g, s) {
  const cells = new Uint8Array(g.cols * g.rows);
  let v = g.rle.first;
  let i = 0;
  for (const run of g.rle.runs) {
    cells.fill(v, i, i + run);
    i += run;
    v = v ? 0 : 1;
  }
  const cell = g.cell * s;
  const minX = g.minX * s;
  const minZ = g.minZ * s;
  return {
    cell,
    blockedAt(x, z) {
      const cx = Math.floor((x - minX) / cell);
      const cz = Math.floor((z - minZ) / cell);
      if (cx < 0 || cz < 0 || cx >= g.cols || cz >= g.rows) return true;
      return cells[cz * g.cols + cx] === 1;
    },
    boxesNear(x, z, r) {
      const out = [];
      const x0 = Math.floor((x - r - minX) / cell);
      const x1 = Math.floor((x + r - minX) / cell);
      const z0 = Math.floor((z - r - minZ) / cell);
      const z1 = Math.floor((z + r - minZ) / cell);
      for (let cz = z0; cz <= z1; cz++)
        for (let cx = x0; cx <= x1; cx++) {
          const outside = cx < 0 || cz < 0 || cx >= g.cols || cz >= g.rows;
          if (outside || cells[cz * g.cols + cx]) {
            out.push({ minX: minX + cx * cell, maxX: minX + (cx + 1) * cell, minZ: minZ + cz * cell, maxZ: minZ + (cz + 1) * cell });
          }
        }
      return out;
    },
  };
}
