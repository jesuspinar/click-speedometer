import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  WebGLRenderer
} from 'three';
import { createShip, disposeShip } from './ships.js';
export function createScene(canvas) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.autoClear = false;
  const scene = new Scene();
  const camera = new PerspectiveCamera(65, 1, 0.1, 1600);
  camera
    .position
    .set(0, 1, 12);
  const ambient = new HemisphereLight(0xbce8ed, 0x152510, 2.8);
  scene.add(ambient);
  const light = new DirectionalLight(0xe9ffe1, 4);
  light
    .position
    .set(-5, 9, 8);
  scene.add(light);
  const rim = new PointLight(0x82ffd6, 90);
  rim
    .position
    .set(5, 0, -3);
  scene.add(rim);
  const count = 1500;
  const positions = new Float32Array(count * 6);
  const data = [];
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 5 + Math.random() * 210;
    data.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: -Math.random() * 800
    })
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  const material = new LineBasicMaterial({ color: 0xb6e3d5, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false });
  const stars = new LineSegments(geo, material);
  scene.add(stars);
  const fogScene = new Scene();
  const fogCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fogGeo = new PlaneGeometry(2, 2);
  const fogMat = new ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: {
        value: 0
      },
      uSpeed: {
        value: 0
      },
      uAspect: {
        value: 1
      },
      uColor: {
        value: new Color(0x4ca997)
      },
      uDensity: {
        value: 1.35
      }
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;

        gl_Position = vec4(
          position.xy,
          0.0,
          1.0
        );
      }
    `,
    fragmentShader: `
      precision highp float;

      varying vec2 vUv;

      uniform float uTime;
      uniform float uSpeed;
      uniform float uAspect;
      uniform float uDensity;

      uniform vec3 uColor;

      // -----------------------------------------------------------------------
      // Fast hash
      // -----------------------------------------------------------------------

      float hash21(vec2 p) {
        p = fract(
          p * vec2(
            123.34,
            456.21
          )
        );

        p += dot(
          p,
          p + 45.32
        );

        return fract(
          p.x * p.y
        );
      }

      // -----------------------------------------------------------------------
      // Value noise
      // -----------------------------------------------------------------------

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);

        f = f * f * (
          3.0 - 2.0 * f
        );

        float a = hash21(i);

        float b = hash21(
          i + vec2(
            1.0,
            0.0
          )
        );

        float c = hash21(
          i + vec2(
            0.0,
            1.0
          )
        );

        float d = hash21(
          i + vec2(
            1.0,
            1.0
          )
        );

        return mix(
          mix(
            a,
            b,
            f.x
          ),

          mix(
            c,
            d,
            f.x
          ),

          f.y
        );
      }

      // -----------------------------------------------------------------------
      // Optimized FBM
      //
      // Four octaves instead of five.
      // -----------------------------------------------------------------------

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.55;

        mat2 rotation = mat2(
           0.80, 0.60,
          -0.60, 0.80
        );

        for (int i = 0; i < 4; i++) {
          value += noise(p) * amplitude;

          p =
            rotation *
            p *
            2.02 +
            7.13;

          amplitude *= 0.5;
        }

        return value;
      }

      // -----------------------------------------------------------------------
      // Main
      // -----------------------------------------------------------------------

      void main() {
        vec2 uv = vUv;

        // Aspect-correct screen coordinates.
        vec2 p = uv - 0.5;

        p.x *= uAspect;

        // Fog moves slightly faster as the ship accelerates.
        float motion =
          1.0 +
          uSpeed * 2.8;

        vec2 drift = vec2(
          uTime * 0.022 * motion,
          -uTime * 0.010
        );

        // ---------------------------------------------------------------------
        // Cheap domain warp
        //
        // One noise sample instead of two independent warp fields.
        // ---------------------------------------------------------------------

        float warp =
          noise(
            p * 1.25 +
            drift * 0.45
          ) -
          0.5;

        p += vec2(
          warp,
          -warp * 0.7
        ) * 0.28;

        // ---------------------------------------------------------------------
        // Main fog structure
        // ---------------------------------------------------------------------

        float base = fbm(
          p * 1.9 +
          drift
        );

        // ---------------------------------------------------------------------
        // Cheap fine detail
        // ---------------------------------------------------------------------

        float detail = noise(
          p * 5.4 +
          vec2(
            -uTime * 0.018,
            uTime * 0.012 * motion
          )
        );

        float density =
          base * 0.88 +
          detail * 0.12;

        // ---------------------------------------------------------------------
        // Cloud body
        // ---------------------------------------------------------------------

        float cloud = smoothstep(
          0.27,
          0.78,
          density
        );

        // Background haze keeps the screen atmospheric.
        float haze = smoothstep(
          0.15,
          0.72,
          base
        );

        float fog =
          haze * 0.42 +
          cloud * 0.68;

        fog *= uDensity;

        fog *=
          1.0 +
          uSpeed * 0.12;

        fog = clamp(
          fog,
          0.0,
          1.0
        );

        // ---------------------------------------------------------------------
        // Atmospheric glow
        //
        // Uses reciprocal falloff instead of exp().
        // ---------------------------------------------------------------------

        vec2 glowUV =
          uv -
          vec2(
            0.64,
            0.54
          );

        glowUV.x *=
          uAspect *
          0.72;

        float glow =
          1.0 /
          (
            1.0 +
            dot(
              glowUV,
              glowUV
            ) *
            5.0
          );

        // ---------------------------------------------------------------------
        // Fog colour
        // ---------------------------------------------------------------------

        vec3 fogColor =
          uColor *
          (
            0.09 +
            fog * 0.58 +
            glow * 0.12
          );

        // ---------------------------------------------------------------------
        // Tiny animated dither
        // ---------------------------------------------------------------------

        float grain =
          hash21(
            gl_FragCoord.xy +
            fract(
              uTime * 83.71
            ) *
            100.0
          ) -
          0.5;

        fogColor +=
          grain *
          0.007;

        // ---------------------------------------------------------------------
        // Alpha
        // ---------------------------------------------------------------------

        float alpha =
          0.18 +
          fog * 0.60 +
          glow * 0.04;

        gl_FragColor = vec4(
          fogColor,
          clamp(
            alpha,
            0.0,
            0.84
          )
        );
      }
    `
  });
  const fog = new Mesh(fogGeo, fogMat);
  fog.frustumCulled = false;
  fogScene.add(fog);
  const planet = new Mesh(new SphereGeometry(19, 48, 48), new MeshStandardMaterial({ color: 0x122c29, roughness: 1, metalness: 0.3 }));
  planet
    .position
    .set(62, 24, -145);
  scene.add(planet);
  const planetGlow = new Mesh(new SphereGeometry(19.5, 48, 48), new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      glow: {
        value: new Color(0x72d6b5)
      }
    },
    vertexShader: `
        varying vec3 n;
        varying vec3 v;

        void main() {
          vec4 p =
            modelViewMatrix *
            vec4(
              position,
              1.0
            );

          n = normalize(
            normalMatrix *
            normal
          );

          v = normalize(
            -p.xyz
          );

          gl_Position =
            projectionMatrix *
            p;
        }
      `,
    fragmentShader: `
        varying vec3 n;
        varying vec3 v;

        uniform vec3 glow;

        void main() {
          float a = pow(
            1.0 -
            abs(
              dot(
                n,
                v
              )
            ),
            4.0
          );

          gl_FragColor = vec4(
            glow,
            a * 0.6
          );
        }
      `
  }));
  planetGlow
    .position
    .copy(planet.position);
  scene.add(planetGlow);
  let craft = new Group();
  let engines = [];
  let current = '';
  scene.add(craft);
  function buildShip(ship) {
    if (current === ship.id) {
      return
    }
    current = ship.id;
    scene.remove(craft);
    disposeShip(craft);
    craft = createShip(ship);
    engines = craft.userData.engines || [];
    scene.add(craft)
  }
  function size() {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fogMat.uniforms.uAspect.value = width / height
  }
  const resizeObserver = new ResizeObserver(size);
  resizeObserver.observe(canvas);
  size();
  let speed = 0;
  let roll = 0;
  let rollVelocity = 0;
  let impulse = 0;
  const stageColors = [new Color(0xc8ff59), new Color(0x71e5ff), new Color(0xffb45e), new Color(0xbda0ff), new Color(0xff7698)];
  return {
    kick() {
      impulse = Math.min(impulse + 0.055, 0.55);
      rollVelocity += (Math.random() - 0.5) * 0.045
    },
    update(dt, time, flight, reduced) {
      buildShip(flight.ship);
      const flying = flight.state === 'flying';
      const cps = flight.cps(time);
      const target = flying
        ? Math.min(1, cps * 0.044 * flight.ship.power + flight.stage * 0.12 + impulse)
        : 0;
      speed += (target - speed) * (1 - Math.exp(-dt * 3.1));
      impulse *= Math.exp(-dt * 2);
      const motion = reduced
        ? 0.07
        : 1;
      const travel = (1.7 + speed * 460) * motion * dt;
      const trail = 0.4 + speed * 50 * motion;
      for (let i = 0; i < count; i += 1) {
        const p = data[i];
        p.z += travel;
        if (p.z > 10) {
          p.z = -800
        }
        const j = i * 6;
        positions[j] = p.x;
        positions[j + 1] = p.y;
        positions[j + 2] = p.z;
        positions[j + 3] = p.x;
        positions[j + 4] = p.y;
        positions[j + 5] = p.z - trail
      }
      geo.attributes.position.needsUpdate = true;
      stars.rotation.z = reduced
        ? 0
        : Math.sin(time * 0.00004) * 0.04;
      const stageIndex = Math.max(0, Math.min(stageColors.length - 1, flight.stage));
      const color = stageColors[stageIndex];
      material
        .color
        .lerp(color, 0.02);
      fogMat
        .uniforms
        .uColor
        .value
        .lerp(color, 0.008);
      fogMat.uniforms.uTime.value = time * 0.001;
      const fogTargetSpeed = reduced
        ? speed * 0.2
        : speed;
      fogMat.uniforms.uSpeed.value += (fogTargetSpeed - fogMat.uniforms.uSpeed.value) * (1 - Math.exp(-dt * 2.5));
      rollVelocity += (-roll * 20 - rollVelocity * 7) * dt;
      roll += rollVelocity * dt;
      craft
        .position
        .set(flying
          ? 0
          : 3.5, -0.6 + (reduced
            ? 0
            : Math.sin(time * 0.0015) * 0.09), flying
          ? 1
          : 0);
      craft
        .rotation
        .set(0.27, flying
          ? Math.sin(time * 0.0007) * 0.025
          : -0.28, reduced
          ? 0
          : roll + (flying
            ? Math.sin(time * 0.001) * 0.03
            : -0.1));
      for (const engine of engines) {
        engine.scale.y = 0.18 + speed * 2 + (flying && !reduced
          ? Math.random() * 0.15
          : 0);
        engine.position.z = engine.userData.nozzle + engine.scale.y
      }
      planet.visible = flight.stage < 2;
      planetGlow.visible = flight.stage < 2;
      camera.fov = 65 + speed * (reduced
        ? 0
        : 12);
      camera.updateProjectionMatrix();
      renderer.clear(true, true, true);
      renderer.render(fogScene, fogCamera);
      renderer.clearDepth();
      renderer.render(scene, camera);
      return speed
    },
    dispose() {
      resizeObserver.disconnect();
      scene.remove(craft);
      disposeShip(craft);
      geo.dispose();
      material.dispose();
      fogGeo.dispose();
      fogMat.dispose();
      planet
        .geometry
        .dispose();
      planet
        .material
        .dispose();
      planetGlow
        .geometry
        .dispose();
      planetGlow
        .material
        .dispose();
      renderer.dispose()
    }
  }
}
