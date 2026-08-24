import * as THREE from 'three';

/**
 * Quantum Ambient Studio Background Shader
 * Creates an illuminated cinematic quantum studio environment with soft radial
 * energy illumination, animated field waves, and gentle horizon diffusion.
 */
export const QuantumBackgroundShader = {
  uniforms: {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color('#0c1222') }, // Rich illuminated core navy/slate
    uColorB: { value: new THREE.Color('#020617') }, // Deep horizon gradient
    uAccentColor: { value: new THREE.Color('#38bdf8') }, // Radiant cyan / quantum energy tint
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uAccentColor;

    varying vec2 vUv;

    float grid(vec2 st, float res) {
      vec2 fw = max(fwidth(st * res), vec2(0.001));
      vec2 grid = abs(fract(st * res - 0.5) - 0.5) / fw;
      float line = min(grid.x, grid.y);
      return 1.0 - min(line, 1.0);
    }

    void main() {
      vec2 centerUv = vUv - 0.5;
      float dist = length(centerUv);

      // Smooth studio radial illumination gradient (bright in center, falloff towards edges)
      float radialCore = smoothstep(0.85, 0.0, dist);
      vec3 bg = mix(uColorB, uColorA, radialCore);

      // Subtle animated quantum grid floor & ceiling
      vec2 gridUv = vUv * 16.0 + vec2(sin(uTime * 0.15) * 0.05, uTime * 0.03);
      float g = grid(gridUv, 1.0);

      // Radiant energy wave ripples expanding from center
      float wave = sin(dist * 18.0 - uTime * 1.2) * 0.5 + 0.5;
      wave *= smoothstep(0.7, 0.05, dist);

      // Combine studio ambient lighting with quantum accent shimmer
      vec3 studioGlow = uAccentColor * (radialCore * 0.22 + g * 0.05 + wave * 0.08);
      vec3 finalColor = bg + studioGlow;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

export function createQuantumBackgroundMaterial(accentColor?: string, colorA?: string, colorB?: string) {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(QuantumBackgroundShader.uniforms),
    vertexShader: QuantumBackgroundShader.vertexShader,
    fragmentShader: QuantumBackgroundShader.fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
    extensions: {
      derivatives: true,
    },
  });
  if (accentColor) mat.uniforms.uAccentColor.value.set(accentColor);
  if (colorA) mat.uniforms.uColorA.value.set(colorA);
  if (colorB) mat.uniforms.uColorB.value.set(colorB);
  return mat;
}
