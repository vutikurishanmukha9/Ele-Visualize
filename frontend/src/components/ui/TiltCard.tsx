import React, { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    cardClassName?: string;
    perspective?: number;
    maxTilt?: number;
    glareOpacity?: number;
}

export function TiltCard({
    children,
    className,
    cardClassName,
    perspective = 1000,
    maxTilt = 10,
    glareOpacity = 0.35,
    ...props
}: TiltCardProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHover, setIsHover] = useState(false);
    const [isTilting, setIsTilting] = useState(false);

    const handlePointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!containerRef.current || e.pointerType === 'touch') return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;

            const rx = (0.5 - y) * (maxTilt * 2);
            const ry = (x - 0.5) * (maxTilt * 2);

            const el = containerRef.current;
            el.style.setProperty('--tilt-rx', `${rx.toFixed(2)}deg`);
            el.style.setProperty('--tilt-ry', `${ry.toFixed(2)}deg`);
            el.style.setProperty('--tilt-gx', `${(x * 100).toFixed(1)}%`);
            el.style.setProperty('--tilt-gy', `${(y * 100).toFixed(1)}%`);

            if (!isTilting) setIsTilting(true);
        },
        [maxTilt, isTilting]
    );

    const handlePointerEnter = useCallback(() => {
        setIsHover(true);
    }, []);

    const handlePointerLeave = useCallback(() => {
        setIsHover(false);
        setIsTilting(false);
        if (containerRef.current) {
            containerRef.current.style.setProperty('--tilt-rx', '0deg');
            containerRef.current.style.setProperty('--tilt-ry', '0deg');
        }
    }, []);

    return (
        <div
            ref={containerRef}
            onPointerEnter={handlePointerEnter}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            className={cn("t-tilt relative select-none", isHover && "is-hover", className)}
            style={{
                perspective: `${perspective}px`,
                ['--tilt-glare-opacity' as string]: glareOpacity,
            }}
            {...props}
        >
            <div
                className={cn(
                    "t-tilt-card transition-all duration-300",
                    isTilting && "is-tilting",
                    cardClassName
                )}
            >
                {children}
                <div className="t-tilt-glare pointer-events-none" />
            </div>
        </div>
    );
}
