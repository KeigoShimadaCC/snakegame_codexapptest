import { CONFIG } from './config';
import type { ShiftDirection } from './state';
import type { Point } from './types';

const coordKey = (x: number, y: number) => `${x},${y}`;

export const initWalls = (gridSize: number, rng: () => number, snake: Point[]): boolean[][] => {
  const walls = Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => false));
  const snakeSet = new Set(snake.map((seg) => coordKey(seg.x, seg.y)));

  for (let x = CONFIG.walls.borderClearance; x < gridSize - CONFIG.walls.borderClearance; x += 1) {
    for (let y = CONFIG.walls.borderClearance; y < gridSize - CONFIG.walls.borderClearance; y += 1) {
      if (snakeSet.has(coordKey(x, y))) {
        continue;
      }
      if (rng() < CONFIG.walls.startDensity) {
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
  const snakeSet = new Set(snake.map((seg) => coordKey(seg.x, seg.y)));

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
      if (snakeSet.has(coordKey(nx, ny))) {
        return false;
      }
    }
  }

  return true;
};

export const countWalls = (walls: boolean[][]): number =>
  walls.reduce((sum, col) => sum + col.filter(Boolean).length, 0);

export const targetWallCount = (gridSize: number, snakeLength: number): number => {
  const baseDensity = CONFIG.walls.startDensity + CONFIG.walls.densityByLength * (snakeLength - 3);
  const density = Math.min(CONFIG.walls.maxDensity, Math.max(CONFIG.walls.startDensity, baseDensity));
  return Math.floor(gridSize * gridSize * density);
};

export const addWalls = (
  walls: boolean[][],
  rng: () => number,
  snake: Point[],
  apple: Point,
  targetCount: number,
  limit: number
): boolean[][] => {
  const size = walls.length;
  const next = walls.map((col) => col.slice());
  const snakeSet = new Set(snake.map((seg) => coordKey(seg.x, seg.y)));
  snakeSet.add(coordKey(apple.x, apple.y));

  let current = countWalls(next);
  let attempts = 0;

  while (current < targetCount && attempts < limit * 10) {
    const x = Math.floor(rng() * size);
    const y = Math.floor(rng() * size);
    attempts += 1;
    if (next[x][y]) {
      continue;
    }
    if (snakeSet.has(coordKey(x, y))) {
      continue;
    }
    if (x < CONFIG.walls.borderClearance || y < CONFIG.walls.borderClearance) {
      continue;
    }
    if (x >= size - CONFIG.walls.borderClearance || y >= size - CONFIG.walls.borderClearance) {
      continue;
    }
    next[x][y] = true;
    current += 1;
    if (current >= targetCount || current % limit === 0) {
      break;
    }
  }

  return next;
};

export const removeWalls = (walls: boolean[][], rng: () => number, count: number): boolean[][] => {
  const size = walls.length;
  const next = walls.map((col) => col.slice());
  let removed = 0;
  let attempts = 0;

  while (removed < count && attempts < count * 20) {
    const x = Math.floor(rng() * size);
    const y = Math.floor(rng() * size);
    attempts += 1;
    if (!next[x][y]) {
      continue;
    }
    next[x][y] = false;
    removed += 1;
  }

  return next;
};
