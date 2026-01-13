import { memo, useMemo } from 'react';
import { ChemicalElement } from '../data/elements';
import { elementProperties } from '../data/elementProperties';
import { X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonModeProps {
    element1: ChemicalElement | null;
    element2: ChemicalElement | null;
    onRemoveElement: (slot: 1 | 2) => void;
    categoryColors: Record<string, string>;
}

const PropertyBar = memo(function PropertyBar({
    label,
    value1,
    value2,
    max,
    unit = '',
    higherIsBetter = true,
}: {
    label: string;
    value1: number | null;
    value2: number | null;
    max: number;
    unit?: string;
    higherIsBetter?: boolean;
}) {
    const percent1 = value1 ? Math.min((value1 / max) * 100, 100) : 0;
    const percent2 = value2 ? Math.min((value2 / max) * 100, 100) : 0;

    const winner = value1 && value2
        ? (higherIsBetter ? (value1 > value2 ? 1 : value2 > value1 ? 2 : 0) : (value1 < value2 ? 1 : value2 < value1 ? 2 : 0))
        : 0;

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{label}</span>
            </div>
            <div className="flex gap-2 items-center">
                {/* Element 1 bar (reversed) */}
                <div className="flex-1 h-4 bg-secondary/30 rounded overflow-hidden flex justify-end">
                    <div
                        className={cn(
                            "h-full transition-all duration-500",
                            winner === 1 ? "bg-green-500" : "bg-blue-500"
                        )}
                        style={{ width: `${percent1}%` }}
                    />
                </div>
                <div className="w-20 text-center text-xs">
                    <span className={winner === 1 ? "text-green-400 font-bold" : ""}>
                        {value1 ?? '-'}{unit}
                    </span>
                    <span className="text-muted-foreground mx-1">vs</span>
                    <span className={winner === 2 ? "text-green-400 font-bold" : ""}>
                        {value2 ?? '-'}{unit}
                    </span>
                </div>
                {/* Element 2 bar */}
                <div className="flex-1 h-4 bg-secondary/30 rounded overflow-hidden">
                    <div
                        className={cn(
                            "h-full transition-all duration-500",
                            winner === 2 ? "bg-green-500" : "bg-orange-500"
                        )}
                        style={{ width: `${percent2}%` }}
                    />
                </div>
            </div>
        </div>
    );
});

const ElementCard = memo(function ElementCard({
    element,
    slot,
    color,
    onRemove,
}: {
    element: ChemicalElement | null;
    slot: 1 | 2;
    color: string;
    onRemove: () => void;
}) {
    if (!element) {
        return (
            <div className="flex-1 border-2 border-dashed border-border/50 rounded-xl p-6 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <div className="text-4xl mb-2">?</div>
                    <div className="text-sm">Select element {slot}</div>
                    <div className="text-xs">from the sidebar</div>
                </div>
            </div>
        );
    }

    const props = elementProperties[element.atomicNumber];

    return (
        <div
            className="flex-1 rounded-xl p-4 relative"
            style={{ backgroundColor: `${color}20`, borderColor: color, borderWidth: 2 }}
        >
            <button
                onClick={onRemove}
                className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-4">
                <div
                    className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl font-bold mb-2"
                    style={{ backgroundColor: color }}
                >
                    {element.symbol}
                </div>
                <div className="font-semibold">{element.name}</div>
                <div className="text-xs text-muted-foreground">#{element.atomicNumber}</div>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Mass</span>
                    <span>{element.atomicMass.toFixed(2)} u</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="capitalize">{element.category}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Shells</span>
                    <span>{element.shells.join('-')}</span>
                </div>
                {props && (
                    <>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">State</span>
                            <span className="capitalize">{props.state}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Melting</span>
                            <span>{props.meltingPoint ?? '-'} K</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Boiling</span>
                            <span>{props.boilingPoint ?? '-'} K</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});

export const ComparisonMode = memo(function ComparisonMode({
    element1,
    element2,
    onRemoveElement,
    categoryColors,
}: ComparisonModeProps) {
    const props1 = element1 ? elementProperties[element1.atomicNumber] : null;
    const props2 = element2 ? elementProperties[element2.atomicNumber] : null;

    const comparisons = useMemo(() => {
        if (!element1 || !element2) return [];

        return [
            { label: 'Atomic Number', value1: element1.atomicNumber, value2: element2.atomicNumber, max: 118 },
            { label: 'Atomic Mass', value1: element1.atomicMass, value2: element2.atomicMass, max: 300, unit: ' u' },
            { label: 'Electron Shells', value1: element1.shells.length, value2: element2.shells.length, max: 7 },
            { label: 'Melting Point', value1: props1?.meltingPoint ?? null, value2: props2?.meltingPoint ?? null, max: 4000, unit: ' K' },
            { label: 'Boiling Point', value1: props1?.boilingPoint ?? null, value2: props2?.boilingPoint ?? null, max: 6000, unit: ' K' },
            { label: 'Density', value1: props1?.density ?? null, value2: props2?.density ?? null, max: 25, unit: ' g/cm³' },
        ];
    }, [element1, element2, props1, props2]);

    return (
        <div className="h-full flex flex-col p-2 sm:p-4 pt-14 sm:pt-4 overflow-auto">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-center">Element Comparison</h2>

            {/* Element Cards - stack on mobile */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                <ElementCard
                    element={element1}
                    slot={1}
                    color={element1 ? categoryColors[element1.category] || '#666' : '#666'}
                    onRemove={() => onRemoveElement(1)}
                />
                <div className="hidden sm:flex items-center">
                    <ArrowRight className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="sm:hidden flex justify-center">
                    <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
                </div>
                <ElementCard
                    element={element2}
                    slot={2}
                    color={element2 ? categoryColors[element2.category] || '#666' : '#666'}
                    onRemove={() => onRemoveElement(2)}
                />
            </div>

            {/* Comparison Bars */}
            {element1 && element2 && (
                <div className="space-y-4 bg-card/50 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-center mb-4">Property Comparison</h3>
                    {comparisons.map((comp, i) => (
                        <PropertyBar
                            key={i}
                            label={comp.label}
                            value1={comp.value1}
                            value2={comp.value2}
                            max={comp.max}
                            unit={comp.unit || ''}
                        />
                    ))}
                </div>
            )}

            {!element1 && !element2 && (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Select two elements from the sidebar to compare
                </div>
            )}
        </div>
    );
});
