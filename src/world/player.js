import * as pc from 'playcanvas';

const EYE = 1.62;
const RADIUS = 0.35;
const WALK = 3.0;
const RUN = 6.0;
const LOOK_SENS = 0.12; // degrees per pixel

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerpAngle = (a, b, t) => {
  let d = ((b - a + 540) % 360) - 180;
  return a + d * t;
};

export class Player {
  constructor(camera, input) {
    this.camera = camera;
    this.input = input;
    this.x = 0;
    this.z = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.vx = 0;
    this.vz = 0;
    this.glide = null;
  }

  teleport(x, z, yaw = this.yaw, pitch = 0) {
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.pitch = pitch;
    this.vx = this.vz = 0;
    this.glide = null;
    this._apply();
  }

  // Camera fly-through to a point. Callers swap this for a fade when the
  // visitor prefers reduced motion.
  glideTo(x, z, yaw, pitch = -8, duration = 1.6) {
    return new Promise((resolve) => {
      this.glide = {
        from: { x: this.x, z: this.z, yaw: this.yaw, pitch: this.pitch },
        to: { x, z, yaw, pitch },
        t: 0,
        duration,
        resolve,
      };
    });
  }

  update(dt, colliders) {
    if (this.glide) {
      const g = this.glide;
      g.t = Math.min(1, g.t + dt / g.duration);
      const k = ease(g.t);
      this.x = g.from.x + (g.to.x - g.from.x) * k;
      this.z = g.from.z + (g.to.z - g.from.z) * k;
      this.yaw = lerpAngle(g.from.yaw, g.to.yaw, k);
      this.pitch = g.from.pitch + (g.to.pitch - g.from.pitch) * k;
      this.input.consumeLook();
      if (g.t >= 1) {
        this.glide = null;
        g.resolve();
      }
      this._apply();
      return;
    }

    // Clamp the movement step so a long frame can't tunnel through walls.
    dt = Math.min(dt, 0.05);
    const look = this.input.consumeLook();
    this.yaw -= look.x * LOOK_SENS;
    this.pitch = Math.max(-80, Math.min(80, this.pitch - look.y * LOOK_SENS));

    const mv = this.input.moveVector();
    const speed = this.input.running() ? RUN : WALK;
    const r = (this.yaw * Math.PI) / 180;
    const fx = -Math.sin(r);
    const fz = -Math.cos(r);
    const rx = Math.cos(r);
    const rz = -Math.sin(r);
    const tx = (fx * mv.y + rx * mv.x) * speed;
    const tz = (fz * mv.y + rz * mv.x) * speed;
    // Light smoothing so starts and stops don't feel robotic.
    const k = 1 - Math.exp(-dt * 12);
    this.vx += (tx - this.vx) * k;
    this.vz += (tz - this.vz) * k;

    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this._collide(colliders);
    this._apply();
  }

  _collide(colliders) {
    for (let iter = 0; iter < 2; iter++) {
      for (const b of colliders) {
        const cx = Math.max(b.minX, Math.min(this.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(this.z, b.maxZ));
        const dx = this.x - cx;
        const dz = this.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= RADIUS * RADIUS) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          this.x = cx + (dx / d) * RADIUS;
          this.z = cz + (dz / d) * RADIUS;
        } else {
          // Center inside the box: push out along the shallowest axis.
          const pen = [
            [this.x - b.minX + RADIUS, -1, 0],
            [b.maxX - this.x + RADIUS, 1, 0],
            [this.z - b.minZ + RADIUS, 0, -1],
            [b.maxZ - this.z + RADIUS, 0, 1],
          ].sort((a, c) => a[0] - c[0])[0];
          this.x += pen[1] * pen[0];
          this.z += pen[2] * pen[0];
        }
      }
    }
  }

  _apply() {
    this.camera.setPosition(this.x, EYE, this.z);
    this.camera.setEulerAngles(this.pitch, this.yaw, 0);
  }

  position() {
    return new pc.Vec3(this.x, EYE, this.z);
  }
}

// Yaw (degrees) that looks from (x, z) toward (tx, tz).
export function yawToward(x, z, tx, tz) {
  return (Math.atan2(-(tx - x), -(tz - z)) * 180) / Math.PI;
}
