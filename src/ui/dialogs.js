/**
 * Shared `<dialog>` behaviour: close buttons and click-outside-to-dismiss.
 */

import { openDialogs } from './dom.js';

export const closeAllDialogs = () => openDialogs().forEach((dialog) => dialog.close());

/**
 * A click on a modal dialog reports the dialog as its target both for the
 * backdrop and for padding inside the frame, so dismiss only when the pointer
 * actually landed outside the dialog's box.
 */
function dismissOnBackdropClick(dialog, event) {
  if (event.target !== dialog) return;

  const box = dialog.getBoundingClientRect();
  const outside =
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom;

  if (outside) dialog.close();
}

export function initDialogs() {
  document.querySelectorAll('[data-close]').forEach((button) =>
    button.addEventListener('click', () => button.closest('dialog').close()),
  );

  document.querySelectorAll('dialog').forEach((dialog) =>
    dialog.addEventListener('click', (event) => dismissOnBackdropClick(dialog, event)),
  );
}
