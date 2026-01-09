import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ChevronDown, ChevronUp, Hand, Scan, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HandTrackerPanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="absolute bottom-6 right-6 z-10"
    >
      <div className="glass-panel rounded-xl overflow-hidden">
        {/* Header - Always visible, clickable to toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Hand className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-foreground">
              Hand Tracker
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="status-dot" />
            <span className="text-[10px] text-muted-foreground">Active</span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Collapsible content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              {/* Video feed placeholder */}
              <div className="relative w-64 aspect-video bg-secondary/30 border-t border-border/30">
                {/* Placeholder content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Camera className="w-6 h-6 text-muted-foreground/30 mb-1" />
                  <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                    Webcam Feed
                  </span>
                </div>

                {/* Scan overlay effect */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div 
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                    style={{
                      animation: 'scan 3s ease-in-out infinite',
                    }}
                  />
                </div>

                {/* Corner brackets */}
                <div className="absolute top-2 left-2 w-3 h-3 border-l border-t border-primary/30" />
                <div className="absolute top-2 right-2 w-3 h-3 border-r border-t border-primary/30" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-l border-b border-primary/30" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-primary/30" />

                {/* Developer comment overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-background/80 to-transparent">
                  <code className="text-[8px] text-primary/40 font-mono">
                    {/* MediaPipe HandLandmarker */}
                  </code>
                </div>
              </div>

              {/* Controls */}
              <div className="p-2.5 flex items-center justify-between border-t border-border/30">
                <div className="flex gap-1">
                  {[
                    { icon: Scan, label: 'Detect' },
                    { icon: Settings, label: 'Settings' },
                  ].map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      className={cn(
                        'p-1.5 rounded-md bg-secondary/30 border border-border/30',
                        'hover:bg-secondary/50 hover:border-primary/20 transition-all duration-200',
                        'group cursor-pointer'
                      )}
                      title={label}
                    >
                      <Icon className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground/50">Confidence</span>
                  <div className="w-12 h-1 bg-secondary/50 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-primary/60 to-primary rounded-full" />
                  </div>
                  <span className="text-[9px] text-primary font-mono">75%</span>
                </div>
              </div>

              {/* Gesture hints */}
              <div className="px-2.5 pb-2.5 flex gap-2">
                {['Pinch', 'Grab', 'Point'].map((gesture) => (
                  <div
                    key={gesture}
                    className="flex-1 py-1 px-1.5 rounded-md bg-secondary/20 border border-border/20 text-center"
                  >
                    <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">
                      {gesture}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CSS for scan animation */}
      <style>{`
        @keyframes scan {
          0%, 100% {
            top: 0;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
      `}</style>
    </motion.div>
  );
}
