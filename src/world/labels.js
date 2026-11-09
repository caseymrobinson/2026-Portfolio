import * as pc from 'playcanvas';
import { material } from './kit.js';
import { currentDirection } from '../ui/theme.js';

// Text painted onto a transparent plane, drawn with the active direction's
// fonts. Labels redraw when the visual direction changes.
//
// lines: [{ text, role: 'display' | 'body' | 'mono', size (meters), gap (meters) }]
export function createLabel(builder, { name, width, height, lines, align = 'left', color = null, glow = false, pad = 0, pxPerMeter = 220 }) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(2048, Math.round(width * pxPerMeter));
  canvas.height = Math.min(2048, Math.round(height * pxPerMeter));
  const scale = canvas.width / width;

  const draw = () => {
    const dir = currentDirection();
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = color || dir.world.text;
    g.textBaseline = 'alphabetic';
    g.textAlign = align;
    const p = pad * scale;
    const x = align === 'center' ? canvas.width / 2 : align === 'right' ? canvas.width - p : p;
    let y = p;
    for (const line of lines) {
      const px = line.size * scale;
      const family = dir.fonts[line.role || 'body'];
      const weight = line.role === 'display' ? displayWeight(dir) : line.weight || 500;
      g.font = `${weight} ${px}px "${family}", system-ui, sans-serif`;
      if ('letterSpacing' in g) g.letterSpacing = line.role === 'mono' ? `${px * 0.08}px` : '0px';
      y += px * 0.95 + (line.gap || 0) * scale;
      const text = line.upper ? line.text.toUpperCase() : line.text;
      g.fillText(text, x, y);
    }
  };
  draw();

  const tex = builder.texture(canvas, { anisotropy: 8 });
  const mat = builder.track(
    material({
      diffuseMap: tex,
      opacityMap: tex,
      diffuse: [1, 1, 1],
      gloss: 0.2,
      emissive: glow ? [1, 1, 1] : null,
      emissiveIntensity: glow ? 1 : 0,
    }),
  );
  if (glow) {
    mat.emissiveMap = tex;
    mat.update();
  }

  const entity = new pc.Entity(name);
  const plane = new pc.Entity(name + '-plane');
  plane.addComponent('render', { type: 'plane', material: mat, castShadows: false });
  // Plane faces +Y; stand it up so it faces +Z.
  plane.setLocalEulerAngles(90, 0, 0);
  plane.setLocalScale(width, 1, height);
  entity.addChild(plane);
  builder.root.addChild(entity);

  return {
    entity,
    redraw() {
      draw();
      tex.setSource(canvas);
    },
  };
}

function displayWeight(dir) {
  return { label: 400, survey: 700, afterhours: 600 }[dir.id] || 500;
}
