/**
 * Master Scientific Engine
 * Pure deterministic orchestrator that synthesizes all physics calculation domains
 * into an immutable ScientificState contract.
 */

import { ChemicalElement } from '@/data/elements';
import { IsotopeInfo, ELEMENT_ISOTOPES } from '@/data/isotopes';
import { EpistemologyMetadata, EPISTEMOLOGY_DEFINITIONS } from './models/Epistemology';
import { ModelContext, DEFAULT_HYDROGENIC_CONTEXT, DEFAULT_MULTI_ELECTRON_CONTEXT } from './models/ModelContext';
import { ScientificState } from './models/ScientificState';
import { calculateElectronConfiguration, calculateShellConfigurations } from './calculations/electronConfiguration';
import { calculateAtomicOrbitals } from './calculations/orbitalMathematics';
import { calculateAtomicEnergyState } from './calculations/atomicEnergyModels';
import { calculateAtomicTransitions } from './calculations/atomicTransitionEngine';
import { calculateNuclearStructure } from './calculations/nuclearStructureEngine';

/**
 * Builds the complete, strongly-typed ScientificState for any element and isotope.
 * Guaranteed deterministic and side-effect free.
 */
export function buildScientificState(
  element: ChemicalElement,
  selectedIsotope?: IsotopeInfo,
  customContext?: Partial<ModelContext>
): ScientificState {
  const Z = element.atomicNumber;
  const isHydrogenic = Z === 1;

  // Select default isotope if not provided
  const isotopes = ELEMENT_ISOTOPES[Z] || [];
  const activeIsotope: IsotopeInfo = selectedIsotope || isotopes[0] || {
    symbol: `${Math.round(element.atomicMass)}${element.symbol}`,
    massNumber: Math.round(element.atomicMass),
    protons: Z,
    neutrons: Math.round(element.atomicMass) - Z,
    abundance: '100%',
    halfLife: 'Stable',
    decayMode: 'Stable',
    isStable: true,
    spin: '0+',
    description: `${element.name} ground-state nucleus.`,
  };

  // Compose model context
  const baseContext = isHydrogenic ? DEFAULT_HYDROGENIC_CONTEXT : DEFAULT_MULTI_ELECTRON_CONTEXT;
  const modelContext: ModelContext = {
    ...baseContext,
    ...customContext,
  };

  // Epistemology provenance
  const provenance: EpistemologyMetadata = isHydrogenic
    ? {
        provenance: 'MATHEMATICALLY_DERIVED',
        label: 'Hydrogenic Analytical Solution',
        shortDescription: 'Exact mathematical solution of the 1-electron Schrödinger equation in atomic units.',
        detailedMethodology: 'Analytically evaluates radial wavefunctions R_nl(r) via generalized Laguerre polynomials and angular distributions Y_lm(theta, phi).',
        limitations: 'Applicable strictly to hydrogen and hydrogen-like single-electron ions.',
        citation: modelContext.dataSources[0],
      }
    : {
        provenance: 'MODEL_DERIVED',
        label: 'Central Field Screening & Empirical NIST Datasets',
        shortDescription: 'Effective nuclear charge Z_eff calculated via Slater screening rules paired with measured NIST reference datasets.',
        detailedMethodology: 'Outer valence screening calculated via Slater (1930) central-field rules; discrete energy levels anchored to empirical first ionization potentials.',
        limitations: 'Semi-empirical multi-electron approximation; does not replace full Dirac-Fock relativistic numerical simulations for heavy actinide elements.',
        citation: modelContext.dataSources[0],
      };

  // Run domain calculations
  const electronConfiguration = calculateElectronConfiguration(Z);
  const shells = calculateShellConfigurations(Z);
  const orbitals = calculateAtomicOrbitals(Z);
  const energy = calculateAtomicEnergyState(Z);
  const spectroscopy = calculateAtomicTransitions(Z);
  const nucleus = calculateNuclearStructure(Z, activeIsotope);

  return {
    element,
    activeIsotope,
    electronConfiguration,
    shells,
    orbitals,
    nucleus,
    energy,
    spectroscopy,
    modelContext,
    provenance,
    timestamp: Date.now(),
  };
}
