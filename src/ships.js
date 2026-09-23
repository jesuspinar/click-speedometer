import {
  AdditiveBlending,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Shape,
  SphereGeometry,
  WebGLRenderer,
} from 'three';

export function createShip(ship) {
  const craft = new Group();
  const engines = [];

  const hull = new MeshStandardMaterial({
    color: ship.form === 'stealth' ? 0x303344 : 0x829184,
    metalness: 0.75,
    roughness: ship.form === 'stealth' ? 0.65 : 0.36,
    flatShading: true,
  });

  const dark = new MeshStandardMaterial({
    color: 0x17232a,
    metalness: 0.65,
    roughness: 0.3,
  });

  const cargo = new MeshStandardMaterial({
    color: 0x67794b,
    metalness: 0.45,
    roughness: 0.65,
  });

  const accent = new MeshStandardMaterial({
    color: ship.color,
    emissive: ship.color,
    emissiveIntensity: 0.65,
  });

  const flame = new MeshBasicMaterial({
    color: ship.color,
    transparent: true,
    opacity: 0.7,
    blending: AdditiveBlending,
    depthWrite: false,
  });

  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0) => {
    const m = new Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    craft.add(m);
    return m;
  };

  const box = (w, h, d, mat, x, y, z) =>
    add(new BoxGeometry(w, h, d), mat, x, y, z);

  const nose = (radius, length, x = 0, y = 0, z = -1) =>
    add(
      new ConeGeometry(radius, length, 4),
      hull,
      x,
      y,
      z,
      -Math.PI / 2,
    );

  const canopy = (x = 0, y = 0.3, z = -0.6) => {
    const m = add(new SphereGeometry(0.32, 12, 8), dark, x, y, z);
    m.scale.set(0.8, 0.55, 2);
  };

  const wing = (points, y = 0) => {
    const shape = new Shape();

    points.forEach(([x, z], i) =>
      i ? shape.lineTo(x, z) : shape.moveTo(x, z),
    );

    shape.closePath();

    return add(
      new ExtrudeGeometry(shape, {
        depth: 0.12,
        bevelEnabled: false,
      }),
      hull,
      0,
      y,
      0,
      Math.PI / 2,
    );
  };

  const engine = (x, y, z, r = 0.22) => {
    add(
      new CylinderGeometry(r, r * 1.15, 0.9, 10),
      dark,
      x,
      y,
      z - 0.4,
      Math.PI / 2,
    );

    add(
      new CylinderGeometry(r * 0.8, r * 0.8, 0.08, 12),
      accent,
      x,
      y,
      z,
      Math.PI / 2,
    );

    const e = add(
      new ConeGeometry(r * 0.8, 2, 12),
      flame,
      x,
      y,
      z + 0.4,
      Math.PI / 2,
    );

    e.scale.y = 0.4;
    e.userData.nozzle = z;
    engines.push(e);
  };

  switch (ship.form) {
    case 'cargo':
      box(1.1, 0.7, 3.4, hull, 0, 0, 0);
      box(0.9, 0.55, 0.9, hull, 0, 0.4, -1.2);
      canopy(0, 0.65, -1.35);

      for (const side of [-1, 1]) {
        for (const z of [-0.85, 0.25, 1.35]) {
          box(0.9, 0.85, 0.95, cargo, side * 0.95, 0, z);
          box(0.93, 0.08, 0.12, accent, side * 0.95, 0.45, z);
        }

        engine(side * 0.85, -0.05, 2, 0.3);
      }

      box(3, 0.18, 0.35, dark, 0, -0.4, 0.9);
      break;

    case 'interceptor':
      nose(0.5, 3.8, 0, 0, -0.45);
      canopy();
      box(2.9, 0.14, 0.6, hull, 0, 0, 0.5);

      for (const side of [-1, 1]) {
        nose(0.27, 1.5, side * 1.3, 0, -0.8);
        box(0.4, 0.4, 2, dark, side * 1.3, 0, 0.4);
        box(0.06, 0.08, 1.7, accent, side * 1.3, 0.22, 0.1);
        engine(side * 1.3, 0, 1.6, 0.25);
      }

      break;

    case 'striker':
      nose(0.65, 4.1, 0, 0, -0.3);
      canopy();

      for (const side of [-1, 1]) {
        wing([
          [side * 0.2, -1.2],
          [side * 2.4, 1.45],
          [side * 0.3, 0.9],
        ]);

        engine(side * 1.04, 0, 1.6);
        box(0.08, 0.6, 0.9, hull, side * 0.6, 0.4, 0.8);
        box(0.1, 0.06, 1, accent, side * 0.68, 0.15, 0.1);
      }

      break;

    case 'stealth':
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

      for (const side of [-1, 1]) {
        box(0.65, 0.04, 0.08, accent, side * 1.1, 0.08, 0.85);
        engine(side * 0.5, -0.08, 1.05, 0.15);
      }

      break;

    case 'lightrunner':
      nose(0.34, 5.3, 0, 0, -0.5);
      canopy(0, 0.24, -0.75);

      for (const side of [-1, 1]) {
        wing([
          [side * 0.15, 0.05],
          [side * 1.4, -1],
          [side * 1.1, 1.6],
          [side * 0.5, 1.2],
        ]);

        nose(0.22, 2.4, side * 1.2, 0, -0.15);
        box(0.06, 0.08, 1.6, accent, side * 1.2, 0.14, 0);
        engine(side * 1.2, 0, 1.45, 0.2);
      }

      engine(0, 0, 2, 0.22);
      break;
  }

  craft.userData.engines = engines;
  return craft;
}

export function disposeShip(craft) {
  const geometries = new Set();
  const materials = new Set();

  craft.traverse((o) => {
    if (o.geometry) {
      geometries.add(o.geometry);
    }

    if (o.material) {
      materials.add(o.material);
    }
  });

  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

export function renderShipPreviews(ships) {
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
  });

  renderer.setSize(360, 240);

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1.5, 0.1, 100);

  camera.position.set(5, 7, 8);
  camera.lookAt(0, 0, 0);

  scene.add(new HemisphereLight(0xdceeff, 0x263219, 3));

  const key = new DirectionalLight(0xffffff, 4);
  key.position.set(-3, 7, 4);
  scene.add(key);

  const images = {};

  try {
    for (const ship of ships) {
      const craft = createShip(ship);
      scene.add(craft);

      renderer.render(scene, camera);
      images[ship.id] = renderer.domElement.toDataURL('image/png');

      scene.remove(craft);
      disposeShip(craft);
    }
  } finally {
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return images;
}
