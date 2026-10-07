/**
 * Progress persistence. Storage can be absent (private browsing, blocked
 * cookies, full quota), so every call reports failure instead of throwing and
 * the game stays playable for the current visit.
 */

const STORAGE_KEY = 'click-speedometer-v1';

/** Returns the raw stored object; `cleanSave` is what makes it trustworthy. */
export function readSave() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/** Returns false when the save could not be written. */
export function writeSave(save) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
