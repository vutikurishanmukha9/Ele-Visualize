export interface CurriculumModule {
    id: string;
    title: string;
    category: 'General Chemistry' | 'Quantum Mechanics' | 'Organic Chemistry' | 'Thermodynamics' | 'Nuclear Physics';
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    description: string;
    objectives: string[];
    targetMode: 'explore' | 'table' | 'compare' | 'reactions' | 'builder';
    defaultElement?: number;
    compareElements?: [number, number];
    sampleFormula?: string;
    keyConcepts: string[];
}

export const CURRICULUM_MODULES: CurriculumModule[] = [
    {
        id: 'alkali-metals-trend',
        title: 'Alkali Metal Reactivity & Periodic Trends',
        category: 'General Chemistry',
        level: 'Beginner',
        description: 'Explore why Group 1 alkali metals (Li, Na, K, Rb, Cs) become explosively reactive down the column as valence electrons are shielded from the nucleus.',
        objectives: [
            'Observe the increase in atomic radius from Lithium to Cesium',
            'Compare 1st ionization energies across Group 1',
            'Observe single electron valence shell ionization'
        ],
        targetMode: 'table',
        defaultElement: 11, // Sodium
        compareElements: [3, 11], // Li vs Na
        keyConcepts: ['Electron Shielding', 'Effective Nuclear Charge', 'Low Ionization Energy', 'Metallic Bonding']
    },
    {
        id: 'bohr-quantum-states',
        title: 'Bohr Hydrogen Atom & Spectral Emission',
        category: 'Quantum Mechanics',
        level: 'Intermediate',
        description: 'Discover how discrete electron orbital transitions emit specific photon wavelengths in the Balmer and Lyman series matching quantum energy states.',
        objectives: [
            'Inspect photon wavelength emission peaks for Hydrogen and Helium',
            'Compute transition energy E = hc / λ in eV',
            'Relate principal quantum number (n) to shell radii'
        ],
        targetMode: 'explore',
        defaultElement: 1, // Hydrogen
        keyConcepts: ['Rydberg Formula', 'Photon Energy', 'Discrete Energy Levels', 'Continuous vs Emission Spectra']
    },
    {
        id: 'covalent-vs-ionic-bonding',
        title: 'Electronegativity & Pauling Bond Character',
        category: 'General Chemistry',
        level: 'Intermediate',
        description: 'Compare Sodium and Chlorine versus Carbon and Oxygen to calculate electronegativity differences (Δχ) and determine percentage ionic vs covalent character.',
        objectives: [
            'Calculate Pauling Δχ difference between metals and non-metals',
            'Predict dipole vectors and bond polarity',
            'Contrast lattice structure with molecular covalent bonds'
        ],
        targetMode: 'compare',
        compareElements: [11, 17], // Na vs Cl
        keyConcepts: ['Pauling Scale', 'Dipole Moments', 'Polar Covalent', 'Ionic Lattice Energy']
    },
    {
        id: 'arrhenius-kinetics-combustion',
        title: 'Arrhenius Reaction Kinetics & Thermal Activation',
        category: 'Thermodynamics',
        level: 'Advanced',
        description: 'Simulate high-enthalpy hydrogen-oxygen combustion and observe how temperature increases the collision rate multiplier according to the Arrhenius equation.',
        objectives: [
            'Visualize the transition state activated complex on an energy curve',
            'Observe collision rate multiplication at elevated temperatures',
            'Analyze exothermic enthalpy release (ΔH < 0)'
        ],
        targetMode: 'reactions',
        defaultElement: 1,
        sampleFormula: 'H2O',
        keyConcepts: ['Activation Energy (Ea)', 'Arrhenius Equation', 'Enthalpy (ΔH)', 'Spontaneity (ΔG)']
    },
    {
        id: 'vsepr-molecular-geometry',
        title: 'VSEPR Molecular Geometry & Hybridization',
        category: 'Organic Chemistry',
        level: 'Intermediate',
        description: 'Assemble molecules from Water (bent, 104.5°) to Methane (tetrahedral, 109.5°) to Carbon Dioxide (linear, 180°) and observe lone pair repulsion.',
        objectives: [
            'Build 2D structures and resolve 3D spatial electron geometries',
            'Identify steric numbers and electron pair repulsions',
            'Calculate molecular mass and elemental mass percentage breakdown'
        ],
        targetMode: 'builder',
        sampleFormula: 'CH4',
        keyConcepts: ['VSEPR Theory', 'Steric Number', 'Bond Angles', 'Hybridization (sp, sp², sp³)']
    },
    {
        id: 'nuclear-isotopes-fission',
        title: 'Nuclear Stability, Isotopes & Radioactive Decay',
        category: 'Nuclear Physics',
        level: 'Advanced',
        description: 'Compare stable nuclides (Carbon-12, Iron-56) with radioactive isotopes (Carbon-14, Uranium-235) and observe N/Z nuclear stability boundaries.',
        objectives: [
            'Analyze neutron-to-proton ratios (N/Z) and the band of stability',
            'Distinguish alpha (α), beta (β⁻), and gamma (γ) decay mechanisms',
            'Understand nuclear binding energy curve and fissile isotopes'
        ],
        targetMode: 'explore',
        defaultElement: 92, // Uranium
        keyConcepts: ['Neutron-Proton Ratio', 'Radioactive Half-life', 'Nuclear Fission', 'Binding Energy']
    }
];
