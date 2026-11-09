import * as pc from 'playcanvas';
import { canvasTexture } from './engine.js';

// A painted equirect "room" used for image-based lighting, so the polished
// concrete and brass pick up soft reflections. When Marble splats arrive,
// this can be swapped for a panorama exported from the same world.
export function applyEnvironment(app, dir) {
  const w = dir.world;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  const rgb = (a, k = 1) => `rgb(${Math.round(a[0] * 255 * k)},${Math.round(a[1] * 255 * k)},${Math.round(a[2] * 255 * k)})`;

  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, rgb(w.sky, 1));
  grad.addColorStop(0.32, rgb(w.wall, 0.95));
  grad.addColorStop(0.5, rgb(w.wall, 0.82));
  grad.addColorStop(0.56, rgb(w.floor, 0.7));
  grad.addColorStop(1, rgb(w.floor, 0.45));
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 256);
  // Skylight band overhead.
  g.fillStyle = rgb(w.sky, 1.0);
  g.globalAlpha = 0.9;
  g.fillRect(0, 0, 512, 22);
  g.globalAlpha = 1;
  // Doorway glows on the horizon, tinted by the accent.
  for (const x of [120, 380]) {
    const dg = g.createRadialGradient(x, 128, 0, x, 128, 40);
    dg.addColorStop(0, rgb(w.accent, 1));
    dg.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.35;
    g.fillStyle = dg;
    g.fillRect(x - 40, 88, 80, 80);
  }
  g.globalAlpha = 1;

  const device = app.graphicsDevice;
  const src = canvasTexture(device, c, { mipmaps: false });
  src.projection = pc.TEXTUREPROJECTION_EQUIRECT;
  try {
    const lighting = pc.EnvLighting.generateLightingSource(src, { size: 128 });
    const atlas = pc.EnvLighting.generateAtlas(lighting, { size: 256, numReflectionSamples: 512, numAmbientSamples: 1024 });
    const old = app.scene.envAtlas;
    app.scene.envAtlas = atlas;
    app.scene.skyboxIntensity = w.ambient * 1.3;
    old?.destroy();
    lighting.destroy();
  } catch (err) {
    // IBL is a nice-to-have. Fall back to flat ambient light.
    console.warn('Environment lighting unavailable', err);
    app.scene.ambientLight = new pc.Color(w.ambient, w.ambient, w.ambient);
  }
  src.destroy();
  app.scene.exposure = w.exposure;
}
