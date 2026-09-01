import * as THREE from 'three';

/**
 * Standing Wave & Probability Trail Shader
 * Visualizes probability-inspired standing wave contours along quantized shell tracks.
 */
export const StandingWaveShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#38bdf8') },
    uWavenumber: { value: 4.0 }, // Principal quantum number n
    uSpeed: { value: 1.0 },
    uOpacity: { value: 0.6 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uWavenumber;
    uniform float uSpeed;
    uniform float uOpacity;

    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      // Standing wave probability modulation: sin(n * theta - omega * t)
      float angle = atan(vPosition.z, vPosition.x);
      float standingWave = 0.5 + 0.5 * sin(uWavenumber * angle - uTime * uSpeed * 2.0);
      float alpha = standingWave * uOpacity;

      gl_FragColor = vec4(uColor, alpha);
    }
  `,
};

export function createStandingWaveMaterial(
  color: string = '#38bdf8',
  wavenumber: number = 4.0,
  speed: number = 1.0,
  opacity: number = 0.6
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uWavenumber: { value: wavenumber },
      uSpeed: { value: speed },
      uOpacity: { value: opacity },
    },
    vertexShader: StandingWaveShader.vertexShader,
    fragmentShader: StandingWaveShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}
