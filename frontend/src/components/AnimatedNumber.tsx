import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export function AnimatedNumber({ 
    value, 
    format = (v: number) => v.toFixed(2), 
    suffix = '' 
}: { 
    value: number; 
    format?: (v: number) => string; 
    suffix?: string;
}) {
    const spring = useSpring(value, { mass: 1, stiffness: 100, damping: 20 });
    const display = useTransform(spring, (current) => format(current) + suffix);

    useEffect(() => {
        spring.set(value);
    }, [spring, value]);

    return <motion.span>{display}</motion.span>;
}
