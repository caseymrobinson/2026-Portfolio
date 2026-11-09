import * as pc from 'playcanvas';
import { createEngine, detectTier } from './engine.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { applyEnvironment } from './env.js';
import { buildHall, HALL } from './hall.js';
import { buildPlaces } from './placesRoom.js';
import { buildSplatRoom } from './splatRoom.js';
import { preloadMapData } from './mapTexture.js';
import { ensureFonts } from '../ui/theme.js';

// The 3D layer. Rooms load one at a time, like the Marble splats will:
// leaving a room unloads it, entering builds (later: streams) the next.

export async function createWorld(canvas, hooks) {
  const tier = detectTier();
  hooks.onProgress?.(0.1, 'Starting the renderer');
  const { app, device } = await createEngine(canvas, tier);
  const deviceName = device.isWebGPU ? 'WebGPU' : 'WebGL 2';
  hooks.onProgress?.(0.35, `Renderer ready (${deviceName})`);

  let dir = hooks.direction();
  await ensureFonts(dir);

  const camera = new pc.Entity('camera');
  camera.addComponent('camera', {
    fov: 68,
    nearClip: 0.05,
    farClip: 120,
    clearColor: new pc.Color(...dir.world.fog, 1),
  });
  app.root.addChild(camera);

  const fitFov = () => {
    const portrait = window.innerHeight > window.innerWidth;
    camera.camera.horizontalFov = portrait;
    camera.camera.fov = portrait ? 78 : 68;
  };
  fitFov();
  window.addEventListener('resize', fitFov);

  // Post effects on capable hardware; plain tone mapping elsewhere.
  let frame = null;
  if (tier === 'high') {
    try {
      frame = new pc.CameraFrame(app, camera.camera);
      frame.rendering.toneMapping = pc.TONEMAP_NEUTRAL;
      frame.rendering.samples = 4;
      frame.ssao.type = pc.SSAOTYPE_COMBINE;
      frame.ssao.intensity = 0.22;
      frame.ssao.radius = 14;
      frame.ssao.samples = 12;
      frame.ssao.blurEnabled = true;
      frame.bloom.intensity = 0.012;
      frame.bloom.blurLevel = 12;
      frame.update();
    } catch (err) {
      console.warn('Post effects unavailable', err);
      frame = null;
    }
  }
  if (!frame) {
    camera.camera.toneMapping = pc.TONEMAP_NEUTRAL;
    camera.camera.gammaCorrection = pc.GAMMA_SRGB;
  }

  const input = new Input(canvas, {
    joystickEl: hooks.joystickEl,
    onInteract: () => prompt?.action(),
    onLockChange: hooks.onLockChange,
    onFirstMove: hooks.onFirstMove,
  });
  const player = new Player(camera, input);

  applyEnvironment(app, dir);
  hooks.onProgress?.(0.5, 'Building the hall');
  // Start fetching map data for the Places room in the background.
  const mapReady = preloadMapData().catch(() => {});

  let room = null;
  let roomName = null;
  let paused = false;
  let busy = false;
  let prompt = null;

  const roomHooks = {
    setPrompt(p) {
      if ((p?.label || null) === (prompt?.label || null)) {
        prompt = p;
        return;
      }
      prompt = p;
      hooks.onPrompt(p);
    },
    onDoor: (name) => hooks.onDoor(name),
    onStation: (i) => hooks.onStation(i),
  };

  async function build(name, onProgress) {
    if (name === 'hall') {
      if (hooks.hallVariant?.() === 'marble') {
        try {
          return await buildSplatRoom(app, 'hall', { tier, onProgress });
        } catch (err) {
          // A missing or broken splat should never strand the visitor.
          console.warn('Marble hall unavailable, using the built hall', err);
        }
      }
      return buildHall(app, dir, { tier });
    }
    if (name === 'places') {
      await mapReady;
      return buildPlaces(app, dir, { tier, onProgress });
    }
    throw new Error(`Unknown room ${name}`);
  }

  function applyFog(r) {
    camera.camera.clearColor = new pc.Color(...(r.clearColor || dir.world.fog), 1);
    // Splat rooms carry their own atmosphere.
    app.scene.fog.type = r.grid ? pc.FOG_NONE : pc.FOG_LINEAR;
    app.scene.fog.color = new pc.Color(...r.fog);
    app.scene.fog.start = 30;
    app.scene.fog.end = 90;
  }

  async function loadRoom(name, { spawn, onProgress } = {}) {
    const next = await build(name, onProgress);
    room?.destroy();
    room = next;
    roomName = name;
    applyFog(room);
    let s = spawn || room.spawn;
    // A spawn meant for another layout can land inside a wall here.
    if (room.grid && room.grid.blockedAt(s.x, s.z)) s = room.spawn;
    player.teleport(s.x, s.z, s.yaw, s.pitch || 0);
    roomHooks.setPrompt(null);
    return room;
  }

  app.on('update', (dt) => {
    if (paused || !room || busy) return;
    player.update(dt, room.colliders, room.grid);
    room.update?.(dt, player, roomHooks);
  });

  await loadRoom('hall');
  hooks.onProgress?.(1, 'Ready');

  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const api = {
    tier,
    deviceName,
    get room() {
      return roomName;
    },
    get busy() {
      return busy;
    },

    // Fade out, swap rooms, fade in. Splat streaming will slot in here.
    async enterRoom(name, { spawn, fade, onProgress } = {}) {
      if (busy) return;
      busy = true;
      input.release();
      try {
        await fade?.(true);
        await loadRoom(name, { spawn, onProgress });
        await fade?.(false);
      } finally {
        busy = false;
      }
      return room;
    },

    setPaused(on) {
      paused = on;
      input.setEnabled(!on);
      app.autoRender = !on;
      if (!on) app.renderNextFrame = true;
      if (on) roomHooks.setPrompt(null);
    },

    releaseInput() {
      input.release();
    },

    stations() {
      return room?.stations || [];
    },

    setProgress(doneIds) {
      room?.setProgress?.(doneIds);
    },

    // Fly the camera to a station. Reduced motion gets a fade instead.
    async goToStation(i, { fade } = {}) {
      const s = room?.stations?.[i];
      if (!s || busy) return;
      input.release();
      if (reducedMotion() && fade) {
        await fade(true);
        player.teleport(s.stand.x, s.stand.z, s.standYaw, -10);
        await fade(false);
      } else {
        const dist = Math.hypot(player.x - s.stand.x, player.z - s.stand.z);
        await player.glideTo(s.stand.x, s.stand.z, s.standYaw, -10, Math.min(2.4, 0.8 + dist * 0.25));
      }
    },

    teleportNearDoor(name) {
      const d = HALL.doors[name];
      if (d) player.teleport(d.x, d.z + 4, 0, 0);
    },

    // Test hook (exposed on window only with ?debug).
    pose(next) {
      if (next) player.teleport(next.x ?? player.x, next.z ?? player.z, next.yaw ?? player.yaw, next.pitch ?? player.pitch);
      return { x: +player.x.toFixed(2), z: +player.z.toFixed(2), yaw: +player.yaw.toFixed(1), pitch: +player.pitch.toFixed(1), blocked: room?.grid ? room.grid.blockedAt(player.x, player.z) : null };
    },

    get hallVariant() {
      return room?.variant || 'code';
    },

    async reloadRoom({ fade } = {}) {
      if (!room || busy) return;
      busy = true;
      try {
        await fade?.(true);
        await loadRoom(roomName);
        await fade?.(false);
      } finally {
        busy = false;
      }
    },

    async setDirection(next) {
      dir = next;
      await ensureFonts(dir);
      applyEnvironment(app, dir);
      // Rebuild the current room in place so materials and labels pick up the new palette.
      if (room) {
        const pos = { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch };
        await loadRoom(roomName, { spawn: pos });
        hooks.onRoomRebuilt?.(roomName);
      }
    },
  };

  return api;
}
