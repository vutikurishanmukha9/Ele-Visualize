/**
 * One-Euro Filter (CHI 2012)
 *
 * An adaptive first-order low-pass filter for noisy human computer interaction signals.
 * Dynamically adjusts cutoff frequency based on movement speed:
 * - Low speed (stationary): Low cutoff frequency = eliminates jitter and noise completely.
 * - High speed (rapid motion): High cutoff frequency = eliminates lag and latency completely.
 *
 * Reference: Casiez, G., Roussel, N. and Vogel, D. (2012).
 * 1 € Filter: A Simple Speed-based Low-pass Filter for Noisy Input in Interactive Systems.
 */

export class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  filter(value: number, alpha: number): number {
    if (this.y === null) {
      this.s = value;
      this.y = value;
      return value;
    }
    this.s = alpha * value + (1 - alpha) * this.s!;
    this.y = this.s;
    return this.y;
  }

  hasLastRawValue(): boolean {
    return this.y !== null;
  }

  last(): number {
    return this.y ?? 0;
  }

  reset(value: number | null = null): void {
    this.y = value;
    this.s = value;
  }
}

export interface OneEuroParams {
  minCutoff?: number; // Minimum cutoff frequency in Hz (default: 1.0)
  beta?: number;      // Speed coefficient (default: 0.007)
  dCutoff?: number;   // Cutoff frequency for derivative in Hz (default: 1.0)
}

export class OneEuroFilter1D {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter: LowPassFilter;
  private dxFilter: LowPassFilter;
  private lastTime: number | null = null;

  constructor({ minCutoff = 1.0, beta = 0.007, dCutoff = 1.0 }: OneEuroParams = {}) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  filter(value: number, timestamp: number = performance.now()): number {
    if (this.lastTime === null) {
      this.lastTime = timestamp;
      return this.xFilter.filter(value, 1.0);
    }

    const dt = Math.max((timestamp - this.lastTime) / 1000.0, 1e-4);
    this.lastTime = timestamp;

    // Estimate derivative (velocity)
    const prevX = this.xFilter.last();
    const dx = (value - prevX) / dt;
    const edx = this.dxFilter.filter(dx, this.alpha(this.dCutoff, dt));

    // Dynamic cutoff frequency
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(value, this.alpha(cutoff, dt));
  }

  reset(): void {
    this.lastTime = null;
    this.xFilter.reset();
    this.dxFilter.reset();
  }
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export class OneEuroFilter3D {
  private fx: OneEuroFilter1D;
  private fy: OneEuroFilter1D;
  private fz: OneEuroFilter1D;

  constructor(params?: OneEuroParams) {
    this.fx = new OneEuroFilter1D(params);
    this.fy = new OneEuroFilter1D(params);
    this.fz = new OneEuroFilter1D(params);
  }

  filter(point: Point3D, timestamp: number = performance.now()): Point3D {
    return {
      x: this.fx.filter(point.x, timestamp),
      y: this.fy.filter(point.y, timestamp),
      z: this.fz.filter(point.z, timestamp),
    };
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
    this.fz.reset();
  }
}

/**
 * Multi-landmark 3D One-Euro Filter Bank
 * Smooths all 21 hand landmarks concurrently with independent velocity adaptation.
 */
export class LandmarkFilterBank {
  private filters: OneEuroFilter3D[] = [];

  update(landmarks: Point3D[], timestamp: number = performance.now()): Point3D[] {
    if (this.filters.length !== landmarks.length) {
      this.filters = landmarks.map(() => new OneEuroFilter3D({ minCutoff: 1.2, beta: 0.008, dCutoff: 1.0 }));
    }

    return landmarks.map((lm, i) => this.filters[i].filter(lm, timestamp));
  }

  reset(): void {
    this.filters.forEach(f => f.reset());
    this.filters = [];
  }
}
