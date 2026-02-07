import { CONFIG } from './config';
import type { ShiftDirection } from './state';
import type { Point } from './types';

export const initWalls = (gridSize: number, rng: () => number, snake: Point[]): boolean[][] => {
  const walls = Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => false));
  const snakeSet = new Set(snake.map((seg) => `${seg.x},${seg.y}`));

  for (let x = CONFIG.walls.borderClearance; x < gridSize - CONFIG.walls.borderClearance; x += 1) {
    for (let y = CONFIG.walls.borderClearance; y < gridSize - CONFIG.walls.borderClearance; y += 1) {
      if (snakeSet.has(`${x},${y}`)) {
        continue;
      }
      if (rng() < CONFIG.walls.density) {
        walls[x][y] = true;
      }
    }
  }

  return walls;
};

export const planShift = (rng: () => number): ShiftDirection => {
  const roll = Math.floor(rng() * 4);
  return roll === 0 ? 'LEFT' : roll === 1 ? 'RIGHT' : roll === 2 ? 'UP' : 'DOWN';
};

export const applyShift = (walls: boolean[][], direction: ShiftDirection): boolean[][] => {
  const size = walls.length;
  const next = Array.from({ length: size }, () => Array.from({ length: size }, () => false));

  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) {
      if (!walls[x][y]) {
        continue;
      }
      let nx = x;
      let ny = y;
      switch (direction) {
        case 'LEFT':
          nx = (x - 1 + size) % size;
          break;
        case 'RIGHT':
          nx = (x + 1) % size;
          break;
        case 'UP':
          ny = (y - 1 + size) % size;
          break;
        case 'DOWN':
          ny = (y + 1) % size;
          break;
      }
      next[nx][ny] = true;
    }
  }

  return next;
};

export const isSafeShift = (walls: boolean[][], snake: Point[], direction: ShiftDirection): boolean => {
  const size = walls.length;
  const snakeSet = new Set(snake.map((seg) => `${seg.x},${seg.y}`));

  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) {
      if (!walls[x][y]) {
        continue;
      }
      let nx = x;
      let ny = y;
      switch (direction) {
        case 'LEFT':
          nx = (x - 1 + size) % size;
          break;
        case 'RIGHT':
          nx = (x + 1) % size;
          break;
        case 'UP':
          ny = (y - 1 + size) % size;
          break;
        case 'DOWN':
          ny = (y + 1) % size;
          break;
      }
      if (snakeSet.has(`${nx},${ny}`)) {
        return false;
      }
    }
  }

  return true;
};
