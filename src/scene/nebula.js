/**
 * The drifting nebula backdrop.
 *
 * A full-screen quad rendered in its own orthographic pass behind the main
 * scene. The clouds are fractal noise evaluated in the shader, so there is no
 * texture to load and the pattern never repeats.
 */

import { Color, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial } from 'three';

const BASE_COLOR = 0x4ca997;
const DENSITY = 1.35;

/** Stage colours and speed are eased so stage changes read as a drift. */
const COLOR_BLEND = 0.008;
const SPEED_RESPONSE = 2.5;

/** The quad already covers the viewport, so skip the projection entirely. */
const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform float uSpeed;
  uniform float uAspect;
  uniform float uDensity;
  uniform vec3 uColor;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);

    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    // Smoothstep the cell fraction for continuous derivatives.
    f = f * f * (3.0 - 2.0 * f);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Four octaves, each rotated to hide the grid of the one below it.
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.55;
    mat2 rotation = mat2(0.80, 0.60, -0.60, 0.80);

    for (int i = 0; i < 4; i++) {
      value += noise(p) * amplitude;
      p = rotation * p * 2.02 + 7.13;
      amplitude *= 0.5;
    }

    return value;
  }

  void main() {
    vec2 uv = vUv;

    // Aspect-corrected coordinates centred on the screen.
    vec2 p = uv - 0.5;
    p.x *= uAspect;

    // The nebula streams past faster as the ship accelerates.
    float motion = 1.0 + uSpeed * 2.8;
    vec2 drift = vec2(uTime * 0.022 * motion, -uTime * 0.010);

    // A single noise sample warps the domain, which curls the cloud edges.
    float warp = noise(p * 1.25 + drift * 0.45) - 0.5;
    p += vec2(warp, -warp * 0.7) * 0.28;

    float base = fbm(p * 1.9 + drift);
    float detail = noise(p * 5.4 + vec2(-uTime * 0.018, uTime * 0.012 * motion));
    float density = base * 0.88 + detail * 0.12;

    // Dense cores over a wide haze that keeps the whole screen atmospheric.
    float cloud = smoothstep(0.27, 0.78, density);
    float haze = smoothstep(0.15, 0.72, base);

    float fog = haze * 0.42 + cloud * 0.68;
    fog *= uDensity;
    fog *= 1.0 + uSpeed * 0.12;
    fog = clamp(fog, 0.0, 1.0);

    // Off-centre glow, with a reciprocal falloff instead of exp().
    vec2 glowUV = uv - vec2(0.64, 0.54);
    glowUV.x *= uAspect * 0.72;

    float glow = 1.0 / (1.0 + dot(glowUV, glowUV) * 5.0);

    vec3 color = uColor * (0.09 + fog * 0.58 + glow * 0.12);

    // Animated dither, which breaks up banding in the smooth gradients.
    float grain = hash21(gl_FragCoord.xy + fract(uTime * 83.71) * 100.0) - 0.5;
    color += grain * 0.007;

    float alpha = 0.18 + fog * 0.60 + glow * 0.04;

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.84));
  }
`;

export function createNebula() {
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new PlaneGeometry(2, 2);

  const material = new ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: 0 },
      uAspect: { value: 1 },
      uColor: { value: new Color(BASE_COLOR) },
      uDensity: { value: DENSITY },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });

  const quad = new Mesh(geometry, material);

  // The quad bypasses the projection matrix, so culling would misjudge it.
  quad.frustumCulled = false;
  scene.add(quad);

  const { uniforms } = material;

  return {
    setAspect(aspect) {
      uniforms.uAspect.value = aspect;
    },

    setColor(color) {
      uniforms.uColor.value.lerp(color, COLOR_BLEND);
    },

    update(dt, timeMs, targetSpeed) {
      uniforms.uTime.value = timeMs * 0.001;
      uniforms.uSpeed.value +=
        (targetSpeed - uniforms.uSpeed.value) * (1 - Math.exp(-dt * SPEED_RESPONSE));
    },

    /** Drawn first, as the backdrop for the main scene. */
    render(renderer) {
      renderer.render(scene, camera);
    },

    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
