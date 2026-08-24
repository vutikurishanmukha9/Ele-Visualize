/**
 * 3D Hand Biomechanics & Spatial Kinematics
 *
 * Provides analytical geometric calculations for 3D human hands:
 * - 3D Vector algebra (dot, cross, norm, angle)
 * - Anatomical joint flexion angles (MCP, PIP, DIP)
 * - 3D Palm normal plane (pitch, yaw, roll)
 * - Scale-invariant normalized pinch metric
 * - Kinetic spatial velocity tracking
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface HandOrientation {
  pitch: number; // In radians (-PI/2 to PI/2)
  yaw: number;   // In radians (-PI to PI)
  roll: number;  // In radians (-PI to PI)
  normal: Vec3;  // Unit normal vector pointing out from the palm
}

export interface FingerState {
  isExtended: boolean;
  flexionAngle: number; // In degrees (0 = fully extended straight, 180 = fully curled)
  curlRatio: number;    // Normalized 0.0 (extended) to 1.0 (curled)
}

export interface HandBiomechanics {
  palmCenter: Vec3;
  palmSpan: number; // Pixel/normalized scale of the palm (Wrist to Middle MCP)
  orientation: HandOrientation;
  thumb: FingerState;
  index: FingerState;
  middle: FingerState;
  ring: FingerState;
  pinky: FingerState;
  extendedCount: number;
  indexPinchDistance: number;  // Normalized 3D distance between Thumb tip & Index tip
  middlePinchDistance: number; // Normalized 3D distance between Thumb tip & Middle tip
  isFacingCamera: boolean;
}

// Landmark Indices from MediaPipe Hand Model
export const LM = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

// 3D Vector Math Helpers
export function sub3(a: Landmark, b: Landmark): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) };
}

export function add3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function scale3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function norm3(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1e-6;
}

export function normalize3(v: Vec3): Vec3 {
  const n = norm3(v);
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

export function dist3(a: Landmark, b: Landmark): number {
  return norm3(sub3(a, b));
}

/**
 * Computes the 3D joint angle in radians formed by 3 points: A - B - C
 * B is the joint vertex.
 */
export function jointAngleRad(a: Landmark, b: Landmark, c: Landmark): number {
  const ba = sub3(a, b);
  const bc = sub3(c, b);
  const cosTheta = dot3(ba, bc) / (norm3(ba) * norm3(bc));
  return Math.acos(Math.max(-1, Math.min(1, cosTheta)));
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Calculates anatomical finger flexion state
 */
export function calculateFingerFlexion(
  mcp: Landmark,
  pip: Landmark,
  dip: Landmark,
  tip: Landmark,
  palmSpan: number,
  isThumb: boolean = false
): FingerState {
  if (isThumb) {
    // Thumb flexion is angle between MCP -> IP -> TIP and distance to Pinky MCP
    const angleRad = jointAngleRad(mcp, pip, tip);
    const angleDeg = radToDeg(angleRad);
    const isExtended = angleDeg > 145 && dist3(tip, mcp) > palmSpan * 0.65;
    const curlRatio = Math.max(0, Math.min(1, (170 - angleDeg) / 70));
    return {
      isExtended,
      flexionAngle: 180 - angleDeg,
      curlRatio,
    };
  }

  // Interphalangeal joint angle: MCP -> PIP -> TIP
  const pipAngleRad = jointAngleRad(mcp, pip, dip);
  const dipAngleRad = jointAngleRad(pip, dip, tip);
  const totalAngleDeg = (radToDeg(pipAngleRad) + radToDeg(dipAngleRad)) / 2;

  // Straight finger has joint angles ~180° (flexion angle ~0°)
  // Curled finger has joint angles < 120° (flexion angle > 60°)
  const flexionAngle = Math.max(0, 180 - totalAngleDeg);
  const isExtended = totalAngleDeg > 140;
  const curlRatio = Math.max(0, Math.min(1, flexionAngle / 85));

  return {
    isExtended,
    flexionAngle,
    curlRatio,
  };
}

/**
 * Analyzes full 3D hand biomechanics from 21 landmarks
 */
export function analyzeBiomechanics(landmarks: Landmark[], handedness: 'Right' | 'Left' = 'Right'): HandBiomechanics {
  const wrist = landmarks[LM.WRIST];
  const indexMcp = landmarks[LM.INDEX_MCP];
  const middleMcp = landmarks[LM.MIDDLE_MCP];
  const pinkyMcp = landmarks[LM.PINKY_MCP];
  const thumbTip = landmarks[LM.THUMB_TIP];
  const indexTip = landmarks[LM.INDEX_TIP];
  const middleTip = landmarks[LM.MIDDLE_TIP];

  // Palm center approximation (centroid of wrist, index MCP, middle MCP, pinky MCP)
  const palmCenter: Vec3 = {
    x: (wrist.x + indexMcp.x + middleMcp.x + pinkyMcp.x) * 0.25,
    y: (wrist.y + indexMcp.y + middleMcp.y + pinkyMcp.y) * 0.25,
    z: ((wrist.z ?? 0) + (indexMcp.z ?? 0) + (middleMcp.z ?? 0) + (pinkyMcp.z ?? 0)) * 0.25,
  };

  // Palm scale reference span (Wrist to Middle MCP distance)
  const palmSpan = Math.max(dist3(wrist, middleMcp), 0.05);

  // Compute 3D Palm Orientation
  // u: Wrist -> Index MCP, v: Wrist -> Pinky MCP
  const u = sub3(indexMcp, wrist);
  const v = sub3(pinkyMcp, wrist);
  let palmNormal = normalize3(cross3(u, v));

  // Mirror normal based on handedness
  if (handedness === 'Left') {
    palmNormal = scale3(palmNormal, -1);
  }

  // Pitch (tilt up/down) and Yaw (turn left/right) and Roll (rotation around palm normal)
  const pitch = Math.asin(Math.max(-1, Math.min(1, -palmNormal.y)));
  const yaw = Math.atan2(palmNormal.x, palmNormal.z);
  const roll = Math.atan2(u.y, u.x);

  const orientation: HandOrientation = {
    pitch,
    yaw,
    roll,
    normal: palmNormal,
  };

  // Is palm facing toward the camera? (In MediaPipe, +Z is into screen, camera is -Z)
  const isFacingCamera = palmNormal.z < 0.25;

  // Individual finger states
  const thumb = calculateFingerFlexion(landmarks[LM.THUMB_CMC], landmarks[LM.THUMB_MCP], landmarks[LM.THUMB_IP], thumbTip, palmSpan, true);
  const index = calculateFingerFlexion(landmarks[LM.INDEX_MCP], landmarks[LM.INDEX_PIP], landmarks[LM.INDEX_DIP], indexTip, palmSpan);
  const middle = calculateFingerFlexion(landmarks[LM.MIDDLE_MCP], landmarks[LM.MIDDLE_PIP], landmarks[LM.MIDDLE_DIP], middleTip, palmSpan);
  const ring = calculateFingerFlexion(landmarks[LM.RING_MCP], landmarks[LM.RING_PIP], landmarks[LM.RING_DIP], landmarks[LM.RING_TIP], palmSpan);
  const pinky = calculateFingerFlexion(landmarks[LM.PINKY_MCP], landmarks[LM.PINKY_PIP], landmarks[LM.PINKY_DIP], landmarks[LM.PINKY_TIP], palmSpan);

  const extendedCount = [index.isExtended, middle.isExtended, ring.isExtended, pinky.isExtended].filter(Boolean).length + (thumb.isExtended ? 1 : 0);

  // Scale-invariant 3D pinch metrics
  const indexPinchDistance = dist3(thumbTip, indexTip) / palmSpan;
  const middlePinchDistance = dist3(thumbTip, middleTip) / palmSpan;

  return {
    palmCenter,
    palmSpan,
    orientation,
    thumb,
    index,
    middle,
    ring,
    pinky,
    extendedCount,
    indexPinchDistance,
    middlePinchDistance,
    isFacingCamera,
  };
}

/**
 * 3D Spatial Velocity & Kinetic Motion Tracker
 */
export class KineticVelocityTracker {
  private history: { x: number; y: number; z: number; time: number }[] = [];
  private readonly maxWindowMs: number;

  constructor(maxWindowMs = 250) {
    this.maxWindowMs = maxWindowMs;
  }

  add(pos: Vec3, time = performance.now()): void {
    this.history.push({ ...pos, time });
    const cutoff = time - this.maxWindowMs;
    while (this.history.length > 0 && this.history[0].time < cutoff) {
      this.history.shift();
    }
  }

  getVelocity(): Vec3 {
    if (this.history.length < 2) return { x: 0, y: 0, z: 0 };
    const first = this.history[0];
    const last = this.history[this.history.length - 1];
    const dt = Math.max((last.time - first.time) / 1000.0, 0.01);

    return {
      x: (last.x - first.x) / dt,
      y: (last.y - first.y) / dt,
      z: (last.z - first.z) / dt,
    };
  }

  getSpeed(): number {
    return norm3(this.getVelocity());
  }

  reset(): void {
    this.history = [];
  }
}
