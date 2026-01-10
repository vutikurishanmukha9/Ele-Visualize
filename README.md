# Ele-Visualize

## Our Aim
The primary aim of **Ele-Visualize** is to revolutionize science education by transforming the periodic table from a static reference chart into an **immersive, interactive 3D experience**. We aim to bridge the gap between theoretical chemistry and tangible visualization. By leveraging modern web technologies and computer vision, we strive to create a platform where users don't just *see* elements, but *interact* with them—manipulating atomic structures in real-time using intuitive hand gestures.

## What We Are Trying to Do
We are developing a sophisticated web application that integrates high-fidelity **3D graphics** with **computer vision**. The project seeks to solve the problem of abstract visualization in chemistry by building a minority-report-style interface.
-   **Interactive Visualization**: Converting numerical atomic data (shells, electron configuration) into dynamic, orbiting 3D models.
-   **Touchless Interface**: replacing traditional mouse/keyboard inputs with natural hand gestures (pinching, grabbing, pointing) for a more immersive learning environment.
-   **Modern User Experience**: Delivering a high-performance, aesthetically pleasing "Cyberpunk/Glassmorphism" interface that appeals to modern users and keeps them engaged.

## What We Have Done Up To Now
### Frontend Architecture (Client-Side)
We have built a robust React-based frontend powered by **Vite** for performance.
1.  **3D Atom Engine**:
    *   Developed a custom 3D rendering engine using **Three.js** and **React Three Fiber (R3F)**.
    *   Implemented procedural generation of atoms: The system calculates electron distribution across shells (K, L, M, N...) largely based on real chemical data and renders them as dynamic particles orbiting a glowing nucleus.
    *   Added cinematic post-processing effects (Bloom, Glow) to achieve a futuristic neon aesthetic.
2.  **User Interface (UI)**:
    *   Designed a fully responsive layout with a collapsible sidebar and glass-panel overlays using **Tailwind CSS**.
    *   Implemented real-time filtering and search capabilities for the period table.
    *   Integrated **Framer Motion** for smooth, physics-based UI transitions.

### Backend Infrastructure (Server-Side)
We have established a solid backend foundation using **Node.js** and **TypeScript**.
1.  **REST API**:
    *   Implemented an Express.js server providing endpoints (`/api/elements`) to serve rich chemical data, including atomic mass, category, and electron shell configurations for all elements.
2.  **Real-Time Communication Layer**:
    *   Set up a **WebSocket Server** (`ws://localhost:3001/ws`) designed to handle high-frequency data streams. This layer is specifically architected to receive coordinates from the Computer Vision system and broadcast them instantly to the frontend for low-latency control.

## End Goal
Our specific end goal is the seamless integration of **MediaPipe Hand Tracking**.
-   **The Vision**: A user sits in front of their webcam and holds up a hand.
-   **The Mechanism**: The backend (or a dedicated CV worker) processes the video feed to detect 21 built-in 3D hand landmarks.
-   **The Interaction**:
    *   **Pinch Gesture**: Validated by calculating distance between thumb and index finger tip. Used to **Zoom In/Out** of the atom.
    *   **Closed Fist / Grab**: Used to **Rotate** the atom in 3D space.
    *   **Pointer Finger**: Used to **Select** different electron shells or highlight specific particles.
-   This "Touchless Laboratory" creates a safe, virtual environment for exploring the building blocks of the universe.

## Tools We Have Used
### Core Stack
-   **React 18**: Component-based UI library.
-   **TypeScript**: For type-safe code across the entire stack.
-   **Vite**: Next-generation frontend tooling.

### Styling & Animation
-   **Tailwind CSS**: Utility-first CSS framework for rapid UI development.
-   **Framer Motion**: Production-ready animation library for React.
-   **Lucide React**: Beautiful, consistent icon set.

### 3D & Graphics
-   **Three.js**: JavaScript 3D library.
-   **React Three Fiber**: React renderer for Three.js.
-   **React Three Drei**: Useful helpers for R3F (Stars, OrbitControls).
-   **React Three Postprocessing**: For bloom and visual effects.

### Backend & Network
-   **Node.js**: JavaScript runtime.
-   **Express**: Minimal web framework for Node.js.
-   **ws**: Simple to use, blazing fast and thoroughly tested WebSocket client and server for Node.js.
-   **Cors**: Middleware for enabling Cross-Origin Resource Sharing.

### Data Management
-   **TanStack Query (React Query)**: For powerful asynchronous state management and data fetching.

## Getting Started

The project is organized into two main folders:
-   **`frontend/`**: The React/Three.js application.
-   **`backend/`**: The Node.js/Express server and WebSocket handler.

### Running the Application

1.  **Start the Backend**:
    ```bash
    cd backend
    npm install
    npm run dev
    ```
    *Server will start on `http://localhost:3001`*

2.  **Start the Frontend**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    *App will run on `http://localhost:8080` (or similar)*
