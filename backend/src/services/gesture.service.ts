/**
 * Gesture Recognition Service
 * Processes MediaPipe hand landmarks to detect gestures
 */

// MediaPipe hand landmark indices
const LANDMARKS = {
    WRIST: 0,
    THUMB_TIP: 4,
    INDEX_TIP: 8,
    MIDDLE_TIP: 12,
    RING_TIP: 16,
    PINKY_TIP: 20,
    INDEX_MCP: 5,
    MIDDLE_MCP: 9,
    RING_MCP: 13,
    PINKY_MCP: 17,
};

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
        rotation?: { x: number; y: number };
        position?: { x: number; y: number };
    };
}

/**
 * Calculate Euclidean distance between two landmarks
 */
function distance(a: HandLandmark, b: HandLandmark): number {
    return Math.sqrt(
        Math.pow(a.x - b.x, 2) +
        Math.pow(a.y - b.y, 2) +
        Math.pow(a.z - b.z, 2)
    );
}

/**
 * Check if finger is extended (tip is above MCP in y-axis, assuming palm facing camera)
 */
function isFingerExtended(tip: HandLandmark, mcp: HandLandmark): boolean {
    return tip.y < mcp.y; // Lower y means higher on screen
}

/**
 * Detect pinch gesture (thumb and index finger close together)
 */
export function detectPinch(landmarks: HandLandmark[]): { isPinching: boolean; distance: number } {
    const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
    const indexTip = landmarks[LANDMARKS.INDEX_TIP];
    const pinchDistance = distance(thumbTip, indexTip);

    return {
        isPinching: pinchDistance < 0.05, // Threshold for pinch
        distance: pinchDistance
    };
}

/**
 * Detect grab gesture (all fingers curled)
 */
export function detectGrab(landmarks: HandLandmark[]): boolean {
    const indexExtended = isFingerExtended(landmarks[LANDMARKS.INDEX_TIP], landmarks[LANDMARKS.INDEX_MCP]);
    const middleExtended = isFingerExtended(landmarks[LANDMARKS.MIDDLE_TIP], landmarks[LANDMARKS.MIDDLE_MCP]);
    const ringExtended = isFingerExtended(landmarks[LANDMARKS.RING_TIP], landmarks[LANDMARKS.RING_MCP]);
    const pinkyExtended = isFingerExtended(landmarks[LANDMARKS.PINKY_TIP], landmarks[LANDMARKS.PINKY_MCP]);

    // Grab = no fingers extended
    return !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
}

/**
 * Detect point gesture (only index finger extended)
 */
export function detectPoint(landmarks: HandLandmark[]): boolean {
    const indexExtended = isFingerExtended(landmarks[LANDMARKS.INDEX_TIP], landmarks[LANDMARKS.INDEX_MCP]);
    const middleExtended = isFingerExtended(landmarks[LANDMARKS.MIDDLE_TIP], landmarks[LANDMARKS.MIDDLE_MCP]);
    const ringExtended = isFingerExtended(landmarks[LANDMARKS.RING_TIP], landmarks[LANDMARKS.RING_MCP]);
    const pinkyExtended = isFingerExtended(landmarks[LANDMARKS.PINKY_TIP], landmarks[LANDMARKS.PINKY_MCP]);

    return indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
}

/**
 * Detect open hand (all fingers extended)
 */
export function detectOpenHand(landmarks: HandLandmark[]): boolean {
    const indexExtended = isFingerExtended(landmarks[LANDMARKS.INDEX_TIP], landmarks[LANDMARKS.INDEX_MCP]);
    const middleExtended = isFingerExtended(landmarks[LANDMARKS.MIDDLE_TIP], landmarks[LANDMARKS.MIDDLE_MCP]);
    const ringExtended = isFingerExtended(landmarks[LANDMARKS.RING_TIP], landmarks[LANDMARKS.RING_MCP]);
    const pinkyExtended = isFingerExtended(landmarks[LANDMARKS.PINKY_TIP], landmarks[LANDMARKS.PINKY_MCP]);

    return indexExtended && middleExtended && ringExtended && pinkyExtended;
}

/**
 * Get hand center position (wrist)
 */
export function getHandPosition(landmarks: HandLandmark[]): { x: number; y: number } {
    const wrist = landmarks[LANDMARKS.WRIST];
    return { x: wrist.x, y: wrist.y };
}

/**
 * Main gesture recognition function
 */
export function recognizeGesture(landmarks: HandLandmark[]): GestureResult {
    if (!landmarks || landmarks.length < 21) {
        return { gesture: 'none', confidence: 0 };
    }

    const pinch = detectPinch(landmarks);
    const isGrab = detectGrab(landmarks);
    const isPoint = detectPoint(landmarks);
    const isOpen = detectOpenHand(landmarks);
    const position = getHandPosition(landmarks);

    // Priority: Pinch > Grab > Point > Open > None
    if (pinch.isPinching) {
        return {
            gesture: 'pinch',
            confidence: 1 - (pinch.distance / 0.05), // Higher confidence when closer
            data: {
                pinchDistance: pinch.distance,
                position
            }
        };
    }

    if (isGrab) {
        return {
            gesture: 'grab',
            confidence: 0.9,
            data: {
                rotation: { x: position.x * 360, y: position.y * 360 },
                position
            }
        };
    }

    if (isPoint) {
        return {
            gesture: 'point',
            confidence: 0.85,
            data: { position }
        };
    }

    if (isOpen) {
        return {
            gesture: 'open',
            confidence: 0.8,
            data: { position }
        };
    }

    return { gesture: 'none', confidence: 0 };
}
