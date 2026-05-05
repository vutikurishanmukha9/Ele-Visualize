# Ele-Visualize

> A premium dark-mode scientific workbench for exploring atoms, molecules, reactions, AR, and gesture-driven chemistry learning.

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![React](https://img.shields.io/badge/React-18-blue)
![Three.js](https://img.shields.io/badge/Three.js-R3F-orange)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Hand%20Tracking-purple)
![WebXR](https://img.shields.io/badge/WebXR-AR-ff69b4)
![Zustand](https://img.shields.io/badge/State-Zustand-yellow)

---

## Overview

Ele-Visualize turns chemistry into an interactive product-grade workspace. The app combines a premium dark scientific UI with 3D atom and molecule rendering, hand gesture controls, WebXR AR placement, reaction simulation, comparison tools, and saved exploration sessions.

The current UI is organized as a productivity workbench:

- **Top command bar** for fast search, actions, and session saving
- **Workspace navigation** for Explore, Table, Compare, Reactions, Builder, AR Lab, and Library
- **Discovery rail** for quick atom and molecule selection
- **Central visual stage** for 3D atoms and molecules
- **Inspector panel** for properties, learning notes, and quick actions
- **Library** for saved local exploration sessions

The product is dark-mode only by design.

---

## Features

### Premium Workbench UI

- Dark-only scientific product interface
- Command/search palette for elements, molecules, and app actions
- Responsive desktop workbench, tablet layout, and mobile dock
- Inspector tabs for overview, properties, learning notes, and actions
- Design language inspired by polished product systems: precise dark surfaces, quiet chrome, pill CTAs, shadow-as-border cards, and restrained lavender/blue accents

### Atom Visualization

- 3D atomic models using React Three Fiber and Three.js
- Orbiting electrons across proper shells
- Nucleus detail at higher zoom levels
- Electron configuration display
- Optional orbital probability clouds
- Animation speed, pause/play, zoom, and fullscreen controls

### Molecule Visualization

- 20+ prebuilt molecule structures
- Accurate 3D atom positions and single, double, and triple bonds
- Molecule descriptions, atom counts, bond counts, and element summaries

### Compare, Reactions, and Builder

- Side-by-side element comparison
- Interactive reaction simulator
- 2D molecule builder with valence-aware bonding
- 3D physics molecule builder components remain available in the codebase

### Hand Gestures and AR

- MediaPipe hand tracking with Kalman-style smoothing
- Gesture state machine for stable recognition
- Open hand rotates the model
- Pinch controls zoom
- Fist freezes transforms
- Swipe navigates between elements
- WebXR AR support with compatible browsers/devices

### Saved Sessions

The backend provides local JSON-backed session storage for saving and reopening explorations.

Session data includes:

- title
- selected element
- selected molecule
- workspace mode
- compared elements
- builder atoms and bonds
- notes
- tags
- created and updated timestamps

---

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, Framer Motion, Lucide React |
| 3D | Three.js, React Three Fiber, Drei, Postprocessing |
| Physics | `@react-three/rapier` |
| AR/XR | `@react-three/xr` |
| State | Zustand |
| Hand Tracking | `@mediapipe/tasks-vision` |
| Backend | Node.js, Express |
| Realtime | `ws` WebSocket server |
| Persistence | Local JSON session store |

---

## Project Structure

```text
Ele-Visualize/
├── package.json                         # Root workspace scripts
├── frontend/
│   ├── package.json
│   └── src/
│       ├── pages/
│       │   └── Index.tsx                # Premium workbench shell
│       ├── components/
│       │   ├── Atom3D.tsx               # 3D atom renderer
│       │   ├── Molecule3D.tsx           # 3D molecule renderer
│       │   ├── HandTracker.tsx          # MediaPipe gesture panel
│       │   ├── PeriodicTableGrid.tsx    # Periodic table workspace
│       │   ├── ComparisonMode.tsx       # Element comparison
│       │   ├── ReactionSimulator.tsx    # Reaction simulator
│       │   ├── MoleculeBuilder.tsx      # 2D molecule builder
│       │   └── ui/                      # shadcn/Radix primitives
│       ├── data/
│       │   ├── elements.ts
│       │   ├── elementProperties.ts
│       │   ├── molecules.ts
│       │   └── reactions.ts
│       ├── lib/
│       │   ├── sessions.ts              # Frontend session API helper
│       │   └── productSocket.ts         # Product event WebSocket helper
│       ├── store/
│       │   └── useAppStore.ts           # Zustand app state
│       └── index.css                    # Design system and workbench styles
└── backend/
    ├── package.json
    └── src/
        ├── server.ts                    # Express app and WebSocket server
        ├── routes/
        │   ├── element.routes.ts
        │   └── session.routes.ts
        ├── controllers/
        │   ├── element.controller.ts
        │   └── session.controller.ts
        └── services/
            ├── session.service.ts       # JSON-backed session persistence
            ├── websocket.service.ts     # Gesture/product event relay
            └── gesture.service.ts
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Webcam for hand tracking
- WebXR-compatible browser/device for AR features

### Install Dependencies

Install frontend and backend dependencies separately:

```bash
cd frontend
npm install --legacy-peer-deps

cd ../backend
npm install
```

### Run From The Repo Root

From `Ele-Visualize/`:

```bash
npm run dev
```

This starts:

- backend API on `http://localhost:3001`
- frontend app on `http://127.0.0.1:8080`

### Run Apps Separately

```bash
npm run dev:backend
npm run dev:frontend
```

### Build Everything

```bash
npm run build
```

You can also build one side at a time:

```bash
npm run build:frontend
npm run build:backend
```

---

## API

### Health and Element APIs

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Basic health check |
| `GET` | `/api/status` | Server status, connected clients, enabled features |
| `GET` | `/api/elements` | List elements |
| `GET` | `/api/elements?category=nonmetal` | Filter elements by category |
| `GET` | `/api/elements/:atomicNumber` | Get one element |
| `GET` | `/api/categories` | List element categories |

### Session APIs

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/sessions` | List saved sessions |
| `POST` | `/api/sessions` | Create a session |
| `GET` | `/api/sessions/:id` | Get a session |
| `PUT` | `/api/sessions/:id` | Update a session |
| `DELETE` | `/api/sessions/:id` | Delete a session |

Sessions are stored locally in `backend/data/sessions.json` by default.

### WebSocket

The WebSocket server runs at:

```text
ws://localhost:3001/ws
```

Supported event groups include:

- client registration
- hand landmark relay
- element selection
- direct control events
- session opened
- molecule selected
- comparison updates
- builder updates
- presence heartbeat

---

## Environment Variables

### Backend `.env`

Create `backend/.env` from `backend/.env.example` if you need custom values.

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Backend server port | `3001` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:8080,http://localhost:5173,http://localhost:3000` |
| `SESSIONS_FILE` | Optional custom path for saved sessions JSON | `backend/data/sessions.json` via process cwd |

---

## Usage

1. Open the app at `http://127.0.0.1:8080`.
2. Use the command/search bar to jump to an element, molecule, or workspace.
3. Browse atoms and molecules from the discovery rail.
4. Use the central visual stage for 3D exploration.
5. Open the inspector to review properties, learning notes, and quick actions.
6. Use Compare, Reactions, Builder, AR Lab, or Library from the workspace navigation.
7. Save a session to reopen it later from Library.

### Gesture Controls

| Gesture | Action |
| --- | --- |
| Open hand | Rotate atom or molecule |
| Pinch | Zoom in/out |
| Fist | Freeze transforms |
| Point | Pointer/highlight behavior |
| Swipe | Navigate between elements |

---

## Design Direction

Ele-Visualize uses a dark-only product UI. The design system favors:

- deep near-black canvas surfaces
- restrained lavender and blue interaction accents
- quiet chrome that lets the 3D model lead
- precise cards with shadow-as-border treatment
- pill-shaped primary actions
- compact, readable scientific data
- responsive layouts with stable controls and no text overlap

---

## Roadmap

- [x] Premium productivity workbench UI
- [x] Dark-only design system
- [x] Command/search experience
- [x] Element comparison
- [x] Reaction simulator
- [x] Molecule builder
- [x] WebXR AR mode
- [x] Zustand state management
- [x] Hand-to-XR input mapping
- [x] Local saved sessions API
- [ ] Voice commands
- [ ] Quiz/lesson mode
- [ ] PWA offline support
- [ ] Multi-user collaborative sessions
- [ ] Code-splitting for large 3D/AR bundles

---

## Author

**V Shanmukha** - [GitHub](https://github.com/vutikurishanmukha9)

---

## License

This project is open source and available under the [MIT License](LICENSE).
