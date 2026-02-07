export const CONFIG = {
  gridSize: 20,
  cellSize: 20,
  baseTickMs: 120,
  minTickMs: 95,
  speedRampDurationMs: 8 * 60 * 1000,
  shiftIntervalMs: 12_000,
  shiftWarningMs: 600,
  applesPerShift: 4,
  flowWindowMs: 5_000,
  flowMultipliers: [1.0, 1.5, 2.0] as const,
  phaseChargesMax: 2,
  phaseWindowMoves: 2,
  applesPerPhaseCharge: 3,
  score: {
    apple: 10,
    phaseChargeBonus: 25
  },
  walls: {
    density: 0.12,
    borderClearance: 1
  }
};
