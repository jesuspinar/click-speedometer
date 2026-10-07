/**
 * The 3D flight scene.
 *
 * Composes the nebula backdrop, starfield, planet and ship, and runs the speed
 * simulation that drives all of them. Loaded dynamically: if WebGL is missing
 * the import fails and the game keeps running without a scene.
 *
 * Speed is a normalised 0..1 value derived from click rate, and every visual
 * effect — star streaks, nebula drift, exhaust length, field of view — is a
 * function of it. It eases toward its target so the view accelerates smoothly
 * instead of snapping between click rates.
 */

import {
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  PointLight,
  Scene,
  WebGLRenderer,
} from 'three';

import { STAGES } from '../game/catalog.js';
import { createCraft } from './craft.js';
import { createNebula } from './nebula.js';
import { createPlanet } from './planet.js';
import { createStarfield } from './starfield.js';

/** Retina is enough; beyond this the fragment cost outweighs the sharpness. */
const MAX_PIXEL_RATIO = 1.75;

const BASE_FOV = 65;
const FOV_GAIN = 12;

/** Contributions to the speed target, which is then clamped to 1. */
const SPEED_PER_CPS = 0.044;
const SPEED_PER_STAGE = 0.12;
const SPEED_RESPONSE = 3.1;

/** Each click adds a decaying bump, so bursts are felt before the rate moves. */
const IMPULSE_PER_CLICK = 0.055;
const IMPULSE_CEILING = 0.55;
const IMPULSE_DECAY = 2;

const STAR_BASE_TRAVEL = 1.7;
const STAR_TRAVEL_PER_SPEED = 460;
const STAR_BASE_TRAIL = 0.4;
const STAR_TRAIL_PER_SPEED = 50;

/** Reduced motion keeps the scene alive but nearly still. */
const REDUCED_MOTION_SCALE = 0.07;
const REDUCED_NEBULA_SCALE = 0.2;

/** The planet is only in view before the ship leaves the solar system. */
const PLANET_LAST_STAGE = 2;

const STAGE_COLORS = STAGES.map((stage) => new Color(stage.color));

function addLights(scene) {
  scene.add(new HemisphereLight(0xbce8ed, 0x152510, 2.8));

  const sun = new DirectionalLight(0xe9ffe1, 4);
  sun.position.set(-5, 9, 8);
  scene.add(sun);

  // Picks out the ship's silhouette from behind.
  const rim = new PointLight(0x82ffd6, 90);
  rim.position.set(5, 0, -3);
  scene.add(rim);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {{ kick: () => void, update: Function, dispose: () => void }}
 */
export function createScene(canvas) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });

  // The nebula pass and the scene pass are cleared by hand in `update`.
  renderer.autoClear = false;

  const scene = new Scene();
  const camera = new PerspectiveCamera(BASE_FOV, 1, 0.1, 1600);
  camera.position.set(0, 1, 12);

  addLights(scene);

  const nebula = createNebula();
  const starfield = createStarfield();
  const planet = createPlanet();
  const craft = createCraft(scene);

  scene.add(starfield.object, planet.object);

  function resize() {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(width, height, false);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    nebula.setAspect(width / height);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  let speed = 0;
  let impulse = 0;

  /** Eases `speed` toward the rate the player is currently sustaining. */
  function updateSpeed(dt, flight, cps) {
    const target =
      flight.state === 'flying'
        ? Math.min(
            1,
            cps * SPEED_PER_CPS * flight.ship.power +
              flight.stage * SPEED_PER_STAGE +
              impulse,
          )
        : 0;

    speed += (target - speed) * (1 - Math.exp(-dt * SPEED_RESPONSE));
    impulse *= Math.exp(-dt * IMPULSE_DECAY);
  }

  return {
    /** Registers a click: a speed bump plus a wobble on the ship. */
    kick() {
      impulse = Math.min(impulse + IMPULSE_PER_CLICK, IMPULSE_CEILING);
      craft.nudge();
    },

    /**
     * Advances and draws one frame.
     *
     * @param {number} dt Seconds since the previous frame.
     * @param {number} timeMs Monotonic timestamp from the animation frame.
     * @param {import('../game/flight.js').Flight} flight
     * @param {boolean} reduced Whether reduced motion is in effect.
     * @returns {number} Current speed, as a fraction of light.
     */
    update(dt, timeMs, flight, reduced) {
      craft.use(flight.ship);

      const flying = flight.state === 'flying';
      updateSpeed(dt, flight, flight.cps(timeMs));

      const motion = reduced ? REDUCED_MOTION_SCALE : 1;

      starfield.update({
        travel: (STAR_BASE_TRAVEL + speed * STAR_TRAVEL_PER_SPEED) * motion * dt,
        trail: STAR_BASE_TRAIL + speed * STAR_TRAIL_PER_SPEED * motion,
        timeMs,
        reduced,
      });

      const stageColor = STAGE_COLORS[Math.max(0, Math.min(STAGE_COLORS.length - 1, flight.stage))];

      starfield.setColor(stageColor);
      nebula.setColor(stageColor);
      nebula.update(dt, timeMs, reduced ? speed * REDUCED_NEBULA_SCALE : speed);

      craft.update(dt, { speed, timeMs, flying, reduced });
      planet.setVisible(flight.stage < PLANET_LAST_STAGE);

      camera.fov = BASE_FOV + speed * (reduced ? 0 : FOV_GAIN);
      camera.updateProjectionMatrix();

      // The nebula is drawn first, then depth is cleared so it stays behind.
      renderer.clear(true, true, true);
      nebula.render(renderer);
      renderer.clearDepth();
      renderer.render(scene, camera);

      return speed;
    },

    dispose() {
      resizeObserver.disconnect();

      craft.dispose();
      starfield.dispose();
      nebula.dispose();
      planet.dispose();
      renderer.dispose();
    },
  };
}
