import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { initGame, step } from './logic';
import { applyShift, isSafeShift, initWalls } from './maze';
import type { Point } from './types';

const makeSnake = (points: Point[]) => points;

describe('maze shifts', () => {
  it('shifts walls left by 1 with wrap', () => {
    const walls = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => false));
    walls[1][1] = true;
    const shifted = applyShift(walls, 'LEFT');
    expect(shifted[0][1]).toBe(true);
  });

  it('blocks unsafe shifts into snake', () => {
    const walls = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => false));
    walls[1][1] = true;
    const snake = makeSnake([{ x: 0, y: 1 }]);
    expect(isSafeShift(walls, snake, 'LEFT')).toBe(false);
  });
});

describe('phase wall pass', () => {
  it('consumes a phase charge to pass through a wall once', () => {
    const state = initGame(CONFIG.gridSize, 1);
    state.walls[3][2] = true;
    state.snake = [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 }
    ];
    state.direction = 'right';
    state.phaseCharges = 1;

    const next = step(state, CONFIG.gridSize);
    expect(next.isGameOver).toBe(false);
    expect(next.phaseCharges).toBe(0);
  });
});

describe('flow multiplier', () => {
  it('resets flow when timer expires', () => {
    const state = initGame(CONFIG.gridSize, 1);
    state.flowMultiplier = 2;
    state.flowTimerMs = 0;
    const next = step(state, CONFIG.gridSize);
    expect(next.flowMultiplier).toBe(1);
  });
});
