import { placeSamples } from '../content/places.js';
import { esc } from './util.js';

// Live recreation of the shipped card feed: the same rules applied to a
// dense place and a sparse one. Long cards collapse behind "show more";
// empty cards don't render at all.
const LIMIT = 3;

export function placeCompareHTML() {
  const { dense, sparse } = placeSamples;
  return `
  <div class="compare-block" data-compare>
    <div class="compare">
      ${col(dense)}
      ${col(sparse)}
    </div>
    <div class="compare-note">
      <span>Illustrative recreation with sample data, not the production UI.</span>
      <button type="button" data-ghosts aria-pressed="false">Show the empty cards</button>
    </div>
  </div>`;
}

function col(place) {
  const ghosts = (place.hidden || [])
    .map((t) => `<div class="pcard ghost" data-ghost hidden><h5>${esc(t)}</h5><span>Nothing to show, so it doesn’t render.</span></div>`)
    .join('');
  return `
    <div class="compare-col">
      <h4>${esc(place.name)}</h4>
      <div class="meta">${esc(place.meta)}</div>
      ${place.cards.map(card).join('')}
      ${ghosts}
    </div>`;
}

function card(c) {
  const extra = c.rows.length - LIMIT;
  const rows = c.rows
    .map(([k, v], i) => `<dt ${i >= LIMIT ? 'data-extra hidden' : ''}>${esc(k)}</dt><dd ${i >= LIMIT ? 'data-extra hidden' : ''}>${esc(v)}</dd>`)
    .join('');
  return `
    <div class="pcard">
      <h5>${esc(c.title)}</h5>
      <dl>${rows}</dl>
      ${extra > 0 ? `<button type="button" class="more" data-more aria-expanded="false">Show ${extra} more</button>` : ''}
    </div>`;
}

export function wireCompare(root) {
  root.querySelectorAll('[data-compare]').forEach((block) => {
    block.querySelectorAll('[data-more]').forEach((btn) => {
      const extra = btn.closest('.pcard').querySelectorAll('[data-extra]');
      const n = extra.length / 2;
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        extra.forEach((el) => (el.hidden = !open));
        btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? 'Show less' : `Show ${n} more`;
      });
    });
    const toggle = block.querySelector('[data-ghosts]');
    toggle?.addEventListener('click', () => {
      const on = toggle.getAttribute('aria-pressed') !== 'true';
      block.querySelectorAll('[data-ghost]').forEach((el) => (el.hidden = !on));
      toggle.setAttribute('aria-pressed', String(on));
      toggle.textContent = on ? 'Hide the empty cards' : 'Show the empty cards';
    });
  });
}
