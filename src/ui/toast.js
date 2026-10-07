import { el } from './dom.js';

const VISIBLE_MS = 3000;

const toast = el('toast');

let hideTimer;

/** Shows a transient status message, replacing any message still on screen. */
export function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => toast.classList.remove('show'), VISIBLE_MS);
}
