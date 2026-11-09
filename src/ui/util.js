import { localImage, wixImage } from '../content/site.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function img(image, { width = 1600, cls = '', fit = 'cover' } = {}) {
  return `<img class="${cls}" src="${localImage(image.id)}" data-fallback="${wixImage(image.id, width)}" alt="${esc(image.alt)}" loading="lazy" decoding="async" style="object-fit:${fit}" />`;
}

// Local copy first; Wix's resized copy if that's missing; a quiet placeholder
// if both fail (for example, offline or blocked).
export function wireImages(root) {
  root.querySelectorAll('img[data-fallback]').forEach((el) => {
    el.addEventListener('error', function onErr() {
      if (el.dataset.fallback) {
        el.src = el.dataset.fallback;
        delete el.dataset.fallback;
      } else {
        el.removeEventListener('error', onErr);
        el.replaceWith(Object.assign(document.createElement('div'), {
          className: 'img-missing',
          textContent: `Image unavailable: ${el.alt}`,
        }));
      }
    });
  });
}

export function figure(image, caption, opts) {
  return `<figure class="figure">${img(image, opts)}${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}</figure>`;
}

export function announce(text) {
  const el = document.getElementById('announcer');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => (el.textContent = text));
}
