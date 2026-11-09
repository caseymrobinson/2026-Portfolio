import { site } from '../content/site.js';
import { places, placesImages } from '../content/places.js';
import { records, recordsImages } from '../content/records.js';
import { esc, img, figure, wireImages } from './util.js';
import { placeCompareHTML, wireCompare } from './placeCompare.js';

// Quick read: the same content as a plain 2D case study. Pure HTML, so it
// works instantly, without WebGL/WebGPU, and with screen readers.

export function renderScan(el, view, { anchor, onExplore } = {}) {
  const html = view === 'places' ? placesView() : view === 'records' ? recordsView() : indexView();
  el.innerHTML = `<div class="scan-wrap">${html}</div>`;
  wireImages(el);
  wireCompare(el);
  el.querySelectorAll('[data-explore]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.preventDefault();
      onExplore?.(b.dataset.explore);
    }),
  );
  if (anchor) {
    const target = el.querySelector(`#${CSS.escape(anchor)}`);
    if (target) {
      requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
      return;
    }
  }
  window.scrollTo(0, 0);
}

function indexView() {
  return `
    <header class="scan-hero">
      <div class="kicker">${esc(site.role)}</div>
      <h1 class="display">${esc(site.name)}</h1>
      <p class="scan-lede">${esc(site.intro)}</p>
      <p class="takeaway">${esc(site.galleryNote)} This is the Quick read: every project, no 3D required.</p>
    </header>
    <section class="scan-section" aria-labelledby="work">
      <div class="kicker" id="work">Selected work</div>
      <div class="project-list" style="margin-top:14px">
        <a class="project-card" href="#/scan/places">
          <span class="kicker">01 · Walk-through available</span>
          <h3 class="display">${esc(places.title)}</h3>
          <p>${esc(places.takeaway)}</p>
        </a>
        <a class="project-card" href="#/scan/records">
          <span class="kicker">02 · Quick read</span>
          <h3 class="display">${esc(records.title)}</h3>
          <p>${esc(records.takeaway)}</p>
        </a>
      </div>
    </section>
    <section class="scan-section">
      <div class="kicker">About</div>
      <p>${esc(site.bio)}</p>
    </section>
    <footer class="scan-footer">
      <button class="btn btn-primary" data-explore="hall">Explore the gallery in 3D</button>
    </footer>`;
}

function placesView() {
  const p = places;
  return `
    <header class="scan-hero">
      <a class="kicker" href="#/scan">← All work</a>
      <h1 class="display">${esc(p.title)}</h1>
      <p class="scan-lede">${esc(p.oneLiner)}</p>
      <p class="takeaway"><strong>In 10 seconds:</strong> ${esc(p.takeaway)}</p>
    </header>
    ${figure(placesImages.hero, '', { width: 1800 })}
    <dl class="facts" style="margin-top:32px">
      <div><dt class="kicker">Role</dt><dd>${esc(p.role)}</dd></div>
      <div><dt class="kicker">Problems</dt><dd>${p.scan.problems.map(esc).join(' · ')}</dd></div>
      <div><dt class="kicker">Impact</dt><dd>~25 FTE-equivalent output · ~$2.5M projected first-year savings (beta)</dd></div>
    </dl>
    ${p.scan.decisions
      .map(
        (d, i) => `
      <section class="scan-section" id="decision-${i + 1}">
        <div class="kicker">Decision ${i + 1}</div>
        <h2 class="display">${esc(d.title)}</h2>
        <p>${esc(d.body)}</p>
        ${d.visual === 'placeCompare' ? placeCompareHTML() : ''}
        ${d.visual === 'matrix' ? `<div class="pair">${figure(placesImages.matrix, placesImages.matrix.alt, { width: 1200 })}${figure(placesImages.simplifiedSearch, 'The simplified search', { width: 1200, fit: 'contain' })}</div>` : ''}
      </section>`,
      )
      .join('')}
    <section class="scan-section" id="impact">
      <div class="kicker">Impact</div>
      <h2 class="display">What it was worth</h2>
      <div class="stats">
        ${p.impact.stats.map((s) => `<div><div class="stat-value">${esc(s.value)}</div><div>${esc(s.label)}</div></div>`).join('')}
      </div>
      <p class="kicker">${esc(p.impact.note)}</p>
      <p>${esc(p.impact.role)}</p>
    </section>
    <footer class="scan-footer">
      <button class="btn btn-primary" data-explore="places">Walk through it in 3D</button>
      <a class="btn" href="#/scan/records">Next: ${esc(records.title)}</a>
    </footer>`;
}

function recordsView() {
  const r = records;
  return `
    <header class="scan-hero">
      <a class="kicker" href="#/scan">← All work</a>
      <h1 class="display">${esc(r.title)}</h1>
      <p class="scan-lede">${esc(r.hook)}</p>
      <p class="takeaway"><strong>In 10 seconds:</strong> ${esc(r.takeaway)}</p>
    </header>
    ${figure(recordsImages.hero, '', { width: 1800 })}
    <dl class="facts" style="margin-top:32px">
      <div><dt class="kicker">Context</dt><dd>${esc(r.context)}</dd></div>
      <div><dt class="kicker">Role</dt><dd>${esc(r.role)}</dd></div>
    </dl>
    <section class="scan-section">
      <div class="kicker">The tension</div>
      <h2 class="display">Few experts, many newcomers</h2>
      <p>${esc(r.tension)}</p>
    </section>
    <section class="scan-section">
      <div class="kicker">The decision</div>
      <h2 class="display">Three fields, and a side sheet for everything else</h2>
      <div class="three-fields" aria-label="The three search fields">${r.fields.map((f) => `<span>${esc(f)}</span>`).join('')}</div>
      <p>${esc(r.decision)}</p>
    </section>
    ${recordsImages.pairs
      .map(
        (pair) => `
      <section class="scan-section">
        <div class="kicker">${esc(pair.label)}</div>
        <div class="pair">
          ${figure(pair.before, 'Before', { width: 1200, fit: 'contain' })}
          ${figure(pair.after, 'After', { width: 1200, fit: 'contain' })}
        </div>
      </section>`,
      )
      .join('')}
    <section class="scan-section">
      <div class="kicker">Advanced options</div>
      ${figure(recordsImages.sideSheet, recordsImages.sideSheet.alt, { width: 1400, fit: 'contain' })}
    </section>
    <p class="notice">The walk-through room for this project (from a spacecraft cockpit down to three calm inputs) is next on the list.</p>
    <footer class="scan-footer">
      <a class="btn btn-primary" href="#/scan/places">Next: ${esc(places.title)}</a>
      <button class="btn" data-explore="hall">Back to the gallery</button>
    </footer>`;
}

export { img };
