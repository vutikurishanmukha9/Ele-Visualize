import * as THREE from 'three';

/**
 * Mathematical Hydrogenic Quantum Orbital Shader
 * Evaluates electron wavefunction probability densities |psi_nlm(r, theta, phi)|^2
 * with quantum phase nodal surfaces (+/- lobes) and bounded raymarching.
 * Supports s (0), p (1), d (2), and f (3) orbitals.
 */
export const VolumetricOrbitalShader = {
  uniforms: {
    uTime: { value: 0 },
    uOrbitalType: { value: 0 }, // 0 = s, 1 = p, 2 = d, 3 = f
    uColor: { value: new THREE.Color('#38bdf8') },
    uPhaseColor: { value: new THREE.Color('#f43f5e') },
    uCoreColor: { value: new THREE.Color('#ffffff') },
    uOpacity: { value: 0.4 },
    uCoreGlow: { value: 1.2 },
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
    uniform int uOrbitalType; // 0 = s, 1 = p, 2 = d, 3 = f
    uniform vec3 uColor;
    uniform vec3 uPhaseColor;
    uniform vec3 uCoreColor;
    uniform float uOpacity;
    uniform float uCoreGlow;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;
    varying vec3 vLocalPosition;

    #define MAX_STEPS 36
    #define STEP_SIZE 0.055

    // Returns vec2(probabilityDensity, quantumPhaseSign)
    vec2 evaluateWavefunction(vec3 p) {
      float r = length(p);
      if (r < 0.001 || r > 3.2) return vec2(0.0, 1.0);

      float theta = acos(clamp(p.z / r, -1.0, 1.0));
      float phi = atan(p.y, p.x);
      float psi = 0.0;

      if (uOrbitalType == 0) {
        // 1s Orbital: Spherical symmetric density
        psi = exp(-r * 1.6);
      } else if (uOrbitalType == 1) {
        // 2pz Orbital: Dumbbell with +/- nodal planes
        psi = r * exp(-r * 0.9) * cos(theta);
      } else if (uOrbitalType == 2) {
        // 3dz2 Orbital: Quadrupole torus & lobes
        psi = r * r * exp(-r * 0.7) * (3.0 * cos(theta) * cos(theta) - 1.0);
      } else if (uOrbitalType == 3) {
        // 4fz3 Orbital: Octupole 8-lobe harmonic
        psi = pow(r, 3.0) * exp(-r * 0.55) * (5.0 * pow(cos(theta), 3.0) - 3.0 * cos(theta));
      }

      float signVal = psi >= 0.0 ? 1.0 : -1.0;
      return vec2(psi * psi, signVal); // |psi|^2 and phase
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(-vViewPosition);
      float normalDot = abs(dot(viewDir, normal));
      float rim = pow(1.0 - normalDot, 1.8);
      float centerGlow = pow(normalDot, 2.0);

      // Bounded raymarching accumulation
      vec3 rayOrigin = vLocalPosition;
      vec3 rayDir = normalize(vLocalPosition);
      vec3 pos = rayOrigin - rayDir * 1.4;

      float densityAccum = 0.0;
      float phaseAccum = 0.0;

      for (int i = 0; i < MAX_STEPS; i++) {
        vec2 wf = evaluateWavefunction(pos);
        float d = wf.x;
        densityAccum += d * STEP_SIZE * 7.5;
        phaseAccum += wf.y * d;

        if (densityAccum >= 0.92) break; // Early termination
        pos += rayDir * STEP_SIZE;
      }

      // Dynamic quantum phase breathing
      float pulse = 0.88 + 0.12 * sin(uTime * 2.2);
      float alpha = clamp(densityAccum * pulse * uOpacity, 0.0, 0.85);

      // Phase-dependent color interpolation (+ phase = cyan/sky, - phase = ruby/rose)
      float phaseBlend = clamp((phaseAccum / max(densityAccum, 0.001) + 1.0) * 0.5, 0.0, 1.0);
      vec3 lobeColor = mix(uPhaseColor, uColor, phaseBlend);

      vec3 finalColor = mix(lobeColor, uCoreColor, rim * 0.45 + centerGlow * 0.25) * (1.0 + rim * uCoreGlow * 0.7);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

export function createVolumetricOrbitalMaterial(
  color: string,
  opacity: number = 0.4,
  coreColor: string = '#ffffff',
  orbitalType: number = 0,
  phaseColor: string = '#f43f5e'
) {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(VolumetricOrbitalShader.uniforms),
    vertexShader: VolumetricOrbitalShader.vertexShader,
    fragmentShader: VolumetricOrbitalShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  mat.uniforms.uColor.value.set(color);
  mat.uniforms.uPhaseColor.value.set(phaseColor);
  mat.uniforms.uCoreColor.value.set(coreColor);
  mat.uniforms.uOpacity.value = opacity;
  mat.uniforms.uOrbitalType.value = orbitalType;
  return mat;
}
