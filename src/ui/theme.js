// Visual directions. Each one sets the CSS tokens for the UI layer and the
// palette the 3D scene uses, so directions can be compared on the real thing.

export const directions = {
  label: {
    id: 'label',
    letter: 'A',
    name: 'Wall Label',
    pitch: 'Museum wall text. Editorial serif, hairline rules, warm paper. The UI reads like the placards beside the work.',
    fonts: { display: 'Instrument Serif', body: 'Instrument Sans', mono: 'IBM Plex Mono' },
    world: {
      sky: [1.0, 0.95, 0.86],
      sunColor: [1.0, 0.93, 0.82],
      sunIntensity: 1.5,
      ambient: 0.85,
      wall: [0.93, 0.92, 0.9],
      floor: [0.6, 0.58, 0.55],
      accent: [0.78, 0.42, 0.2],
      text: '#1b1a17',
      mapOcean: '#cfc8bb',
      mapLand: '#a8834a',
      mapLine: '#7b5c2e',
      mapInk: '#3b2f1e',
      fog: [0.94, 0.92, 0.88],
      exposure: 1.0,
    },
  },
  survey: {
    id: 'survey',
    letter: 'B',
    name: 'Survey',
    pitch: 'A cartographer’s instrument. Tight grotesk, monospace coordinates, verdigris on cool stone. Precise and quietly technical.',
    fonts: { display: 'Schibsted Grotesk', body: 'Schibsted Grotesk', mono: 'Fragment Mono' },
    world: {
      sky: [0.9, 0.95, 1.0],
      sunColor: [0.95, 0.97, 1.0],
      sunIntensity: 1.4,
      ambient: 0.85,
      wall: [0.9, 0.91, 0.9],
      floor: [0.52, 0.54, 0.53],
      accent: [0.12, 0.5, 0.42],
      text: '#13211d',
      mapOcean: '#b9c2bf',
      mapLand: '#6f8f86',
      mapLine: '#2f5a50',
      mapInk: '#13211d',
      fog: [0.9, 0.92, 0.92],
      exposure: 1.0,
    },
  },
  afterhours: {
    id: 'afterhours',
    letter: 'C',
    name: 'Afterhours',
    pitch: 'The gallery after closing. Near-black, sodium-lamp amber, a characterful grotesk. Moody and cinematic.',
    fonts: { display: 'Bricolage Grotesque', body: 'Hanken Grotesk', mono: 'JetBrains Mono' },
    world: {
      sky: [0.35, 0.36, 0.45],
      sunColor: [1.0, 0.78, 0.5],
      sunIntensity: 1.1,
      ambient: 0.22,
      wall: [0.42, 0.4, 0.38],
      floor: [0.2, 0.19, 0.18],
      accent: [1.0, 0.66, 0.24],
      text: '#ede6da',
      mapOcean: '#1d1c1b',
      mapLand: '#7a5a2c',
      mapLine: '#d79a45',
      mapInk: '#f1c27d',
      fog: [0.08, 0.075, 0.07],
      exposure: 1.1,
    },
  },
};

export const DEFAULT_DIRECTION = 'label';

const listeners = new Set();
let current = null;

function readStored() {
  try {
    return localStorage.getItem('look');
  } catch {
    return null;
  }
}
function store(id) {
  try {
    localStorage.setItem('look', id);
  } catch {
    /* storage may be blocked; the choice just won't persist */
  }
}

export function initialDirection() {
  const param = new URLSearchParams(location.search).get('look');
  const byLetter = Object.values(directions).find((d) => d.letter.toLowerCase() === (param || '').toLowerCase());
  const id = byLetter?.id || (directions[param] ? param : null) || readStored() || DEFAULT_DIRECTION;
  return directions[id] ? id : DEFAULT_DIRECTION;
}

export function applyDirection(id) {
  const dir = directions[id] || directions[DEFAULT_DIRECTION];
  current = dir;
  document.documentElement.dataset.look = dir.id;
  store(dir.id);
  listeners.forEach((fn) => fn(dir));
  return dir;
}

export function currentDirection() {
  return current || directions[DEFAULT_DIRECTION];
}

export function onDirectionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Canvas text needs the web font loaded first.
export async function ensureFonts(dir = currentDirection()) {
  if (!document.fonts) return;
  const { display, body, mono } = dir.fonts;
  try {
    await Promise.all([
      document.fonts.load(`400 64px "${display}"`),
      document.fonts.load(`500 32px "${body}"`),
      document.fonts.load(`400 24px "${mono}"`),
    ]);
  } catch {
    /* fall back to system fonts */
  }
}
