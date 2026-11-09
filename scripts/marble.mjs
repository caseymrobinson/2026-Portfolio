// World Labs Marble pipeline: generate a room, wait for it, download its assets.
// Checked against docs.worldlabs.ai (World API, Nov 2026).
//
//   node scripts/marble.mjs credits
//   node scripts/marble.mjs generate hall [--model marble-1.0-draft] [--seed 42] [--image path-or-url] [--dry-run]
//   node scripts/marble.mjs resume hall <operation_id>
//   node scripts/marble.mjs fetch hall            (re-download assets from the saved world.json)
//
// Needs WORLDLABS_API_KEY in the environment or in .env (never commit it).
// API credits are separate from Marble app credits: buy them at
// platform.worldlabs.ai/billing. Drafts are the cheap way to iterate.
// Behind a proxy on Node 22, run with NODE_USE_ENV_PROXY=1.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname } from 'node:path';

const API = 'https://api.worldlabs.ai/marble/v1';
const ROOT = new URL('../', import.meta.url);
const rooms = JSON.parse(await readFile(new URL('scripts/rooms.json', ROOT), 'utf8'));

const [cmd, room, ...rest] = process.argv.slice(2);
const flag = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? undefined : rest[i + 1];
};
const has = (name) => rest.includes(`--${name}`);

async function apiKey() {
  if (process.env.WORLDLABS_API_KEY) return process.env.WORLDLABS_API_KEY;
  if (existsSync(new URL('.env', ROOT))) {
    const env = await readFile(new URL('.env', ROOT), 'utf8');
    const m = env.match(/^WORLDLABS_API_KEY\s*=\s*(.+)$/m);
    if (m && m[1].trim()) return m[1].trim();
  }
  throw new Error('WORLDLABS_API_KEY is not set. Add it to .env (see .env.example).');
}

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'WLT-Api-Key': await apiKey(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const hint =
      res.status === 401 || res.status === 403
        ? ' Check the API key.'
        : res.status === 402
          ? ' Not enough API credits: add some at platform.worldlabs.ai/billing.'
          : res.status === 429
            ? ' Rate limited (about 3 starts per minute). Wait a minute and retry.'
            : '';
    throw new Error(`${method} ${path} failed: ${res.status}.${hint}\n${JSON.stringify(json, null, 2)}`);
  }
  return json;
}

const outDir = (name) => new URL(`public/splats/${name}/`, ROOT);

async function imagePrompt(src) {
  if (/^https?:\/\//.test(src)) return { source: 'uri', uri: src };
  const buf = await readFile(src);
  const ext = extname(src).slice(1).toLowerCase();
  return { source: 'data_base64', data_base64: buf.toString('base64'), extension: ext === 'jpeg' ? 'jpg' : ext };
}

async function buildRequest(name) {
  const r = rooms[name];
  if (!r) throw new Error(`Unknown room "${name}". Rooms: ${Object.keys(rooms).filter((k) => !k.startsWith('_')).join(', ')}`);
  const image = flag('image');
  const world_prompt = image
    ? { type: 'image', image_prompt: await imagePrompt(image), text_prompt: r.prompt, is_pano: 'auto' }
    : { type: 'text', text_prompt: r.prompt };
  const req = {
    display_name: r.display_name,
    model: flag('model') || 'marble-1.0-draft',
    world_prompt,
    tags: r.tags,
    permission: { public: false },
  };
  if (flag('seed')) req.seed = Number(flag('seed'));
  return req;
}

async function poll(name, operationId) {
  const started = Date.now();
  for (;;) {
    const op = await call('GET', `/operations/${operationId}`);
    const status = op.metadata?.progress?.status || (op.done ? 'DONE' : 'PENDING');
    const mins = ((Date.now() - started) / 60000).toFixed(1);
    process.stdout.write(`\r${name}: ${status} (${mins} min)        `);
    if (op.done) {
      process.stdout.write('\n');
      if (op.error) throw new Error(`Generation failed: ${JSON.stringify(op.error)}`);
      return op;
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`  saved ${dest.pathname.split('/public/')[1]}  ${(buf.length / 1048576).toFixed(1)} MB`);
}

async function saveAssets(name, world) {
  const dir = outDir(name);
  await mkdir(dir, { recursive: true });
  const a = world.assets || {};
  const spz = a.splats?.spz_urls || {};
  // The manifest the app reads. Tier files map to device quality tiers.
  const manifest = {
    room: name,
    world_id: world.id,
    marble_url: world.world_marble_url,
    caption: a.caption,
    semantics: a.splats?.semantics_metadata || null,
    files: {},
  };
  const want = [
    ['low', spz['500k'], 'splat-500k.spz'],
    ['high', spz.full_res, 'splat-full.spz'],
    ['preview', spz['100k'], 'splat-100k.spz'],
    ['collider', a.mesh?.collider_mesh_url, 'collider.glb'],
    ['pano', a.imagery?.pano_url, 'pano.jpg'],
    ['thumbnail', a.thumbnail_url, 'thumbnail.jpg'],
  ];
  for (const [key, url, file] of want) {
    if (!url) continue;
    await download(url, new URL(file, dir));
    manifest.files[key] = file;
  }
  await writeFile(new URL('world.json', dir), JSON.stringify(world, null, 2));
  await writeFile(new URL('manifest.json', dir), JSON.stringify(manifest, null, 2));
  console.log(`  wrote manifest.json${manifest.semantics ? ` (scale ${manifest.semantics.metric_scale_factor})` : ''}`);
  console.log(`  open in Marble: ${world.world_marble_url}`);
}

try {
  if (cmd === 'credits') {
    console.log(JSON.stringify(await call('GET', '/credits'), null, 2));
  } else if (cmd === 'generate') {
    const req = await buildRequest(room);
    if (has('dry-run')) {
      const shown = structuredClone(req);
      if (shown.world_prompt.image_prompt?.data_base64) shown.world_prompt.image_prompt.data_base64 = '<base64 omitted>';
      console.log(`POST ${API}/worlds:generate\n${JSON.stringify(shown, null, 2)}`);
      process.exit(0);
    }
    const op = await call('POST', '/worlds:generate', req);
    console.log(`${room}: started ${op.operation_id} with ${req.model}. Takes about 5 minutes.`);
    await mkdir(outDir(room), { recursive: true });
    await writeFile(new URL('operation.json', outDir(room)), JSON.stringify(op, null, 2));
    const done = await poll(room, op.operation_id);
    if (done.cost) console.log(`  cost: ${JSON.stringify(done.cost)}`);
    await saveAssets(room, done.response);
  } else if (cmd === 'resume') {
    const done = await poll(room, rest[0]);
    await saveAssets(room, done.response);
  } else if (cmd === 'fetch') {
    const world = JSON.parse(await readFile(new URL('world.json', outDir(room)), 'utf8'));
    await saveAssets(room, world);
  } else {
    console.log('Usage: node scripts/marble.mjs credits | generate <room> [--model m] [--seed n] [--image p] [--dry-run] | resume <room> <op> | fetch <room>');
  }
} catch (err) {
  console.error(`\n${err.message}`);
  process.exit(1);
}
