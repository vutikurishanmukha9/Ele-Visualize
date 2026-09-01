import * as THREE from 'three';

/**
 * Strong Nuclear Interaction Field Shader
 * Conceptual visual abstraction representing the strong nuclear force binding nucleons together.
 * NOTE: This is an intentional visual metaphor, not a literal depiction of gluon trajectories.
 */
export const StrongForceFieldShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#e11d48') },
    uSecondaryColor: { value: new THREE.Color('#0284c7') },
    uIntensity: { value: 0.8 },
  },
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uSecondaryColor;
    uniform float uIntensity;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(-vViewPosition);

      // Chromatic Fresnel edge rim
      float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 2.2);

      // Micro-pulsating strong force harmonic oscillation
      float pulse = 0.5 + 0.5 * sin(uTime * 4.0 + vPosition.x * 3.0 + vPosition.y * 3.0);

      vec3 mixedColor = mix(uColor, uSecondaryColor, pulse * 0.4);
      float alpha = fresnel * 0.45 * uIntensity;

      gl_FragColor = vec4(mixedColor, alpha);
    }
  `,
};

export function createStrongForceMaterial(
  primaryColor: string = '#e11d48',
  secondaryColor: string = '#0284c7',
  intensity: number = 0.8
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(primaryColor) },
      uSecondaryColor: { value: new THREE.Color(secondaryColor) },
      uIntensity: { value: intensity },
    },
    vertexShader: StrongForceFieldShader.vertexShader,
    fragmentShader: StrongForceFieldShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
}
