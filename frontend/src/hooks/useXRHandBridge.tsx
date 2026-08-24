/**
 * useXRHandBridge — Maps MediaPipe gesture data to XR-space interactions
 *
 * During an active XR (AR/VR) session, this hook reads the same hand tracking
 * refs that drive the 2D experience and translates them into 3D spatial
 * interactions:
 *
 *  - OPEN hand → rotate the atom/molecule by mapping 2D wrist (x,y) to 3D Euler rotation
 *  - PINCH gesture → scale the model up/down based on finger distance
 *  - FIST gesture → freeze the model in place (lock rotation + scale)
 *  - POINT gesture → used as a pointer / selection ray
 *
 * The hook outputs a XRHandState that the Atom3D / Molecule3D components can
 * consume via their useFrame loop to apply transformations in AR space.
 */

import { useRef, MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ============== TYPES ==============

export interface XRHandState {
    /** Current 3D rotation driven by hand (world-space Euler) */
    rotation: THREE.Euler;
    /** Current scale factor driven by pinch */
    scale: number;
    /** Whether the model is frozen (fist gesture) */
    isFrozen: boolean;
    /** Whether XR hand input is actively controlling the model */
    isActive: boolean;
    /** A 3D ray direction from the pointing finger (for selection) */
    pointerDirection: THREE.Vector3;
    /** Whether the user is currently pointing */
    isPointing: boolean;
}

export interface XRHandBridgeConfig {
    /** Ref to the MediaPipe hand X position (0-1, normalized) */
    handPositionX: MutableRefObject<number>;
    /** Ref to the MediaPipe hand Y position (0-1, normalized) */
    handPositionY: MutableRefObject<number>;
    /** Ref to the current detected gesture name */
    currentGesture: MutableRefObject<string>;
    /** Ref indicating whether MediaPipe hand tracking is active */
    isHandControlled: MutableRefObject<boolean>;
    /** Ref indicating the fist-freeze state */
    isFrozen: MutableRefObject<boolean>;
    /** Whether an XR session is currently active */
    isXRActive: boolean;
    /** Sensitivity multiplier for rotation mapping (default: 2.0) */
    rotationSensitivity?: number;
    /** Sensitivity multiplier for scale mapping (default: 1.5) */
    scaleSensitivity?: number;
}

// ============== SMOOTHING ==============

class ExponentialSmooth {
    private value: number;
    private alpha: number;

    constructor(alpha = 0.15, initial = 0) {
        this.alpha = alpha;
        this.value = initial;
    }

    update(input: number): number {
        this.value = this.alpha * input + (1 - this.alpha) * this.value;
        return this.value;
    }

    get current() {
        return this.value;
    }

    reset(v: number) {
        this.value = v;
    }
}

// ============== HOOK ==============

export function useXRHandBridge(config: XRHandBridgeConfig): XRHandState {
    const {
        handPositionX,
        handPositionY,
        currentGesture,
        isHandControlled,
        isFrozen,
        isXRActive,
        rotationSensitivity = 2.0,
        scaleSensitivity = 1.5,
    } = config;

    // Smoothed rotation output
    const rotationRef = useRef(new THREE.Euler(0, 0, 0));
    const scaleRef = useRef(1);
    const pointerRef = useRef(new THREE.Vector3(0, 0, -1));
    const isPointingRef = useRef(false);
    const isActiveRef = useRef(false);
    const isFrozenRef = useRef(false);

    // Smoothers for XR space (higher alpha = more responsive)
    const smoothX = useRef(new ExponentialSmooth(0.2, 0));
    const smoothY = useRef(new ExponentialSmooth(0.2, 0));
    const smoothScale = useRef(new ExponentialSmooth(0.1, 1));

    // Previous pinch distance for delta calculation
    const lastPinchX = useRef(0.5);

    useFrame(() => {
        if (!isXRActive || !isHandControlled.current) {
            isActiveRef.current = false;
            return;
        }

        isActiveRef.current = true;
        const gesture = currentGesture.current;
        const handX = handPositionX.current;
        const handY = handPositionY.current;

        // ========== FROZEN STATE ==========
        if (isFrozen.current || gesture === 'fist') {
            isFrozenRef.current = true;
            return; // Don't update anything while frozen
        }
        isFrozenRef.current = false;

        // ========== OPEN HAND → ROTATION ==========
        if (gesture === 'open') {
            // Map 2D hand position (0-1) to rotation angles
            // Center at 0.5,0.5 so resting position = no rotation
            const rawRotX = (handY - 0.5) * Math.PI * rotationSensitivity;
            const rawRotY = (handX - 0.5) * Math.PI * rotationSensitivity;

            const smoothedX = smoothX.current.update(rawRotX);
            const smoothedY = smoothY.current.update(rawRotY);

            rotationRef.current.set(smoothedX, smoothedY, 0);

            // Reset pinch tracking
            lastPinchX.current = 0.5;
        }

        // ========== PINCH → SCALE ==========
        if (gesture === 'pinch') {
            // Map hand X movement to scale changes
            // Moving hand right = scale up, left = scale down
            const delta = (handX - lastPinchX.current) * scaleSensitivity;
            const currentScale = scaleRef.current;
            const newScale = THREE.MathUtils.clamp(currentScale + delta, 0.3, 5.0);
            scaleRef.current = smoothScale.current.update(newScale);

            lastPinchX.current = handX;
        } else {
            lastPinchX.current = handX;
        }

        // ========== POINT → POINTER RAY ==========
        if (gesture === 'point') {
            isPointingRef.current = true;
            // Create a pointer direction from hand position
            // Map 2D (0-1) to a direction in camera space
            const dirX = (handX - 0.5) * 2;
            const dirY = -(handY - 0.5) * 2; // Invert Y
            pointerRef.current.set(dirX, dirY, -1).normalize();
        } else {
            isPointingRef.current = false;
        }
    });

    return {
        rotation: rotationRef.current,
        scale: scaleRef.current,
        isFrozen: isFrozenRef.current,
        isActive: isActiveRef.current,
        pointerDirection: pointerRef.current,
        isPointing: isPointingRef.current,
    };
}

// ============== XR HAND VISUALIZER (optional 3D overlay) ==============

/**
 * XRHandPointer — Renders a visible pointer ray in 3D when the user is pointing.
 * Place this inside the XR-wrapped Canvas scene.
 */
export function XRHandPointer({
    handState,
    color = '#6366f1',
    length = 5,
}: {
    handState: XRHandState;
    color?: string;
    length?: number;
}) {
    const lineRef = useRef<THREE.Line>(null);
    const dotRef = useRef<THREE.Mesh>(null);

    useFrame(({ camera }) => {
        if (!lineRef.current || !dotRef.current) return;

        lineRef.current.visible = handState.isPointing && handState.isActive;
        dotRef.current.visible = handState.isPointing && handState.isActive;

        if (handState.isPointing && handState.isActive) {
            const origin = camera.position.clone();
            const direction = handState.pointerDirection.clone().applyQuaternion(camera.quaternion);
            const endPoint = origin.clone().add(direction.multiplyScalar(length));

            const positions = lineRef.current.geometry.attributes.position;
            if (positions) {
                positions.setXYZ(0, origin.x, origin.y, origin.z);
                positions.setXYZ(1, endPoint.x, endPoint.y, endPoint.z);
                positions.needsUpdate = true;
            }

            dotRef.current.position.copy(endPoint);
        }
    });

    return (
        <group>
        <line ref= { lineRef as any } >
        <bufferGeometry>
        <bufferAttribute
                        attach="attributes-position"
    count = { 2}
    array = { new Float32Array(6) }
    itemSize = { 3}
        />
        </bufferGeometry>
        < lineBasicMaterial color = { color } transparent opacity = { 0.6} linewidth = { 2} />
            </line>
            < mesh ref = { dotRef } >
                <sphereGeometry args={ [0.03, 8, 8] } />
                    < meshBasicMaterial color = { color } />
                        </mesh>
                        </group>
    );
}
