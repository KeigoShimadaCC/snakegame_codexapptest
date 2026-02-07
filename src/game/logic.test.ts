import { describe, expect, it } from 'vitest';
import { initGame, setDirection, spawnFood, step } from './logic';
import type { GameState, Point } from './types';

const makeRng = (values: number[]) => {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
};

const makeState = (overrides: Partial<GameState>): GameState => ({
  snake: [{ x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }],
  direction: 'right',
  pendingDirection: null,
  food: { x: 4, y: 2 },
  score: 0,
  isGameOver: false,
  ...overrides
});

const toSet = (points: Point[]) => new Set(points.map((p) => `${p.x},${p.y}`));

describe('snake logic', () => {
  it('moves the head forward', () => {
    const rng = makeRng([0.1]);
    const state = makeState({});
    const next = step(state, 10, rng);
    expect(next.snake[0]).toEqual({ x: 3, y: 2 });
  });

  it('rejects opposite direction changes', () => {
    const state = makeState({});
    const next = setDirection(state, 'left');
    expect(next.pendingDirection).toBeNull();
  });

  it('detects wall collision', () => {
    const rng = makeRng([0.1]);
    const state = makeState({
      snake: [{ x: 9, y: 0 }, { x: 8, y: 0 }, { x: 7, y: 0 }],
      direction: 'right'
    });
    const next = step(state, 10, rng);
    expect(next.isGameOver).toBe(true);
  });

  it('detects self collision', () => {
    const rng = makeRng([0.1]);
    const state = makeState({
      snake: [
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 1, y: 3 },
        { x: 1, y: 2 }
      ],
      direction: 'down'
    });
    const next = step(state, 10, rng);
    expect(next.isGameOver).toBe(true);
  });

  it('grows and scores when eating food', () => {
    const rng = makeRng([0.0, 0.0]);
    const state = makeState({
      snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 0 }],
      direction: 'right',
      food: { x: 2, y: 1 }
    });
    const next = step(state, 5, rng);
    expect(next.snake.length).toBe(4);
    expect(next.score).toBe(1);
  });

  it('spawns food outside the snake', () => {
    const rng = makeRng([0.0, 0.0, 0.5, 0.5]);
    const snake = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ];
    const food = spawnFood(snake, 3, rng);
    expect(toSet(snake).has(`${food.x},${food.y}`)).toBe(false);
  });

  it('creates deterministic initial state with rng', () => {
    const rng = makeRng([0.2, 0.3, 0.4, 0.5]);
    const game = initGame(10, rng);
    expect(game.food).toEqual({ x: 2, y: 3 });
  });
});
