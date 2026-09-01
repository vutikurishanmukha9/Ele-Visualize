/**
 * Quantum Orbital Mathematics & Wavefunction Evaluation Engine
 * Pure mathematical implementation of Hydrogenic Wavefunctions:
 *   ψ_nlm(r, θ, φ) = R_nl(r) * Y_lm(θ, φ)
 *
 * Evaluates exact radial functions using generalized Laguerre polynomials
 * and real spherical harmonics with mathematically derived nodal surfaces.
 */

import { ElectronOrbitalState, SubshellType } from '../models/QuantumTypes';

/**
 * Evaluates generalized Laguerre polynomial L_n^(alpha)(x)
 */
export function laguerrePolynomial(n: number, alpha: number, x: number): number {
  if (n === 0) return 1.0;
  if (n === 1) return 1.0 + alpha - x;

  let lPrev = 1.0;
  let lCurr = 1.0 + alpha - x;

  for (let k = 1; k < n; k++) {
    const lNext = ((2 * k + 1 + alpha - x) * lCurr - (k + alpha) * lPrev) / (k + 1);
    lPrev = lCurr;
    lCurr = lNext;
  }

  return lCurr;
}

/**
 * Evaluates factorial n!
 */
export function factorial(n: number): number {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

/**
 * Hydrogenic Radial Wavefunction R_nl(r) in atomic units (Bohr radius a0 = 1).
 * R_nl(r) = sqrt( (2/n)^3 * (n-l-1)! / (2n * (n+l)!) ) * e^(-rho/2) * rho^l * L_(n-l-1)^(2l+1)(rho)
 * where rho = 2 * Z * r / n
 */
export function radialWavefunction(n: number, l: number, r: number, Z: number = 1.0): number {
  if (r < 0) return 0;
  const rho = (2.0 * Z * r) / n;
  const prefactor = Math.sqrt(
    Math.pow((2.0 * Z) / n, 3) *
    (factorial(n - l - 1) / (2.0 * n * factorial(n + l)))
  );
  const expPart = Math.exp(-rho / 2.0);
  const polyPart = Math.pow(rho, l) * laguerrePolynomial(n - l - 1, 2 * l + 1, rho);

  return prefactor * expPart * polyPart;
}

/**
 * Real Spherical Harmonics Y_lm(theta, phi)
 * Returns mathematically derived angular probability amplitude.
 */
export function realSphericalHarmonic(l: number, m: number, theta: number, phi: number): number {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  // l = 0 (s-orbital)
  if (l === 0) {
    return 0.5 * Math.sqrt(1.0 / Math.PI); // Y_00 = 1 / (2 * sqrt(pi))
  }

  // l = 1 (p-orbitals)
  if (l === 1) {
    const norm = 0.5 * Math.sqrt(3.0 / Math.PI);
    if (m === 0) return norm * cosT; // 2pz
    if (m === 1) return norm * sinT * Math.cos(phi); // 2px
    if (m === -1) return norm * sinT * Math.sin(phi); // 2py
  }

  // l = 2 (d-orbitals)
  if (l === 2) {
    if (m === 0) {
      // 3dz2
      return 0.25 * Math.sqrt(5.0 / Math.PI) * (3.0 * cosT * cosT - 1.0);
    }
    if (m === 1) {
      // 3dxz
      return 0.5 * Math.sqrt(15.0 / Math.PI) * sinT * cosT * Math.cos(phi);
    }
    if (m === -1) {
      // 3dyz
      return 0.5 * Math.sqrt(15.0 / Math.PI) * sinT * cosT * Math.sin(phi);
    }
    if (m === 2) {
      // 3dx2-y2
      return 0.25 * Math.sqrt(15.0 / Math.PI) * sinT * sinT * Math.cos(2.0 * phi);
    }
    if (m === -2) {
      // 3dxy
      return 0.25 * Math.sqrt(15.0 / Math.PI) * sinT * sinT * Math.sin(2.0 * phi);
    }
  }

  // l = 3 (f-orbitals - l=3 spherical-harmonic real combinations)
  if (l === 3) {
    const normF = 0.25 * Math.sqrt(7.0 / Math.PI);
    if (m === 0) {
      // 4fz3
      return normF * (5.0 * Math.pow(cosT, 3) - 3.0 * cosT);
    }
    if (m === 1) {
      // 4fxz2
      return 0.25 * Math.sqrt(42.0 / Math.PI) * sinT * (5.0 * cosT * cosT - 1.0) * Math.cos(phi);
    }
    if (m === -1) {
      // 4fyz2
      return 0.25 * Math.sqrt(42.0 / Math.PI) * sinT * (5.0 * cosT * cosT - 1.0) * Math.sin(phi);
    }
    if (m === 2) {
      // 4fz(x2-y2)
      return 0.25 * Math.sqrt(105.0 / Math.PI) * sinT * sinT * cosT * Math.cos(2.0 * phi);
    }
    if (m === -2) {
      // 4fxyz
      return 0.25 * Math.sqrt(105.0 / Math.PI) * sinT * sinT * cosT * Math.sin(2.0 * phi);
    }
    if (m === 3) {
      // 4fx(x2-3y2)
      return 0.25 * Math.sqrt(70.0 / Math.PI) * Math.pow(sinT, 3) * Math.cos(3.0 * phi);
    }
    if (m === -3) {
      // 4fy(3x2-y2)
      return 0.25 * Math.sqrt(70.0 / Math.PI) * Math.pow(sinT, 3) * Math.sin(3.0 * phi);
    }
  }

  return 0.0;
}

/**
 * Evaluates Full 3D Hydrogenic Wavefunction ψ_nlm(r, theta, phi)
 * Returns { psi, probabilityDensity: |psi|^2, phaseSign: sign(psi) }
 */
export function evaluateFullWavefunction(
  n: number,
  l: number,
  m: number,
  r: number,
  theta: number,
  phi: number,
  Z: number = 1.0
): { psi: number; probabilityDensity: number; phaseSign: number } {
  const R = radialWavefunction(n, l, r, Z);
  const Y = realSphericalHarmonic(l, m, theta, phi);
  const psi = R * Y;
  return {
    psi,
    probabilityDensity: psi * psi,
    phaseSign: psi >= 0 ? 1 : -1,
  };
}

/**
 * Generates structured list of occupied and accessible quantum orbitals for an atomic number.
 */
export function calculateAtomicOrbitals(atomicNumber: number): ElectronOrbitalState[] {
  const orbitals: ElectronOrbitalState[] = [];
  let remaining = atomicNumber;

  const subshells: { n: number; l: number; type: SubshellType; label: string }[] = [
    { n: 1, l: 0, type: 's', label: '1s' },
    { n: 2, l: 0, type: 's', label: '2s' },
    { n: 2, l: 1, type: 'p', label: '2p' },
    { n: 3, l: 0, type: 's', label: '3s' },
    { n: 3, l: 1, type: 'p', label: '3p' },
    { n: 4, l: 0, type: 's', label: '4s' },
    { n: 3, l: 2, type: 'd', label: '3d' },
    { n: 4, l: 1, type: 'p', label: '4p' },
    { n: 5, l: 0, type: 's', label: '5s' },
    { n: 4, l: 2, type: 'd', label: '4d' },
    { n: 5, l: 1, type: 'p', label: '5p' },
    { n: 6, l: 0, type: 's', label: '6s' },
    { n: 4, l: 3, type: 'f', label: '4f' },
    { n: 5, l: 2, type: 'd', label: '5d' },
    { n: 6, l: 1, type: 'p', label: '6p' },
    { n: 7, l: 0, type: 's', label: '7s' },
    { n: 5, l: 3, type: 'f', label: '5f' },
    { n: 6, l: 2, type: 'd', label: '6d' },
    { n: 7, l: 1, type: 'p', label: '7p' },
  ];

  for (const sub of subshells) {
    const numOrbitals = 2 * sub.l + 1; // 1 for s, 3 for p, 5 for d, 7 for f
    const subCapacity = numOrbitals * 2;
    const electronsInSub = Math.min(remaining, subCapacity);

    for (let m = -sub.l; m <= sub.l; m++) {
      const mlIndex = m + sub.l;
      // Hund's rule: 1 electron per degenerate orbital before pairing
      let occ = 0;
      if (electronsInSub > mlIndex) occ += 1;
      if (electronsInSub > mlIndex + numOrbitals) occ += 1;

      const radialNodes = sub.n - sub.l - 1;
      const angularNodes = sub.l;

      orbitals.push({
        id: `${sub.n}${sub.type}_m${m}`,
        n: sub.n,
        l: sub.l,
        ml: m,
        subshell: sub.type,
        orbitalLabel: `${sub.label}${sub.l === 1 ? (m === 0 ? 'z' : m === 1 ? 'x' : 'y') : ''}`,
        radialNodes,
        angularNodes,
        occupancy: occ,
        energyEv: -13.6 / (sub.n * sub.n),
        isValence: false,
        electronCount: occ,
      });
    }

    remaining -= electronsInSub;
    if (remaining <= 0 && orbitals.length >= 5) break;
  }

  // Mark valence orbitals
  if (orbitals.length > 0) {
    const highestN = Math.max(...orbitals.filter((o) => o.occupancy > 0).map((o) => o.n));
    orbitals.forEach((o) => {
      if (o.n === highestN && o.occupancy > 0) {
        o.isValence = true;
      }
    });
  }

  return orbitals;
}
