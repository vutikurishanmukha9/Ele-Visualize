/**
 * Chemical Reactions Database
 * Reactions with balanced equations and animation types
 */

export interface Reaction {
    id: string;
    name: string;
    reactants: string[];
    products: string[];
    equation: string;
    type: 'exothermic' | 'endothermic' | 'neutral';
    category?: 'Synthesis' | 'Decomposition' | 'Combustion' | 'Redox' | 'Precipitation' | 'Acid-Base' | 'Displacement';
    animation: 'explosion' | 'glow' | 'freeze' | 'bubble' | 'spark';
    description: string;
    energyChange: number; // ΔH in kJ/mol
    enthalpy?: number; // ΔH° in kJ/mol
    entropy?: number; // ΔS° in J/(mol*K)
    activationEnergy?: number; // Ea in kJ/mol
    color: string;
}

export const reactions: Reaction[] = [
    // Single element pairs (most common selections)
    {
        id: 'h-o',
        name: 'Water Formation',
        reactants: ['H', 'O'],
        products: ['H2O'],
        equation: '2H₂ + O₂ → 2H₂O',
        type: 'exothermic',
        animation: 'explosion',
        description: 'Hydrogen and oxygen combine explosively to form water',
        energyChange: -286,
        color: '#ff6600'
    },
    {
        id: 'na-cl',
        name: 'Sodium Chloride (Salt)',
        reactants: ['Na', 'Cl'],
        products: ['NaCl'],
        equation: '2Na + Cl₂ → 2NaCl',
        type: 'exothermic',
        animation: 'explosion',
        description: 'Sodium reacts violently with chlorine to form table salt',
        energyChange: -411,
        color: '#ffaa00'
    },
    {
        id: 'fe-o',
        name: 'Iron Oxide (Rust)',
        reactants: ['Fe', 'O'],
        products: ['Fe2O3'],
        equation: '4Fe + 3O₂ → 2Fe₂O₃',
        type: 'exothermic',
        animation: 'glow',
        description: 'Iron oxidizes to form rust',
        energyChange: -824,
        color: '#aa4400'
    },
    {
        id: 'mg-o',
        name: 'Magnesium Oxide',
        reactants: ['Mg', 'O'],
        products: ['MgO'],
        equation: '2Mg + O₂ → 2MgO',
        type: 'exothermic',
        animation: 'spark',
        description: 'Brilliant white flame as magnesium burns',
        energyChange: -602,
        color: '#ffffff'
    },
    {
        id: 'c-o',
        name: 'Carbon Dioxide',
        reactants: ['C', 'O'],
        products: ['CO2'],
        equation: 'C + O₂ → CO₂',
        type: 'exothermic',
        animation: 'glow',
        description: 'Carbon combustion produces carbon dioxide',
        energyChange: -394,
        color: '#ff4400'
    },
    {
        id: 'n-h',
        name: 'Ammonia Synthesis',
        reactants: ['H', 'N'],
        products: ['NH3'],
        equation: 'N₂ + 3H₂ → 2NH₃',
        type: 'exothermic',
        animation: 'glow',
        description: 'Haber process for making ammonia fertilizer',
        energyChange: -92,
        color: '#66aaff'
    },
    {
        id: 'k-cl',
        name: 'Potassium Chloride',
        reactants: ['K', 'Cl'],
        products: ['KCl'],
        equation: '2K + Cl₂ → 2KCl',
        type: 'exothermic',
        animation: 'explosion',
        description: 'Potassium reacts violently with chlorine',
        energyChange: -437,
        color: '#cc66ff'
    },
    {
        id: 'ca-o',
        name: 'Calcium Oxide (Quicklite)',
        reactants: ['Ca', 'O'],
        products: ['CaO'],
        equation: '2Ca + O₂ → 2CaO',
        type: 'exothermic',
        animation: 'glow',
        description: 'Calcium burns with orange-red flame',
        energyChange: -635,
        color: '#ff6644'
    },
    {
        id: 's-o',
        name: 'Sulfur Dioxide',
        reactants: ['O', 'S'],
        products: ['SO2'],
        equation: 'S + O₂ → SO₂',
        type: 'exothermic',
        animation: 'glow',
        description: 'Sulfur burns with blue flame',
        energyChange: -297,
        color: '#4488ff'
    },
    {
        id: 'al-o',
        name: 'Aluminum Oxide',
        reactants: ['Al', 'O'],
        products: ['Al2O3'],
        equation: '4Al + 3O₂ → 2Al₂O₃',
        type: 'exothermic',
        animation: 'spark',
        description: 'Thermite-like reaction with intense heat',
        energyChange: -1676,
        color: '#ffcc00'
    },
    {
        id: 'cu-s',
        name: 'Copper Sulfide',
        reactants: ['Cu', 'S'],
        products: ['CuS'],
        equation: 'Cu + S → CuS',
        type: 'exothermic',
        animation: 'glow',
        description: 'Copper reacts with sulfur when heated',
        energyChange: -53,
        color: '#228866'
    },
    {
        id: 'cu-o',
        name: 'Copper Oxide',
        reactants: ['Cu', 'O'],
        products: ['CuO'],
        equation: '2Cu + O₂ → 2CuO',
        type: 'exothermic',
        animation: 'glow',
        description: 'Copper oxidizes to form black copper oxide',
        energyChange: -157,
        color: '#ff8844'
    },
    {
        id: 'na-o',
        name: 'Sodium Oxide',
        reactants: ['Na', 'O'],
        products: ['Na2O'],
        equation: '4Na + O₂ → 2Na₂O',
        type: 'exothermic',
        animation: 'explosion',
        description: 'Sodium burns with yellow flame in oxygen',
        energyChange: -416,
        color: '#ffff00'
    },
    {
        id: 'k-o',
        name: 'Potassium Oxide',
        reactants: ['K', 'O'],
        products: ['K2O'],
        equation: '4K + O₂ → 2K₂O',
        type: 'exothermic',
        animation: 'explosion',
        description: 'Potassium burns with lilac flame',
        energyChange: -363,
        color: '#cc66ff'
    },
    {
        id: 'ca-cl',
        name: 'Calcium Chloride',
        reactants: ['Ca', 'Cl'],
        products: ['CaCl2'],
        equation: 'Ca + Cl₂ → CaCl₂',
        type: 'exothermic',
        animation: 'glow',
        description: 'Calcium reacts with chlorine',
        energyChange: -795,
        color: '#ff9966'
    },
    {
        id: 'mg-cl',
        name: 'Magnesium Chloride',
        reactants: ['Cl', 'Mg'],
        products: ['MgCl2'],
        equation: 'Mg + Cl₂ → MgCl₂',
        type: 'exothermic',
        animation: 'spark',
        description: 'Magnesium burns in chlorine',
        energyChange: -641,
        color: '#ffffff'
    },
    {
        id: 'fe-s',
        name: 'Iron Sulfide',
        reactants: ['Fe', 'S'],
        products: ['FeS'],
        equation: 'Fe + S → FeS',
        type: 'exothermic',
        animation: 'glow',
        description: 'Iron combines with sulfur when heated',
        energyChange: -100,
        color: '#aa6600'
    },
    {
        id: 'fe-cl',
        name: 'Iron Chloride',
        reactants: ['Cl', 'Fe'],
        products: ['FeCl3'],
        equation: '2Fe + 3Cl₂ → 2FeCl₃',
        type: 'exothermic',
        animation: 'glow',
        description: 'Iron reacts with chlorine gas',
        energyChange: -399,
        color: '#cc8800'
    },
    {
        id: 'al-cl',
        name: 'Aluminum Chloride',
        reactants: ['Al', 'Cl'],
        products: ['AlCl3'],
        equation: '2Al + 3Cl₂ → 2AlCl₃',
        type: 'exothermic',
        animation: 'spark',
        description: 'Aluminum burns in chlorine',
        energyChange: -704,
        color: '#ffdd00'
    },
    {
        id: 'c-h',
        name: 'Methane Formation',
        reactants: ['C', 'H'],
        products: ['CH4'],
        equation: 'C + 2H₂ → CH₄',
        type: 'exothermic',
        animation: 'glow',
        description: 'Carbon and hydrogen form methane',
        energyChange: -75,
        color: '#66ccff'
    },
    {
        id: 'na-s',
        name: 'Sodium Sulfide',
        reactants: ['Na', 'S'],
        products: ['Na2S'],
        equation: '2Na + S → Na₂S',
        type: 'exothermic',
        animation: 'spark',
        description: 'Sodium reacts with sulfur',
        energyChange: -365,
        color: '#ffcc00'
    },
    {
        id: 'mg-s',
        name: 'Magnesium Sulfide',
        reactants: ['Mg', 'S'],
        products: ['MgS'],
        equation: 'Mg + S → MgS',
        type: 'exothermic',
        animation: 'spark',
        description: 'Magnesium combines with sulfur',
        energyChange: -346,
        color: '#ffffff'
    },
    {
        id: 'ca-s',
        name: 'Calcium Sulfide',
        reactants: ['Ca', 'S'],
        products: ['CaS'],
        equation: 'Ca + S → CaS',
        type: 'exothermic',
        animation: 'glow',
        description: 'Calcium reacts with sulfur',
        energyChange: -473,
        color: '#ff7744'
    },
    {
        id: 'k-s',
        name: 'Potassium Sulfide',
        reactants: ['K', 'S'],
        products: ['K2S'],
        equation: '2K + S → K₂S',
        type: 'exothermic',
        animation: 'spark',
        description: 'Potassium combines with sulfur',
        energyChange: -381,
        color: '#cc66ff'
    },
    {
        id: 'al-s',
        name: 'Aluminum Sulfide',
        reactants: ['Al', 'S'],
        products: ['Al2S3'],
        equation: '2Al + 3S → Al₂S₃',
        type: 'exothermic',
        animation: 'glow',
        description: 'Aluminum reacts with sulfur',
        energyChange: -724,
        color: '#ffcc00'
    },
    {
        id: 'c-s',
        name: 'Carbon Disulfide',
        reactants: ['C', 'S'],
        products: ['CS2'],
        equation: 'C + 2S → CS₂',
        type: 'endothermic',
        animation: 'glow',
        description: 'Carbon and sulfur form carbon disulfide',
        energyChange: 89,
        color: '#6688ff'
    },
    {
        id: 'n-o',
        name: 'Nitrogen Dioxide',
        reactants: ['N', 'O'],
        products: ['NO2'],
        equation: 'N₂ + 2O₂ → 2NO₂',
        type: 'endothermic',
        animation: 'glow',
        description: 'Nitrogen combines with oxygen at high temperatures',
        energyChange: 33,
        color: '#aa4400'
    },
    {
        id: 'c-n',
        name: 'Cyanogen',
        reactants: ['C', 'N'],
        products: ['C2N2'],
        equation: '2C + N₂ → C₂N₂',
        type: 'endothermic',
        animation: 'glow',
        description: 'Carbon and nitrogen form cyanogen',
        energyChange: 309,
        color: '#8866ff'
    },
    {
        id: 'h-cl',
        name: 'Hydrogen Chloride (Acid Gas)',
        reactants: ['Cl', 'H'],
        products: ['HCl'],
        equation: 'H₂ + Cl₂ → 2HCl',
        type: 'exothermic',
        category: 'Synthesis',
        animation: 'explosion',
        description: 'Violent photo-initiated synthesis of hydrogen chloride gas',
        energyChange: -92.3,
        enthalpy: -92.3,
        entropy: -14.2,
        color: '#10b981'
    },
    {
        id: 'h-s',
        name: 'Hydrogen Sulfide',
        reactants: ['H', 'S'],
        products: ['H2S'],
        equation: 'H₂ + S → H₂S',
        type: 'exothermic',
        category: 'Synthesis',
        animation: 'glow',
        description: 'Hydrogen reacts with molten sulfur to produce pungent hydrogen sulfide',
        energyChange: -20.6,
        enthalpy: -20.6,
        entropy: 43.1,
        color: '#eab308'
    },
    {
        id: 'cu-cl',
        name: 'Copper(II) Chloride',
        reactants: ['Cl', 'Cu'],
        products: ['CuCl2'],
        equation: 'Cu + Cl₂ → CuCl₂',
        type: 'exothermic',
        category: 'Synthesis',
        animation: 'glow',
        description: 'Hot copper wire burns in chlorine gas with vivid blue-green flame',
        energyChange: -220.1,
        enthalpy: -220.1,
        entropy: -110.5,
        color: '#06b6d4'
    },
    {
        id: 'na-h',
        name: 'Sodium Hydride',
        reactants: ['H', 'Na'],
        products: ['NaH'],
        equation: '2Na + H₂ → 2NaH',
        type: 'exothermic',
        category: 'Synthesis',
        animation: 'spark',
        description: 'Sodium metal absorbs pure hydrogen gas at 300°C forming ionic sodium hydride',
        energyChange: -56.3,
        enthalpy: -56.3,
        entropy: -76.8,
        color: '#eab308'
    },
    {
        id: 'ca-h',
        name: 'Calcium Hydride (Hydrolith)',
        reactants: ['Ca', 'H'],
        products: ['CaH2'],
        equation: 'Ca + H₂ → CaH₂',
        type: 'exothermic',
        category: 'Synthesis',
        animation: 'spark',
        description: 'Calcium reacts directly with hydrogen gas at 400°C to form powerful desiccant calcium hydride',
        energyChange: -186.2,
        enthalpy: -186.2,
        entropy: -130.4,
        color: '#f59e0b'
    },
    {
        id: 'thermite',
        name: 'Thermite Redox Reaction',
        reactants: ['Al', 'Fe', 'O'],
        products: ['Al2O3', 'Fe'],
        equation: '2Al + Fe₂O₃ → Al₂O₃ + 2Fe',
        type: 'exothermic',
        category: 'Redox',
        animation: 'spark',
        description: 'Legendary exothermic thermite reaction producing molten elemental iron at 2500°C',
        energyChange: -851.5,
        enthalpy: -851.5,
        entropy: -37.6,
        color: '#f97316'
    },
    {
        id: 'combustion-hydrocarbon',
        name: 'Hydrocarbon Complete Combustion',
        reactants: ['C', 'H', 'O'],
        products: ['CO2', 'H2O'],
        equation: 'CH₄ + 2O₂ → CO₂ + 2H₂O',
        type: 'exothermic',
        category: 'Combustion',
        animation: 'explosion',
        description: 'Methane combustion with oxygen releasing carbon dioxide and water vapor',
        energyChange: -891.0,
        enthalpy: -891.0,
        entropy: -242.8,
        color: '#ef4444'
    },
    {
        id: 'limestone-calcite',
        name: 'Calcium Carbonate Formation',
        reactants: ['C', 'Ca', 'O'],
        products: ['CaCO3'],
        equation: 'CaO + CO₂ → CaCO₃',
        type: 'exothermic',
        category: 'Synthesis',
        animation: 'glow',
        description: 'Quicklime absorbs atmospheric carbon dioxide to crystallize mineral calcite limestone',
        energyChange: -178.3,
        enthalpy: -178.3,
        entropy: -160.5,
        color: '#cbd5e1'
    },
    {
        id: 'nitric-acid-precursor',
        name: 'Nitric Acid Precursor Complex',
        reactants: ['H', 'N', 'O'],
        products: ['HNO3'],
        equation: '3NO₂ + H₂O → 2HNO₃ + NO',
        type: 'exothermic',
        category: 'Synthesis',
        animation: 'glow',
        description: 'Ostwald process industrial synthesis route to concentrated nitric acid',
        energyChange: -136.8,
        enthalpy: -136.8,
        entropy: -287.0,
        color: '#8b5cf6'
    },
    {
        id: 'sulfuric-acid-precursor',
        name: 'Sulfuric Acid Anhydride Hydration',
        reactants: ['H', 'O', 'S'],
        products: ['H2SO4'],
        equation: 'SO₃ + H₂O → H₂SO₄',
        type: 'exothermic',
        category: 'Synthesis',
        animation: 'spark',
        description: 'Hydration of sulfur trioxide in the industrial Contact Process forming dense sulfuric acid',
        energyChange: -132.5,
        enthalpy: -132.5,
        entropy: -189.4,
        color: '#eab308'
    },
];

// Find matching reaction for given elements
export function findReaction(selectedElements: string[]): Reaction | null {
    if (selectedElements.length < 2) return null;

    const sorted = [...selectedElements].sort();

    for (const reaction of reactions) {
        const reactantsSorted = [...reaction.reactants].sort();
        // Check if arrays match
        if (sorted.length === reactantsSorted.length &&
            sorted.every((el, i) => el === reactantsSorted[i])) {
            return reaction;
        }
    }
    return null;
}

// Get all unique elements involved in reactions
export function getReactiveElements(): string[] {
    const set = new Set<string>();
    reactions.forEach(r => r.reactants.forEach(el => set.add(el)));
    return Array.from(set).sort();
}

// Calculate Gibbs Free Energy ΔG = ΔH - T*ΔS
export function calculateGibbsFreeEnergy(reaction: Reaction, tempK: number): {
    deltaH: number;
    deltaS: number;
    deltaG: number;
    isSpontaneous: boolean;
    equilibriumConstant: number;
    rateMultiplier: number;
} {
    const deltaH = reaction.enthalpy ?? reaction.energyChange; // kJ/mol
    // Estimated standard entropy change if not specified
    const deltaS = reaction.entropy ?? (reaction.reactants.length > reaction.products.length ? -89.4 : 45.2); // J/(mol*K)
    const deltaG = deltaH - (tempK * deltaS) / 1000; // kJ/mol
    const isSpontaneous = deltaG < 0;

    // Equilibrium constant K = exp(-ΔG° / RT)
    const R = 8.314e-3; // kJ/(mol*K)
    const exponent = -deltaG / (R * tempK);
    const equilibriumConstant = Math.min(Math.max(Math.exp(Math.min(exponent, 50)), 1e-20), 1e20);

    // Arrhenius rate multiplier relative to 298K
    const Ea = reaction.activationEnergy ?? (Math.abs(deltaH) * 0.25 + 30);
    const k = Math.exp(-Ea / (R * tempK));
    const k298 = Math.exp(-Ea / (R * 298));
    const rateMultiplier = k / k298;

    return {
        deltaH,
        deltaS,
        deltaG,
        isSpontaneous,
        equilibriumConstant,
        rateMultiplier,
    };
}

// Compute root mean square velocity for collision chamber: v_rms = sqrt(3RT / M)
export function calculateMolecularVelocity(molarMassGramsPerMol: number, tempK: number): number {
    const R = 8.314; // J/(mol*K)
    const molarMassKg = Math.max(molarMassGramsPerMol, 1) / 1000;
    return Math.round(Math.sqrt((3 * R * tempK) / molarMassKg));
}

