/**
 * Chemical Reactions Database
 * Common reactions with balanced equations and animation types
 */

export interface Reaction {
    id: string;
    name: string;
    reactants: string[];      // Element/compound symbols
    products: string[];       // Product symbols
    equation: string;         // Balanced equation with subscripts
    type: 'exothermic' | 'endothermic' | 'neutral';
    animation: 'explosion' | 'glow' | 'freeze' | 'bubble' | 'spark';
    description: string;
    energyChange: number;     // kJ/mol (negative = exothermic)
    color: string;            // Visual effect color
}

export const reactions: Reaction[] = [
    // Alkali metals + Halogens
    {
        id: 'na-cl',
        name: 'Sodium Chloride Formation',
        reactants: ['Na', 'Cl'],
        products: ['NaCl'],
        equation: '2Na + Cl₂ → 2NaCl',
        type: 'exothermic',
        animation: 'explosion',
        description: 'Violent reaction producing table salt with bright yellow flame',
        energyChange: -411,
        color: '#ffaa00'
    },
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
        id: 'fe-o',
        name: 'Iron Oxide (Rust)',
        reactants: ['Fe', 'O'],
        products: ['Fe2O3'],
        equation: '4Fe + 3O₂ → 2Fe₂O₃',
        type: 'exothermic',
        animation: 'glow',
        description: 'Iron slowly oxidizes to form rust',
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
        description: 'Carbon combustion producing carbon dioxide',
        energyChange: -394,
        color: '#ff4400'
    },
    {
        id: 'n-h',
        name: 'Ammonia Synthesis',
        reactants: ['N', 'H'],
        products: ['NH3'],
        equation: 'N₂ + 3H₂ → 2NH₃',
        type: 'exothermic',
        animation: 'glow',
        description: 'Haber process for making ammonia',
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
        name: 'Calcium Oxide (Quickite)',
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
        reactants: ['S', 'O'],
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
        id: 'na-h2o',
        name: 'Sodium + Water',
        reactants: ['Na', 'H', 'O'],
        products: ['NaOH', 'H2'],
        equation: '2Na + 2H₂O → 2NaOH + H₂',
        type: 'exothermic',
        animation: 'explosion',
        description: 'Sodium explodes on contact with water',
        energyChange: -184,
        color: '#ffff00'
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
];

// Find matching reaction for given elements
export function findReaction(elements: string[]): Reaction | null {
    const sorted = [...elements].sort();

    for (const reaction of reactions) {
        const reactantsSorted = [...reaction.reactants].sort();
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
