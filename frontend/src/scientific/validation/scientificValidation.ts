/**
 * Automated Scientific Physics Validation Suite
 * Executes pure numerical and analytical tests against physical laws and empirical benchmarks.
 */

import { calculateAtomicTransitions } from '../calculations/atomicTransitionEngine';
import { calculateAtomicOrbitals } from '../calculations/orbitalMathematics';
import { calculateNuclearStructure } from '../calculations/nuclearStructureEngine';
import { calculateElectronConfiguration } from '../calculations/electronConfiguration';

export interface ValidationReport {
  testName: string;
  category: 'SPECTROSCOPY' | 'QUANTUM_NODES' | 'SUBATOMIC_QUARKS' | 'AUFBAU_INTEGRITY';
  passed: boolean;
  expected: string;
  actual: string;
  errorMarginPercent?: number;
}

/**
 * Runs all automated scientific validation checks.
 */
export function runScientificValidation(): {
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  reports: ValidationReport[];
} {
  const reports: ValidationReport[] = [];

  // Test 1: Hydrogen Balmer H_alpha spectral transition (n=3 -> n=2)
  const hSpec = calculateAtomicTransitions(1);
  const balmerAlpha = hSpec.availableTransitions.find((t) => t.initialLevel === 3 && t.finalLevel === 2);
  const expectedBalmerAlphaNm = 656.3; // NIST H_alpha wavelength in vacuum / air (approx 656.28 nm)
  const actualBalmerAlphaNm = balmerAlpha?.wavelengthNm || 0;
  const errorMarginBalmer = Math.abs((actualBalmerAlphaNm - expectedBalmerAlphaNm) / expectedBalmerAlphaNm) * 100;

  reports.push({
    testName: 'Hydrogen Balmer Alpha (Hα: n=3 -> n=2) Wavelength',
    category: 'SPECTROSCOPY',
    passed: errorMarginBalmer < 0.5,
    expected: `${expectedBalmerAlphaNm} nm`,
    actual: `${actualBalmerAlphaNm} nm`,
    errorMarginPercent: parseFloat(errorMarginBalmer.toFixed(3)),
  });

  // Test 2: Hydrogenic Radial Nodal Surface Counts (n - l - 1)
  const orbitals = calculateAtomicOrbitals(26); // Iron (Z=26)
  const test1s = orbitals.find((o) => o.orbitalLabel === '1s');
  const test2s = orbitals.find((o) => o.orbitalLabel === '2s');
  const test2p = orbitals.find((o) => o.orbitalLabel.startsWith('2p'));
  const test3d = orbitals.find((o) => o.orbitalLabel.startsWith('3d'));

  const nodesValid =
    test1s?.radialNodes === 0 &&
    test2s?.radialNodes === 1 &&
    test2p?.radialNodes === 0 &&
    test3d?.radialNodes === 0;

  reports.push({
    testName: 'Quantum Radial Nodal Counts (1s=0, 2s=1, 2p=0, 3d=0)',
    category: 'QUANTUM_NODES',
    passed: nodesValid,
    expected: '1s: 0, 2s: 1, 2p: 0, 3d: 0',
    actual: `1s: ${test1s?.radialNodes}, 2s: ${test2s?.radialNodes}, 2p: ${test2p?.radialNodes}, 3d: ${test3d?.radialNodes}`,
  });

  // Test 3: Valence Quark Fractional Charge Sums (Proton = +1e, Neutron = 0e)
  const nuc = calculateNuclearStructure(6); // Carbon-12
  const protonCharges = nuc.nucleons.filter((n) => n.type === 'proton').every((p) => p.charge === 1);
  const neutronCharges = nuc.nucleons.filter((n) => n.type === 'neutron').every((n) => n.charge === 0);
  const netCharge = nuc.totalValenceQuarks.totalCharge;

  reports.push({
    testName: 'Nucleon Valence Quark Charge Balance (uud=+1e, udd=0e)',
    category: 'SUBATOMIC_QUARKS',
    passed: protonCharges && neutronCharges && netCharge === 6,
    expected: 'Proton charge=+1, Neutron charge=0, Carbon-12 net charge=+6',
    actual: `Protons valid: ${protonCharges}, Neutrons valid: ${neutronCharges}, Net charge: ${netCharge}`,
  });

  // Test 4: Aufbau Electron Conservation across representative elements (Z=1, 6, 24, 29, 79, 92, 118)
  const testElements = [1, 6, 24, 29, 79, 92, 118];
  let aufbauPassed = true;
  for (const z of testElements) {
    const cfg = calculateElectronConfiguration(z);
    const sum = cfg.shellOccupancies.reduce((a, b) => a + b, 0);
    if (sum !== z) {
      aufbauPassed = false;
      break;
    }
  }

  reports.push({
    testName: 'Electron Conservation in Shells (Z = 1, 6, 24, 29, 79, 92, 118)',
    category: 'AUFBAU_INTEGRITY',
    passed: aufbauPassed,
    expected: 'Sum of shell occupancies === Atomic number Z',
    actual: aufbauPassed ? 'All tested elements strictly conserve electron count' : 'Electron sum mismatch',
  });

  const passedTests = reports.filter((r) => r.passed).length;
  return {
    allPassed: passedTests === reports.length,
    totalTests: reports.length,
    passedTests,
    reports,
  };
}
