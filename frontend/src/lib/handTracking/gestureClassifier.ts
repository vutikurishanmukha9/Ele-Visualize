/**
 * Multi-Gesture Classification Engine & State Machine
 *
 * Classifies raw biomechanical hand states into distinct user gestures:
 * - OPEN_PALM (3D continuous orbit & pan)
 * - PINCH (Precision 3D grab & continuous optical zoom)
 * - FIST (Freeze / Orientation Lock)
 * - POINT (Laser raycast atom pointer)
 * - VICTORY (Mode toggle / peace sign)
 * - THUMBS_UP (Confirm / Home reset)
 * - SWIPE_LEFT / SWIPE_RIGHT / SWIPE_UP / SWIPE_DOWN (Kinetic navigation)
 */

import { HandBiomechanics, Vec3 } from './biomechanics';

export type GestureType =
  | 'none'
  | 'open'
  | 'pinch'
  | 'fist'
  | 'point'
  | 'victory'
  | 'thumbs_up'
  | 'swipe_left'
  | 'swipe_right'
  | 'swipe_up'
  | 'swipe_down';

export interface GestureClassification {
  gesture: GestureType;
  confidence: number;
  pinchDistance: number;
  rotationDelta: { x: number; y: number; roll: number };
  pointerRay?: { origin: Vec3; direction: Vec3 };
  isFrozen: boolean;
}

export interface GestureStateMachineOptions {
  entryThresholdFrames?: number; // Frames required to commit to a new gesture
  exitThresholdFrames?: number;  // Frames required to drop out of current gesture
  swipeSpeedThreshold?: number;  // Minimum speed for swipe trigger
  swipeCooldownMs?: number;      // Debounce window between swipe triggers
}

export class GestureClassifier {
  private currentGesture: GestureType = 'none';
  private candidateGesture: GestureType = 'none';
  private candidateFrames = 0;
  private exitFrames = 0;

  private readonly entryFrames: number;
  private readonly exitFramesReq: number;
  private readonly swipeSpeedThreshold: number;
  private readonly swipeCooldownMs: number;
  private lastSwipeTime = 0;

  constructor({
    entryThresholdFrames = 3,
    exitThresholdFrames = 2,
    swipeSpeedThreshold = 1.8, // Normalized velocity units/sec
    swipeCooldownMs = 450,
  }: GestureStateMachineOptions = {}) {
    this.entryFrames = entryThresholdFrames;
    this.exitFramesReq = exitThresholdFrames;
    this.swipeSpeedThreshold = swipeSpeedThreshold;
    this.swipeCooldownMs = swipeCooldownMs;
  }

  /**
   * Classifies the raw biomechanical hand state
   */
  classifyRaw(bio: HandBiomechanics, velocity: Vec3): { gesture: GestureType; confidence: number } {
    const now = performance.now();

    // 1. Kinetic Swipe Detection (Velocity impulse with directional priority)
    if (now - this.lastSwipeTime > this.swipeCooldownMs) {
      const speedX = Math.abs(velocity.x);
      const speedY = Math.abs(velocity.y);

      if (speedX > this.swipeSpeedThreshold && speedX > speedY * 1.4) {
        this.lastSwipeTime = now;
        return {
          gesture: velocity.x > 0 ? 'swipe_right' : 'swipe_left',
          confidence: Math.min(1.0, speedX / (this.swipeSpeedThreshold * 1.8)),
        };
      } else if (speedY > this.swipeSpeedThreshold && speedY > speedX * 1.4) {
        this.lastSwipeTime = now;
        return {
          gesture: velocity.y > 0 ? 'swipe_down' : 'swipe_up',
          confidence: Math.min(1.0, speedY / (this.swipeSpeedThreshold * 1.8)),
        };
      }
    }

    // 2. PINCH GESTURE: Thumb tip and Index tip close (Normalized 3D distance < 0.40 palm span)
    if (bio.indexPinchDistance < 0.38 && !bio.middle.isExtended && !bio.ring.isExtended) {
      const confidence = Math.max(0.6, 1.0 - bio.indexPinchDistance / 0.38);
      return { gesture: 'pinch', confidence };
    }

    // 3. FIST GESTURE: All fingers curled (extendedCount <= 1 and flexions > 55°)
    if (
      !bio.index.isExtended &&
      !bio.middle.isExtended &&
      !bio.ring.isExtended &&
      !bio.pinky.isExtended &&
      bio.index.curlRatio > 0.65 &&
      bio.middle.curlRatio > 0.65
    ) {
      return { gesture: 'fist', confidence: 0.95 };
    }

    // 4. POINT GESTURE: Only Index extended, Middle/Ring/Pinky tightly curled
    if (
      bio.index.isExtended &&
      !bio.middle.isExtended &&
      !bio.ring.isExtended &&
      !bio.pinky.isExtended &&
      bio.middle.curlRatio > 0.6
    ) {
      return { gesture: 'point', confidence: 0.92 };
    }

    // 5. VICTORY / PEACE: Index & Middle extended, Ring & Pinky curled
    if (
      bio.index.isExtended &&
      bio.middle.isExtended &&
      !bio.ring.isExtended &&
      !bio.pinky.isExtended &&
      bio.ring.curlRatio > 0.55
    ) {
      return { gesture: 'victory', confidence: 0.90 };
    }

    // 6. THUMBS UP: Thumb extended upwards, others curled
    if (
      bio.thumb.isExtended &&
      !bio.index.isExtended &&
      !bio.middle.isExtended &&
      !bio.ring.isExtended &&
      !bio.pinky.isExtended
    ) {
      return { gesture: 'thumbs_up', confidence: 0.88 };
    }

    // 7. OPEN PALM: 4+ fingers extended and facing camera
    if (bio.extendedCount >= 4) {
      return { gesture: 'open', confidence: 0.85 };
    }

    return { gesture: 'none', confidence: 0.2 };
  }

  /**
   * Processes through the hysteresis state machine to eliminate flickering
   */
  update(bio: HandBiomechanics, velocity: Vec3): GestureClassification {
    const raw = this.classifyRaw(bio, velocity);

    // Instant bypass for dynamic swipes
    if (raw.gesture.startsWith('swipe_')) {
      this.currentGesture = raw.gesture;
      this.candidateFrames = this.entryFrames;
      this.exitFrames = 0;
      return {
        gesture: raw.gesture,
        confidence: raw.confidence,
        pinchDistance: bio.indexPinchDistance,
        rotationDelta: { x: bio.palmCenter.y, y: bio.palmCenter.x, roll: bio.orientation.roll },
        isFrozen: false,
      };
    }

    // State machine smoothing
    if (raw.gesture === this.currentGesture) {
      this.candidateGesture = raw.gesture;
      this.candidateFrames = this.entryFrames;
      this.exitFrames = 0;
    } else {
      if (raw.gesture === this.candidateGesture) {
        this.candidateFrames++;
        if (this.candidateFrames >= this.entryFrames) {
          this.currentGesture = raw.gesture;
          this.exitFrames = 0;
        }
      } else {
        this.candidateGesture = raw.gesture;
        this.candidateFrames = 1;
        this.exitFrames++;
      }

      if (this.exitFrames >= this.exitFramesReq && raw.gesture === 'none') {
        this.currentGesture = 'none';
      }
    }

    const isFrozen = this.currentGesture === 'fist';

    return {
      gesture: this.currentGesture,
      confidence: raw.confidence,
      pinchDistance: bio.indexPinchDistance,
      rotationDelta: {
        x: bio.palmCenter.y,
        y: bio.palmCenter.x,
        roll: bio.orientation.roll,
      },
      pointerRay: this.currentGesture === 'point' ? {
        origin: bio.palmCenter,
        direction: bio.orientation.normal,
      } : undefined,
      isFrozen,
    };
  }

  reset(): void {
    this.currentGesture = 'none';
    this.candidateGesture = 'none';
    this.candidateFrames = 0;
    this.exitFrames = 0;
    this.lastSwipeTime = 0;
  }
}
