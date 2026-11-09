import './styles/base.css';
import { site } from './content/site.js';
import { places } from './content/places.js';
import { directions, applyDirection, initialDirection, currentDirection } from './ui/theme.js';
import { renderScan } from './ui/scan.js';
import { createAdventure } from './ui/adventure.js';
import { esc, announce } from './ui/util.js';

// ---------- Elements ----------
const $ = (id) => document.getElementById(id);
const body = document.body;
const canvas = $('stage');
const introEl = $('intro');
const scanEl = $('scan');
const promptEl = $('prompt');
const hintEl = $('hint');
const menuEl = $('menu');
const menuBtn = $('menu-btn');
const roomTag = $('room-tag');
const progressChip = $('progress-chip');
const fadeEl = $('fade');
const modeButtons = document.querySelectorAll('.mode-toggle button');

// ---------- State ----------
const state = {
  mode: 'intro', // intro | explore | scan
  scanView: 'index',
  world: null,
  worldPromise: null,
  hallVariant: initialHallVariant(),
  worldFailed: null,
  currentPrompt: null,
};

applyDirection(initialDirection());

// Which entry hall to show: the code-built placeholder, or the Marble draft splat.
function initialHallVariant() {
  const param = new URLSearchParams(location.search).get('hall');
  if (param === 'marble' || param === 'code') return param;
  try {
    return localStorage.getItem('hall') === 'marble' ? 'marble' : 'code';
  } catch {
    return 'code';
  }
}

const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
};

// ---------- Fade ----------
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function fade(on) {
  fadeEl.classList.toggle('on', on);
  await wait(matchMedia('(prefers-reduced-motion: reduce)').matches ? 60 : 460);
}

// ---------- Intro ----------
function renderIntro() {
  introEl.innerHTML = `
    <div class="intro-inner">
      <div class="kicker">${esc(site.role)}</div>
      <h1 class="display" id="intro-title">${esc(site.name)}</h1>
      <p class="intro-lede">${esc(site.intro)}</p>
      <p class="intro-note">${esc(site.galleryNote)}</p>
      <div class="intro-actions">
        <button type="button" class="btn btn-primary" id="enter-btn">Enter the gallery</button>
        <a class="btn" href="#scan">Quick read instead</a>
      </div>
      <div class="load-meter" aria-hidden="true"><span id="load-bar"></span></div>
      <div class="load-status" id="load-status" role="status"></div>
    </div>`;
  $('enter-btn').addEventListener('click', () => go('#explore-hall'));
}

function setLoad(p, msg) {
  introEl.classList.toggle('is-loading', p > 0 && p < 1);
  const bar = $('load-bar');
  const status = $('load-status');
  if (bar) bar.style.width = `${Math.round(p * 100)}%`;
  if (status && msg) status.textContent = msg;
}

// ---------- World (lazy) ----------
// The 3D engine is a separate chunk, so Quick read is interactive before
// any of it downloads.
function loadWorld() {
  if (state.worldPromise) return state.worldPromise;
  setLoad(0.05, 'Loading the gallery');
  state.worldPromise = import('./world/index.js')
    .then(({ createWorld }) =>
      createWorld(canvas, {
        direction: currentDirection,
        hallVariant: () => state.hallVariant,
        joystickEl: $('joystick'),
        onProgress: setLoad,
        onPrompt: setPrompt,
        onDoor,
        onStation,
        onLockChange: (locked) => {
          if (locked) hideHint();
        },
        onFirstMove: () => setTimeout(hideHint, 2500),
        onRoomRebuilt: (name) => {
          if (name === 'places') state.world.setProgress(adventure.done);
        },
      }),
    )
    .then((world) => {
      state.world = world;
      if (new URLSearchParams(location.search).has('debug')) window.__world = world;
      document.documentElement.dataset.renderer = world.deviceName;
      return world;
    })
    .catch((err) => {
      console.error(err);
      state.worldFailed = err;
      setLoad(0, '');
      return null;
    });
  return state.worldPromise;
}

// ---------- Prompt ----------
function setPrompt(p) {
  state.currentPrompt = p;
  if (!p || state.mode !== 'explore' || adventure.isOpen) {
    promptEl.hidden = true;
    promptEl.innerHTML = '';
    return;
  }
  const coarse = matchMedia('(pointer: coarse)').matches;
  promptEl.innerHTML = `<button type="button" class="btn">${esc(p.label)}${coarse ? '' : ' <kbd>E</kbd>'}</button>`;
  promptEl.hidden = false;
  promptEl.firstElementChild.addEventListener('click', () => p.action());
}

// ---------- Rooms ----------
let entering = false;
async function onDoor(name) {
  const world = state.world;
  if (!world || entering || world.busy) return;
  if (name === 'records') {
    // Teaser: Quick read only for now. Step back from the door so returning
    // to Explore doesn't immediately re-trigger it.
    world.teleportNearDoor('records');
    go('#scan-records');
    return;
  }
  await enterRoom(name);
}

async function enterRoom(name, { spawn } = {}) {
  const world = state.world;
  if (!world || entering) return;
  entering = true;
  adventure.close();
  setPrompt(null);
  try {
    const fromRoom = world.room;
    await world.enterRoom(name, {
      spawn: spawn || (name === 'hall' && fromRoom === 'places' ? { x: -4, z: -7, yaw: 205 } : undefined),
      fade,
      onProgress: (p, msg) => announce(msg),
    });
    if (location.hash !== `#explore-${name}`) history.replaceState(null, '', `#explore-${name}`);
    updateRoomChrome();
    if (name === 'places') {
      world.setProgress(adventure.done);
      if (!adventure.done.size) adventure.openIntro();
    }
  } finally {
    entering = false;
  }
}

function onStation(i) {
  const world = state.world;
  const s = world?.stations()[i];
  if (!s) return;
  if (s.def.kind === 'impact') adventure.openImpact();
  else adventure.openDecision(s.def.index);
}

function updateRoomChrome() {
  const room = state.world?.room;
  const inExplore = state.mode === 'explore';
  roomTag.hidden = !inExplore || !room;
  roomTag.textContent = room === 'places' ? 'Exhibit 01 · Places' : state.world?.hallVariant === 'marble' ? 'Entry hall · Marble draft' : 'Entry hall';
  const t = adventure.totals();
  progressChip.hidden = !inExplore || room !== 'places';
  progressChip.textContent = `Paths explored ${t.explored} / ${t.total}`;
}

// ---------- Adventure ----------
const adventure = createAdventure($('panel'), {
  onOpen() {
    state.world?.releaseInput();
    setPrompt(null);
  },
  onClose() {
    setPrompt(state.currentPrompt);
    canvas.focus({ preventScroll: true });
  },
  async onStart() {
    adventure.close();
    await state.world?.goToStation(0, { fade });
    adventure.openDecision(0);
  },
  async onNext(index) {
    adventure.close();
    state.world?.setProgress(adventure.done);
    await state.world?.goToStation(index + 1, { fade });
    if (index + 1 < places.decisions.length) adventure.openDecision(index + 1);
    else adventure.openImpact();
  },
  onBackToHall() {
    enterRoom('hall');
  },
  onFullCase() {
    adventure.close();
    go('#scan-places');
  },
  onProgress() {
    updateRoomChrome();
    state.world?.setProgress(adventure.done);
  },
});

// ---------- Hint ----------
function showHint() {
  if (store.get('hint-dismissed')) return;
  const coarse = matchMedia('(pointer: coarse)').matches;
  hintEl.innerHTML = `
    <div class="kicker">How to move</div>
    <ul>
      ${
        coarse
          ? `<li>Drag on the left side to walk</li><li>Drag on the right side to look around</li><li>Tap the button that appears to open a room or exhibit</li>`
          : `<li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows to walk, <kbd>Shift</kbd> to run</li><li>Click the scene to look with the mouse, <kbd>Esc</kbd> to let go</li><li><kbd>E</kbd> to open what’s in front of you</li>`
      }
      <li>Or skip walking: use <strong>Menu</strong> to jump anywhere</li>
    </ul>
    <button type="button" class="btn" id="hint-ok">Got it</button>`;
  hintEl.hidden = false;
  $('hint-ok').addEventListener('click', () => {
    store.set('hint-dismissed', '1');
    hideHint();
  });
}
function hideHint() {
  hintEl.hidden = true;
}

// ---------- Menu ----------
function renderMenu() {
  const room = state.world?.room;
  const inPlaces = state.mode === 'explore' && room === 'places';
  const look = currentDirection().id;
  menuEl.innerHTML = `
    <h3 class="kicker">Rooms</h3>
    <button class="menu-item" role="menuitem" data-go="#explore-hall" ${room === 'hall' && state.mode === 'explore' ? 'aria-current="true"' : ''}>
      <span>Entry hall</span><small>Start here</small></button>
    <button class="menu-item" role="menuitem" data-go="#explore-places" ${inPlaces ? 'aria-current="true"' : ''}>
      <span>01 · Places</span><small>Walk-through, about 3 minutes</small></button>
    <button class="menu-item" role="menuitem" data-go="#scan-records">
      <span>02 · Records Search</span><small>Quick read</small></button>
    ${
      inPlaces
        ? `<hr class="menu-sep" /><h3 class="kicker">Jump to</h3>
      ${places.decisions
        .map((d, i) => `<button class="menu-item" role="menuitem" data-station="${i}"><span>${esc(d.kicker)}</span><small>${esc(d.title)}</small></button>`)
        .join('')}
      <button class="menu-item" role="menuitem" data-station="3"><span>Impact</span><small>The ending</small></button>`
        : ''
    }
    <hr class="menu-sep" />
    <h3 class="kicker">Entry hall version</h3>
    <div class="look-grid" role="group" aria-label="Entry hall version">
      <button class="look-btn hall-btn" data-hall-variant="code" aria-pressed="${state.hallVariant === 'code'}">
        <span class="letter">1</span><strong>Built placeholder</strong><small>Code geometry with both doorways and wall text.</small></button>
      <button class="look-btn hall-btn" data-hall-variant="marble" aria-pressed="${state.hallVariant === 'marble'}">
        <span class="letter">2</span><strong>Marble draft</strong><small>Generated Gaussian splat, about 4 MB. First draft: one doorway, use the menu to reach rooms.</small></button>
    </div>
    <hr class="menu-sep" />
    <h3 class="kicker">Visual direction</h3>
    <div class="look-grid" role="group" aria-label="Visual direction">
      ${Object.values(directions)
        .map(
          (d) => `<button class="look-btn" data-look="${d.id}" aria-pressed="${d.id === look}">
          <span class="letter">${d.letter}</span><strong>${esc(d.name)}${d.id === 'label' ? ' · my pick' : ''}</strong><small>${esc(d.pitch)}</small></button>`,
        )
        .join('')}
    </div>
    <hr class="menu-sep" />
    <button class="menu-item" role="menuitem" data-hint><span>Show controls</span></button>
    ${state.world ? `<p class="kicker" style="margin:8px 12px">Renderer: ${esc(state.world.deviceName)} · ${esc(state.world.tier)} tier</p>` : ''}`;

  menuEl.querySelectorAll('[data-go]').forEach((b) =>
    b.addEventListener('click', () => {
      closeMenu();
      go(b.dataset.go);
    }),
  );
  menuEl.querySelectorAll('[data-station]').forEach((b) =>
    b.addEventListener('click', async () => {
      closeMenu();
      const i = Number(b.dataset.station);
      adventure.close();
      await state.world?.goToStation(i, { fade });
      onStation(i);
    }),
  );
  menuEl.querySelectorAll('[data-look]').forEach((b) => b.addEventListener('click', () => setLook(b.dataset.look)));
  menuEl.querySelectorAll('[data-hall-variant]').forEach((b) =>
    b.addEventListener('click', async () => {
      const v = b.dataset.hallVariant;
      if (v === state.hallVariant) return;
      state.hallVariant = v;
      store.set('hall', v);
      renderMenu();
      if (state.world?.room === 'hall' && state.mode === 'explore') {
        closeMenu();
        await state.world.reloadRoom({ fade });
        updateRoomChrome();
      }
    }),
  );
  menuEl.querySelector('[data-hint]')?.addEventListener('click', () => {
    closeMenu();
    store.set('hint-dismissed', '');
    showHint();
  });
}

function openMenu() {
  renderMenu();
  menuEl.hidden = false;
  menuBtn.setAttribute('aria-expanded', 'true');
  state.world?.releaseInput();
  menuEl.querySelector('button')?.focus();
}
function closeMenu() {
  menuEl.hidden = true;
  menuBtn.setAttribute('aria-expanded', 'false');
}
menuBtn.addEventListener('click', () => (menuEl.hidden ? openMenu() : closeMenu()));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!menuEl.hidden) closeMenu();
    else if (adventure.isOpen) adventure.close();
  }
});
document.addEventListener('pointerdown', (e) => {
  if (!menuEl.hidden && !menuEl.contains(e.target) && e.target !== menuBtn) closeMenu();
});

async function setLook(id) {
  const dir = applyDirection(id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(body).backgroundColor);
  renderMenu();
  if (state.world) {
    await fade(true);
    await state.world.setDirection(dir);
    await fade(false);
  }
  if (state.mode === 'scan') route();
}

// ---------- Mode toggle ----------
modeButtons.forEach((b) =>
  b.addEventListener('click', () => {
    const want = b.dataset.mode;
    if (want === 'scan') {
      const room = state.world?.room;
      const inExplore = state.mode === 'explore';
      if (inExplore && room === 'places') {
        state.scanAnchor = adventure.scanAnchor();
        go('#scan-places');
      } else go('#scan');
    } else {
      // Context-preserving: the Places case study maps back to the Places room.
      go(state.mode === 'scan' && state.scanView === 'places' ? '#explore-places' : `#explore-${state.world?.room || 'hall'}`);
    }
  }),
);

function syncToggle() {
  modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
}

// ---------- Router ----------
function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

async function route() {
  // Plain hash names (#scan-places, #explore-hall) so links survive hosts
  // that only pass simple fragments. The older #/scan/places form still works.
  const hash = location.hash.replace(/^#\/?/, '');
  const [section, sub] = hash.split(/[/-]/);
  closeMenu();

  if (section === 'scan') {
    state.mode = 'scan';
    state.scanView = sub === 'places' || sub === 'records' ? sub : 'index';
    adventure.close();
    state.world?.setPaused(true);
    body.className = 'is-scan';
    introEl.hidden = true;
    scanEl.hidden = false;
    renderScan(scanEl, state.scanView, {
      anchor: state.scanAnchor,
      onExplore: (room) => go(`#explore-${room}`),
    });
    state.scanAnchor = null;
    syncToggle();
    updateRoomChrome();
    setPrompt(null);
    document.title = `${state.scanView === 'places' ? places.title + ' · ' : ''}Casey Robinson`;
    scanEl.focus({ preventScroll: true });
    return;
  }

  if (section === 'explore') {
    const room = sub === 'places' ? 'places' : 'hall';
    scanEl.hidden = true;
    if (!state.world) {
      // Show the intro with progress while the engine loads.
      state.mode = 'intro';
      body.className = 'is-intro';
      introEl.hidden = false;
      syncToggle();
      const btn = $('enter-btn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Loading…';
      }
      const world = await loadWorld();
      if (!world) {
        if (btn) {
          btn.textContent = '3D unavailable on this device';
        }
        setLoad(0, 'This device can’t run the 3D gallery. Quick read has everything.');
        return;
      }
      await fade(true);
      introEl.hidden = true;
    }
    state.mode = 'explore';
    body.className = '';
    introEl.hidden = true;
    syncToggle();
    state.world.setPaused(false);
    if (state.world.room !== room) await enterRoom(room);
    else await fade(false);
    fadeEl.classList.remove('on');
    updateRoomChrome();
    setPrompt(state.currentPrompt);
    canvas.focus({ preventScroll: true });
    if (!store.get('hint-dismissed')) showHint();
    document.title = 'Casey Robinson · Gallery';
    return;
  }

  // Default: intro, unless the gallery is already running.
  if (state.world) return go(`#explore-${state.world.room}`);
  state.mode = 'intro';
  body.className = 'is-intro';
  scanEl.hidden = true;
  introEl.hidden = false;
  syncToggle();
  updateRoomChrome();
  document.title = 'Casey Robinson · UX Designer';
}

window.addEventListener('hashchange', route);
renderIntro();
route();

// Warm the engine chunk once the page is idle, without starting the GPU.
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
idle(() => import('./world/index.js').catch(() => {}));
