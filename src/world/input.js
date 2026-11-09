// Keyboard + mouse (pointer lock, or drag-to-look as a fallback) and touch
// (left-side virtual joystick, right-side drag-to-look).

const MOVE_KEYS = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export class Input {
  constructor(canvas, { joystickEl, onInteract, onLockChange, onFirstMove }) {
    this.canvas = canvas;
    this.joystickEl = joystickEl;
    this.onInteract = onInteract;
    this.onLockChange = onLockChange;
    this.onFirstMove = onFirstMove;
    this.enabled = true;
    this.keys = new Set();
    this.lookDX = 0;
    this.lookDY = 0;
    this.stick = { x: 0, y: 0 };
    this.touchLook = null;
    this.touchMove = null;
    this.drag = null;
    this.coarse = matchMedia('(pointer: coarse)').matches;
    this.moved = false;
    this._bind();
  }

  _bind() {
    const typing = (e) => /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    this._kd = (e) => {
      if (!this.enabled || typing(e)) return;
      if (MOVE_KEYS[e.code] || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        // Arrow keys would otherwise scroll focused panels.
        if (document.activeElement === document.body || document.activeElement === this.canvas || this.locked) e.preventDefault();
        this.keys.add(e.code);
        this._markMoved();
      }
      if (e.code === 'KeyE' || (e.code === 'Enter' && (document.activeElement === this.canvas || this.locked))) {
        this.onInteract?.();
      }
    };
    this._ku = (e) => this.keys.delete(e.code);
    this._blur = () => this.keys.clear();
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);
    window.addEventListener('blur', this._blur);

    // Mouse: click to lock, else drag to look.
    this._lockChange = () => {
      this.locked = document.pointerLockElement === this.canvas;
      document.body.classList.toggle('is-locked', this.locked);
      this.onLockChange?.(this.locked);
    };
    document.addEventListener('pointerlockchange', this._lockChange);

    this._pd = (e) => {
      if (!this.enabled) return;
      if (e.pointerType === 'touch') return this._touchStart(e);
      if (e.button !== 0) return;
      this.canvas.focus({ preventScroll: true });
      if (!this.locked && this.canvas.requestPointerLock && !this.noLock) {
        try {
          const p = this.canvas.requestPointerLock();
          if (p && p.catch) p.catch(() => (this.noLock = true));
        } catch {
          this.noLock = true;
        }
      }
      this.drag = { x: e.clientX, y: e.clientY };
    };
    this._pm = (e) => {
      if (!this.enabled) return;
      if (e.pointerType === 'touch') return this._touchMoveEv(e);
      if (this.locked) {
        this.lookDX += e.movementX;
        this.lookDY += e.movementY;
        this._markMoved();
      } else if (this.drag) {
        this.lookDX += e.clientX - this.drag.x;
        this.lookDY += e.clientY - this.drag.y;
        this.drag = { x: e.clientX, y: e.clientY };
        this._markMoved();
      }
    };
    this._pu = (e) => {
      if (e.pointerType === 'touch') return this._touchEnd(e);
      this.drag = null;
    };
    this.canvas.addEventListener('pointerdown', this._pd);
    window.addEventListener('pointermove', this._pm);
    window.addEventListener('pointerup', this._pu);
    window.addEventListener('pointercancel', this._pu);
  }

  _touchStart(e) {
    const left = e.clientX < window.innerWidth * 0.45;
    if (left && !this.touchMove) {
      this.touchMove = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
      this.joystickEl.hidden = false;
      this.joystickEl.style.left = e.clientX + 'px';
      this.joystickEl.style.top = e.clientY + 'px';
      this.joystickEl.firstElementChild.style.transform = 'translate(0,0)';
    } else if (!this.touchLook) {
      this.touchLook = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
    this._markMoved();
  }
  _touchMoveEv(e) {
    if (this.touchMove && e.pointerId === this.touchMove.id) {
      const max = 50;
      let dx = e.clientX - this.touchMove.ox;
      let dy = e.clientY - this.touchMove.oy;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      this.stick.x = dx / max;
      this.stick.y = -dy / max;
      this.joystickEl.firstElementChild.style.transform = `translate(${dx}px, ${dy}px)`;
    } else if (this.touchLook && e.pointerId === this.touchLook.id) {
      this.lookDX += (e.clientX - this.touchLook.x) * 1.6;
      this.lookDY += (e.clientY - this.touchLook.y) * 1.6;
      this.touchLook.x = e.clientX;
      this.touchLook.y = e.clientY;
    }
  }
  _touchEnd(e) {
    if (this.touchMove && e.pointerId === this.touchMove.id) {
      this.touchMove = null;
      this.stick.x = this.stick.y = 0;
      this.joystickEl.hidden = true;
    }
    if (this.touchLook && e.pointerId === this.touchLook.id) this.touchLook = null;
  }

  _markMoved() {
    if (!this.moved) {
      this.moved = true;
      this.onFirstMove?.();
    }
  }

  // Movement intent in [-1, 1] on each axis: x = strafe, y = forward.
  moveVector() {
    let x = this.stick.x;
    let y = this.stick.y;
    for (const code of this.keys) {
      const v = MOVE_KEYS[code];
      if (v) {
        x += v[0];
        y += v[1];
      }
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  running() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || Math.hypot(this.stick.x, this.stick.y) > 0.95;
  }

  consumeLook() {
    const d = { x: this.lookDX, y: this.lookDY };
    this.lookDX = this.lookDY = 0;
    return d;
  }

  release() {
    if (this.locked) document.exitPointerLock?.();
    this.keys.clear();
    this.stick.x = this.stick.y = 0;
    this.drag = null;
    this.touchMove = this.touchLook = null;
    this.joystickEl.hidden = true;
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.release();
  }
}
