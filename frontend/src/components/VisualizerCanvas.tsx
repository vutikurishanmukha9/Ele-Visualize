import { motion } from 'framer-motion';
import { Box, Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { ChemicalElement } from '@/data/elements';
import { cn } from '@/lib/utils';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Atom } from './Atom';

interface VisualizerCanvasProps {
  selectedElement: ChemicalElement | null;
}

export function VisualizerCanvas({ selectedElement }: VisualizerCanvasProps) {
  return (
    <main className="flex-1 relative overflow-hidden grid-pattern">
      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-primary/20 rounded-tl-lg" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-primary/20 rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-primary/20 rounded-bl-lg" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-primary/20 rounded-br-lg" />

      {/* Floating title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="absolute top-8 left-1/2 -translate-x-1/2 text-center"
      >
        <h1 className="text-lg font-light tracking-[0.3em] uppercase text-muted-foreground/60">
          Element Visualizer
        </h1>
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent mx-auto mt-2" />
      </motion.div>

      {/* Control buttons - floating on the right */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="absolute top-24 right-6 flex flex-col gap-2"
      >
        {[
          { icon: ZoomIn, label: 'Zoom In' },
          { icon: ZoomOut, label: 'Zoom Out' },
          { icon: RotateCcw, label: 'Reset View' },
          { icon: Maximize2, label: 'Fullscreen' },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            className={cn(
              'group p-2.5 rounded-lg glass-panel',
              'hover:border-primary/30 hover:shadow-glow transition-all duration-200',
              'cursor-pointer'
            )}
            title={label}
          >
            <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
      </motion.div>

      {/* Center content - Three.js placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        {selectedElement ? (
          <motion.div
            key={selectedElement.atomicNumber}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full h-full relative"
          >
            {/* 3D Canvas */}
            <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

              <OrbitControls
                enablePan={false}
                minDistance={5}
                maxDistance={30}
                autoRotate
                autoRotateSpeed={0.5}
              />

              <Atom element={selectedElement} />

              <EffectComposer>
                <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.5} />
              </EffectComposer>
            </Canvas>

            {/* Overlay Info (HTML) */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-end pb-32">
              {/* Element symbol with glow */}
              <div className="relative mb-4">
                <span className="text-6xl font-bold text-primary text-glow-lg tracking-tight">
                  {selectedElement.symbol}
                </span>
              </div>

              {/* Element info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-1 text-center bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10"
              >
                <h2 className="text-2xl font-medium text-foreground">
                  {selectedElement.name}
                </h2>
                <div className="flex gap-4 justify-center text-sm text-muted-foreground">
                  <p>Atomic Number: <span className="text-primary">{selectedElement.atomicNumber}</span></p>
                  <p>Mass: <span className="text-primary">{selectedElement.atomicMass.toFixed(2)}</span></p>
                </div>
                <div className="flex gap-2 justify-center mt-2">
                  {selectedElement.shells.map((s, i) => (
                    <span key={i} className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/70" title={`Shell ${i + 1}`}>
                      {s}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Placeholder state */}
            <div className="relative mb-8">
              <Box className="w-24 h-24 text-primary/20 mx-auto" strokeWidth={0.5} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 border border-dashed border-primary/10 rounded-full animate-spin" style={{ animationDuration: '20s' }} />
              </div>
            </div>

            {/* Three.js mount point comment */}
            <div className="glass-panel p-6 rounded-xl max-w-md mx-auto corner-accent">
              <p className="text-sm text-muted-foreground mb-2">
                Ready to Visualize
              </p>
              <p className="text-xs text-muted-foreground/50">
                Select an element from the sidebar to generate its 3D atomic structure
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom status bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
          <span className="uppercase tracking-wider">FPS</span>
          <span className="text-primary font-mono">60</span>
        </div>
        <div className="w-px h-4 bg-border/30" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
          <span className="uppercase tracking-wider">Resolution</span>
          <span className="text-primary/70 font-mono">1920×1080</span>
        </div>
        <div className="w-px h-4 bg-border/30" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
          <span className="uppercase tracking-wider">Renderer</span>
          <span className="text-primary/70 font-mono">WebGL 2.0</span>
        </div>
      </motion.div>
    </main>
  );
}
