/**
 * Gesture Service — Type Definitions
 * Detection logic lives on the frontend (HandTracker.tsx).
 * The backend just relays raw landmarks via WebSocket.
 */

export interface HandLandmark {
    x: number;
    y: number;
    z: number;
}

export interface GestureResult {
    gesture: 'pinch' | 'grab' | 'point' | 'open' | 'none';
    confidence: number;
    data?: {
        pinchDistance?: number;
        grabStrength?: number;
        fingerPositions?: { x: number; y: number; z: number }[];
    };
}
