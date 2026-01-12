import { memo, useMemo } from 'react';
import { elements, ChemicalElement } from '../data/elements';
import { cn } from '@/lib/utils';

interface PeriodicTableGridProps {
    selectedElement: ChemicalElement | null;
    onSelectElement: (element: ChemicalElement) => void;
    categoryColors: Record<string, string>;
}

// Periodic table layout positions
const LAYOUT: Record<number, [number, number]> = {
    // Period 1
    1: [1, 1], 2: [1, 18],
    // Period 2
    3: [2, 1], 4: [2, 2], 5: [2, 13], 6: [2, 14], 7: [2, 15], 8: [2, 16], 9: [2, 17], 10: [2, 18],
    // Period 3
    11: [3, 1], 12: [3, 2], 13: [3, 13], 14: [3, 14], 15: [3, 15], 16: [3, 16], 17: [3, 17], 18: [3, 18],
    // Period 4
    19: [4, 1], 20: [4, 2], 21: [4, 3], 22: [4, 4], 23: [4, 5], 24: [4, 6], 25: [4, 7], 26: [4, 8],
    27: [4, 9], 28: [4, 10], 29: [4, 11], 30: [4, 12], 31: [4, 13], 32: [4, 14], 33: [4, 15], 34: [4, 16],
    35: [4, 17], 36: [4, 18],
    // Period 5
    37: [5, 1], 38: [5, 2], 39: [5, 3], 40: [5, 4], 41: [5, 5], 42: [5, 6], 43: [5, 7], 44: [5, 8],
    45: [5, 9], 46: [5, 10], 47: [5, 11], 48: [5, 12], 49: [5, 13], 50: [5, 14], 51: [5, 15], 52: [5, 16],
    53: [5, 17], 54: [5, 18],
    // Period 6
    55: [6, 1], 56: [6, 2], 57: [9, 3], // La in lanthanides row
    72: [6, 4], 73: [6, 5], 74: [6, 6], 75: [6, 7], 76: [6, 8], 77: [6, 9], 78: [6, 10],
    79: [6, 11], 80: [6, 12], 81: [6, 13], 82: [6, 14], 83: [6, 15], 84: [6, 16], 85: [6, 17], 86: [6, 18],
    // Period 7
    87: [7, 1], 88: [7, 2], 89: [10, 3], // Ac in actinides row
    104: [7, 4], 105: [7, 5], 106: [7, 6], 107: [7, 7], 108: [7, 8], 109: [7, 9], 110: [7, 10],
    111: [7, 11], 112: [7, 12], 113: [7, 13], 114: [7, 14], 115: [7, 15], 116: [7, 16], 117: [7, 17], 118: [7, 18],
    // Lanthanides (row 9)
    58: [9, 4], 59: [9, 5], 60: [9, 6], 61: [9, 7], 62: [9, 8], 63: [9, 9], 64: [9, 10],
    65: [9, 11], 66: [9, 12], 67: [9, 13], 68: [9, 14], 69: [9, 15], 70: [9, 16], 71: [9, 17],
    // Actinides (row 10)
    90: [10, 4], 91: [10, 5], 92: [10, 6], 93: [10, 7], 94: [10, 8], 95: [10, 9], 96: [10, 10],
    97: [10, 11], 98: [10, 12], 99: [10, 13], 100: [10, 14], 101: [10, 15], 102: [10, 16], 103: [10, 17],
};

const ElementCell = memo(function ElementCell({
    element,
    isSelected,
    color,
    onClick,
}: {
    element: ChemicalElement;
    isSelected: boolean;
    color: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full aspect-square p-0.5 rounded transition-all duration-200 text-white",
                "hover:scale-110 hover:z-10 hover:shadow-lg",
                isSelected && "ring-2 ring-white scale-110 z-10 shadow-xl"
            )}
            style={{ backgroundColor: color }}
            title={`${element.name} (${element.symbol}) - ${element.atomicNumber}`}
        >
            <div className="h-full flex flex-col items-center justify-center">
                <span className="text-[8px] opacity-70">{element.atomicNumber}</span>
                <span className="text-xs font-bold">{element.symbol}</span>
            </div>
        </button>
    );
});

export const PeriodicTableGrid = memo(function PeriodicTableGrid({
    selectedElement,
    onSelectElement,
    categoryColors,
}: PeriodicTableGridProps) {
    const grid = useMemo(() => {
        const cells: (ChemicalElement | null)[][] = Array(11).fill(null).map(() => Array(19).fill(null));

        elements.forEach((element) => {
            const pos = LAYOUT[element.atomicNumber];
            if (pos) {
                cells[pos[0]][pos[1]] = element;
            }
        });

        return cells;
    }, []);

    return (
        <div className="w-full overflow-x-auto p-4">
            <div className="min-w-[800px]">
                {/* Main table */}
                <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(18, minmax(32px, 1fr))' }}>
                    {grid.slice(1, 8).map((row, rowIndex) => (
                        row.slice(1).map((element, colIndex) => (
                            <div key={`${rowIndex}-${colIndex}`} className="aspect-square">
                                {element ? (
                                    <ElementCell
                                        element={element}
                                        isSelected={selectedElement?.atomicNumber === element.atomicNumber}
                                        color={categoryColors[element.category] || '#666'}
                                        onClick={() => onSelectElement(element)}
                                    />
                                ) : (
                                    <div className="w-full h-full" />
                                )}
                            </div>
                        ))
                    ))}
                </div>

                {/* Gap for lanthanides/actinides */}
                <div className="h-4" />

                {/* Lanthanides */}
                <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs text-muted-foreground w-16">La-Lu</span>
                    <div className="flex-1 grid gap-0.5" style={{ gridTemplateColumns: 'repeat(15, minmax(32px, 1fr))' }}>
                        {grid[9].slice(3, 18).map((element, i) => (
                            <div key={`la-${i}`} className="aspect-square">
                                {element ? (
                                    <ElementCell
                                        element={element}
                                        isSelected={selectedElement?.atomicNumber === element.atomicNumber}
                                        color={categoryColors[element.category] || '#666'}
                                        onClick={() => onSelectElement(element)}
                                    />
                                ) : <div />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actinides */}
                <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground w-16">Ac-Lr</span>
                    <div className="flex-1 grid gap-0.5" style={{ gridTemplateColumns: 'repeat(15, minmax(32px, 1fr))' }}>
                        {grid[10].slice(3, 18).map((element, i) => (
                            <div key={`ac-${i}`} className="aspect-square">
                                {element ? (
                                    <ElementCell
                                        element={element}
                                        isSelected={selectedElement?.atomicNumber === element.atomicNumber}
                                        color={categoryColors[element.category] || '#666'}
                                        onClick={() => onSelectElement(element)}
                                    />
                                ) : <div />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                    {Object.entries(categoryColors).slice(0, 10).map(([category, color]) => (
                        <div key={category} className="flex items-center gap-1 text-xs">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                            <span className="text-muted-foreground capitalize">{category.replace('-', ' ')}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});
