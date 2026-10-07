/**
 * The streaking starfield.
 *
 * Stars are line segments rather than points so they can stretch into trails
 * at speed. Positions live in one buffer that is rewritten each frame; stars
 * that pass the camera wrap back to the far plane, so the field never runs out.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  LineSegments,
} from 'three';

const STAR_COUNT = 1500;

/** Two endpoints of three coordinates per star. */
const FLOATS_PER_STAR = 6;

const INNER_RADIUS = 5;
const RADIUS_SPREAD = 210;
const FAR_PLANE = -800;

/** Past this depth a star is behind the camera and gets recycled. */
const RECYCLE_Z = 10;

/** Stage colours are eased in, so a stage change is a drift, not a cut. */
const COLOR_BLEND = 0.02;

const SWAY_SPEED = 0.00004;
const SWAY_AMOUNT = 0.04;

/** Places a star on a random ring around the flight path. */
function randomStar() {
  const angle = Math.random() * Math.PI * 2;
  const radius = INNER_RADIUS + Math.random() * RADIUS_SPREAD;

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    z: Math.random() * FAR_PLANE,
  };
}

export function createStarfield() {
  const stars = Array.from({ length: STAR_COUNT }, randomStar);
  const positions = new Float32Array(STAR_COUNT * FLOATS_PER_STAR);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));

  const material = new LineBasicMaterial({
    color: 0xb6e3d5,
    transparent: true,
    opacity: 0.55,
    blending: AdditiveBlending,
    depthWrite: false,
  });

  const object = new LineSegments(geometry, material);

  return {
    object,

    setColor(color) {
      material.color.lerp(color, COLOR_BLEND);
    },

    /**
     * @param {object} frame
     * @param {number} frame.travel Distance to advance each star this frame.
     * @param {number} frame.trail Length of the streak behind each star.
     */
    update({ travel, trail, timeMs, reduced }) {
      for (let index = 0; index < stars.length; index += 1) {
        const star = stars[index];

        star.z += travel;
        if (star.z > RECYCLE_Z) star.z = FAR_PLANE;

        const offset = index * FLOATS_PER_STAR;

        positions[offset] = star.x;
        positions[offset + 1] = star.y;
        positions[offset + 2] = star.z;
        positions[offset + 3] = star.x;
        positions[offset + 4] = star.y;
        positions[offset + 5] = star.z - trail;
      }

      geometry.attributes.position.needsUpdate = true;
      object.rotation.z = reduced ? 0 : Math.sin(timeMs * SWAY_SPEED) * SWAY_AMOUNT;
    },

    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
