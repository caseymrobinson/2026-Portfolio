import * as pc from 'playcanvas';
import { Builder, material, concreteCanvas } from './kit.js';
import { createLabel } from './labels.js';
import { site } from '../content/site.js';

// Entry hall: code-built placeholder for the Marble splat. Calm contemporary
// museum, linear skylight, two doorways on the far wall.
//
// Layout (meters): x from -8 to 8, z from -16 (doorway wall) to 17 (back wall).
export const HALL = {
  spawn: { x: 0, z: 5, yaw: 0, pitch: 4 },
  doors: {
    places: { x: -4, z: -12, label: 'Places' },
    records: { x: 4, z: -12, label: 'Records Search' },
  },
};

const W = 8;
const NEAR = 10;
const FAR = -12;
const H = 9;
const DOOR_W = 2.4;
const DOOR_H = 4.4;

export function buildHall(app, dir, { tier }) {
  const b = new Builder(app, 'hall');
  const w = dir.world;

  const floorTex = b.texture(concreteCanvas(512), { repeat: true });
  const mats = {
    floor: b.track(material({ diffuse: w.floor, diffuseMap: floorTex, tiling: [4, 6.5], gloss: 0.8 })),
    wall: b.track(material({ diffuse: w.wall, gloss: 0.15, emissive: w.wall, emissiveIntensity: 0.14 })),
    ceiling: b.track(material({ diffuse: w.wall.map((v) => v * 0.92), gloss: 0.1, emissive: w.wall, emissiveIntensity: 0.32 })),
    sky: b.track(material({ emissive: w.sky, emissiveIntensity: 3.2, unlit: true })),
    portal: b.track(material({ emissive: [1, 1, 1], emissiveIntensity: 1.25, unlit: true, emissiveMap: b.texture(portalCanvas(w), { mipmaps: false }) })),
    bench: b.track(material({ diffuse: [0.36, 0.27, 0.19], gloss: 0.55 })),
    plinth: b.track(material({ diffuse: w.wall, gloss: 0.3, emissive: w.wall, emissiveIntensity: 0.1 })),
  };

  // Floor and ceiling (with a slot for the skylight).
  b.box('floor', [0, -0.1, 0.5], [W * 2, 0.2, NEAR - FAR + 3], mats.floor, { castShadows: false });
  b.box('ceiling-l', [-4.5, H + 0.2, 0.5], [7, 0.4, NEAR - FAR], mats.ceiling);
  b.box('ceiling-r', [4.5, H + 0.2, 0.5], [7, 0.4, NEAR - FAR], mats.ceiling);
  b.box('skylight-well-l', [-1.05, H + 0.9, 0.5], [0.1, 1.4, NEAR - FAR], mats.wall);
  b.box('skylight-well-r', [1.05, H + 0.9, 0.5], [0.1, 1.4, NEAR - FAR], mats.wall);
  b.plane('skylight', [0, H + 1.55, 0.5], [2.2, NEAR - FAR], mats.sky, [180, 0, 0]);

  // Side and back walls.
  b.box('wall-l', [-W - 0.2, H / 2, 0.5], [0.4, H, NEAR - FAR], mats.wall, { collide: true });
  b.box('wall-r', [W + 0.2, H / 2, 0.5], [0.4, H, NEAR - FAR], mats.wall, { collide: true });
  b.box('wall-back', [0, H / 2, NEAR + 0.2], [W * 2, H, 0.4], mats.wall, { collide: true });

  // Far wall with two doorways.
  const doorXs = [HALL.doors.places.x, HALL.doors.records.x];
  const segs = [
    [-W, doorXs[0] - DOOR_W / 2],
    [doorXs[0] + DOOR_W / 2, doorXs[1] - DOOR_W / 2],
    [doorXs[1] + DOOR_W / 2, W],
  ];
  segs.forEach(([a, c], i) => b.box(`far-${i}`, [(a + c) / 2, H / 2, FAR - 0.2], [c - a, H, 0.4], mats.wall, { collide: true }));
  doorXs.forEach((x, i) => {
    b.box(`lintel-${i}`, [x, (DOOR_H + H) / 2, FAR - 0.2], [DOOR_W, H - DOOR_H, 0.4], mats.wall);
    // Short passage behind each doorway, ending in a glowing portal.
    b.box(`jamb-l-${i}`, [x - DOOR_W / 2 - 0.1, DOOR_H / 2, FAR - 1.2], [0.2, DOOR_H, 2], mats.wall, { collide: true });
    b.box(`jamb-r-${i}`, [x + DOOR_W / 2 + 0.1, DOOR_H / 2, FAR - 1.2], [0.2, DOOR_H, 2], mats.wall, { collide: true });
    b.box(`passage-top-${i}`, [x, DOOR_H + 0.1, FAR - 1.2], [DOOR_W + 0.4, 0.2, 2], mats.wall);
    b.plane(`portal-${i}`, [x, DOOR_H / 2, FAR - 2.1], [DOOR_W, DOOR_H], mats.portal, [90, 0, 0]);
    b.box(`portal-stop-${i}`, [x, DOOR_H / 2, FAR - 2.4], [DOOR_W, DOOR_H, 0.2], mats.wall, { collide: true });

    const glow = new pc.Entity(`portal-light-${i}`);
    glow.addComponent('light', {
      type: 'omni',
      color: new pc.Color(...w.accent),
      intensity: 0.6,
      range: 4.5,
      castShadows: false,
    });
    glow.setLocalPosition(x, 1.6, FAR - 0.4);
    b.root.addChild(glow);
  });

  // Furniture for scale.
  b.box('bench', [0, 0.23, -1], [3.2, 0.46, 0.7], mats.bench, { collide: true });
    b.box('plinth-a', [-6, 0.55, -5], [0.9, 1.1, 0.9], mats.plinth, { collide: true });
  b.box('plinth-b', [6, 0.55, -5], [0.9, 1.1, 0.9], mats.plinth, { collide: true });

  // Wall text.
  const labels = [];
  const title = createLabel(b, {
    name: 'title',
    width: 5.4,
    height: 3.4,
    align: 'center',
    lines: [
      { text: site.name, role: 'display', size: 0.78 },
      { text: site.role, role: 'mono', size: 0.2, gap: 0.26, upper: true },
      { text: 'Choose a room. Walk through a doorway,', role: 'body', size: 0.2, gap: 0.5 },
      { text: 'or open the menu to jump.', role: 'body', size: 0.2, gap: 0.1 },
    ],
  });
  title.entity.setLocalPosition(0, 5.6, FAR + 0.02);
  labels.push(title);

  const doorLabels = [
    { x: doorXs[0], n: '01', t: 'Places', s: 'Walk-through' },
    { x: doorXs[1], n: '02', t: 'Records Search', s: 'Quick read' },
  ];
  doorLabels.forEach((d, i) => {
    const l = createLabel(b, {
      name: `door-label-${i}`,
      width: 3.4,
      height: 1.7,
      align: 'center',
      lines: [
        { text: d.n, role: 'mono', size: 0.2 },
        { text: d.t, role: 'display', size: 0.52, gap: 0.1 },
        { text: d.s, role: 'mono', size: 0.16, gap: 0.16, upper: true },
      ],
    });
    l.entity.setLocalPosition(d.x, DOOR_H + 1.35, FAR + 0.02);
    labels.push(l);
  });

  // Sun through the skylight. With shadows on, the ceiling slabs block it
  // and only a stripe of daylight lands on the floor.
  const sun = new pc.Entity('sun');
  sun.addComponent('light', {
    type: 'directional',
    color: new pc.Color(...w.sunColor),
    intensity: w.sunIntensity,
    castShadows: tier === 'high',
    shadowResolution: 2048,
    shadowDistance: 45,
    shadowBias: 0.3,
    normalOffsetBias: 0.06,
    shadowType: pc.SHADOW_PCF3_32F,
  });
  sun.setLocalEulerAngles(28, 30, 10);
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

  const colliders = b.colliders;


  return {
    name: 'hall',
    builder: b,
    colliders,
    spawn: HALL.spawn,
    fog: w.fog,
    labels,
    update(dt, player, hooks) {
      // Doorway triggers.
      if (player.z < FAR - 0.5) {
        const door = Math.abs(player.x - doorXs[0]) < DOOR_W / 2 + 0.2 ? 'places' : Math.abs(player.x - doorXs[1]) < DOOR_W / 2 + 0.2 ? 'records' : null;
        if (door) hooks.onDoor(door);
      }
      // Prompt when standing in front of a doorway, so it's discoverable.
      let prompt = null;
      if (player.z < FAR + 3.5) {
        if (Math.abs(player.x - doorXs[0]) < 1.6) prompt = { label: 'Enter Places', action: () => hooks.onDoor('places') };
        else if (Math.abs(player.x - doorXs[1]) < 1.6) prompt = { label: 'Read Records Search', action: () => hooks.onDoor('records') };
      }
      hooks.setPrompt(prompt);
    },
    destroy() {
      b.destroy();
    },
  };
}

// Light beyond the doorway: warm white core falling off to the accent.
function portalCanvas(w) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  const css = (a, k = 1) => `rgb(${Math.round(Math.min(1, a[0] * k) * 255)},${Math.round(Math.min(1, a[1] * k) * 255)},${Math.round(Math.min(1, a[2] * k) * 255)})`;
  const grad = g.createRadialGradient(64, 200, 10, 64, 160, 220);
  grad.addColorStop(0, css(w.sky, 1.0));
  grad.addColorStop(0.45, css([(w.sky[0] + w.accent[0]) / 2, (w.sky[1] + w.accent[1]) / 2, (w.sky[2] + w.accent[2]) / 2]));
  grad.addColorStop(1, css(w.accent, 0.8));
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 256);
  return c;
}
