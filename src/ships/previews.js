/**
 * Shop card artwork. Each ship is rendered once into a PNG data URL so the
 * hangar grid stays static images instead of live WebGL contexts.
 *
 * Loaded on demand, since nothing before the shop opens needs it.
 */

import {
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';

import { createShip, disposeShip } from './builder.js';

const WIDTH = 360;
const HEIGHT = 240;

/**
 * @param {Array<object>} ships
 * @returns {Record<string, string>} Data URLs keyed by ship id.
 */
export function renderShipPreviews(ships) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true });

  renderer.setSize(WIDTH, HEIGHT);

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, WIDTH / HEIGHT, 0.1, 100);

  camera.position.set(5, 7, 8);
  camera.lookAt(0, 0, 0);

  scene.add(new HemisphereLight(0xdceeff, 0x263219, 3));

  const key = new DirectionalLight(0xffffff, 4);
  key.position.set(-3, 7, 4);
  scene.add(key);

  const images = {};

  try {
    // One ship on stage at a time keeps the framing identical across cards.
    for (const ship of ships) {
      const craft = createShip(ship);
      scene.add(craft);

      renderer.render(scene, camera);
      images[ship.id] = renderer.domElement.toDataURL('image/png');

      scene.remove(craft);
      disposeShip(craft);
    }
  } finally {
    // The context is single-use; release it even if a ship failed to render.
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return images;
}
