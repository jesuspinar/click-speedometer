/**
 * The read-only instrument panel: wallet, ship card, dashboard metrics and the
 * stage track. Every function here derives its output from the flight, so the
 * caller only decides *when* a region is stale.
 */

import { shipCategory, STAGES } from '../game/catalog.js';
import { el, formatNumber, padNumber } from './dom.js';

const SCORE_DIGITS = 3;

const nodes = {
  wallet: el('wallet'),
  best: el('best'),
  shipName: el('ship-name'),
  shipSpec: el('ship-spec'),
  multiplier: el('multiplier'),
  activeHint: el('active-hint'),
  launchDescription: el('launch-description'),
  flightDuration: el('flight-duration'),
  stages: el('stages'),
  stageNumber: el('stage-number'),
  stageName: el('stage-name'),
  sector: el('sector'),
  nextStage: el('next-stage'),
  timer: el('timer'),
  timerBar: el('timer-bar'),
  score: el('score'),
  cps: el('cps'),
  velocity: el('velocity'),
};

/** Credits, personal best and everything that describes the equipped ship. */
export function renderWallet(flight) {
  const { save, ship } = flight;

  nodes.wallet.textContent = formatNumber(save.credits);
  nodes.best.textContent = formatNumber(save.best);
  nodes.shipName.textContent = ship.name;
  nodes.shipSpec.textContent = `${shipCategory(ship)} · +${ship.power} SPEED · ${ship.duration}s`;
  nodes.multiplier.textContent = `${ship.power}× CLICK MULTIPLIER`;
  nodes.activeHint.lastElementChild.textContent = `+${ship.power} SPEED / CLICK`;
  nodes.launchDescription.textContent =
    `${ship.name} · +${ship.power} speed / click · ${ship.duration}s flight`;
  nodes.flightDuration.textContent = `${ship.duration} SECONDS`;
}

function stageMarkup(stage, index, current) {
  const state = index === current ? 'active' : index < current ? 'complete' : '';
  const marker = index < current ? '✓' : padNumber(index + 1);
  const threshold = stage.at === 0 ? 'START' : `${stage.at} PTS`;

  return `
    <div class="stage ${state}">
      <span>${marker}</span>
      <div><strong>${stage.name}</strong><small>${threshold}</small></div>
    </div>`;
}

/** The stage track and the current sector heading. Call on stage change. */
export function renderStages(flight) {
  const current = flight.stage;

  nodes.stages.innerHTML = STAGES.map((stage, index) => stageMarkup(stage, index, current)).join('');
  nodes.stageNumber.textContent = padNumber(current + 1);
  nodes.stageName.textContent = STAGES[current].name;
  nodes.sector.textContent = STAGES[current].place;
}

/** Live dashboard readouts. Call once per frame. */
export function renderMetrics(flight, now) {
  const remaining = flight.remaining(now);
  const next = STAGES[flight.stage + 1];

  nodes.timer.textContent = remaining.toFixed(1);
  nodes.timerBar.style.width = `${(remaining / flight.ship.duration) * 100}%`;
  nodes.score.textContent = padNumber(flight.score, SCORE_DIGITS);
  nodes.cps.textContent = flight.state === 'flying' ? flight.cps(now).toFixed(1) : '0.0';
  nodes.nextStage.textContent = next
    ? `${next.at - flight.score} PTS TO NEXT STAGE`
    : 'LIGHTSPEED UNLOCKED';
}

/** Speed as a fraction of light, straight from the scene simulation. */
export function renderVelocity(speed) {
  nodes.velocity.textContent = speed.toFixed(2);
}
