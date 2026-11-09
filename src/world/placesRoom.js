import * as pc from 'playcanvas';
import { Builder, material, mergedBoxes, meshEntity } from './kit.js';
import { createLabel } from './labels.js';
import { drawMap, MAP, ROME, VILLAGE, toRoom } from './mapTexture.js';
import { yawToward } from './player.js';
import { places } from '../content/places.js';

// Places room: the floor is the map. You enter at Rome, where the data is
// dense, and walk south to a village in Zambia, where there's almost none.
// Three decision stations sit along that path; the impact plinth waits at
// the village.

const H = 7;
const MARGIN = 0.7;

export async function buildPlaces(app, dir, { tier, onProgress }) {
  const b = new Builder(app, 'places');
  const w = dir.world;
  const halfW = MAP.width / 2;
  const halfD = MAP.depth / 2;
  const rome = toRoom(ROME.lon, ROME.lat);
  const village = toRoom(VILLAGE.lon, VILLAGE.lat);

  onProgress?.(0.2, 'Drawing the map');
  const map = await drawMap(dir, { size: tier === 'high' ? 2048 : 1536 });
  onProgress?.(0.6, 'Placing the data');

  const colorTex = b.texture(map.color, { anisotropy: 16 });
  const metalTex = b.texture(map.metal, { srgb: false });
  const mapMat = b.track(material({ diffuse: [1, 1, 1], diffuseMap: colorTex, gloss: 0.62 }));
  mapMat.metalnessMap = metalTex;
  mapMat.metalnessMapChannel = 'r';
  mapMat.metalness = 1;
  mapMat.update();

  const mats = {
    stone: b.track(material({ diffuse: w.floor.map((v) => v * 0.9), gloss: 0.5 })),
    wall: b.track(material({ diffuse: w.wall, gloss: 0.12, emissive: w.wall, emissiveIntensity: 0.16 })),
    ceiling: b.track(material({ diffuse: w.wall.map((v) => v * 0.9), gloss: 0.1, emissive: w.wall, emissiveIntensity: 0.3 })),
    laylight: b.track(material({ emissive: w.sky, emissiveIntensity: 2.4, unlit: true })),
    portal: b.track(material({ emissive: w.accent, emissiveIntensity: 1.5, unlit: true })),
    pin: b.track(material({ diffuse: [0.86, 0.7, 0.45], metalness: 0.35, gloss: 0.65 })),
    pinCap: b.track(material({ emissive: w.accent, emissiveIntensity: 2.2, unlit: true })),
    path: b.track(material({ emissive: w.accent, emissiveIntensity: 1.4, unlit: true })),
    plinth: b.track(material({ diffuse: w.wall, gloss: 0.35, emissive: w.wall, emissiveIntensity: 0.12 })),
    plinthTop: b.track(material({ diffuse: w.wall.map((v) => v * 0.96), gloss: 0.5 })),
    edge: b.track(material({ emissive: w.accent, emissiveIntensity: 1.8, unlit: true })),
    edgeDone: b.track(material({ emissive: [0.45, 0.62, 0.4], emissiveIntensity: 1.2, unlit: true })),
  };

  // Floor: map inlay inside a stone surround.
  b.plane('map', [0, 0.001, 0], [MAP.width, MAP.depth], mapMat);
  b.box('surround', [0, -0.1, 0], [MAP.width + MARGIN * 2 + 0.8, 0.2, MAP.depth + MARGIN * 2 + 0.8], mats.stone, { castShadows: false });

  // Walls.
  const xW = halfW + MARGIN;
  const zN = -halfD - MARGIN;
  const zS = halfD + MARGIN;
  const doorX = rome.x;
  const DOOR_W = 2.4;
  const DOOR_H = 4.0;
  b.box('wall-w', [-xW - 0.2, H / 2, 0], [0.4, H, zS - zN + 0.8], mats.wall, { collide: true });
  b.box('wall-e', [xW + 0.2, H / 2, 0], [0.4, H, zS - zN + 0.8], mats.wall, { collide: true });
  b.box('wall-s', [0, H / 2, zS + 0.2], [xW * 2 + 0.8, H, 0.4], mats.wall, { collide: true });
  // North wall, with the doorway back to the hall.
  const nl = -xW - 0.4;
  const nr = xW + 0.4;
  b.box('wall-n-l', [(nl + doorX - DOOR_W / 2) / 2, H / 2, zN - 0.2], [doorX - DOOR_W / 2 - nl, H, 0.4], mats.wall, { collide: true });
  b.box('wall-n-r', [(doorX + DOOR_W / 2 + nr) / 2, H / 2, zN - 0.2], [nr - doorX - DOOR_W / 2, H, 0.4], mats.wall, { collide: true });
  b.box('wall-n-top', [doorX, (DOOR_H + H) / 2, zN - 0.2], [DOOR_W, H - DOOR_H, 0.4], mats.wall);
  b.box('exit-jamb-l', [doorX - DOOR_W / 2 - 0.1, DOOR_H / 2, zN - 1.1], [0.2, DOOR_H, 1.8], mats.wall, { collide: true });
  b.box('exit-jamb-r', [doorX + DOOR_W / 2 + 0.1, DOOR_H / 2, zN - 1.1], [0.2, DOOR_H, 1.8], mats.wall, { collide: true });
  b.box('exit-top', [doorX, DOOR_H + 0.1, zN - 1.1], [DOOR_W + 0.4, 0.2, 1.8], mats.wall);
  b.plane('exit-portal', [doorX, DOOR_H / 2, zN - 1.9], [DOOR_W, DOOR_H], mats.portal, [90, 0, 0]);
  b.box('exit-stop', [doorX, DOOR_H / 2, zN - 2.2], [DOOR_W, DOOR_H, 0.2], mats.wall, { collide: true });

  // Ceiling with a big laylight.
  const LL_W = MAP.width * 0.62;
  const LL_D = MAP.depth * 0.62;
  b.plane('laylight', [0, H + 0.05, 0], [LL_W, LL_D], mats.laylight, [180, 0, 0]);
  const cw = xW * 2 + 0.8;
  const cd = zS - zN + 0.8;
  b.box('ceil-n', [0, H + 0.2, -(LL_D / 2 + (cd / 2 - LL_D / 2) / 2)], [cw, 0.4, cd / 2 - LL_D / 2], mats.ceiling);
  b.box('ceil-s', [0, H + 0.2, LL_D / 2 + (cd / 2 - LL_D / 2) / 2], [cw, 0.4, cd / 2 - LL_D / 2], mats.ceiling);
  b.box('ceil-w', [-(LL_W / 2 + (cw / 2 - LL_W / 2) / 2), H + 0.2, 0], [cw / 2 - LL_W / 2, 0.4, LL_D], mats.ceiling);
  b.box('ceil-e', [LL_W / 2 + (cw / 2 - LL_W / 2) / 2, H + 0.2, 0], [cw / 2 - LL_W / 2, 0.4, LL_D], mats.ceiling);

  // Data pins: dense around Rome, thinning out toward the village.
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pins = [];
  const caps = [];
  const spawnClear = (x, z) => Math.hypot(x - rome.x, z - (zN + 1.6)) < 1.0;
  for (let i = 0; i < 9000 && pins.length < 520; i++) {
    const lon = MAP.lonMin + rnd() * (MAP.lonMax - MAP.lonMin);
    const lat = MAP.latMin + rnd() * (MAP.latMax - MAP.latMin);
    if (!map.isLand(lon, lat)) continue;
    const p = toRoom(lon, lat);
    const d = Math.hypot(p.x - rome.x, p.z - rome.z);
    const north = Math.max(0, Math.min(1, (lat - 30) / 25));
    const prob = 0.85 * Math.exp(-d / 1.8) + 0.16 * north + 0.004;
    if (rnd() > prob) continue;
    if (spawnClear(p.x, p.z)) continue;
    const h = 0.03 + (0.32 * Math.exp(-d / 1.6) + 0.06 * north) * (0.35 + rnd());
    pins.push({ center: [p.x, h / 2, p.z], size: [0.045, h, 0.045] });
    caps.push({ center: [p.x, h + 0.012, p.z], size: [0.06, 0.024, 0.06] });
  }
  // Rome itself, and the one lonely pin at the village.
  pins.push({ center: [rome.x, 0.25, rome.z], size: [0.09, 0.5, 0.09] });
  caps.push({ center: [rome.x, 0.52, rome.z], size: [0.13, 0.04, 0.13] });
  pins.push({ center: [village.x, 0.06, village.z], size: [0.05, 0.12, 0.05] });
  caps.push({ center: [village.x, 0.13, village.z], size: [0.07, 0.02, 0.07] });
  const device = app.graphicsDevice;
  meshEntity('pins', mergedBoxes(device, pins), mats.pin, b.root);
  meshEntity('pin-caps', mergedBoxes(device, caps), mats.pinCap, b.root, { castShadows: false });

  // The path, Rome to the village.
  const dx = village.x - rome.x;
  const dz = village.z - rome.z;
  const len = Math.hypot(dx, dz);
  const ux = dx / len;
  const uz = dz / len;
  const px = -uz; // perpendicular, pointing east-ish
  const pz = ux;
  const dashes = [];
  for (let t = 0.04; t < 0.97; t += 0.035) {
    const x = rome.x + dx * t;
    const z = rome.z + dz * t;
    dashes.push({ center: [x, 0.006, z], size: [0.05, 0.004, 0.05] });
  }
  meshEntity('path', mergedBoxes(device, dashes), mats.path, b.root, { castShadows: false });

  // Stations.
  const at = (t, side = 1.0) => ({ x: rome.x + dx * t + px * side, z: rome.z + dz * t + pz * side });
  const stationDefs = [
    { kind: 'decision', index: 0, t: 0.26 },
    { kind: 'decision', index: 1, t: 0.52 },
    { kind: 'decision', index: 2, t: 0.78 },
    { kind: 'impact', t: 1.0, side: 1.1 },
  ];
  const labels = [];
  const stations = stationDefs.map((def, i) => {
    const pos = at(def.t, def.side ?? 1.0);
    const yaw = yawToward(pos.x, pos.z, rome.x + dx * def.t, rome.z + dz * def.t);
    const root = new pc.Entity(`station-${i}`);
    root.setLocalPosition(pos.x, 0, pos.z);
    root.setLocalEulerAngles(0, yaw + 180, 0); // +Z of the station faces the path
    b.root.addChild(root);

    b.box(`plinth-${i}`, [0, 0.5, 0], [0.9, 1.0, 0.55], mats.plinth, { parent: root });
    const top = b.box(`plinth-top-${i}`, [0, 1.06, 0.02], [0.9, 0.06, 0.62], mats.plinthTop, { parent: root });
    top.setLocalEulerAngles(18, 0, 0);
    const edge = b.box(`edge-${i}`, [0, 0.03, 0.29], [0.9, 0.04, 0.02], mats.edge, { parent: root, castShadows: false });
    // Collider in world space.
    b.colliders.push({ minX: pos.x - 0.55, maxX: pos.x + 0.55, minZ: pos.z - 0.55, maxZ: pos.z + 0.55 });

    const d = def.kind === 'decision' ? places.decisions[def.index] : null;
    const caption = createLabel(b, {
      name: `station-label-${i}`,
      width: 0.84,
      height: 0.56,
      pad: 0.06,
      pxPerMeter: 640,
      lines: d
        ? [
            { text: d.kicker, role: 'mono', size: 0.04, upper: true },
            ...wrap(d.title, 17).map((t, k) => ({ text: t, role: 'display', size: 0.068, gap: k ? 0.008 : 0.03 })),
          ]
        : [
            { text: 'The ending', role: 'mono', size: 0.045, upper: true },
            { text: places.impact.kicker, role: 'display', size: 0.1, gap: 0.03 },
          ],
    });
    // Lay it on the slanted top.
    caption.entity.reparent(root);
    caption.entity.setLocalPosition(0, 1.115, 0.03);
    caption.entity.setLocalEulerAngles(-72, 0, 0);
    labels.push(caption);

    // Floating numeral that turns to face you, for wayfinding.
    const numeral = createLabel(b, {
      name: `station-num-${i}`,
      width: 0.8,
      height: 0.5,
      align: 'center',
      glow: true,
      pxPerMeter: 420,
      color: rgbCss(w.accent),
      lines: [{ text: d ? `0${def.index + 1}` : '★', role: d ? 'display' : 'body', size: 0.36 }],
    });
    numeral.entity.setLocalPosition(pos.x, 2.15, pos.z);
    labels.push(numeral);

    // Spot where the camera parks: on the path, a step back from the plinth.
    const stand = { x: rome.x + dx * (def.t - 0.12), z: rome.z + dz * (def.t - 0.12) };
    return { def, pos, stand, standYaw: yawToward(stand.x, stand.z, pos.x, pos.z), edge, numeral: numeral.entity, done: false };
  });

  // Room title on the north wall, beside the door.
  const title = createLabel(b, {
    name: 'room-title',
    width: 4.4,
    height: 1.6,
    lines: [
      { text: places.intro.kicker, role: 'mono', size: 0.13, upper: true },
      { text: places.title, role: 'display', size: 0.42, gap: 0.08 },
      { text: 'Rome has everything. Mwandi has almost nothing.', role: 'body', size: 0.13, gap: 0.16 },
    ],
  });
  title.entity.setLocalPosition(doorX + DOOR_W / 2 + 0.6 + 2.2, 3.4, zN + 0.02);
  // Mirror text on the north wall faces +Z already (into the room).
  labels.push(title);

  // Lighting: soft top light from the laylight, no hard shadows.
  const sun = new pc.Entity('laylight-sun');
  sun.addComponent('light', {
    type: 'directional',
    color: new pc.Color(...w.sunColor),
    intensity: w.sunIntensity * 0.75,
    castShadows: tier === 'high',
    shadowResolution: 2048,
    shadowDistance: 30,
    shadowBias: 0.3,
    normalOffsetBias: 0.05,
    shadowType: pc.SHADOW_PCF5_32F,
  });
  sun.setLocalEulerAngles(8, 30, 4);
  b.root.addChild(sun);

  // Soft fill from the opposite side, no shadows: stands in for bounce light.
  const fill = new pc.Entity('fill');
  fill.addComponent('light', {
    type: 'directional',
    color: new pc.Color(...w.sunColor),
    intensity: w.sunIntensity * (tier === 'high' ? 0.45 : 0.25),
    castShadows: false,
  });
  fill.setLocalEulerAngles(-150, -40, 0);
  b.root.addChild(fill);

  const spot = new pc.Entity('rome-glow');
  spot.addComponent('light', { type: 'omni', color: new pc.Color(...w.accent), intensity: 0.9, range: 4, castShadows: false });
  spot.setLocalPosition(rome.x, 1.2, rome.z);
  b.root.addChild(spot);

  onProgress?.(1, 'Ready');

  let time = 0;
  let nextIndex = 0;

  return {
    name: 'places',
    builder: b,
    colliders: b.colliders,
    spawn: { x: rome.x, z: zN + 1.6, yaw: yawToward(rome.x, zN + 1.6, village.x, village.z), pitch: window.innerHeight > window.innerWidth ? -22 : -12 },
    labels,
    stations,
    fog: w.fog,
    setProgress(doneIds) {
      stations.forEach((s, i) => {
        s.done = s.def.kind === 'decision' && doneIds.has(places.decisions[s.def.index].id);
        s.edge.render.meshInstances[0].material = s.done ? mats.edgeDone : mats.edge;
      });
      const idx = stations.findIndex((s) => !s.done);
      nextIndex = idx === -1 ? stations.length - 1 : idx;
    },
    update(dt, player, hooks) {
      time += dt;
      // Billboards and the "next" pulse.
      stations.forEach((s, i) => {
        const yaw = yawToward(s.pos.x, s.pos.z, player.x, player.z) + 180;
        s.numeral.setEulerAngles(0, yaw, 0);
        const bob = i === nextIndex ? Math.sin(time * 2.2) * 0.06 : 0;
        s.numeral.setLocalPosition(s.pos.x, 1.95 + bob, s.pos.z);
      });

      // Exit back to the hall.
      if (player.z < zN - 0.6 && Math.abs(player.x - doorX) < DOOR_W / 2 + 0.2) {
        hooks.onDoor('hall');
        return;
      }

      // Nearest station prompt.
      let best = null;
      let bestD = 2.3;
      stations.forEach((s, i) => {
        const d = Math.hypot(player.x - s.pos.x, player.z - s.pos.z);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best !== null) {
        const s = stations[best];
        const label = s.def.kind === 'decision' ? `Open ${places.decisions[s.def.index].kicker}` : 'See the impact';
        hooks.setPrompt({ label, action: () => hooks.onStation(best) });
      } else if (player.z < zN + 2.6 && Math.abs(player.x - doorX) < 1.6) {
        hooks.setPrompt({ label: 'Back to the hall', action: () => hooks.onDoor('hall') });
      } else {
        hooks.setPrompt(null);
      }
    },
    destroy() {
      b.destroy();
    },
  };
}

function wrap(text, max) {
  const words = text.split(' ');
  const lines = [''];
  for (const word of words) {
    const cur = lines[lines.length - 1];
    if ((cur + ' ' + word).trim().length > max && cur) lines.push(word);
    else lines[lines.length - 1] = (cur + ' ' + word).trim();
  }
  return lines;
}

function rgbCss(c) {
  return `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
}
