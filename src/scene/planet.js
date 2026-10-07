/**
 * The home planet that hangs off to the side during the early stages: a dark
 * sphere wrapped in a slightly larger shell whose rim glows where the surface
 * turns away from the camera.
 */

import {
  AdditiveBlending,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  ShaderMaterial,
  SphereGeometry,
} from 'three';

const RADIUS = 19;
const GLOW_RADIUS = 19.5;
const SEGMENTS = 48;
const GLOW_COLOR = 0x72d6b5;

/** Off to the right and well ahead, so it drifts by rather than looms. */
const POSITION = [62, 24, -145];

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);

    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-viewPosition.xyz);

    gl_Position = projectionMatrix * viewPosition;
  }
`;

/** Fresnel rim: brightest where the surface normal is edge-on. */
const FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;

  uniform vec3 uGlow;

  void main() {
    float rim = pow(1.0 - abs(dot(vNormal, vView)), 4.0);

    gl_FragColor = vec4(uGlow, rim * 0.6);
  }
`;

export function createPlanet() {
  const object = new Group();
  object.position.set(...POSITION);

  const body = new Mesh(
    new SphereGeometry(RADIUS, SEGMENTS, SEGMENTS),
    new MeshStandardMaterial({ color: 0x122c29, roughness: 1, metalness: 0.3 }),
  );

  const halo = new Mesh(
    new SphereGeometry(GLOW_RADIUS, SEGMENTS, SEGMENTS),
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uGlow: { value: new Color(GLOW_COLOR) } },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    }),
  );

  object.add(body, halo);

  return {
    object,

    setVisible(visible) {
      object.visible = visible;
    },

    dispose() {
      for (const mesh of [body, halo]) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    },
  };
}
