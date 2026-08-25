# Routes & Workspaces

## Route Mapping
- `/` — Main Scientific Laboratory Workbench (`frontend/src/pages/Index.tsx`)

### Workspace Modes (Interactive Client Workspaces in `/`):
1. **`explore`** — 3D Single Element & Quantum Orbital Visualizer (Realtime R3F 3D atom with subsurface scattering, laser tracks, and de Broglie photon packets).
2. **`table`** — Interactive 118-Element Periodic Table with Category Filtering, Heatmaps, and Block Selection.
3. **`compare`** — Side-by-side Dual Element Telemetry and Delta Bar Analytics with dual R3F 3D Atom comparison stages.
4. **`reactions`** — Realtime Chemical Reaction & Gibbs Free Energy Collision Simulator.
5. **`builder`** — 2D/3D Molecule Construction Sandbox with Covalent Bond Snapping.

### Full Router Source (`src/App.tsx`):
```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
    </Routes>
  </BrowserRouter>
);

export default App;
```
