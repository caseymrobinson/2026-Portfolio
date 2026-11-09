import * as pc from 'playcanvas';
import { canvasTexture } from './engine.js';

// Small helpers for building placeholder architecture out of boxes. Every
// solid box can also register an XZ collider, so walls and plinths block
// movement without a physics engine.

export const color = (rgb) => new pc.Color(rgb[0], rgb[1], rgb[2]);

export function material({
  diffuse = [1, 1, 1],
  gloss = 0.4,
  metalness = 0,
  emissive = null,
  emissiveIntensity = 1,
  emissiveMap = null,
  diffuseMap = null,
  tiling = null,
  opacityMap = null,
  blend = false,
  cull = true,
  unlit = false,
} = {}) {
  const m = new pc.StandardMaterial();
  m.diffuse = color(diffuse);
  m.useMetalness = true;
  m.metalness = metalness;
  m.gloss = gloss;
  if (diffuseMap) {
    m.diffuseMap = diffuseMap;
    if (tiling) m.diffuseMapTiling = new pc.Vec2(tiling[0], tiling[1]);
  }
  if (emissive) {
    m.emissive = color(emissive);
    m.emissiveIntensity = emissiveIntensity;
    if (emissiveMap) m.emissiveMap = emissiveMap;
  }
  if (unlit) {
    m.useLighting = false;
    m.useSkybox = false;
    m.diffuse = new pc.Color(0, 0, 0);
  }
  if (opacityMap) {
    m.opacityMap = opacityMap;
    m.opacityMapChannel = 'a';
    m.blendType = pc.BLEND_NORMAL;
    m.depthWrite = false;
  }
  if (blend) {
    m.blendType = pc.BLEND_NORMAL;
    m.depthWrite = false;
  }
  if (!cull) m.cull = pc.CULLFACE_NONE;
  m.update();
  return m;
}

export class Builder {
  constructor(app, name) {
    this.app = app;
    this.root = new pc.Entity(name);
    this.colliders = [];
    this.textures = [];
    this.materials = [];
    app.root.addChild(this.root);
  }

  track(m) {
    this.materials.push(m);
    return m;
  }

  box(name, center, size, mat, { collide = false, castShadows = true, parent = this.root } = {}) {
    const e = new pc.Entity(name);
    e.addComponent('render', { type: 'box', material: mat, castShadows, receiveShadows: true });
    e.setLocalPosition(center[0], center[1], center[2]);
    e.setLocalScale(size[0], size[1], size[2]);
    parent.addChild(e);
    if (collide) {
      this.colliders.push({
        minX: center[0] - size[0] / 2,
        maxX: center[0] + size[0] / 2,
        minZ: center[2] - size[2] / 2,
        maxZ: center[2] + size[2] / 2,
      });
    }
    return e;
  }

  plane(name, center, size, mat, euler = [0, 0, 0], { castShadows = false, parent = this.root } = {}) {
    const e = new pc.Entity(name);
    e.addComponent('render', { type: 'plane', material: mat, castShadows, receiveShadows: true });
    e.setLocalPosition(center[0], center[1], center[2]);
    e.setLocalEulerAngles(euler[0], euler[1], euler[2]);
    e.setLocalScale(size[0], 1, size[1]);
    parent.addChild(e);
    return e;
  }

  texture(canvas, opts) {
    const t = canvasTexture(this.app.graphicsDevice, canvas, opts);
    this.textures.push(t);
    return t;
  }

  destroy() {
    this.root.destroy();
    this.textures.forEach((t) => t.destroy());
    this.materials.forEach((m) => m.destroy());
  }
}

// Concrete: soft mottling plus saw-cut joints, tiled across the floor.
export function concreteCanvas(size = 512, joint = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, size, size);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) {
    const r = 6 + rnd() * 60;
    const x = rnd() * size;
    const y = rnd() * size;
    const shade = 236 + Math.floor(rnd() * 19);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${shade},${shade},${shade},0.35)`);
    grad.addColorStop(1, `rgba(${shade},${shade},${shade},0)`);
    g.fillStyle = grad;
    for (const dx of [-size, 0, size])
      for (const dy of [-size, 0, size]) {
        g.save();
        g.translate(dx, dy);
        g.fillRect(x - r, y - r, r * 2, r * 2);
        g.restore();
      }
  }
  for (let i = 0; i < 2500; i++) {
    const v = 200 + Math.floor(rnd() * 40);
    g.fillStyle = `rgba(${v},${v},${v},0.5)`;
    g.fillRect(rnd() * size, rnd() * size, 1.2, 1.2);
  }
  if (joint) {
    g.fillStyle = 'rgba(150,150,150,0.55)';
    g.fillRect(0, 0, size, 2);
    g.fillRect(0, 0, 2, size);
  }
  return c;
}

// Merge many boxes into one mesh so hundreds of map pins cost one draw call.
export function mergedBoxes(device, boxes) {
  const positions = [];
  const normals = [];
  const indices = [];
  const faces = [
    { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
    { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
  ];
  for (const b of boxes) {
    const [cx, cy, cz] = b.center;
    const [sx, sy, sz] = b.size.map((s) => s / 2);
    for (const f of faces) {
      const base = positions.length / 3;
      const c = [cx + f.n[0] * sx, cy + f.n[1] * sy, cz + f.n[2] * sz];
      const ext = (axis) => [axis[0] * sx, axis[1] * sy, axis[2] * sz];
      const U = ext(f.u);
      const V = ext(f.v);
      for (const [a, bb] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        positions.push(c[0] + U[0] * a + V[0] * bb, c[1] + U[1] * a + V[1] * bb, c[2] + U[2] * a + V[2] * bb);
        normals.push(...f.n);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const mesh = new pc.Mesh(device);
  mesh.setPositions(positions);
  mesh.setNormals(normals);
  mesh.setIndices(indices);
  mesh.update();
  return mesh;
}

export function meshEntity(name, mesh, mat, parent, { castShadows = true } = {}) {
  const e = new pc.Entity(name);
  e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)], castShadows, receiveShadows: true });
  parent.addChild(e);
  return e;
}
