/**
 * Nuclear Structure & Subatomic Nucleon Calculation Engine
 * Implements:
 * 1. Nucleon spatial distribution using golden-ratio phyllotaxis packing for visual clarity
 * 2. Exact valence quark composition (Proton = uud, Neutron = udd)
 * 3. Semi-Empirical Bethe-Weizsäcker binding energy per nucleon (MeV)
 */

import { IsotopeInfo } from '@/data/isotopes';
import { NucleonState, ValenceQuark } from '../models/QuantumTypes';
import { NuclearStructureState } from '../models/ScientificState';

const UP_QUARK: ValenceQuark = {
  flavor: 'up',
  chargeFraction: 2 / 3,
  chargeStr: '+2/3 e',
  massMev: 2.2,
  colorCharge: 'red',
};

const DOWN_QUARK: ValenceQuark = {
  flavor: 'down',
  chargeFraction: -1 / 3,
  chargeStr: '-1/3 e',
  massMev: 4.7,
  colorCharge: 'blue',
};

/**
 * Calculates Bethe-Weizsäcker Semi-Empirical Binding Energy per Nucleon (B/A in MeV).
 */
export function calculateBindingEnergyPerNucleon(Z: number, A: number): number {
  if (A <= 1) return 0.0;
  if (A === 2 && Z === 1) return 1.112; // Deuteron
  if (A === 4 && Z === 2) return 7.074; // Helium-4

  const N = A - Z;
  const aV = 15.75; // Volume term
  const aS = 17.8; // Surface term
  const aC = 0.711; // Coulomb term
  const aA = 23.7; // Asymmetry term

  // Pairing term
  let delta = 0;
  if (Z % 2 === 0 && N % 2 === 0) delta = 11.18 / Math.sqrt(A);
  else if (Z % 2 !== 0 && N % 2 !== 0) delta = -11.18 / Math.sqrt(A);

  const B = aV * A - aS * Math.pow(A, 2 / 3) - (aC * Z * (Z - 1)) / Math.pow(A, 1 / 3) - (aA * Math.pow(A - 2 * Z, 2)) / A + delta;
  return parseFloat(Math.max(0.0, B / A).toFixed(3));
}

/**
 * Generates deterministic close-packing positions for nucleons (up to max visual limit 54).
 * IMPORTANT: This packing algorithm is for visual clarity and is not a physical prediction of nucleon positions.
 */
export function generateNucleonCluster(protons: number, neutrons: number): NucleonState[] {
  const total = protons + neutrons;
  const visualCount = Math.min(total, 54);
  const nucleons: NucleonState[] = [];

  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
  const protonRatio = protons / Math.max(total, 1);

  for (let i = 0; i < visualCount; i++) {
    const y = 1 - (i / Math.max(visualCount - 1, 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    const scale = 0.58;

    const isProton = (i % 2 === 0 && protons > 0) || (i / visualCount < protonRatio);

    const valenceQuarks: ValenceQuark[] = isProton
      ? [{ ...UP_QUARK, colorCharge: 'red' }, { ...UP_QUARK, colorCharge: 'green' }, { ...DOWN_QUARK, colorCharge: 'blue' }]
      : [{ ...UP_QUARK, colorCharge: 'red' }, { ...DOWN_QUARK, colorCharge: 'green' }, { ...DOWN_QUARK, colorCharge: 'blue' }];

    nucleons.push({
      id: `nucleon_${i}`,
      type: isProton ? 'proton' : 'neutron',
      charge: isProton ? 1 : 0,
      valenceQuarks,
      position: [
        Math.cos(theta) * radius * scale,
        y * scale,
        Math.sin(theta) * radius * scale,
      ],
      phase: i * 1.37,
    });
  }

  return nucleons;
}

/**
 * Calculates complete Nuclear Structure State for an isotope.
 */
export function calculateNuclearStructure(atomicNumber: number, isotope?: IsotopeInfo): NuclearStructureState {
  const protons = atomicNumber;
  const neutrons = isotope?.neutrons ?? (Math.round(atomicNumber * 1.25) || 1);
  const massNumber = protons + neutrons;

  const bindingEnergy = calculateBindingEnergyPerNucleon(protons, massNumber);
  const nucleons = generateNucleonCluster(protons, neutrons);

  const totalUp = protons * 2 + neutrons * 1;
  const totalDown = protons * 1 + neutrons * 2;
  const totalCharge = totalUp * (2 / 3) - totalDown * (1 / 3);

  return {
    protons,
    neutrons,
    massNumber,
    bindingEnergyPerNucleonMev: bindingEnergy,
    protonNeutronRatio: parseFloat((neutrons / Math.max(protons, 1)).toFixed(3)),
    nucleons,
    totalValenceQuarks: {
      upQuarks: totalUp,
      downQuarks: totalDown,
      totalCharge: Math.round(totalCharge),
    },
    isStable: isotope?.isStable ?? true,
    halfLifeStr: isotope?.halfLife ?? 'Stable',
    decayModeStr: isotope?.decayMode ?? 'Stable',
  };
}
