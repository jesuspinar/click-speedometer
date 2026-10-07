/**
 * Small DOM and formatting helpers shared by the UI modules.
 *
 * The entry point is loaded as `type="module"`, which defers execution until
 * the document has been parsed. UI modules can therefore resolve their
 * elements once at import time instead of looking them up on every render.
 */

export const el = (id) => document.getElementById(id);

export const formatNumber = (value) => value.toLocaleString('en-US');

export const padNumber = (value, length = 2) => String(value).padStart(length, '0');

export const openDialogs = () => document.querySelectorAll('dialog[open]');

/** The diagonal arrow that trails every call-to-action button. */
export const ARROW_ICON =
  '<span aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" ' +
  'xmlns="http://www.w3.org/2000/svg"> <path d="M3.5 20.5L17 7M9 7H17V15" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/> </svg></span>';
