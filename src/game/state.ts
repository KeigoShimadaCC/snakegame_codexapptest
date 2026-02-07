import type { Direction, Point } from './types';

export type ShiftDirection = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';

export type FoodType =
  | 'RED_APPLE'
  | 'BLUE_BIRD'
  | 'YELLOW_BANANA'
  | 'PINK_STRAWBERRY'
  | 'GREEN_CLOVER'
  | 'GOLD_ACORN';

export type FoodItem = {
  pos: Point;
  type: FoodType;
  direction?: Direction;
};

export type GameState = {
  snake: Point[];
  direction: Direction;
  pendingDirections: Direction[];
  foods: FoodItem[];
  score: number;
  tickMs: number;
  elapsedMs: number;
  walls: boolean[][];
  shiftTimerMs: number;
  shiftWarningMs: number;
  pendingShift: ShiftDirection | null;
  foodsSinceShift: number;
  flowTimerMs: number;
  flowMultiplier: 1 | 1.5 | 2;
  foodsSincePhase: number;
  phaseCharges: number;
  phaseWindowMoves: number;
  slowTimerMs: number;
  lastEatenType: FoodType | null;
  isGameOver: boolean;
};
