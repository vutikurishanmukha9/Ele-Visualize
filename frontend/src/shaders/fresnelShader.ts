import * as THREE from 'three';

/**
 * Fresnel Nucleus Shader
 * Creates an Apple-grade glowing sphere with a bright inner core,
 * customizable rim color, and dynamic Fresnel intensity.
 */
export const FresnelShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#f7f8f8') },
    uGlowColor: { value: new THREE.Color('#6366f1') },
    uFresnelPower: { value: 2.5 },
    uPulseSpeed: { value: 1.5 },
    uIntensity: { value: 1.2 },
  },
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vPositionWorld;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vPositionWorld = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
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
    varying vec3 vPositionWorld;
    varying vec2 vUv;

    void main() {
      vec3 viewDirection = normalize(cameraPosition - vPositionWorld);
      float fresnel = 1.0 - max(0.0, dot(viewDirection, vNormal));
      fresnel = pow(fresnel, uFresnelPower);

      float pulse = 0.85 + 0.15 * sin(uTime * uPulseSpeed);
      
      vec3 baseColor = mix(uColor, uGlowColor, fresnel * 0.7);
      vec3 finalColor = baseColor * uIntensity * pulse + (uGlowColor * fresnel * 1.5);

      float alpha = clamp(0.4 + fresnel * 0.6, 0.0, 1.0);
      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

export function createFresnelMaterial(color: string, glowColor: string = '#818cf8') {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(FresnelShader.uniforms),
    vertexShader: FresnelShader.vertexShader,
    fragmentShader: FresnelShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  mat.uniforms.uColor.value.set(color);
  mat.uniforms.uGlowColor.value.set(glowColor);
  return mat;
}
