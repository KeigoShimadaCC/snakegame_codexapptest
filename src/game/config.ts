export const CONFIG = {
  gridSize: 20,
  cellSize: 20,
  baseTickMs: 120,
  minTickMs: 95,
  speedRampDurationMs: 8 * 60 * 1000,
  shiftIntervalMs: 12_000,
  shiftWarningMs: 600,
  foodsPerShift: 4,
  flowWindowMs: 5_000,
  flowMultipliers: [1.0, 1.5, 2.0] as const,
  phaseChargesMax: 2,
  phaseWindowMoves: 2,
  foodsPerPhaseCharge: 3,
  burstChargesMax: 2,
  burstRadius: 2,
  score: {
    redApple: 10,
    blueBird: 18,
    yellowBanana: 8,
    strawberry: 24,
    clover: 6,
    acorn: 6,
    glowSeed: 10,
    phaseChargeBonus: 25
  },
  items: {
    birdMoveChance: 0.6,
    bananaSlowMs: 5_000,
    bananaSlowMultiplier: 1.2,
    acornClearWalls: 4
  },
  foodTargets: {
    RED_APPLE: 2,
    BLUE_BIRD: 1,
    YELLOW_BANANA: 1,
    PINK_STRAWBERRY: 1,
    GREEN_CLOVER: 1,
    GOLD_ACORN: 1,
    GLOW_SEED: 1
  },
  walls: {
    startDensity: 0.04,
    maxDensity: 0.18,
    densityByLength: 0.002,
    spawnPerShift: 3,
    clearOnPhase: 4,
    borderClearance: 1
  }
};
