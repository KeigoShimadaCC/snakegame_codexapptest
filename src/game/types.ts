export type Point = { x: number; y: number };

export type Direction = 'up' | 'down' | 'left' | 'right';

export type GameState = {
  snake: Point[];
  direction: Direction;
  pendingDirection: Direction | null;
  food: Point;
  score: number;
  isGameOver: boolean;
};
