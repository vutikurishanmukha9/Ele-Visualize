import * as THREE from 'three';

/**
 * Quantum Ambient Background Shader
 * Creates a dark, futuristic quantum grid particle wave background
 * with animated dark energy waves.
 */
export const QuantumBackgroundShader = {
  uniforms: {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color('#030712') },
    uColorB: { value: new THREE.Color('#0f172a') },
    uAccentColor: { value: new THREE.Color('#6366f1') },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uAccentColor;

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    float grid(vec2 st, float res) {
      vec2 grid = abs(fract(st * res - 0.5) - 0.5) / fwidth(st * res);
      float line = min(grid.x, grid.y);
      return 1.0 - min(line, 1.0);
    }

    void main() {
      vec2 centerUv = vUv - 0.5;
      float dist = length(centerUv);

      // Gradient background
      vec3 bg = mix(uColorA, uColorB, dist * 1.5);

      // Animated grid
      vec2 gridUv = vUv * 12.0 + vec2(sin(uTime * 0.2) * 0.1, uTime * 0.05);
      float g = grid(gridUv, 1.0);

      // Wave ripple
      float wave = sin(dist * 20.0 - uTime * 1.5) * 0.5 + 0.5;
      wave *= smoothstep(0.8, 0.0, dist);

      vec3 finalColor = bg + (uAccentColor * g * 0.08) + (uAccentColor * wave * 0.04);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

export function createQuantumBackgroundMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(QuantumBackgroundShader.uniforms),
    vertexShader: QuantumBackgroundShader.vertexShader,
    fragmentShader: QuantumBackgroundShader.fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
  });
}
