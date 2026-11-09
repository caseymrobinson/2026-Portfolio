import { places, placesImages } from '../content/places.js';
import { esc, figure, wireImages, announce } from './util.js';
import { placeCompareHTML, wireCompare } from './placeCompare.js';

// The choose-your-own-adventure panel. Wrong answers aren't punished: they
// show what really happened and offer "try another" or "see what shipped".

const TOTAL_PATHS = places.decisions.reduce((n, d) => n + d.options.length, 0);
const LETTERS = 'ABCDEFG';

export function createAdventure(panel, hooks) {
  const explored = new Set();
  const done = new Set();
  const selected = new Map();
  let view = null; // { type: 'intro' | 'decision' | 'impact', index }

  const progress = () => hooks.onProgress?.({ explored: explored.size, total: TOTAL_PATHS, done });

  function show() {
    const wasHidden = panel.hidden;
    panel.hidden = false;
    if (wasHidden) {
      panel.classList.add('entering');
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('entering')));
    }
  }

  function head(kicker) {
    return `
      <div class="panel-head">
        <span class="kicker">${esc(kicker)}</span>
        <button type="button" class="btn btn-quiet" data-close aria-label="Close panel and keep walking">Close</button>
      </div>`;
  }

  function bindCommon() {
    panel.querySelector('[data-close]')?.addEventListener('click', () => api.close());
    wireImages(panel);
    wireCompare(panel);
  }

  function focusTitle() {
    panel.querySelector('.panel-body .display')?.setAttribute('tabindex', '-1');
    panel.querySelector('.panel-body .display')?.focus({ preventScroll: true });
  }

  function renderIntro() {
    const i = places.intro;
    panel.innerHTML = `
      ${head(i.kicker)}
      <div class="panel-body">
        <h2 class="display">${esc(i.title)}</h2>
        ${i.body.map((p) => `<p>${esc(p)}</p>`).join('')}
        <p class="room-note">${esc(i.roomNote)}</p>
        <div class="outcome-actions">
          <button type="button" class="btn btn-primary" data-start>${esc(i.cta)}</button>
        </div>
      </div>`;
    bindCommon();
    panel.querySelector('[data-start]').addEventListener('click', () => hooks.onStart?.());
  }

  function renderDecision(index) {
    const d = places.decisions[index];
    const sel = selected.get(d.id);
    const opt = d.options.find((o) => o.id === sel);
    panel.innerHTML = `
      ${head(`${d.kicker} of ${places.decisions.length}`)}
      <div class="panel-body">
        <h2 class="display">${esc(d.title)}</h2>
        ${d.prompt.map((p) => `<p>${esc(p)}</p>`).join('')}
        <p class="question" id="q-${d.id}">${esc(d.question)}</p>
        <ul class="options" aria-labelledby="q-${d.id}">
          ${d.options
            .map(
              (o, k) => `
            <li><button type="button" class="option" data-opt="${o.id}" ${o.id === sel ? 'aria-current="true"' : ''}>
              <span class="letter">${LETTERS[k]}</span>
              <strong>${esc(o.label)}</strong>
              ${explored.has(o.id) ? '<span class="seen">Seen</span>' : ''}
              <small>${esc(o.summary)}</small>
            </button></li>`,
            )
            .join('')}
        </ul>
        <div data-outcome>${opt ? outcomeHTML(d, opt, index) : ''}</div>
      </div>`;
    bindCommon();
    panel.querySelectorAll('[data-opt]').forEach((btn) =>
      btn.addEventListener('click', () => choose(index, btn.dataset.opt)),
    );
    bindOutcome(index);
  }

  function outcomeHTML(d, o, index) {
    const shipped = d.options.find((x) => x.shipped);
    let visual = '';
    if (o.visual === 'placeCompare') visual = placeCompareHTML();
    if (o.visual === 'matrix') visual = figure(placesImages.matrix, placesImages.matrix.alt, { width: 1000 });
    const isLast = index === places.decisions.length - 1;
    const actions = o.shipped
      ? `<button type="button" class="btn btn-primary" data-next>${esc(d.nextLabel || (isLast ? 'See the impact' : 'Next decision'))}</button>`
      : `<button type="button" class="btn" data-retry>Try another approach</button>
         <button type="button" class="btn btn-primary" data-shipped="${shipped.id}">See what shipped</button>`;
    return `
      <div class="outcome ${o.shipped ? 'shipped' : ''}" tabindex="-1">
        <span class="tag">${o.shipped ? '✓ What shipped' : 'What happened'}</span>
        <p>${esc(o.outcome)}</p>
        ${o.evidence ? `<p>${esc(o.evidence)}</p>` : ''}
        ${visual}
        <div class="outcome-actions">${actions}</div>
      </div>`;
  }

  function bindOutcome(index) {
    const out = panel.querySelector('[data-outcome]');
    out.querySelector('[data-retry]')?.addEventListener('click', () => {
      selected.delete(places.decisions[index].id);
      renderDecision(index);
      const firstUnseen = [...panel.querySelectorAll('[data-opt]')].find((b) => !explored.has(b.dataset.opt));
      (firstUnseen || panel.querySelector('[data-opt]'))?.focus();
    });
    out.querySelector('[data-shipped]')?.addEventListener('click', (e) => choose(index, e.currentTarget.dataset.shipped));
    out.querySelector('[data-next]')?.addEventListener('click', () => hooks.onNext?.(index));
  }

  function choose(index, optId) {
    const d = places.decisions[index];
    const o = d.options.find((x) => x.id === optId);
    selected.set(d.id, optId);
    explored.add(optId);
    if (o.shipped) done.add(d.id);
    renderDecision(index);
    const out = panel.querySelector('.outcome');
    out?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    out?.focus({ preventScroll: true });
    announce(`${o.shipped ? 'What shipped' : 'What happened'}: ${o.outcome}`);
    progress();
  }

  function renderImpact() {
    const m = places.impact;
    const missed = TOTAL_PATHS - explored.size;
    panel.innerHTML = `
      ${head('The ending')}
      <div class="panel-body">
        <h2 class="display">${esc(m.kicker)}</h2>
        <div class="stats">
          ${m.stats.map((s) => `<div><div class="stat-value">${esc(s.value)}</div><div>${esc(s.label)}</div></div>`).join('')}
        </div>
        <p class="kicker">${esc(m.note)}</p>
        <p>${esc(m.role)}</p>
        <div class="explored">You explored ${explored.size} of ${TOTAL_PATHS} paths.${
          missed > 0 ? ` ${missed} still unseen. Any station will take you back.` : ' You saw every one.'
        }</div>
        <div class="outcome-actions">
          <button type="button" class="btn btn-primary" data-hall>Back to the hall</button>
          <button type="button" class="btn" data-case>Read the full case study</button>
        </div>
      </div>`;
    bindCommon();
    panel.querySelector('[data-hall]').addEventListener('click', () => hooks.onBackToHall?.());
    panel.querySelector('[data-case]').addEventListener('click', () => hooks.onFullCase?.());
  }

  const api = {
    get view() {
      return view;
    },
    get isOpen() {
      return !panel.hidden;
    },
    get done() {
      return done;
    },
    openIntro() {
      view = { type: 'intro' };
      renderIntro();
      show();
      focusTitle();
      hooks.onOpen?.();
    },
    openDecision(index) {
      view = { type: 'decision', index };
      renderDecision(index);
      show();
      panel.querySelector('.panel-body').scrollTop = 0;
      focusTitle();
      hooks.onOpen?.();
    },
    openImpact() {
      view = { type: 'impact' };
      renderImpact();
      show();
      focusTitle();
      hooks.onOpen?.();
    },
    close() {
      if (panel.hidden) return;
      panel.hidden = true;
      view = null;
      hooks.onClose?.();
    },
    // Where Quick read should land if the visitor switches modes now.
    scanAnchor() {
      if (!view) return null;
      if (view.type === 'decision') return `decision-${view.index + 1}`;
      if (view.type === 'impact') return 'impact';
      return null;
    },
    totals: () => ({ explored: explored.size, total: TOTAL_PATHS }),
  };
  return api;
}
