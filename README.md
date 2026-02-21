# Ele-Visualize

> A futuristic 3D atomic and molecular visualization platform with real-time hand gesture controls, WebXR AR, and physics-based molecule building

![Status](https://img.shields.io/badge/Status-Active-brightgreen) ![React](https://img.shields.io/badge/React-18-blue) ![Three.js](https://img.shields.io/badge/Three.js-R3F-orange) ![MediaPipe](https://img.shields.io/badge/MediaPipe-Hand%20Tracking-purple) ![WebXR](https://img.shields.io/badge/WebXR-AR-ff69b4) ![Zustand](https://img.shields.io/badge/State-Zustand-yellow)

---

## What is Ele-Visualize?

Ele-Visualize transforms chemistry education by bringing the periodic table to life. Instead of memorizing static diagrams, users can:

- **Explore 3D atoms** with orbiting electrons and detailed nuclei
- **Visualize molecules** with accurate 3D bond structures
- **Build molecules in 3D** using a physics-based builder with auto-bonding
- **Simulate chemical reactions** to understand bonding
- **See orbital shapes** (s, p, d) as probability clouds
- **View atoms in Augmented Reality** on WebXR-compatible devices
- **Control everything with hand gestures** — no mouse needed!

---

## Features

### Atom Visualization
- True 3D atomic models using React Three Fiber
- Orbiting electrons on proper shells
- Zoom into nucleus to see individual protons/neutrons
- Accurate electron configuration (aufbau principle)
- Toggle orbital probability clouds (s/p/d shapes)
- Element comparison (side-by-side view)

### Molecule Visualization
- **20+ pre-built molecules**: H₂O, CO₂, CH₄, NH₃, O₂, C₆H₆, C₂H₅OH, and more
- Accurate molecular geometry with single, double, and triple bonds
- Atom labels and descriptions

### 3D Physics Molecule Builder
- **Rapier Physics Engine**: Atoms are rigid bodies with gravity, damping, and colliders
- **Element Palette**: H, C, N, O, S, P, F, Cl with correct valence rules
- **Auto-Bonding**: Atoms within proximity threshold automatically form single bonds (valence-aware)
- **Visual Feedback**: Proximity glow, selection rings, bond cylinders, symbol labels
- **Responsive toolbar** that scrolls horizontally on mobile

### Reaction Simulator
- Interactive reactions: combine elements to see how they react (e.g., Na + Cl → NaCl)
- Visual feedback with reaction equations and product visualization

### WebXR Augmented Reality
- **Auto-detection**: AR button only appears on WebXR-compatible devices
- **Surface anchoring**: Pulsing reticle for placing atoms on real-world surfaces
- **Hand input mapping**: MediaPipe gestures translate to 3D AR interactions:
  - Open hand → 3D rotation
  - Pinch → scale model up/down
  - Fist → freeze transforms
  - Point → visible pointer ray

### Hand Gesture Controls

| Gesture | Action |
|---------|--------|
| Open Hand | Rotate atom/molecule in 3D |
| Pinch | Zoom in/out (fingers apart = zoom in) |
| Point | Highlight / pointer ray (AR) |
| Fist | Freeze current state |
| Swipe | Navigate between elements |

**Powered by:**
- MediaPipe Hand Tracking (21 landmarks, npm package)
- Kalman filtering for ultra-smooth tracking
- Gesture state machine for stability
- Velocity-based swipe detection

### Responsive Design
- **Mobile**: Collapsible sidebar, compact toolbars, horizontally scrolling palettes, icon-only buttons
- **Tablet**: Balanced layout with touch-optimized controls
- **Desktop**: Full experience with all decorative elements and detailed status bars
- Dark/Light mode toggle
- Gesture tutorial for first-time users

---

## Tech Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | React 18, TypeScript, Vite |
| **3D Graphics** | Three.js, React Three Fiber, Drei, Postprocessing (Bloom) |
| **Physics** | Rapier (`@react-three/rapier`) |
| **WebXR / AR** | `@react-three/xr` v6 |
| **State Management** | Zustand (centralized store) |
| **Hand Tracking** | `@mediapipe/tasks-vision` (npm, not CDN) |
| **Styling** | Tailwind CSS, Framer Motion |
| **Backend** | Node.js, Express, WebSocket (Socket.IO) |
| **Icons** | Lucide React |

---

## Architecture

```
Ele-Visualize/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Atom3D.tsx            # 3D atom renderer (useRef for 60fps perf)
│   │   │   ├── Molecule3D.tsx        # 3D molecule renderer
│   │   │   ├── MoleculeBuilder3D.tsx  # Physics-based 3D builder (Rapier)
│   │   │   ├── MoleculeBuilder.tsx    # 2D canvas builder
│   │   │   ├── HandTracker.tsx        # MediaPipe gesture detection
│   │   │   ├── VisualizerCanvas.tsx   # R3F Canvas with XR + hand bridge
│   │   │   ├── ARButton.tsx           # WebXR AR session toggle
│   │   │   ├── ARPlacement.tsx        # AR surface reticle
│   │   │   ├── ReactionSimulator.tsx  # Chemical reaction sim
│   │   │   ├── PeriodicTableGrid.tsx  # Responsive periodic table
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   ├── useXRHandBridge.tsx    # Maps MediaPipe → XR 3D transforms
│   │   │   └── useGestureReceiver.ts  # WebSocket gesture relay
│   │   ├── store/
│   │   │   └── useAppStore.ts         # Zustand centralized state
│   │   ├── data/
│   │   │   ├── elements.ts            # Periodic table data
│   │   │   ├── molecules.ts           # Molecule structures
│   │   │   └── reactions.ts           # Reaction definitions
│   │   └── pages/
│   │       └── Index.tsx              # Main app page
│   └── index.html
├── backend/
│   ├── src/
│   │   ├── server.ts                  # Express + CORS (env-configurable)
│   │   └── services/
│   │       ├── websocket.service.ts   # WebSocket relay (crypto.randomUUID)
│   │       └── gesture.service.ts     # Type definitions only
│   └── .env.example                   # PORT, ALLOWED_ORIGINS
└── README.md
```

### Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| `useRef` for hand tracking | Prevents 60fps React re-renders — refs update silently |
| Frontend-only gesture detection | MediaPipe + Kalman filters run client-side; backend just relays landmarks |
| Zustand store | Replaces 15+ `useState` hooks in Index.tsx for centralized state |
| `@mediapipe/tasks-vision` npm | Eliminates CDN race conditions, provides TypeScript types |
| `crypto.randomUUID()` | Replaces insecure `Math.random()` for WebSocket client IDs |
| Env-based CORS | `ALLOWED_ORIGINS` configurable via `.env`, falls back to localhost |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Webcam (for hand tracking)
- WebXR-compatible browser/device (optional, for AR)

### Installation

```bash
# Clone the repository
git clone https://github.com/vutikurishanmukha9/Ele-Visualize.git
cd Ele-Visualize

# Install frontend dependencies
cd frontend
npm install --legacy-peer-deps

# Start development server
npm run dev
```

The app will open at `http://localhost:8080`

#### Backend (optional — for WebSocket relay)

```bash
cd backend
cp .env.example .env   # Configure PORT and ALLOWED_ORIGINS
npm install
npm run dev
```

---

## How to Use

1. **Select Mode** — Choose from Atoms, Grid, Compare, Reaction, or Builder
2. **Periodic Table** — Use category filters to browse elements
3. **Start Hand Tracking** — Click the Hand Tracker panel → "Start Tracking"
4. **Use Gestures**:
   - Open hand to rotate
   - Pinch fingers to zoom
   - Fist to freeze
   - Swipe to navigate
5. **3D Builder** — Spawn atoms from the element palette, watch them auto-bond
6. **AR Mode** — Tap the "View in AR" button on compatible devices

---

## Environment Variables

### Backend (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:8080,http://localhost:5173` |

---

## Future Roadmap

- [x] Element comparison (side-by-side view)
- [x] 2D Molecule Builder
- [x] Mobile-optimized layout
- [x] 3D Physics Molecule Builder (Rapier)
- [x] WebXR AR Mode
- [x] Zustand state management
- [x] Hand-to-XR input mapping
- [ ] Voice commands ("Show Carbon")
- [ ] Quiz mode for learning
- [ ] PWA offline support
- [ ] Multi-user collaborative building via WebSocket

---

## Author

**V Shanmukha** — [GitHub](https://github.com/vutikurishanmukha9)

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Made with love for science education
</p>
