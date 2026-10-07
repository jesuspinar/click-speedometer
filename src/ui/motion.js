/**
 * Reduced-motion preference. Seeded from the OS setting and overridable from
 * the footer toggle, since the flight scene is the part people may want calm.
 */

import { el } from './dom.js';

const button = el('motion');

let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const prefersReducedMotion = () => reduced;

function render() {
  button.textContent = `REDUCED MOTION: ${reduced ? 'ON' : 'OFF'}`;
  button.setAttribute('aria-pressed', String(reduced));
  document.body.classList.toggle('reduced', reduced);
}

export function initMotionToggle() {
  render();

  button.addEventListener('click', () => {
    reduced = !reduced;
    render();
  });
}
