/**
 * The player's ship in the scene: swapping the model when the equipped ship
 * changes, and animating its pose and exhaust.
 *
 * Idle, the ship sits off to one side and angled away; in flight it centres
 * and levels out. A damped spring on the roll axis turns each click into a
 * small wobble that settles on its own.
 */

import { Group } from 'three';

import { createShip, disposeShip } from '../ships/builder.js';

const ROLL_STIFFNESS = 20;
const ROLL_DAMPING = 7;
const ROLL_KICK = 0.045;

/** Resting pose: nose-up, parked to the right and turned toward the camera. */
const PITCH = 0.27;
const HOVER_Y = -0.6;
const IDLE_X = 3.5;
const IDLE_YAW = -0.28;
const IDLE_ROLL = -0.1;

/** Flare length at idle, and how far it stretches at full speed. */
const FLARE_BASE = 0.18;
const FLARE_PER_SPEED = 2;
const FLARE_FLICKER = 0.15;

const bob = (timeMs) => Math.sin(timeMs * 0.0015) * 0.09;
const yawDrift = (timeMs) => Math.sin(timeMs * 0.0007) * 0.025;
const rollDrift = (timeMs) => Math.sin(timeMs * 0.001) * 0.03;

/**
 * @param {import('three').Scene} scene Scene the model is attached to.
 */
export function createCraft(scene) {
  let model = new Group();
  let flares = [];
  let shipId = '';
  let roll = 0;
  let rollVelocity = 0;

  scene.add(model);

  /** Rebuilds the model only when a different ship is equipped. */
  function use(ship) {
    if (shipId === ship.id) return;

    shipId = ship.id;
    scene.remove(model);
    disposeShip(model);

    model = createShip(ship);
    flares = model.userData.engines || [];
    scene.add(model);
  }

  /** Jolts the roll spring. Called on every click. */
  function nudge() {
    rollVelocity += (Math.random() - 0.5) * ROLL_KICK;
  }

  function updateRoll(dt) {
    rollVelocity += (-roll * ROLL_STIFFNESS - rollVelocity * ROLL_DAMPING) * dt;
    roll += rollVelocity * dt;
  }

  function updateFlares(speed, flying, reduced) {
    const flicker = flying && !reduced;

    for (const flare of flares) {
      flare.scale.y =
        FLARE_BASE + speed * FLARE_PER_SPEED + (flicker ? Math.random() * FLARE_FLICKER : 0);

      // Keep the cone's tail pinned to the nozzle as it stretches.
      flare.position.z = flare.userData.nozzle + flare.scale.y;
    }
  }

  return {
    use,
    nudge,

    update(dt, { speed, timeMs, flying, reduced }) {
      updateRoll(dt);

      model.position.set(
        flying ? 0 : IDLE_X,
        HOVER_Y + (reduced ? 0 : bob(timeMs)),
        flying ? 1 : 0,
      );

      model.rotation.set(
        PITCH,
        flying ? yawDrift(timeMs) : IDLE_YAW,
        reduced ? 0 : roll + (flying ? rollDrift(timeMs) : IDLE_ROLL),
      );

      updateFlares(speed, flying, reduced);
    },

    dispose() {
      scene.remove(model);
      disposeShip(model);
    },
  };
}
