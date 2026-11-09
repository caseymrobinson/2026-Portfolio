// Turns a downloaded Marble world into files the app can load fast:
//  - SOG splats (PlayCanvas's native compressed format, unbundled), rotated from Marble's
//    OpenCV frame into PlayCanvas's Y-up frame (180 degrees around X)
//  - a 2D walkability grid built from the collider mesh, so the player
//    collides with walls and can't walk off the generated space
//  - room.json: the app-side manifest (files, floor height, grid, spawn)
//
//   node scripts/prepare-splat.mjs hall
//
// Run after `node scripts/marble.mjs generate <room>`.

import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const room = process.argv[2];
if (!room) {
  console.log('Usage: node scripts/prepare-splat.mjs <room>');
  process.exit(1);
}
const dir = new URL(`../public/splats/${room}/`, import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', dir), 'utf8'));
const roomConfig = JSON.parse(await readFile(new URL('./rooms.json', import.meta.url), 'utf8'))[room] || {};

// Marble scale metadata (absent on drafts). Applied to splats here; the
// collider gets the same treatment below.
const scale = manifest.semantics?.metric_scale_factor || 1;
const groundOffset = manifest.semantics?.ground_plane_offset || 0;

// ---------- 1. Splats to SOG ----------
const tiers = { low: 'splat-500k.spz', high: 'splat-full.spz', preview: 'splat-100k.spz' };
const sog = {};
for (const [tier, file] of Object.entries(tiers)) {
  if (!manifest.files[tier]) continue;
  // Unbundled SOG: meta.json plus WebP textures. Plain web types, so any
  // static host serves it, and the textures download in parallel.
  const out = `${room}-${tier}/meta.json`;
  const args = ['splat-transform', '-q', '-w', '-g', 'cpu', new URL(file, dir).pathname];
  if (scale !== 1) args.push('-s', String(scale));
  args.push('-r', '180,0,0', new URL(out, dir).pathname);
  console.log(`converting ${file} -> ${out}`);
  execFileSync('npx', args, { stdio: 'inherit' });
  sog[tier] = out;
}

// ---------- 2. Collider mesh to a walkability grid ----------
function readGlb(buf) {
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const binStart = 20 + jsonLen + 8;
  const bin = buf.subarray(binStart);
  const accessor = (i) => {
    const a = json.accessors[i];
    const view = json.bufferViews[a.bufferView];
    const offset = (view.byteOffset || 0) + (a.byteOffset || 0);
    const comps = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
    const Ctor = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[a.componentType];
    const bytes = bin.subarray(offset, offset + a.count * comps * Ctor.BYTES_PER_ELEMENT);
    return new Ctor(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  };
  if (json.extensionsRequired?.length) throw new Error(`Collider uses unsupported extensions: ${json.extensionsRequired}`);
  const prim = json.meshes[0].primitives[0];
  return { positions: accessor(prim.attributes.POSITION), indices: accessor(prim.indices) };
}

const { positions, indices } = readGlb(await readFile(new URL('collider.glb', dir)));
// Bring the collider into the frame PlayCanvas renders the SOG in. The GLB is
// already Y-up, but the rendered splat ends up rotated 180 degrees around Y
// relative to it (verified in the engine: the doorway Marble shows ahead of
// the capture camera renders at -Z, while the raw collider has it at +Z).
// So negate X and Z, then apply scale.
for (let i = 0; i < positions.length; i += 3) {
  positions[i] = -positions[i] * scale;
  positions[i + 1] *= scale;
  positions[i + 2] = -positions[i + 2] * scale;
}

let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
for (let i = 0; i < positions.length; i += 3) {
  minX = Math.min(minX, positions[i]); maxX = Math.max(maxX, positions[i]);
  minY = Math.min(minY, positions[i + 1]); maxY = Math.max(maxY, positions[i + 1]);
  minZ = Math.min(minZ, positions[i + 2]); maxZ = Math.max(maxZ, positions[i + 2]);
}

// Floor height: the most common height among upward-facing triangles near the bottom.
const CELL = 0.15;
const tri = (t) => [0, 1, 2].map((k) => {
  const i = indices[t * 3 + k] * 3;
  return [positions[i], positions[i + 1], positions[i + 2]];
});
const normalY = ([a, b, c]) => {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const len = Math.hypot(...n) || 1;
  return n[1] / len;
};
const triCount = indices.length / 3;
const hist = new Map();
for (let t = 0; t < triCount; t++) {
  const p = tri(t);
  if (Math.abs(normalY(p)) < 0.8) continue;
  const y = (p[0][1] + p[1][1] + p[2][1]) / 3;
  if (y > minY + (maxY - minY) * 0.4) continue;
  const key = Math.round(y / 0.05);
  hist.set(key, (hist.get(key) || 0) + 1);
}
const floorY = [...hist.entries()].sort((a, b) => b[1] - a[1])[0][0] * 0.05;

const cols = Math.ceil((maxX - minX) / CELL) + 1;
const rows = Math.ceil((maxZ - minZ) / CELL) + 1;
const floor = new Uint8Array(cols * rows);
const wall = new Uint8Array(cols * rows);
const BAND_LO = floorY + 0.25; // ignore curbs and floor noise
// Up to just above the capture camera (y = 0), in raw units: a door lintel
// sits above this, a wall spans it.
const BAND_HI = Math.min(floorY + 1.9, 0.12);

function stamp(grid, p) {
  // Sample the triangle densely enough to hit every cell it covers.
  const edge = Math.max(
    Math.hypot(p[1][0] - p[0][0], p[1][2] - p[0][2]),
    Math.hypot(p[2][0] - p[0][0], p[2][2] - p[0][2]),
    Math.hypot(p[2][0] - p[1][0], p[2][2] - p[1][2]),
  );
  const steps = Math.max(1, Math.ceil(edge / (CELL * 0.5)));
  for (let i = 0; i <= steps; i++)
    for (let j = 0; j <= steps - i; j++) {
      const a = i / steps, b = j / steps, c = 1 - a - b;
      const x = p[0][0] * a + p[1][0] * b + p[2][0] * c;
      const y = p[0][1] * a + p[1][1] * b + p[2][1] * c;
      const z = p[0][2] * a + p[1][2] * b + p[2][2] * c;
      if (grid === wall && (y < BAND_LO || y > BAND_HI)) continue;
      const cx = Math.floor((x - minX) / CELL);
      const cz = Math.floor((z - minZ) / CELL);
      if (cx >= 0 && cz >= 0 && cx < cols && cz < rows) grid[cz * cols + cx] = 1;
    }
}
for (let t = 0; t < triCount; t++) {
  const p = tri(t);
  const ny = normalY(p);
  const ys = p.map((v) => v[1]);
  if (Math.abs(ny) >= 0.8 && Math.max(...ys) < floorY + 0.25) stamp(floor, p);
  else if (Math.abs(ny) < 0.8 && Math.max(...ys) > BAND_LO && Math.min(...ys) < BAND_HI) stamp(wall, p);
}

// Blocked = wall, or no floor. Close one-cell pinholes in the floor first.
const blocked = new Uint8Array(cols * rows);
for (let z = 0; z < rows; z++)
  for (let x = 0; x < cols; x++) {
    const i = z * cols + x;
    let f = floor[i];
    if (!f) {
      let n = 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, zz = z + dz;
        if (xx >= 0 && zz >= 0 && xx < cols && zz < rows && floor[zz * cols + xx]) n++;
      }
      f = n >= 3 ? 1 : 0;
    }
    blocked[i] = wall[i] || !f ? 1 : 0;
  }

// Spawn: the walkable cell nearest the capture point (origin), which is
// where Marble's panorama was taken from.
let spawn = { x: 0, z: 0 };
let best = Infinity;
for (let z = 0; z < rows; z++)
  for (let x = 0; x < cols; x++) {
    if (blocked[z * cols + x]) continue;
    const wx = minX + (x + 0.5) * CELL;
    const wz = minZ + (z + 0.5) * CELL;
    // Prefer open space: require the 5x5 neighbourhood to be walkable.
    let open = true;
    for (let dz = -2; dz <= 2 && open; dz++)
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, zz = z + dz;
        if (xx < 0 || zz < 0 || xx >= cols || zz >= rows || blocked[zz * cols + xx]) { open = false; break; }
      }
    if (!open) continue;
    const d = Math.hypot(wx, wz);
    if (d < best) { best = d; spawn = { x: +wx.toFixed(2), z: +wz.toFixed(2) }; }
  }

const walkable = blocked.reduce((n, v) => n + (v ? 0 : 1), 0);
const roomJson = {
  room,
  source: { world_id: manifest.world_id, marble_url: manifest.marble_url },
  files: sog,
  // The app lifts the splat so the floor sits at y = 0.
  floorY: +floorY.toFixed(3),
  bounds: { minX, maxX, minY, maxY, minZ, maxZ },
  spawn: { ...spawn, yaw: 0 },
  doors: (roomConfig.doors || []).map(({ _note, ...d }) => d),
  grid: {
    cell: CELL,
    minX: +minX.toFixed(3),
    minZ: +minZ.toFixed(3),
    cols,
    rows,
    // Row-major, 1 = blocked. Run-length encoded to keep the file small.
    rle: rle(blocked),
  },
};
function rle(arr) {
  const out = [];
  let cur = arr[0], n = 0;
  for (const v of arr) {
    if (v === cur) n++;
    else { out.push(n); cur = v; n = 1; }
  }
  out.push(n);
  return { first: arr[0], runs: out };
}
await writeFile(new URL('room.json', dir), JSON.stringify(roomJson));
console.log(`floor at y=${floorY.toFixed(2)}, grid ${cols}x${rows} (${CELL} m cells), ${walkable} walkable cells, spawn ${JSON.stringify(spawn)}`);

// Quick ASCII map for a sanity check (north is up = -Z).
const step = Math.max(1, Math.round(0.45 / CELL));
let art = '';
for (let z = 0; z < rows; z += step) {
  let line = '';
  for (let x = 0; x < cols; x += step) line += blocked[z * cols + x] ? '#' : '.';
  art += line + '\n';
}
console.log(art);
