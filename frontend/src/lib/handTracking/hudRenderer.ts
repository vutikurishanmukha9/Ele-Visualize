/**
 * Next-Gen Holographic HUD 2D Canvas Renderer
 *
 * Renders an Apple Vision Pro / Cyberpunk style glowing skeleton HUD:
 * - Anti-aliased holographic bone connections with gradient strokes
 * - 3D depth-scaled joint spheres with luminescent halos
 * - Gesture-reactive energy fingertip rings
 * - Holographic palm compass and laser pointing vector
 */

import { Landmark, HandBiomechanics } from './biomechanics';
import { GestureType } from './gestureClassifier';

// Skeletal Connection Pairs
const BONE_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Knuckle Arch
  [5, 9], [9, 13], [13, 17],
];

// Fingertip Indices
const FINGERTIPS = [4, 8, 12, 16, 20];

// Gesture Color Palette
export const GESTURE_COLORS: Record<GestureType, { primary: string; glow: string; text: string }> = {
  none: { primary: '#64748b', glow: 'rgba(100, 116, 139, 0.4)', text: 'Tracking...' },
  open: { primary: '#00f0ff', glow: 'rgba(0, 240, 255, 0.6)', text: '3D Orbit Pan' },
  pinch: { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.7)', text: 'Pinch Zoom & Grab' },
  fist: { primary: '#ef4444', glow: 'rgba(239, 68, 68, 0.7)', text: 'Fist Locked' },
  point: { primary: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.7)', text: 'Laser Pointer' },
  victory: { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.7)', text: 'Orbitals Toggle' },
  thumbs_up: { primary: '#ec4899', glow: 'rgba(236, 72, 153, 0.7)', text: 'Camera Reset' },
  swipe_left: { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.8)', text: 'Swipe Next' },
  swipe_right: { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.8)', text: 'Swipe Prev' },
  swipe_up: { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.8)', text: 'Swipe Up' },
  swipe_down: { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.8)', text: 'Swipe Down' },
};

export class HandHudRenderer {
  private pulsePhase = 0;

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    landmarks: Landmark[] | null,
    bio: HandBiomechanics | null,
    gesture: GestureType,
    confidence: number,
    mirrored = true
  ): void {
    ctx.clearRect(0, 0, width, height);
    if (!landmarks || landmarks.length === 0 || !bio) return;

    this.pulsePhase += 0.08;
    const colors = GESTURE_COLORS[gesture] || GESTURE_COLORS.none;

    // Coordinate mapping helper
    const mapX = (x: number) => (mirrored ? (1.0 - x) * width : x * width);
    const mapY = (y: number) => y * height;

    // 1. Draw Holographic Bone Lines with Radial Glowing Gradient
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const [fromIdx, toIdx] of BONE_CONNECTIONS) {
      const p1 = landmarks[fromIdx];
      const p2 = landmarks[toIdx];

      const x1 = mapX(p1.x);
      const y1 = mapY(p1.y);
      const x2 = mapX(p2.x);
      const y2 = mapY(p2.y);

      // Outer glow line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = colors.glow;
      ctx.lineWidth = 4.5;
      ctx.stroke();

      // Inner crisp neon line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2.0;
      ctx.stroke();
    }
    ctx.restore();

    // 2. Draw Skeletal Joint Nodes (Depth-scaled)
    ctx.save();
    landmarks.forEach((lm, index) => {
      const x = mapX(lm.x);
      const y = mapY(lm.y);
      const zScale = Math.max(0.6, Math.min(1.4, 1.0 - (lm.z || 0) * 1.5));
      const radius = (index === 0 ? 5.5 : 3.5) * zScale;

      // Glow halo
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = colors.glow;
      ctx.fill();

      // Core sphere
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? colors.primary : '#ffffff';
      ctx.fill();
    });
    ctx.restore();

    // 3. Draw Pulsating Energy Halos on Fingertips
    ctx.save();
    const pulseSize = 1.0 + Math.sin(this.pulsePhase) * 0.25;
    for (const tipIdx of FINGERTIPS) {
      const tip = landmarks[tipIdx];
      const x = mapX(tip.x);
      const y = mapY(tip.y);
      const ringRadius = 7.0 * pulseSize;

      ctx.beginPath();
      ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    ctx.restore();

    // 4. Draw Central Palm Holographic Reticle & Orientation Compass
    ctx.save();
    const cx = mapX(bio.palmCenter.x);
    const cy = mapY(bio.palmCenter.y);
    const reticleRadius = 16.0;

    // Palm Ring
    ctx.beginPath();
    ctx.arc(cx, cy, reticleRadius, 0, Math.PI * 2);
    ctx.strokeStyle = colors.glow;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Orientation Heading Line (Roll angle)
    const rollAngle = mirrored ? -bio.orientation.roll : bio.orientation.roll;
    const nx = cx + Math.cos(rollAngle - Math.PI / 2) * (reticleRadius + 8);
    const ny = cy + Math.sin(rollAngle - Math.PI / 2) * (reticleRadius + 8);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(nx, ny, 3, 0, Math.PI * 2);
    ctx.fillStyle = colors.primary;
    ctx.fill();
    ctx.restore();

    // 5. Laser Raycast Pointer (When in POINT mode)
    if (gesture === 'point') {
      const indexTip = landmarks[8];
      const indexPip = landmarks[6];
      const tx = mapX(indexTip.x);
      const ty = mapY(indexTip.y);
      const px = mapX(indexPip.x);
      const py = mapY(indexPip.y);

      const dirX = tx - px;
      const dirY = ty - py;
      const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
      const rayLen = Math.max(width, height) * 0.8;

      const endX = tx + (dirX / len) * rayLen;
      const endY = ty + (dirY / len) * rayLen;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 3]);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(endX, endY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#a855f7';
      ctx.fill();
      ctx.restore();
    }
  }
}
