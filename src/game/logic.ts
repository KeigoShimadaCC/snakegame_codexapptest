import type { Direction, GameState, Point } from './types';

const OPPOSITES: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left'
};

const isSamePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

export const setDirection = (state: GameState, nextDir: Direction): GameState => {
  if (state.isGameOver) {
    return state;
  }

  if (OPPOSITES[state.direction] === nextDir) {
    return state;
  }

  return {
    ...state,
    pendingDirection: nextDir
  };
};

export const spawnFood = (snake: Point[], gridSize: number, rng: () => number): Point => {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const totalCells = gridSize * gridSize;

  if (occupied.size >= totalCells) {
    return { x: 0, y: 0 };
  }

  let x = 0;
  let y = 0;
  let attempts = 0;

  do {
    x = Math.floor(rng() * gridSize);
    y = Math.floor(rng() * gridSize);
    attempts += 1;
  } while (occupied.has(`${x},${y}`) && attempts < totalCells * 2);

  if (occupied.has(`${x},${y}`)) {
    for (let yy = 0; yy < gridSize; yy += 1) {
      for (let xx = 0; xx < gridSize; xx += 1) {
        if (!occupied.has(`${xx},${yy}`)) {
          return { x: xx, y: yy };
        }
      }
    }
  }

  return { x, y };
};

export const initGame = (gridSize: number, rng: () => number): GameState => {
  const mid = Math.floor(gridSize / 2);
  const snake: Point[] = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid }
  ];

  return {
    snake,
    direction: 'right',
    pendingDirection: null,
    food: spawnFood(snake, gridSize, rng),
    score: 0,
    isGameOver: false
  };
};

const nextHead = (head: Point, direction: Direction): Point => {
  switch (direction) {
    case 'up':
      return { x: head.x, y: head.y - 1 };
    case 'down':
      return { x: head.x, y: head.y + 1 };
    case 'left':
      return { x: head.x - 1, y: head.y };
    case 'right':
      return { x: head.x + 1, y: head.y };
  }
};

export const step = (state: GameState, gridSize: number, rng: () => number): GameState => {
  if (state.isGameOver) {
    return state;
  }

  const direction = state.pendingDirection ?? state.direction;
  const head = state.snake[0];
  const newHead = nextHead(head, direction);

  if (newHead.x < 0 || newHead.y < 0 || newHead.x >= gridSize || newHead.y >= gridSize) {
    return {
      ...state,
      direction,
      pendingDirection: null,
      isGameOver: true
    };
  }

  const willEat = isSamePoint(newHead, state.food);
  const bodyToCheck = willEat ? state.snake : state.snake.slice(0, -1);

  if (bodyToCheck.some((segment) => isSamePoint(segment, newHead))) {
    return {
      ...state,
      direction,
      pendingDirection: null,
      isGameOver: true
    };
  }

  const nextSnake = [newHead, ...state.snake];
  if (!willEat) {
    nextSnake.pop();
  }

  return {
    snake: nextSnake,
    direction,
    pendingDirection: null,
    food: willEat ? spawnFood(nextSnake, gridSize, rng) : state.food,
    score: willEat ? state.score + 1 : state.score,
    isGameOver: false
  };
};
