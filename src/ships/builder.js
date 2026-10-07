/**
 * Procedural ship models.
 *
 * Every hull is assembled from a handful of primitives so the five ships stay
 * visually consistent and cost nothing to ship as assets. A model is built in
 * two steps: `createKit` prepares the shared materials and primitive helpers,
 * then the builder for the ship's `form` places the parts.
 *
 * Ships are symmetrical, so parts are placed once per side.
 */

import {
  AdditiveBlending,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
} from 'three';

const SIDES = [-1, 1];

/** Cones point along +Y by default; ships fly along -Z. */
const POINT_FORWARD = -Math.PI / 2;

/** Rotates a primitive built along Y (cylinders, cones, extrusions) onto Z. */
const ALIGN_TO_Z = Math.PI / 2;

function createMaterials(ship) {
  const stealth = ship.form === 'stealth';

  return {
    hull: new MeshStandardMaterial({
      color: stealth ? 0x303344 : 0x829184,
      metalness: 0.75,
      roughness: stealth ? 0.65 : 0.36,
      flatShading: true,
    }),

    dark: new MeshStandardMaterial({
      color: 0x17232a,
      metalness: 0.65,
      roughness: 0.3,
    }),

    pod: new MeshStandardMaterial({
      color: 0x67794b,
      metalness: 0.45,
      roughness: 0.65,
    }),

    accent: new MeshStandardMaterial({
      color: ship.color,
      emissive: ship.color,
      emissiveIntensity: 0.65,
    }),

    flame: new MeshBasicMaterial({
      color: ship.color,
      transparent: true,
      opacity: 0.7,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  };
}

function createKit(ship) {
  const craft = new Group();
  const engines = [];
  const materials = createMaterials(ship);

  const add = (geometry, material, x = 0, y = 0, z = 0, rotateX = 0) => {
    const mesh = new Mesh(geometry, material);

    mesh.position.set(x, y, z);
    mesh.rotation.x = rotateX;
    craft.add(mesh);

    return mesh;
  };

  const box = (width, height, depth, material, x, y, z) =>
    add(new BoxGeometry(width, height, depth), material, x, y, z);

  /** A four-sided cone: fuselage tips, nacelles and outriggers. */
  const nose = (radius, length, x = 0, y = 0, z = -1) =>
    add(new ConeGeometry(radius, length, 4), materials.hull, x, y, z, POINT_FORWARD);

  const canopy = (x = 0, y = 0.3, z = -0.6) => {
    const mesh = add(new SphereGeometry(0.32, 12, 8), materials.dark, x, y, z);

    mesh.scale.set(0.8, 0.55, 2);

    return mesh;
  };

  /** Extrudes a flat `[x, z]` outline into a wing panel. */
  const wing = (points, y = 0) => {
    const shape = new Shape();

    points.forEach(([x, z], index) => (index ? shape.lineTo(x, z) : shape.moveTo(x, z)));
    shape.closePath();

    return add(
      new ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false }),
      materials.hull,
      0,
      y,
      0,
      ALIGN_TO_Z,
    );
  };

  /**
   * A housing, a glowing ring and the exhaust flare. The flare is registered
   * in `engines` so the scene can stretch it with speed; `nozzle` records the
   * unstretched anchor it grows back from.
   */
  const engine = (x, y, z, radius = 0.22) => {
    add(
      new CylinderGeometry(radius, radius * 1.15, 0.9, 10),
      materials.dark,
      x,
      y,
      z - 0.4,
      ALIGN_TO_Z,
    );

    add(
      new CylinderGeometry(radius * 0.8, radius * 0.8, 0.08, 12),
      materials.accent,
      x,
      y,
      z,
      ALIGN_TO_Z,
    );

    const flare = add(
      new ConeGeometry(radius * 0.8, 2, 12),
      materials.flame,
      x,
      y,
      z + 0.4,
      ALIGN_TO_Z,
    );

    flare.scale.y = 0.4;
    flare.userData.nozzle = z;
    engines.push(flare);

    return flare;
  };

  return { craft, engines, materials, box, nose, canopy, wing, engine };
}

/** A blunt freighter: a long spine flanked by cargo pods. */
function buildCargo({ box, canopy, engine, materials }) {
  box(1.1, 0.7, 3.4, materials.hull, 0, 0, 0);
  box(0.9, 0.55, 0.9, materials.hull, 0, 0.4, -1.2);
  canopy(0, 0.65, -1.35);

  for (const side of SIDES) {
    for (const z of [-0.85, 0.25, 1.35]) {
      box(0.9, 0.85, 0.95, materials.pod, side * 0.95, 0, z);
      box(0.93, 0.08, 0.12, materials.accent, side * 0.95, 0.45, z);
    }

    engine(side * 0.85, -0.05, 2, 0.3);
  }

  box(3, 0.18, 0.35, materials.dark, 0, -0.4, 0.9);
}

/** A narrow needle between two outboard nacelles. */
function buildInterceptor({ box, canopy, engine, nose, materials }) {
  nose(0.5, 3.8, 0, 0, -0.45);
  canopy();
  box(2.9, 0.14, 0.6, materials.hull, 0, 0, 0.5);

  for (const side of SIDES) {
    nose(0.27, 1.5, side * 1.3, 0, -0.8);
    box(0.4, 0.4, 2, materials.dark, side * 1.3, 0, 0.4);
    box(0.06, 0.08, 1.7, materials.accent, side * 1.3, 0.22, 0.1);
    engine(side * 1.3, 0, 1.6, 0.25);
  }
}

/** Swept delta wings with tail fins. */
function buildStriker({ box, canopy, engine, nose, wing, materials }) {
  nose(0.65, 4.1, 0, 0, -0.3);
  canopy();

  for (const side of SIDES) {
    wing([
      [side * 0.2, -1.2],
      [side * 2.4, 1.45],
      [side * 0.3, 0.9],
    ]);

    engine(side * 1.04, 0, 1.6);
    box(0.08, 0.6, 0.9, materials.hull, side * 0.6, 0.4, 0.8);
    box(0.1, 0.06, 1, materials.accent, side * 0.68, 0.15, 0.1);
  }
}

/** A single notched flying wing, drawn in one outline across both sides. */
function buildStealth({ box, canopy, engine, nose, wing, materials }) {
  wing(
    [
      [0, -2.3],
      [2.9, 1.1],
      [1.65, 0.85],
      [1.05, 1.35],
      [0, 0.9],
      [-1.05, 1.35],
      [-1.65, 0.85],
      [-2.9, 1.1],
    ],
    0.02,
  );

  nose(0.4, 2.7, 0, 0.07, -0.65).scale.x = 0.85;
  canopy(0, 0.22, -0.65);

  for (const side of SIDES) {
    box(0.65, 0.04, 0.08, materials.accent, side * 1.1, 0.08, 0.85);
    engine(side * 0.5, -0.08, 1.05, 0.15);
  }
}

/** A long spar with outriggers and a third centre engine. */
function buildLightrunner({ box, canopy, engine, nose, wing, materials }) {
  nose(0.34, 5.3, 0, 0, -0.5);
  canopy(0, 0.24, -0.75);

  for (const side of SIDES) {
    wing([
      [side * 0.15, 0.05],
      [side * 1.4, -1],
      [side * 1.1, 1.6],
      [side * 0.5, 1.2],
    ]);

    nose(0.22, 2.4, side * 1.2, 0, -0.15);
    box(0.06, 0.08, 1.6, materials.accent, side * 1.2, 0.14, 0);
    engine(side * 1.2, 0, 1.45, 0.2);
  }

  engine(0, 0, 2, 0.22);
}

const BUILDERS = {
  cargo: buildCargo,
  interceptor: buildInterceptor,
  striker: buildStriker,
  stealth: buildStealth,
  lightrunner: buildLightrunner,
};

/**
 * Builds a ship model. `userData.engines` holds the exhaust flares the scene
 * animates. An unknown `form` yields an empty group rather than throwing.
 */
export function createShip(ship) {
  const kit = createKit(ship);

  BUILDERS[ship.form]?.(kit);

  kit.craft.userData.engines = kit.engines;

  return kit.craft;
}

/**
 * Releases the GPU resources behind a model. Parts share materials, so both
 * sets are de-duplicated before disposal.
 */
export function disposeShip(craft) {
  const geometries = new Set();
  const materials = new Set();

  craft.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) materials.add(object.material);
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
