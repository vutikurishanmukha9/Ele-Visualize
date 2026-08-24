export interface IsotopeInfo {
    symbol: string;
    massNumber: number;
    protons: number;
    neutrons: number;
    abundance: string;
    halfLife: string;
    decayMode: 'Stable' | 'Alpha (α)' | 'Beta Minus (β⁻)' | 'Beta Plus (β⁺)' | 'Electron Capture' | 'Spontaneous Fission';
    isStable: boolean;
    spin: string;
    description: string;
}

export const ELEMENT_ISOTOPES: Record<number, IsotopeInfo[]> = {
    // 1: Hydrogen
    1: [
        { symbol: '¹H', massNumber: 1, protons: 1, neutrons: 0, abundance: '99.988%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '1/2+', description: 'Protium: The most abundant isotope of hydrogen in the universe.' },
        { symbol: '²H', massNumber: 2, protons: 1, neutrons: 1, abundance: '0.012%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '1+', description: 'Deuterium (Heavy Hydrogen): Key component of heavy water moderator in nuclear reactors.' },
        { symbol: '³H', massNumber: 3, protons: 1, neutrons: 2, abundance: 'Trace', halfLife: '12.32 years', decayMode: 'Beta Minus (β⁻)', isStable: false, spin: '1/2+', description: 'Tritium: Radioactive isotope used in fusion energy research and self-luminous dials.' },
    ],
    // 2: Helium
    2: [
        { symbol: '³He', massNumber: 3, protons: 2, neutrons: 1, abundance: '0.00014%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '1/2+', description: 'Helium-3: Rare isotope prized for clean fusion fuel and low-temperature dilution refrigerators.' },
        { symbol: '⁴He', massNumber: 4, protons: 2, neutrons: 2, abundance: '99.999%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '0+', description: 'Helium-4: Extremely stable doubly magic nucleus ($Z=2, N=2$), identical to alpha particles.' },
    ],
    // 6: Carbon
    6: [
        { symbol: '¹²C', massNumber: 12, protons: 6, neutrons: 6, abundance: '98.93%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '0+', description: 'Carbon-12: The standard reference isotope for atomic mass units ($12\\text{ u}$).' },
        { symbol: '¹³C', massNumber: 13, protons: 6, neutrons: 7, abundance: '1.07%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '1/2-', description: 'Carbon-13: Essential NMR active spin-1/2 nucleus for structural organic chemistry.' },
        { symbol: '¹⁴C', massNumber: 14, protons: 6, neutrons: 8, abundance: '1 ppt', halfLife: '5,730 years', decayMode: 'Beta Minus (β⁻)', isStable: false, spin: '0+', description: 'Carbon-14: Formed in upper atmosphere by cosmic rays; gold standard for radiocarbon dating.' },
    ],
    // 7: Nitrogen
    7: [
        { symbol: '¹⁴N', massNumber: 14, protons: 7, neutrons: 7, abundance: '99.63%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '1+', description: 'Nitrogen-14: Primary constituent of Earth atmosphere.' },
        { symbol: '¹⁵N', massNumber: 15, protons: 7, neutrons: 8, abundance: '0.37%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '1/2-', description: 'Nitrogen-15: Used as stable isotopic tracer in agricultural and metabolic studies.' },
    ],
    // 8: Oxygen
    8: [
        { symbol: '¹⁶O', massNumber: 16, protons: 8, neutrons: 8, abundance: '99.76%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '0+', description: 'Oxygen-16: Doubly magic nucleus ($Z=8, N=8$), major product of stellar helium fusion.' },
        { symbol: '¹⁷O', massNumber: 17, protons: 8, neutrons: 9, abundance: '0.04%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '5/2+', description: 'Oxygen-17: Rare isotope used in biochemical magnetic resonance.' },
        { symbol: '¹⁸O', massNumber: 18, protons: 8, neutrons: 10, abundance: '0.20%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '0+', description: 'Oxygen-18: Precursor for fluorine-18 production in PET imaging and paleoclimate temperature proxy.' },
    ],
    // 11: Sodium
    11: [
        { symbol: '²³Na', massNumber: 23, protons: 11, neutrons: 12, abundance: '100%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '3/2+', description: 'Sodium-23: Monoisotopic alkali metal.' },
        { symbol: '²⁴Na', massNumber: 24, protons: 11, neutrons: 13, abundance: 'Synthetic', halfLife: '14.96 hours', decayMode: 'Beta Minus (β⁻)', isStable: false, spin: '4+', description: 'Sodium-24: Radiotracer used in medical electrolyte circulation studies.' },
    ],
    // 17: Chlorine
    17: [
        { symbol: '³⁵Cl', massNumber: 35, protons: 17, neutrons: 18, abundance: '75.76%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '3/2+', description: 'Chlorine-35: Dominant chlorine isotope.' },
        { symbol: '³⁷Cl', massNumber: 37, protons: 17, neutrons: 20, abundance: '24.24%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '3/2+', description: 'Chlorine-37: Secondary stable isotope producing characteristic 3:1 mass spectrometry doublet.' },
    ],
    // 26: Iron
    26: [
        { symbol: '⁵⁴Fe', massNumber: 54, protons: 26, neutrons: 28, abundance: '5.85%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '0+', description: 'Iron-54: Naturally occurring stable isotope with magic neutron count $N=28$.' },
        { symbol: '⁵⁶Fe', massNumber: 56, protons: 26, neutrons: 30, abundance: '91.75%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '0+', description: 'Iron-56: Lowest mass per nucleon of all nuclides; the terminal endpoint of stellar nucleosynthesis.' },
        { symbol: '⁵⁷Fe', massNumber: 57, protons: 26, neutrons: 31, abundance: '2.12%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '1/2-', description: 'Iron-57: Hallmark resonant nucleus for Mössbauer spectroscopy.' },
    ],
    // 79: Gold
    79: [
        { symbol: '¹⁹⁷Au', massNumber: 197, protons: 79, neutrons: 118, abundance: '100%', halfLife: 'Stable', decayMode: 'Stable', isStable: true, spin: '3/2+', description: 'Gold-197: Monoisotopic noble metal; used by Rutherford in alpha scattering gold foil experiment.' },
        { symbol: '¹⁹⁸Au', massNumber: 198, protons: 79, neutrons: 119, abundance: 'Synthetic', halfLife: '2.69 days', decayMode: 'Beta Minus (β⁻)', isStable: false, spin: '2-', description: 'Gold-198: Beta emitter utilized in targeted cancer radiotherapy.' },
    ],
    // 92: Uranium
    92: [
        { symbol: '²³⁵U', massNumber: 235, protons: 92, neutrons: 143, abundance: '0.72%', halfLife: '703.8 million yrs', decayMode: 'Alpha (α)', isStable: false, spin: '7/2-', description: 'Uranium-235: The only naturally occurring fissile isotope; splits upon thermal neutron capture.' },
        { symbol: '²³⁸U', massNumber: 238, protons: 92, neutrons: 146, abundance: '99.27%', halfLife: '4.468 billion yrs', decayMode: 'Alpha (α)', isStable: false, spin: '0+', description: 'Uranium-238: Fertile primordial actinide with half-life comparable to age of Earth; breeds Plutonium-239.' },
    ],
};

export function getIsotopesForElement(atomicNumber: number): IsotopeInfo[] {
    if (ELEMENT_ISOTOPES[atomicNumber]) {
        return ELEMENT_ISOTOPES[atomicNumber];
    }
    // Generic fallback for elements without explicit isotope list
    const mass = Math.round(atomicNumber * 2.15);
    return [
        {
            symbol: `A=${mass}`,
            massNumber: mass,
            protons: atomicNumber,
            neutrons: mass - atomicNumber,
            abundance: '100%',
            halfLife: 'Stable',
            decayMode: 'Stable',
            isStable: true,
            spin: '0+',
            description: `Primary stable nuclide for atomic number ${atomicNumber}.`,
        }
    ];
}
