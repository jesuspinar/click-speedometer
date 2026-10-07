/**
 * Flight rules and persistence validation. This module is pure game logic: it
 * never touches the DOM, so it is also what the test suite exercises directly.
 */

import { DEFAULT_SHIP_ID, findShip, SHIPS, STAGES } from './catalog.js';

const MS_PER_SECOND = 1000;

/** Clicks are counted over a rolling one-second window. */
const CPS_WINDOW_MS = 1000;

export const FINAL_STAGE = STAGES.length - 1;

/** Highest stage whose threshold the score has reached. */
export const stageFor = (score) =>
  STAGES.reduce((reached, stage, index) => (score >= stage.at ? index : reached), 0);

const isCount = (value) => Number.isSafeInteger(value) && value >= 0;

/**
 * Saves come from `localStorage` and may be stale, hand-edited or corrupt, so
 * every field is rebuilt from scratch rather than trusted.
 */
export function cleanSave(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const claimed = Array.isArray(source.owned) ? source.owned : [];

  // The starter ship is always owned; the rest must have been bought.
  const owned = [
    DEFAULT_SHIP_ID,
    ...SHIPS.filter((ship) => ship.cost > 0 && claimed.includes(ship.id)).map((ship) => ship.id),
  ];

  return {
    credits: isCount(source.credits) ? source.credits : 0,
    best: isCount(source.best) ? source.best : 0,
    owned,
    selected: owned.includes(source.selected) ? source.selected : DEFAULT_SHIP_ID,
  };
}

const reject = (message) => ({ ok: false, message });
const accept = (message) => ({ ok: true, message });

/**
 * A single timed run plus the persistent wallet it pays into.
 *
 * States: `ready` before the first launch, `flying` while the clock runs,
 * `done` once the deadline passes and the score has been banked.
 */
export class Flight {
  constructor(save) {
    this.save = cleanSave(save);
    this.state = 'ready';
    this.score = 0;
    this.clicks = 0;
    this.started = 0;
    this.deadline = 0;
    this.peak = 0;

    /** Timestamps of recent clicks, trimmed to the CPS window on read. */
    this.history = [];
  }

  get ship() {
    return findShip(this.save.selected);
  }

  get stage() {
    return stageFor(this.score);
  }

  /** Begins a run. Returns false when one is already in progress. */
  start(now) {
    if (this.state === 'flying') return false;

    this.state = 'flying';
    this.score = 0;
    this.clicks = 0;
    this.history = [];
    this.peak = 0;
    this.started = now;
    this.deadline = now + this.ship.duration * MS_PER_SECOND;

    return true;
  }

  /** Seconds left in the run, or the next run's full duration when idle. */
  remaining(now) {
    if (this.state === 'flying') return Math.max(0, (this.deadline - now) / MS_PER_SECOND);
    if (this.state === 'done') return 0;

    return this.ship.duration;
  }

  /** Clicks in the last second. Also drops samples that have aged out. */
  cps(now) {
    this.history = this.history.filter((at) => at > now - CPS_WINDOW_MS);

    return this.history.length;
  }

  /** Scores a click. Returns false if it landed outside the run. */
  click(now) {
    if (this.state !== 'flying') return false;

    if (now >= this.deadline) {
      this.finish();
      return false;
    }

    this.clicks += 1;
    this.score += this.ship.power;
    this.history.push(now);
    this.peak = Math.max(this.peak, this.cps(now));

    return true;
  }

  /** Ends the run once the clock has run out. Safe to call every frame. */
  tick(now) {
    if (this.state === 'flying' && now >= this.deadline) this.finish();
  }

  /** Banks the score exactly once, since only a flying run can finish. */
  finish() {
    if (this.state !== 'flying') return false;

    this.state = 'done';
    this.save.credits += this.score;
    this.save.best = Math.max(this.save.best, this.score);

    return true;
  }

  /** Buys the ship when needed, then selects it. Never partially applies. */
  equip(id) {
    if (this.state === 'flying') return reject('Finish your flight before changing ships.');

    const ship = findShip(id);
    if (!ship) return reject('Unknown ship.');

    if (!this.save.owned.includes(id)) {
      const short = ship.cost - this.save.credits;
      if (short > 0) return reject(`You need ${short} more credits.`);

      this.save.credits -= ship.cost;
      this.save.owned.push(id);
    }

    this.save.selected = id;

    return accept(`${ship.name} equipped.`);
  }
}
