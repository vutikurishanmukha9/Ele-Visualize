import * as THREE from 'three';

/**
 * Mathematical Hydrogenic Quantum Orbital Shader
 * Evaluates electron wavefunction probability densities |psi_nlm(r, theta, phi)|^2
 * using bounded raymarching (max 40 steps, early termination at 0.95 alpha).
 * Supports s (0), p (1), d (2), and f (3) orbitals.
 */
export const VolumetricOrbitalShader = {
  uniforms: {
    uTime: { value: 0 },
    uOrbitalType: { value: 0 }, // 0 = s, 1 = p, 2 = d, 3 = f
    uColor: { value: new THREE.Color('#38bdf8') },
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
    uniform vec3 uCoreColor;
    uniform float uOpacity;
    uniform float uCoreGlow;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;
    varying vec3 vLocalPosition;

    #define MAX_STEPS 40
    #define STEP_SIZE 0.05

    float evaluateWavefunction(vec3 p) {
      float r = length(p);
      if (r < 0.001 || r > 3.5) return 0.0;

      float theta = acos(clamp(p.z / r, -1.0, 1.0));
      float phi = atan(p.y, p.x);
      float psi = 0.0;

      if (uOrbitalType == 0) {
        // 1s Orbital: exp(-r)
        psi = exp(-r * 1.5);
      } else if (uOrbitalType == 1) {
        // 2pz Orbital: r * exp(-r/2) * cos(theta)
        psi = r * exp(-r * 0.8) * cos(theta);
      } else if (uOrbitalType == 2) {
        // 3dz2 Orbital: r^2 * exp(-r/3) * (3*cos^2(theta) - 1)
        psi = r * r * exp(-r * 0.6) * (3.0 * cos(theta) * cos(theta) - 1.0);
      } else if (uOrbitalType == 3) {
        // 4fz3 Orbital: r^3 * exp(-r/4) * (5*cos^3(theta) - 3*cos(theta))
        psi = pow(r, 3.0) * exp(-r * 0.5) * (5.0 * pow(cos(theta), 3.0) - 3.0 * cos(theta));
      }

      return psi * psi; // Probability density |psi|^2
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
      vec3 pos = rayOrigin - rayDir * 1.5;

      float densityAccum = 0.0;

      for (int i = 0; i < MAX_STEPS; i++) {
        float d = evaluateWavefunction(pos);
        densityAccum += d * STEP_SIZE * 8.0;

        if (densityAccum >= 0.95) break; // Early ray termination to protect mobile GPUs
        pos += rayDir * STEP_SIZE;
      }

      // Dynamic quantum phase breathing
      float pulse = 0.85 + 0.15 * sin(uTime * 2.0);
      float alpha = clamp(densityAccum * pulse * uOpacity, 0.0, 0.85);

      vec3 finalColor = mix(uColor, uCoreColor, rim * 0.5 + centerGlow * 0.3) * (1.0 + rim * uCoreGlow);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

export function createVolumetricOrbitalMaterial(
  color: string,
  opacity: number = 0.4,
  coreColor: string = '#ffffff',
  orbitalType: number = 0
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
  mat.uniforms.uCoreColor.value.set(coreColor);
  mat.uniforms.uOpacity.value = opacity;
  mat.uniforms.uOrbitalType.value = orbitalType;
  return mat;
}
