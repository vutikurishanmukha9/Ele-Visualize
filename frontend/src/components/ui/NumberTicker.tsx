import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NumberTickerProps {
    value: number;
    direction?: 'up' | 'down';
    className?: string;
    decimalPlaces?: number;
}

export function NumberTicker({
    value,
    className,
    decimalPlaces = 0,
}: NumberTickerProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, {
        damping: 30,
        stiffness: 140,
    });
    const transformed = useTransform(springValue, (latest) =>
        latest.toFixed(decimalPlaces)
    );

    useEffect(() => {
        motionValue.set(value);
    }, [motionValue, value]);

    useEffect(() => {
        const unsubscribe = transformed.on('change', (latest) => {
            if (ref.current) {
                ref.current.textContent = latest;
            }
        });
        return () => unsubscribe();
    }, [transformed]);

    return (
        <span
            ref={ref}
            className={cn("inline-block tabular-nums font-mono", className)}
        >
            {value.toFixed(decimalPlaces)}
        </span>
    );
}
