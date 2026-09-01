/**
 * Adaptive Render Quality & Hardware Capability Manager
 * Frame-time budget governor with hysteresis to prevent quality oscillation.
 */

export type QualityTier = 'ULTRA_120' | 'ULTRA_90' | 'HIGH' | 'MEDIUM' | 'LOW' | 'AUTO';

export interface RenderBudgetSettings {
  maxRaymarchSteps: number;
  maxNucleonParticles: number;
  enableBloom: boolean;
  enableDepthOfField: boolean;
  enableDynamicShadows: boolean;
  particleSmearResolution: number;
  targetFrameTimeMs: number;
}

export const QUALITY_PRESETS: Record<Exclude<QualityTier, 'AUTO'>, RenderBudgetSettings> = {
  ULTRA_120: {
    maxRaymarchSteps: 48,
    maxNucleonParticles: 64,
    enableBloom: true,
    enableDepthOfField: true,
    enableDynamicShadows: true,
    particleSmearResolution: 128,
    targetFrameTimeMs: 8.3, // 120 FPS
  },
  ULTRA_90: {
    maxRaymarchSteps: 40,
    maxNucleonParticles: 54,
    enableBloom: true,
    enableDepthOfField: true,
    enableDynamicShadows: true,
    particleSmearResolution: 96,
    targetFrameTimeMs: 11.1, // 90 FPS
  },
  HIGH: {
    maxRaymarchSteps: 32,
    maxNucleonParticles: 48,
    enableBloom: true,
    enableDepthOfField: false,
    enableDynamicShadows: true,
    particleSmearResolution: 64,
    targetFrameTimeMs: 16.6, // 60 FPS
  },
  MEDIUM: {
    maxRaymarchSteps: 20,
    maxNucleonParticles: 32,
    enableBloom: false,
    enableDepthOfField: false,
    enableDynamicShadows: false,
    particleSmearResolution: 48,
    targetFrameTimeMs: 16.6, // 60 FPS
  },
  LOW: {
    maxRaymarchSteps: 12,
    maxNucleonParticles: 18,
    enableBloom: false,
    enableDepthOfField: false,
    enableDynamicShadows: false,
    particleSmearResolution: 32,
    targetFrameTimeMs: 33.3, // 30 FPS
  },
};

export class QualityGovernor {
  private activeTier: QualityTier = 'AUTO';
  private resolvedTier: Exclude<QualityTier, 'AUTO'> = 'HIGH';
  private frameTimes: number[] = [];
  private lastDegradeTimestamp = 0;
  private lastUpgradeTimestamp = 0;
  private readonly DEGRADE_THRESHOLD_MS = 18.0; // If frame time exceeds 18ms
  private readonly UPGRADE_THRESHOLD_MS = 12.0; // If frame time recovers below 12ms
  private readonly HYSTERESIS_COOLDOWN_MS = 4000; // 4s cooldown between adjustments

  constructor(initialTier: QualityTier = 'AUTO') {
    this.activeTier = initialTier;
    if (initialTier !== 'AUTO') {
      this.resolvedTier = initialTier;
    }
  }

  public setTier(tier: QualityTier) {
    this.activeTier = tier;
    if (tier !== 'AUTO') {
      this.resolvedTier = tier;
    }
  }

  public getActiveTier(): QualityTier {
    return this.activeTier;
  }

  public getResolvedSettings(): RenderBudgetSettings {
    return QUALITY_PRESETS[this.resolvedTier];
  }

  /**
   * Records delta frame time in ms and adjusts quality tier with hysteresis if AUTO is enabled.
   */
  public reportFrameTime(deltaMs: number): void {
    if (this.activeTier !== 'AUTO') return;

    this.frameTimes.push(deltaMs);
    if (this.frameTimes.length > 60) this.frameTimes.shift();

    const now = Date.now();
    if (this.frameTimes.length < 30) return;

    // Calculate rolling average
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;

    // Degrade under pressure
    if (avgFrameTime > this.DEGRADE_THRESHOLD_MS && now - this.lastDegradeTimestamp > this.HYSTERESIS_COOLDOWN_MS) {
      if (this.resolvedTier === 'ULTRA_120') this.resolvedTier = 'ULTRA_90';
      else if (this.resolvedTier === 'ULTRA_90') this.resolvedTier = 'HIGH';
      else if (this.resolvedTier === 'HIGH') this.resolvedTier = 'MEDIUM';
      else if (this.resolvedTier === 'MEDIUM') this.resolvedTier = 'LOW';

      this.lastDegradeTimestamp = now;
      this.frameTimes = [];
    }
    // Upgrade on recovery
    else if (avgFrameTime < this.UPGRADE_THRESHOLD_MS && now - this.lastUpgradeTimestamp > this.HYSTERESIS_COOLDOWN_MS * 2) {
      if (this.resolvedTier === 'LOW') this.resolvedTier = 'MEDIUM';
      else if (this.resolvedTier === 'MEDIUM') this.resolvedTier = 'HIGH';
      else if (this.resolvedTier === 'HIGH') this.resolvedTier = 'ULTRA_90';

      this.lastUpgradeTimestamp = now;
      this.frameTimes = [];
    }
  }
}

export const qualityGovernor = new QualityGovernor('AUTO');
