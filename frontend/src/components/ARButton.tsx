import { useEffect, useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Glasses } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ARButtonProps {
    xrStore: any;
    disabled?: boolean;
}

/**
 * Floating "View in AR" button — only renders on WebXR-capable devices.
 * Calls xrStore.enterAR() to start an immersive-ar session.
 */
export const ARButton = memo(function ARButton({ xrStore, disabled = false }: ARButtonProps) {
    const [arSupported, setArSupported] = useState(false);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        // Feature-detect WebXR AR support
        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-ar').then(supported => {
                setArSupported(supported);
            }).catch(() => setArSupported(false));
        }
    }, []);

    const handleToggleAR = useCallback(async () => {
        if (!xrStore) return;

        try {
            if (isActive) {
                // Exit AR by ending the session
                xrStore.getState()?.session?.end();
                setIsActive(false);
            } else {
                await xrStore.enterAR();
                setIsActive(true);
            }
        } catch (err) {
            console.error('[AR] Failed to toggle AR session:', err);
            setIsActive(false);
        }
    }, [xrStore, isActive]);

    // Only render on AR-capable devices
    if (!arSupported) return null;

    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleAR}
            disabled={disabled}
            className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all",
                "border shadow-lg backdrop-blur-md",
                isActive
                    ? "bg-purple-500/20 border-purple-400/50 text-purple-300 shadow-purple-500/20"
                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20",
                disabled && "opacity-50 cursor-not-allowed"
            )}
            title={isActive ? "Exit AR Mode" : "View in Augmented Reality"}
        >
            <Glasses className={cn("w-5 h-5", isActive && "text-purple-400")} />
            <span className="hidden sm:inline">{isActive ? 'Exit AR' : 'View in AR'}</span>
            <span className="sm:hidden">{isActive ? 'AR' : 'AR'}</span>
            {isActive && (
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            )}
        </motion.button>
    );
});
