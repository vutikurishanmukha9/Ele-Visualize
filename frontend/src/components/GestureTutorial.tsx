import { useState, useEffect } from 'react';
import { X, Hand, ZoomIn, Move, ArrowLeftRight, Sparkles, Compass, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GestureTutorialProps {
  onClose: () => void;
}

export function GestureTutorial({ onClose }: GestureTutorialProps) {
  const [step, setStep] = useState(0);

  const gestures = [
    {
      icon: <Hand className="w-10 h-10 text-cyan-400" />,
      title: 'Open Palm (3D Orbit)',
      description: 'Face open palm toward camera and move hand to smoothly steer and rotate the 3D atom or molecule in real-time.',
      emoji: '🖐️',
      color: '#00f0ff',
      tip: 'Move hand left/right and up/down to orbit 360°',
    },
    {
      icon: <ZoomIn className="w-10 h-10 text-amber-400" />,
      title: 'Pinch Zoom & Grab',
      description: 'Pinch Thumb and Index finger. Spread fingers apart to zoom IN, bring fingers closer to zoom OUT.',
      emoji: '🤏',
      color: '#f59e0b',
      tip: 'Adaptive One-Euro filter ensures silky continuous zoom',
    },
    {
      icon: <Move className="w-10 h-10 text-red-400" />,
      title: 'Fist Lock / Freeze',
      description: 'Curl all fingers into a fist to instantly lock and freeze the 3D orientation in space.',
      emoji: '✊',
      color: '#ef4444',
      tip: 'Release into open palm to resume steering',
    },
    {
      icon: <Compass className="w-10 h-10 text-purple-400" />,
      title: 'Laser Pointer Ray',
      description: 'Extend only your Index finger to project a precision holographic laser pointer for targeting nucleus and shells.',
      emoji: '☝️',
      color: '#8b5cf6',
      tip: 'Aim at the 3D canvas to target components',
    },
    {
      icon: <Sparkles className="w-10 h-10 text-emerald-400" />,
      title: 'Victory (Orbitals Toggle)',
      description: 'Show a Peace / Victory sign (Index + Middle extended) to toggle quantum probability clouds.',
      emoji: '✌️',
      color: '#10b981',
      tip: 'Instantly switches volumetric s, p, d orbital clouds',
    },
    {
      icon: <ArrowLeftRight className="w-10 h-10 text-blue-400" />,
      title: 'Kinetic Swipe',
      description: 'Make a fast horizontal swipe across the camera frame to navigate to the previous or next element.',
      emoji: '💨',
      color: '#3b82f6',
      tip: 'Swipe Right for Next, Swipe Left for Previous',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % gestures.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [gestures.length]);

  const activeGesture = gestures[step];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-slate-950 rounded-2xl p-6 max-w-md w-full border border-white/15 shadow-2xl overflow-hidden relative"
        style={{
          boxShadow: `0 0 35px ${activeGesture.color}25`,
          borderColor: `${activeGesture.color}40`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">Vision Gesture Guide</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Featured Step Carousel */}
        <div className="text-center py-4 relative min-h-[190px] flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center"
            >
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-3 text-4xl shadow-glow"
                style={{
                  backgroundColor: `${activeGesture.color}18`,
                  borderColor: `${activeGesture.color}55`,
                  borderWidth: 2,
                }}
              >
                {activeGesture.emoji}
              </div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2" style={{ color: activeGesture.color }}>
                {activeGesture.title}
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">{activeGesture.description}</p>
              <div className="mt-2 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-slate-400">
                Tip: {activeGesture.tip}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2 mb-4">
          {gestures.map((g, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                backgroundColor: i === step ? g.color : 'rgba(255,255,255,0.2)',
                transform: i === step ? 'scale(1.4)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Gesture Grid Quick Select */}
        <div className="grid grid-cols-3 gap-1.5 text-xs pt-2 border-t border-white/10">
          {gestures.map((g, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="p-2 rounded-xl flex flex-col items-center gap-1 transition-all border text-center"
              style={{
                backgroundColor: i === step ? `${g.color}20` : 'rgba(255,255,255,0.03)',
                borderColor: i === step ? g.color : 'transparent',
              }}
            >
              <span className="text-xl">{g.emoji}</span>
              <span className="text-[10px] font-mono font-medium text-slate-300 truncate w-full">{g.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
