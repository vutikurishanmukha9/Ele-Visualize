import * as THREE from 'three';

/**
 * Volumetric Hydrogenic Orbital Shader
 * Separates Probability Density |ψ|^2 from Quantum Phase Sign sign(ψ).
 * Positive lobes (ψ > 0) render in Phase A color, Negative lobes (ψ < 0) render in Phase B color.
 */
export const OrbitalVolumetricShader = {
  uniforms: {
    uTime: { value: 0 },
    uOrbitalType: { value: 0 }, // 0 = s, 1 = pz, 2 = px, 3 = py, 4 = dz2, 5 = dxy, 6 = dxz, 7 = dyz, 8 = dx2-y2, 9 = fz3
    uColorPhasePositive: { value: new THREE.Color('#38bdf8') }, // Phase A (+): Cyan / Sky Blue
    uColorPhaseNegative: { value: new THREE.Color('#f43f5e') }, // Phase B (-): Crimson / Rose
    uOpacity: { value: 0.45 },
    uMaxSteps: { value: 36 },
  },
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;
    varying vec3 vLocalPosition;

    void main() {
      vLocalPosition = position;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform int uOrbitalType;
    uniform vec3 uColorPhasePositive;
    uniform vec3 uColorPhaseNegative;
    uniform float uOpacity;
    uniform int uMaxSteps;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;
    varying vec3 vLocalPosition;

    #define STEP_SIZE 0.052

    // Returns vec2(probabilityDensity, phaseSign)
    vec2 evaluateWavefunction(vec3 p) {
      float r = length(p);
      if (r < 0.001 || r > 3.4) return vec2(0.0, 1.0);

      float theta = acos(clamp(p.z / r, -1.0, 1.0));
      float phi = atan(p.y, p.x);
      float psi = 0.0;

      // Hydrogenic Wavefunction evaluations
      if (uOrbitalType == 0) {
        // 1s Orbital: Spherically symmetric
        psi = exp(-r * 1.5);
      } else if (uOrbitalType == 1) {
        // 2pz Orbital: Cosine polar lobe
        psi = r * exp(-r * 0.85) * cos(theta);
      } else if (uOrbitalType == 2) {
        // 2px Orbital: Sine cosine phi lobe
        psi = r * exp(-r * 0.85) * sin(theta) * cos(phi);
      } else if (uOrbitalType == 3) {
        // 2py Orbital: Sine sine phi lobe
        psi = r * exp(-r * 0.85) * sin(theta) * sin(phi);
      } else if (uOrbitalType == 4) {
        // 3dz2 Orbital: Quadrupole torus & polar lobes
        psi = r * r * exp(-r * 0.65) * (3.0 * cos(theta) * cos(theta) - 1.0);
      } else if (uOrbitalType == 5) {
        // 3dxy Orbital: 4-lobed cloverleaf
        psi = r * r * exp(-r * 0.65) * sin(theta) * sin(theta) * sin(2.0 * phi);
      } else if (uOrbitalType == 6) {
        // 3dxz Orbital
        psi = r * r * exp(-r * 0.65) * sin(theta) * cos(theta) * cos(phi);
      } else if (uOrbitalType == 7) {
        // 3dyz Orbital
        psi = r * r * exp(-r * 0.65) * sin(theta) * cos(theta) * sin(phi);
      } else if (uOrbitalType == 8) {
        // 3dx2-y2 Orbital
        psi = r * r * exp(-r * 0.65) * sin(theta) * sin(theta) * cos(2.0 * phi);
      } else if (uOrbitalType == 9) {
        // 4fz3 Orbital: Octupole multi-lobe harmonic
        psi = pow(r, 3.0) * exp(-r * 0.52) * (5.0 * pow(cos(theta), 3.0) - 3.0 * cos(theta));
      }

      float phase = psi >= 0.0 ? 1.0 : -1.0;
      float probDensity = psi * psi;
      return vec2(probDensity, phase);
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(-vViewPosition);
      float normalDot = abs(dot(viewDir, normal));
      float rim = pow(1.0 - normalDot, 1.8);

      vec3 rayOrigin = vLocalPosition;
      vec3 rayDir = normalize(vLocalPosition);
      vec3 pos = rayOrigin - rayDir * 1.5;

      float densityAccum = 0.0;
      float phaseAccum = 0.0;

      for (int i = 0; i < 48; i++) {
        if (i >= uMaxSteps) break;
        vec2 wf = evaluateWavefunction(pos);
        float d = wf.x;
        densityAccum += d * STEP_SIZE * 8.0;
        phaseAccum += wf.y * d;

        if (densityAccum >= 0.94) break;
        pos += rayDir * STEP_SIZE;
      }

      densityAccum = clamp(densityAccum * uOpacity, 0.0, 1.0);
      float averagePhase = phaseAccum >= 0.0 ? 1.0 : -1.0;

      // Color selection strictly governed by phase sign
      vec3 lobeColor = averagePhase > 0.0 ? uColorPhasePositive : uColorPhaseNegative;
      vec3 finalColor = lobeColor + rim * 0.25;

      gl_FragColor = vec4(finalColor, densityAccum);
    }
  `,
};

export function createOrbitalVolumetricMaterial(
  orbitalType: number = 0,
  phasePositiveColor: string = '#38bdf8',
  phaseNegativeColor: string = '#f43f5e',
  opacity: number = 0.45,
  maxSteps: number = 32
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOrbitalType: { value: orbitalType },
      uColorPhasePositive: { value: new THREE.Color(phasePositiveColor) },
      uColorPhaseNegative: { value: new THREE.Color(phaseNegativeColor) },
      uOpacity: { value: opacity },
      uMaxSteps: { value: maxSteps },
    },
    vertexShader: OrbitalVolumetricShader.vertexShader,
    fragmentShader: OrbitalVolumetricShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}
