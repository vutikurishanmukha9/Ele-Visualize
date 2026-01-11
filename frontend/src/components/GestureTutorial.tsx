import { useState, useEffect } from 'react';
import { X, Hand, ZoomIn, Move, ArrowLeftRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GestureTutorialProps {
    onClose: () => void;
}

export function GestureTutorial({ onClose }: GestureTutorialProps) {
    const [step, setStep] = useState(0);

    const gestures = [
        {
            icon: <Hand className="w-12 h-12" />,
            title: "Open Hand",
            description: "Spread all 5 fingers to rotate the atom",
            emoji: "Open Hand"
        },
        {
            icon: <ZoomIn className="w-12 h-12" />,
            title: "Pinch Zoom",
            description: "Fingers apart = zoom in, together = zoom out",
            emoji: "Pinch"
        },
        {
            icon: <ArrowLeftRight className="w-12 h-12" />,
            title: "Swipe",
            description: "Open hand + fast swipe to change elements",
            emoji: "Swipe"
        },
        {
            icon: <Move className="w-12 h-12" />,
            title: "Fist Freeze",
            description: "Close fist to freeze/hold current rotation",
            emoji: "Fist"
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setStep(s => (s + 1) % gestures.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-card rounded-2xl p-6 max-w-md w-full border border-border/50"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-primary">Gesture Controls</h2>
                    <button onClick={onClose} className="p-1 hover:bg-secondary/50 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="text-center py-6">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="text-6xl mb-4"
                    >
                        {gestures[step].emoji}
                    </motion.div>
                    <h3 className="text-lg font-semibold">{gestures[step].title}</h3>
                    <p className="text-muted-foreground mt-1">{gestures[step].description}</p>
                </div>

                <div className="flex justify-center gap-2 mb-4">
                    {gestures.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setStep(i)}
                            className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-secondary'
                                }`}
                        />
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                    {gestures.map((g, i) => (
                        <div
                            key={i}
                            className={`p-2 rounded flex items-center gap-2 ${i === step ? 'bg-primary/20 text-primary' : 'bg-secondary/30'
                                }`}
                        >
                            <span className="text-lg">{g.emoji}</span>
                            <span>{g.title}</span>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                    Got it!
                </button>
            </motion.div>
        </motion.div>
    );
}
