import * as THREE from 'three';

/**
 * Fresnel Nucleus Shader
 * Creates a high-fidelity glowing sphere with radiant inner core luminescence,
 * customizable rim color, and dynamic multi-point Fresnel intensity.
 */
export const FresnelShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#f7f8f8') },
    uGlowColor: { value: new THREE.Color('#6366f1') },
    uFresnelPower: { value: 2.2 },
    uPulseSpeed: { value: 1.8 },
    uIntensity: { value: 1.6 },
  },
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uGlowColor;
    uniform float uFresnelPower;
    uniform float uPulseSpeed;
    uniform float uIntensity;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDirection = normalize(-vViewPosition);
      float normalDot = max(0.0, dot(viewDirection, normal));
      float fresnel = 1.0 - normalDot;
      float rim = pow(fresnel, uFresnelPower);
      float innerRim = pow(fresnel, uFresnelPower * 0.5);

      // Subtle organic quantum pulse
      float pulse = 0.9 + 0.1 * sin(uTime * uPulseSpeed);
      
      // Radiant core + iridescent rim bounce
      vec3 core = uColor * 0.6;
      vec3 rimColor = mix(uColor, uGlowColor, 0.6) * rim * 2.2;
      vec3 innerSheen = uGlowColor * innerRim * 0.8;
      
      vec3 finalColor = (core + rimColor + innerSheen) * uIntensity * pulse;

      float alpha = clamp(0.35 + rim * 0.65, 0.0, 1.0);
      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

export function createFresnelMaterial(color: string, glowColor: string = '#818cf8', intensity: number = 1.6) {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(FresnelShader.uniforms),
    vertexShader: FresnelShader.vertexShader,
    fragmentShader: FresnelShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  mat.uniforms.uColor.value.set(color);
  mat.uniforms.uGlowColor.value.set(glowColor);
  mat.uniforms.uIntensity.value = intensity;
  return mat;
}
