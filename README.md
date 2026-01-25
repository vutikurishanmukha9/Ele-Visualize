# Ele-Visualize

> A futuristic 3D atomic and molecular visualization platform with real-time hand gesture controls

![Status](https://img.shields.io/badge/Status-Active-brightgreen) ![React](https://img.shields.io/badge/React-18-blue) ![Three.js](https://img.shields.io/badge/Three.js-R3F-orange) ![MediaPipe](https://img.shields.io/badge/MediaPipe-Hand%20Tracking-purple)

---

## What is Ele-Visualize?

Ele-Visualize transforms chemistry education by bringing the periodic table to life. Instead of memorizing static diagrams, users can:

- **Explore 3D atoms** with orbiting electrons and detailed nuclei
- **Visualize molecules** with accurate 3D bond structures
- **Build custom molecules** using an intuitive builder
- **Simulate chemical reactions** to understand bonding
- **See orbital shapes** (s, p, d) as probability clouds
- **Control everything with hand gestures** - no mouse needed!

---

## Features

### Atom Visualization
- True 3D atomic models using Three.js
- Orbiting electrons on proper shells
- Zoom into nucleus to see individual protons/neutrons
- Accurate electron configuration display (aufbau principle)
- Toggle orbital probability clouds (s/p/d shapes)
- Element Comparison view

### Molecule Visualization
- **20+ pre-built molecules**: Including H2O, CO2, CH4, NH3, O2, C6H6, C2H5OH, and more
- Accurate molecular geometry
- Single, double, and triple bond rendering
- Atom labels and descriptions

### New: Molecule Builder
- **Interactive Canvas**: Click to place atoms, click two atoms to bond
- **Smart Validation**: Checks octet rules and valency in real-time
- **Mobile Optimized**: 6-column palette grid and stacked layout for mobile
- **Save & Reset**: Build complex structures and visualize them in 3D

### New: Reaction Simulator
- **Interactive Reactions**: Combine elements to see how they react (e.g., Na + Cl → NaCl)
- **Visual Feedback**: Reaction equations and product visualization
- **Educational**: Learn about synthesis, combustion, and more

### Hand Gesture Controls
| Gesture | Action |
|---------|--------|
| Open Hand | Rotate atom/molecule in 3D |
| Pinch | Zoom in/out (fingers apart = zoom in) |
| Point | Highlight electrons |
| Swipe | Navigate between elements |

**Powered by:**
- MediaPipe Hand Tracking (21 landmarks)
- Kalman filtering for ultra-smooth tracking
- Gesture state machine for stability
- Velocity-based swipe detection

### User Experience
- **Mobile-First Design**: 
  - Dedicated mobile views for Periodic Table (category tabs + vertical list)
  - Responsive Molecule Builder with optimized touch targets
  - Collapsible sidebar closed by default on mobile
- Dark/Light mode toggle
- Gesture tutorial for first-time users
- Camera-in-use notification
- Error boundaries for stability

---

## Tech Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | React 18, TypeScript, Vite |
| **3D Graphics** | Three.js, React Three Fiber, Drei |
| **Styling** | Tailwind CSS, Framer Motion |
| **Hand Tracking** | MediaPipe Tasks Vision |
| **Icons** | Lucide React |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Webcam (for hand tracking)

### Installation

```bash
# Clone the repository
git clone https://github.com/vutikurishanmukha9/Ele-Visualize.git
cd Ele-Visualize

# Install frontend dependencies
cd frontend
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:8080`

---

## How to Use

1. **Select Mode** - Choose from Atoms, Grid, Compare, Reaction, or Builder
2. **Periodic Table** - Use category filters on mobile to browse elements easily
3. **Start Hand Tracking** - Click the Hand Tracker panel then "Start Tracking"
4. **Use Gestures**:
   - Open hand to rotate
   - Pinch fingers to zoom
   - Swipe to navigate
5. **Builder Mode** - Create custom molecules by placing atoms and bonding them

---

## Project Structure

```
Ele-Visualize/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Atom3D.tsx        # 3D atom renderer
│   │   │   ├── Molecule3D.tsx    # 3D molecule renderer
│   │   │   ├── HandTracker.tsx   # Gesture detection
│   │   │   ├── MoleculeBuilder.tsx # Custom molecule builder
│   │   │   ├── ReactionSimulator.tsx # Chemical reaction sim
│   │   │   ├── PeriodicTableGrid.tsx # Responsive grid view
│   │   │   └── ...
│   │   ├── data/
│   │   │   ├── elements.ts       # Periodic table data
│   │   │   ├── molecules.ts      # Molecule structures
│   │   │   └── reactions.ts      # Reaction definitions
│   │   └── pages/
│   │       └── Index.tsx         # Main app page
│   └── index.html
└── backend/                       # Optional API server
```

---

## Future Roadmap

- [x] Element comparison (side-by-side view)
- [x] Molecule Builder
- [x] Mobile-optimized layout
- [ ] Voice commands ("Show Carbon")
- [ ] Quiz mode for learning
- [ ] AR mode using camera background
- [ ] PWA offline support

---

## Author

**V Shanmukha** - [GitHub](https://github.com/vutikurishanmukha9)

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Made with love for science education
</p>
