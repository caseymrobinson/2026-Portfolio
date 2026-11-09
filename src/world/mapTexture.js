import { feature, mesh } from 'topojson-client';

// The Places floor: an inlaid map of Europe and Africa, from Rome down to a
// village in Zambia. Equirectangular crop. Coastlines from Natural Earth
// (public domain) via world-atlas.
export const MAP = {
  lonMin: -25,
  lonMax: 60,
  latMin: -38,
  latMax: 62,
  width: 20, // meters
};
MAP.depth = (MAP.width * (MAP.latMax - MAP.latMin)) / (MAP.lonMax - MAP.lonMin);

export const ROME = { lon: 12.48, lat: 41.89 };
export const VILLAGE = { lon: 25.1, lat: -17.4 }; // Western Province, Zambia (approximate)

// lon/lat -> room XZ (north is -Z).
export function toRoom(lon, lat) {
  const x = -MAP.width / 2 + ((lon - MAP.lonMin) / (MAP.lonMax - MAP.lonMin)) * MAP.width;
  const z = -MAP.depth / 2 + ((MAP.latMax - lat) / (MAP.latMax - MAP.latMin)) * MAP.depth;
  return { x, z };
}

let topoCache = null;
async function loadTopo() {
  if (!topoCache) {
    const [land, countries] = await Promise.all([
      import('world-atlas/land-50m.json').then((m) => m.default),
      import('world-atlas/countries-110m.json').then((m) => m.default),
    ]);
    topoCache = {
      land: feature(land, land.objects.land),
      borders: mesh(countries, countries.objects.countries, (a, b) => a !== b),
    };
  }
  return topoCache;
}

export async function preloadMapData() {
  await loadTopo();
}

export async function drawMap(dir, { size = 2048, onMask } = {}) {
  const { land, borders } = await loadTopo();
  const w = dir.world;
  const W = size;
  const H = Math.round((size * MAP.depth) / MAP.width);
  const px = (lon) => ((lon - MAP.lonMin) / (MAP.lonMax - MAP.lonMin)) * W;
  const py = (lat) => ((MAP.latMax - lat) / (MAP.latMax - MAP.latMin)) * H;

  const trace = (g, geom) => {
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
    for (const poly of polys)
      for (const ring of poly) {
        ring.forEach(([lon, lat], i) => (i ? g.lineTo(px(lon), py(lat)) : g.moveTo(px(lon), py(lat))));
        g.closePath();
      }
  };
  const traceLines = (g, geom) => {
    const lines = geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;
    for (const line of lines) line.forEach(([lon, lat], i) => (i ? g.lineTo(px(lon), py(lat)) : g.moveTo(px(lon), py(lat))));
  };

  // Color.
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = w.mapOcean;
  g.fillRect(0, 0, W, H);

  // Graticule, every 10 degrees.
  g.strokeStyle = w.mapLine;
  g.globalAlpha = 0.35;
  g.lineWidth = Math.max(1, W / 1400);
  g.beginPath();
  for (let lon = -20; lon <= 60; lon += 10) {
    g.moveTo(px(lon), 0);
    g.lineTo(px(lon), H);
  }
  for (let lat = -30; lat <= 60; lat += 10) {
    g.moveTo(0, py(lat));
    g.lineTo(W, py(lat));
  }
  g.stroke();
  g.globalAlpha = 1;

  // Land.
  g.beginPath();
  for (const f of land.features) trace(g, f.geometry);
  g.fillStyle = w.mapLand;
  g.fill('evenodd');
  g.strokeStyle = w.mapLine;
  g.lineWidth = Math.max(1.5, W / 900);
  g.stroke();

  // Borders, engraved faintly. Borders move; that's the point of the product.
  g.beginPath();
  traceLines(g, borders);
  g.globalAlpha = 0.5;
  g.lineWidth = Math.max(1, W / 1600);
  g.setLineDash([W / 300, W / 400]);
  g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 1;

  // Border inlay frame.
  g.strokeStyle = w.mapLine;
  g.lineWidth = W / 200;
  g.strokeRect(W / 80, W / 80, W - W / 40, H - W / 40);

  // Place labels set into the floor.
  // Visitors walk south, so place names are set to read from the north.
  const label = (text, lon, lat, sizeFrac, dx = 0, dy = 0, align = 'left', facingSouth = true) => {
    g.save();
    g.fillStyle = w.mapInk;
    g.font = `500 ${W * sizeFrac}px "${dir.fonts.mono}", ui-monospace, monospace`;
    if ('letterSpacing' in g) g.letterSpacing = `${W * sizeFrac * 0.18}px`;
    g.textAlign = align;
    g.translate(px(lon), py(lat));
    if (facingSouth) g.rotate(Math.PI);
    g.fillText(text.toUpperCase(), dx * W, dy * W);
    g.restore();
  };
  label('Roma', ROME.lon, ROME.lat, 0.016, 0.012, -0.008);
  label('Mwandi', VILLAGE.lon, VILLAGE.lat, 0.014, 0.012, 0.004);
  g.globalAlpha = 0.6;
  label('Mare Mediterraneum', 18, 35.2, 0.009, 0, 0, 'center');
  label('Oceanus Atlanticus', -14, 20, 0.009, 0, 0, 'center');
  g.globalAlpha = 1;

  // Compass rose, bottom left.
  const cx = W * 0.1;
  const cy = H * 0.9;
  const r = W * 0.035;
  g.strokeStyle = w.mapLine;
  g.fillStyle = w.mapLine;
  g.lineWidth = W / 900;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(cx, cy - r * 1.5);
  g.lineTo(cx + r * 0.22, cy);
  g.lineTo(cx, cy + r * 1.5);
  g.lineTo(cx - r * 0.22, cy);
  g.closePath();
  g.fill();
  label('N', MAP.lonMin + ((cx / W) * (MAP.lonMax - MAP.lonMin)), MAP.latMax - ((cy - r * 1.9) / H) * (MAP.latMax - MAP.latMin), 0.012, 0, 0, 'center', false);

  // Land mask for placing data pins on land.
  const mask = document.createElement('canvas');
  const mw = 512;
  const mh = Math.round((mw * H) / W);
  mask.width = mw;
  mask.height = mh;
  const mg = mask.getContext('2d');
  mg.scale(mw / W, mh / H);
  mg.beginPath();
  for (const f of land.features) trace(mg, f.geometry);
  mg.fillStyle = '#fff';
  mg.fill('evenodd');
  const data = mg.getImageData(0, 0, mw, mh).data;
  const isLand = (lon, lat) => {
    const x = Math.floor((px(lon) / W) * mw);
    const y = Math.floor((py(lat) / H) * mh);
    if (x < 0 || y < 0 || x >= mw || y >= mh) return false;
    return data[(y * mw + x) * 4] > 128;
  };

  // Metalness: land is brass, sea is stone.
  const metal = document.createElement('canvas');
  metal.width = 1024;
  metal.height = Math.round((1024 * H) / W);
  const xg = metal.getContext('2d');
  xg.fillStyle = '#000';
  xg.fillRect(0, 0, metal.width, metal.height);
  xg.scale(metal.width / W, metal.height / H);
  xg.beginPath();
  for (const f of land.features) trace(xg, f.geometry);
  xg.fillStyle = dir.id === 'survey' ? '#555' : '#d0d0d0';
  xg.fill('evenodd');

  return { color: c, metal, isLand };
}
