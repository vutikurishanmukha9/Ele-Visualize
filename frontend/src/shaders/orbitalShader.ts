import * as THREE from 'three';

/**
 * Volumetric Orbital Shader
 * Simulates quantum electron density clouds with noise turbulence,
 * dynamic additive blending, radial core radiance, and soft edge glow.
 */
export const VolumetricOrbitalShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#38bdf8') },
    uCoreColor: { value: new THREE.Color('#ffffff') },
    uOpacity: { value: 0.35 },
    uNoiseScale: { value: 2.8 },
    uSpeed: { value: 0.6 },
    uRimPower: { value: 1.8 },
    uCoreGlow: { value: 1.4 },
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
    uniform vec3 uCoreColor;
    uniform float uOpacity;
    uniform float uNoiseScale;
    uniform float uSpeed;
    uniform float uRimPower;
    uniform float uCoreGlow;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;

    // Simplex 3D noise helper
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(-vViewPosition);
      float normalDot = abs(dot(viewDir, normal));
      float rim = pow(1.0 - normalDot, uRimPower);
      float centerGlow = pow(normalDot, 2.0);

      // Quantum turbulence field
      vec3 pos = vPosition * uNoiseScale + vec3(0.0, 0.0, uTime * uSpeed);
      float n1 = snoise(pos) * 0.5 + 0.5;
      float n2 = snoise(pos * 2.0 - vec3(uTime * 0.3)) * 0.5 + 0.5;
      float n = mix(n1, n2, 0.35);

      // Soft volumetric density falloff with edge rim glow
      float density = (n * 0.65 + rim * 0.75 + centerGlow * 0.2) * uOpacity;
      
      // Color grading: Core highlight -> Vibrant element body -> Radiant rim crest
      vec3 vibrantColor = mix(uColor, uCoreColor, rim * 0.6 + centerGlow * 0.3);
      vec3 finalColor = vibrantColor * (1.0 + rim * uCoreGlow);

      gl_FragColor = vec4(finalColor, clamp(density, 0.0, 1.0));
    }
  `,
};

export function createVolumetricOrbitalMaterial(color: string, opacity: number = 0.35, coreColor: string = '#ffffff') {
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
  return mat;
}
