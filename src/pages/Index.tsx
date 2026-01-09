import { useState } from 'react';
import { motion } from 'framer-motion';
import { ElementSidebar } from '@/components/ElementSidebar';
import { VisualizerCanvas } from '@/components/VisualizerCanvas';
import { HandTrackerPanel } from '@/components/HandTrackerPanel';
import { ChemicalElement } from '@/data/elements';

const Index = () => {
  const [selectedElement, setSelectedElement] = useState<ChemicalElement | null>(null);

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex">
      {/* Left Sidebar - Element Categories */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <ElementSidebar
          selectedElement={selectedElement}
          onSelectElement={setSelectedElement}
        />
      </motion.div>

      {/* Center Main Canvas */}
      <VisualizerCanvas selectedElement={selectedElement} />

      {/* Bottom-Right Floating Panel - Hand Tracker */}
      <HandTrackerPanel />
    </div>
  );
};

export default Index;
