/**
 * Entry point. Owns the single `Flight` instance, wires the UI to it and runs
 * the animation frame loop; every other module is either pure game logic or a
 * view over it.
 */

import { registerAgentTools } from './agent-tools.js';
import { Flight } from './game/flight.js';
import { readSave, writeSave } from './storage.js';
import { initDialogs } from './ui/dialogs.js';
import { el } from './ui/dom.js';
import * as flightView from './ui/flight-view.js';
import * as hud from './ui/hud.js';
import { initMotionToggle, prefersReducedMotion } from './ui/motion.js';
import { createShop } from './ui/shop.js';
import { cue, initSoundToggle } from './ui/sound.js';
import { showToast } from './ui/toast.js';

/** Caps `dt` so a backgrounded tab does not resume with one giant step. */
const MAX_FRAME_SECONDS = 0.05;

const flight = new Flight(readSave());
const shop = createShop({ flight, onEquip: handleShopEquip });

/** Undefined until the scene loads, and stays undefined without WebGL. */
let scene;

let lastFrameAt = performance.now();
let shownStage = 0;

/** Guards against reporting the same finished run on every later frame. */
let resultShown = false;

function persist() {
  if (!writeSave(flight.save)) {
    showToast('Storage is unavailable. Progress lasts for this visit.');
  }
}

function startFlight() {
  if (!flight.start(performance.now())) return;

  resultShown = false;
  shownStage = 0;

  flightView.showLaunchInProgress();
  hud.renderStages(flight);
  cue.launch();
}

/** @param {PointerEvent} [event] Absent when thrust came from the keyboard. */
function applyThrust(event) {
  if (!flight.click(performance.now())) return;

  scene?.kick();
  cue.thrust(flight.stage);

  if (!prefersReducedMotion()) flightView.popThrust(event, flight.ship.power);
}

/** Runs once the deadline passes: bank the score and show the report. */
function endFlight() {
  resultShown = true;

  persist();
  hud.renderWallet(flight);
  flightView.showFlightComplete();
  flightView.showResult(flight);
  cue.complete();
}

function handleShopEquip(result) {
  if (!result.ok) return;

  persist();
  hud.renderWallet(flight);
  cue.equip();
}

/** An agent can equip while the hangar is closed, so refresh it too. */
function handleAgentEquip() {
  persist();
  hud.renderWallet(flight);
  shop.render();
}

function frame(now) {
  const dt = Math.min((now - lastFrameAt) / 1000, MAX_FRAME_SECONDS);
  lastFrameAt = now;

  flight.tick(now);
  if (flight.state === 'done' && !resultShown) endFlight();

  hud.renderMetrics(flight, now);

  if (shownStage !== flight.stage) {
    shownStage = flight.stage;

    hud.renderStages(flight);
    flightView.flashStage(shownStage);
    cue.stage(shownStage);
  }

  hud.renderVelocity(scene?.update(dt, now, flight, prefersReducedMotion()) ?? 0);

  requestAnimationFrame(frame);
}

/** The game stays playable if WebGL is unavailable. */
function loadScene() {
  import('./scene/scene.js')
    .then(({ createScene }) => {
      scene = createScene(el('space'));
    })
    .catch(flightView.showLowGraphicsMode);
}

initDialogs();
initSoundToggle();
initMotionToggle();
flightView.initFlightView({
  isFlying: () => flight.state === 'flying',
  onThrust: applyThrust,
});

el('launch').addEventListener('click', startFlight);
el('again').addEventListener('click', startFlight);
el('shop').addEventListener('click', shop.open);
el('result-shop').addEventListener('click', shop.open);
el('help').addEventListener('click', () => el('help-dialog').showModal());

hud.renderWallet(flight);
hud.renderStages(flight);

// A hidden tab stops firing frames, so settle the clock on the way back.
document.addEventListener('visibilitychange', () => flight.tick(performance.now()));

loadScene();
registerAgentTools({ flight, onEquip: handleAgentEquip });
requestAnimationFrame(frame);
