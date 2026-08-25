import React from 'react';
import { cn } from '@/lib/utils';

interface ShimmerTextProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
    className?: string;
    shimmerColor?: string;
    duration?: string;
}

export function ShimmerText({
    children,
    className,
    shimmerColor = 'rgba(22, 168, 117, 0.4)',
    duration = '3.5s',
    ...props
}: ShimmerTextProps) {
    return (
        <span
            className={cn("t-shimmer-text inline-block relative font-bold", className)}
            style={{
                ['--shimmer-color' as string]: shimmerColor,
                ['--shimmer-duration' as string]: duration,
            }}
            {...props}
        >
            {children}
        </span>
    );
}
