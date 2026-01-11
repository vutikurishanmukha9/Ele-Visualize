// Molecule data with 3D positions and bonds
export interface Atom {
    element: string;
    symbol: string;
    color: string;
    position: [number, number, number];
    radius: number;
}

export interface Bond {
    from: number; // Index of atom
    to: number;   // Index of atom
    order: 1 | 2 | 3; // Single, double, triple bond
}

export interface Molecule {
    name: string;
    formula: string;
    description: string;
    atoms: Atom[];
    bonds: Bond[];
}

// Common molecules with accurate 3D geometry
export const molecules: Molecule[] = [
    {
        name: "Water",
        formula: "H₂O",
        description: "Essential for life. Bent molecular geometry (104.5°)",
        atoms: [
            { element: "Oxygen", symbol: "O", color: "#ff4444", position: [0, 0, 0], radius: 0.6 },
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [-0.95, 0.55, 0], radius: 0.35 },
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [0.95, 0.55, 0], radius: 0.35 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
        ]
    },
    {
        name: "Carbon Dioxide",
        formula: "CO₂",
        description: "Greenhouse gas. Linear molecular geometry (180°)",
        atoms: [
            { element: "Carbon", symbol: "C", color: "#444444", position: [0, 0, 0], radius: 0.5 },
            { element: "Oxygen", symbol: "O", color: "#ff4444", position: [-1.2, 0, 0], radius: 0.6 },
            { element: "Oxygen", symbol: "O", color: "#ff4444", position: [1.2, 0, 0], radius: 0.6 },
        ],
        bonds: [
            { from: 0, to: 1, order: 2 },
            { from: 0, to: 2, order: 2 },
        ]
    },
    {
        name: "Methane",
        formula: "CH₄",
        description: "Natural gas. Tetrahedral geometry (109.5°)",
        atoms: [
            { element: "Carbon", symbol: "C", color: "#444444", position: [0, 0, 0], radius: 0.5 },
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [0.63, 0.63, 0.63], radius: 0.35 },
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [-0.63, -0.63, 0.63], radius: 0.35 },
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [-0.63, 0.63, -0.63], radius: 0.35 },
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [0.63, -0.63, -0.63], radius: 0.35 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
            { from: 0, to: 4, order: 1 },
        ]
    },
    {
        name: "Ammonia",
        formula: "NH₃",
        description: "Pungent smell. Trigonal pyramidal geometry (107°)",
        atoms: [
            { element: "Nitrogen", symbol: "N", color: "#3355ff", position: [0, 0, 0], radius: 0.55 },
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [0.94, 0.33, 0], radius: 0.35 },
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [-0.47, 0.33, 0.81], radius: 0.35 },
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [-0.47, 0.33, -0.81], radius: 0.35 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
        ]
    },
    {
        name: "Oxygen Gas",
        formula: "O₂",
        description: "Essential for respiration. Double bond",
        atoms: [
            { element: "Oxygen", symbol: "O", color: "#ff4444", position: [-0.6, 0, 0], radius: 0.6 },
            { element: "Oxygen", symbol: "O", color: "#ff4444", position: [0.6, 0, 0], radius: 0.6 },
        ],
        bonds: [
            { from: 0, to: 1, order: 2 },
        ]
    },
    {
        name: "Nitrogen Gas",
        formula: "N₂",
        description: "78% of atmosphere. Triple bond",
        atoms: [
            { element: "Nitrogen", symbol: "N", color: "#3355ff", position: [-0.55, 0, 0], radius: 0.55 },
            { element: "Nitrogen", symbol: "N", color: "#3355ff", position: [0.55, 0, 0], radius: 0.55 },
        ],
        bonds: [
            { from: 0, to: 1, order: 3 },
        ]
    },
    {
        name: "Hydrogen Chloride",
        formula: "HCl",
        description: "Forms hydrochloric acid in water",
        atoms: [
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [-0.65, 0, 0], radius: 0.35 },
            { element: "Chlorine", symbol: "Cl", color: "#33ff33", position: [0.65, 0, 0], radius: 0.7 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1 },
        ]
    },
    {
        name: "Ethane",
        formula: "C₂H₆",
        description: "Simple hydrocarbon. Single C-C bond",
        atoms: [
            { element: "Carbon", symbol: "C", color: "#444444", position: [-0.77, 0, 0], radius: 0.5 },
            { element: "Carbon", symbol: "C", color: "#444444", position: [0.77, 0, 0], radius: 0.5 },
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [-1.2, 0.9, 0.52], radius: 0.3 },
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [-1.2, -0.9, 0.52], radius: 0.3 },
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [-1.2, 0, -1.04], radius: 0.3 },
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [1.2, 0.9, -0.52], radius: 0.3 },
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [1.2, -0.9, -0.52], radius: 0.3 },
            { element: "Hydrogen", symbol: "H", color: "#ffffff", position: [1.2, 0, 1.04], radius: 0.3 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
            { from: 0, to: 4, order: 1 },
            { from: 1, to: 5, order: 1 },
            { from: 1, to: 6, order: 1 },
            { from: 1, to: 7, order: 1 },
        ]
    },
    {
        name: "Carbon Monoxide",
        formula: "CO",
        description: "Toxic gas. Triple bond",
        atoms: [
            { element: "Carbon", symbol: "C", color: "#444444", position: [-0.56, 0, 0], radius: 0.5 },
            { element: "Oxygen", symbol: "O", color: "#ff4444", position: [0.56, 0, 0], radius: 0.6 },
        ],
        bonds: [
            { from: 0, to: 1, order: 3 },
        ]
    },
    {
        name: "Sodium Chloride",
        formula: "NaCl",
        description: "Table salt. Ionic bond",
        atoms: [
            { element: "Sodium", symbol: "Na", color: "#9933ff", position: [-0.95, 0, 0], radius: 0.7 },
            { element: "Chlorine", symbol: "Cl", color: "#33ff33", position: [0.95, 0, 0], radius: 0.7 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1 },
        ]
    },
];

export const getMoleculeByFormula = (formula: string): Molecule | undefined => {
    return molecules.find(m => m.formula === formula);
};
