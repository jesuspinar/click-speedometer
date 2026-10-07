/**
 * The flight area: thrust input, the launch/flying/complete modes, the stage
 * banner and the end-of-run report.
 */

import { FINAL_STAGE } from '../game/flight.js';
import { STAGES } from '../game/catalog.js';
import { closeAllDialogs } from './dialogs.js';
import { ARROW_ICON, el, formatNumber, openDialogs } from './dom.js';

const STAGE_FLASH_MS = 1600;
const CLICK_POP_MS = 650;

/** Lifts the floating `+n` clear of the cursor. */
const CLICK_POP_RISE = 20;

const area = el('flight');
const thrust = el('flight-input');
const launchPanel = el('launch-panel');
const launchButton = el('launch');
const activeHint = el('active-hint');
const flightStatus = el('flight-status');
const engineStatus = el('engine-status');
const stageFlash = el('stage-flash');
const shopButton = el('shop');
const helpButton = el('help');

const result = {
  dialog: el('result-dialog'),
  title: el('result-title'),
  score: el('result-score'),
  clicks: el('result-clicks'),
  cps: el('result-cps'),
  stage: el('result-stage'),
  credit: el('result-credit'),
};

let flashTimer;

/**
 * Switches the flight area between its idle and in-flight presentations. The
 * thrust surface is removed from the tab order while idle so keyboard users
 * reach the launch button instead.
 */
function setFlying(flying) {
  area.classList.toggle('flying', flying);
  launchPanel.hidden = flying;
  activeHint.hidden = !flying;
  thrust.hidden = !flying;
  thrust.tabIndex = flying ? 0 : -1;
  shopButton.disabled = flying;
  helpButton.disabled = flying;
}

export function showLaunchInProgress() {
  closeAllDialogs();
  setFlying(true);

  flightStatus.textContent = '● FLIGHT IN PROGRESS';
  engineStatus.textContent = 'THRUST ONLINE';

  thrust.focus({ preventScroll: true });
}

export function showFlightComplete() {
  setFlying(false);

  flightStatus.textContent = '● FLIGHT COMPLETE';
  engineStatus.textContent = 'FLIGHT RECORDED';

  launchPanel.querySelector('h3').innerHTML = 'One more<br><em>light-year?</em>';
  launchButton.innerHTML = `LAUNCH AGAIN ${ARROW_ICON}`;
}

/** Used when WebGL is unavailable and the scene never loads. */
export const showLowGraphicsMode = () => {
  engineStatus.textContent = 'LOW-GRAPHICS MODE';
};

export function showResult(flight) {
  result.title.innerHTML =
    flight.stage === FINAL_STAGE
      ? 'Lightspeed.<br>You made it.'
      : 'A little closer<br>to the stars.';

  result.score.textContent = formatNumber(flight.score);
  result.clicks.textContent = formatNumber(flight.clicks);
  result.cps.textContent = (flight.clicks / flight.ship.duration).toFixed(2);
  result.stage.textContent = `${flight.stage + 1} / ${STAGES.length}`;
  result.credit.textContent = `+${formatNumber(flight.score)} credits added to your balance`;

  result.dialog.showModal();
}

export const closeResult = () => result.dialog.close();

export function flashStage(stage) {
  stageFlash.textContent = `STAGE ${stage + 1} · ${STAGES[stage].name.toUpperCase()}`;
  stageFlash.classList.add('show');

  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => stageFlash.classList.remove('show'), STAGE_FLASH_MS);
}

/** Floats a `+n` where the player clicked. Skipped for keyboard thrust. */
export function popThrust(event, amount) {
  if (event?.clientX === undefined) return;

  const bounds = area.getBoundingClientRect();
  const pop = document.createElement('span');

  pop.className = 'click-pop';
  pop.textContent = `+${amount}`;
  pop.style.left = `${event.clientX - bounds.left}px`;
  pop.style.top = `${event.clientY - bounds.top - CLICK_POP_RISE}px`;

  area.append(pop);
  setTimeout(() => pop.remove(), CLICK_POP_MS);
}

/**
 * Binds the three ways to apply thrust: pointer, activation of the thrust
 * button (keyboard or assistive tech), and Space/Enter anywhere on the page.
 *
 * @param {object} handlers
 * @param {() => boolean} handlers.isFlying Whether a run is in progress.
 * @param {(event?: PointerEvent) => void} handlers.onThrust
 */
export function initFlightView({ isFlying, onThrust }) {
  thrust.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;

    // Keeps the press from moving focus or starting a text selection.
    event.preventDefault();
    onThrust(event);
  });

  // `detail === 0` marks a synthetic click, i.e. the button was activated by
  // key or assistive tech rather than by a pointer.
  thrust.addEventListener('click', (event) => {
    if (event.detail === 0) onThrust();
  });

  document.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' && event.code !== 'Enter') return;
    if (!isFlying() || openDialogs().length) return;

    // Other buttons keep their own key activation; the thrust surface does not.
    if (event.target instanceof HTMLButtonElement && event.target !== thrust) return;

    event.preventDefault();
    if (!event.repeat) onThrust();
  });
}
