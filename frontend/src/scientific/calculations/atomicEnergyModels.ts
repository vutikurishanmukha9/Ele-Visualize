/**
 * Atomic Energy Models & Effective Nuclear Charge Calculations
 * Implements:
 * 1. Hydrogenic exact analytical model (Z=1)
 * 2. Slater's rules for multi-electron screening and effective nuclear charge (Z_eff = Z - S)
 * 3. Empirical NIST ionization potentials
 */

import { EnergyLevelState } from '../models/QuantumTypes';
import { AtomicEnergyState } from '../models/ScientificState';
import { calculateElectronConfiguration } from './electronConfiguration';

/**
 * Calculates Slater Screening Constant S for an electron in the outermost shell.
 * Uses standard Slater (1930) central-field rules.
 */
export function calculateSlaterScreening(atomicNumber: number): { shieldingConstantS: number; zEff: number } {
  if (atomicNumber === 1) return { shieldingConstantS: 0.0, zEff: 1.0 };
  if (atomicNumber === 2) return { shieldingConstantS: 0.30, zEff: 1.70 };

  const config = calculateElectronConfiguration(atomicNumber);
  const shells = config.shellOccupancies;
  const numShells = shells.length;

  const valenceElectrons = shells[numShells - 1] || 1;
  const penultimateElectrons = shells[numShells - 2] || 0;
  let coreElectrons = 0;
  for (let i = 0; i < numShells - 2; i++) {
    coreElectrons += shells[i] || 0;
  }

  // Slater rules for outer s or p electron:
  // - Other electrons in same shell: 0.35
  // - Electrons in (n-1) shell: 0.85
  // - Electrons in (n-2) or lower: 1.00
  const sameShellContribution = (valenceElectrons - 1) * 0.35;
  const penultimateContribution = penultimateElectrons * 0.85;
  const coreContribution = coreElectrons * 1.00;

  const S = sameShellContribution + penultimateContribution + coreContribution;
  const zEff = Math.max(1.0, parseFloat((atomicNumber - S).toFixed(2)));

  return { shieldingConstantS: parseFloat(S.toFixed(2)), zEff };
}

/**
 * Known empirical first ionization energies (eV) from NIST Atomic Spectra Database.
 */
const NIST_IONIZATION_ENERGIES: Record<number, number> = {
  1: 13.598, 2: 24.587, 3: 5.392, 4: 9.323, 5: 8.298, 6: 11.260, 7: 14.534, 8: 13.618, 9: 17.423, 10: 21.565,
  11: 5.139, 12: 7.646, 13: 5.986, 14: 8.152, 15: 10.487, 16: 10.360, 17: 12.968, 18: 15.760,
  19: 4.341, 20: 6.113, 21: 6.561, 22: 6.828, 23: 6.746, 24: 6.767, 25: 7.434, 26: 7.902, 27: 7.881, 28: 7.640, 29: 7.726, 30: 9.394,
  31: 5.999, 32: 7.899, 33: 9.789, 34: 9.752, 35: 11.814, 36: 14.000,
  47: 7.576, 79: 9.226, 80: 10.438, 92: 6.194,
};

/**
 * Calculates complete Atomic Energy state and energy level ladder for atomic number Z.
 */
export function calculateAtomicEnergyState(atomicNumber: number): AtomicEnergyState {
  const { zEff } = calculateSlaterScreening(atomicNumber);
  const empiricalIonization = NIST_IONIZATION_ENERGIES[atomicNumber] || (13.6 * Math.pow(zEff, 2) / Math.pow(1, 2) * 0.4);

  const config = calculateElectronConfiguration(atomicNumber);
  const groundStateEnergyEv = -empiricalIonization;

  const energyLevels: EnergyLevelState[] = [];
  const maxN = Math.max(config.shellOccupancies.length + 2, 6);

  for (let n = 1; n <= maxN; n++) {
    // Effective energy for level n relative to vacuum continuum (E = 0 eV)
    const levelZeff = n === 1 ? zEff : Math.max(1.0, zEff - (n - 1) * 0.4);
    const energyEv = -13.6 * Math.pow(levelZeff, 2) / Math.pow(n, 2);
    const occ = config.shellOccupancies[n - 1] || 0;

    energyLevels.push({
      n,
      label: `n=${n}`,
      energyEv: parseFloat(energyEv.toFixed(2)),
      ionizationGapEv: parseFloat((0 - energyEv).toFixed(2)),
      isOccupied: occ > 0,
      electronCount: occ,
    });
  }

  return {
    groundStateEnergyEv: parseFloat(groundStateEnergyEv.toFixed(3)),
    firstIonizationEnergyEv: parseFloat(empiricalIonization.toFixed(3)),
    effectiveNuclearChargeZeff: zEff,
    energyLevels,
  };
}
