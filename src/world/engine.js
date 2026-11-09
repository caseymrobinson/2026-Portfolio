import * as pc from 'playcanvas';

// Device tier decides pixel ratio, shadows and post effects. Splat budgets
// will hang off this too once Marble rooms arrive (500K vs 2M splat tiers).
export function detectTier() {
  const forced = new URLSearchParams(location.search).get('tier');
  if (forced === 'low' || forced === 'high') return forced;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 8;
  if (coarse || cores <= 4 || memory <= 4) return 'low';
  return 'high';
}

// Software ("fallback") WebGPU adapters exist on some low-end devices and in
// headless browsers. They're slow and can fail on buffer limits, so prefer
// WebGL 2 there.
async function webgpuUsable() {
  if (!navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return false;
    const info = adapter.info || {};
    if (adapter.isFallbackAdapter || info.isFallbackAdapter) return false;
    if (/swiftshader/i.test(`${info.vendor} ${info.architecture} ${info.description}`)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function createEngine(canvas, tier) {
  const forced = new URLSearchParams(location.search).get('device');
  const useWebGPU = forced === 'webgl2' ? false : forced === 'webgpu' ? true : await webgpuUsable();
  const deviceTypes = useWebGPU ? [pc.DEVICETYPE_WEBGPU, pc.DEVICETYPE_WEBGL2] : [pc.DEVICETYPE_WEBGL2];

  const device = await pc.createGraphicsDevice(canvas, {
    deviceTypes,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  device.maxPixelRatio = tier === 'low' ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);

  const options = new pc.AppOptions();
  options.graphicsDevice = device;
  options.componentSystems = [pc.RenderComponentSystem, pc.CameraComponentSystem, pc.LightComponentSystem, pc.GSplatComponentSystem];
  options.resourceHandlers = [pc.TextureHandler, pc.ContainerHandler, pc.GSplatHandler];

  const app = new pc.AppBase(canvas);
  app.init(options);
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);

  const onResize = () => app.resizeCanvas();
  window.addEventListener('resize', onResize);
  app.on('destroy', () => window.removeEventListener('resize', onResize));

  app.start();
  return { app, device };
}

export function canvasTexture(device, canvas, { srgb = true, mipmaps = true, repeat = false, anisotropy = 8 } = {}) {
  const address = repeat ? pc.ADDRESS_REPEAT : pc.ADDRESS_CLAMP_TO_EDGE;
  const tex = new pc.Texture(device, {
    width: canvas.width,
    height: canvas.height,
    format: srgb ? pc.PIXELFORMAT_SRGBA8 : pc.PIXELFORMAT_RGBA8,
    mipmaps,
    minFilter: mipmaps ? pc.FILTER_LINEAR_MIPMAP_LINEAR : pc.FILTER_LINEAR,
    magFilter: pc.FILTER_LINEAR,
    addressU: address,
    addressV: address,
    anisotropy,
  });
  tex.setSource(canvas);
  return tex;
}
