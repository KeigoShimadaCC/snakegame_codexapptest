import type { Direction, Point } from './types';

export type ShiftDirection = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';

export type GameState = {
  snake: Point[];
  direction: Direction;
  pendingDirections: Direction[];
  apple: Point;
  score: number;
  tickMs: number;
  elapsedMs: number;
  walls: boolean[][];
  shiftTimerMs: number;
  shiftWarningMs: number;
  pendingShift: ShiftDirection | null;
  applesSinceShift: number;
  flowTimerMs: number;
  flowMultiplier: 1 | 1.5 | 2;
  applesSincePhase: number;
  phaseCharges: number;
  phaseWindowMoves: number;
  isGameOver: boolean;
};
