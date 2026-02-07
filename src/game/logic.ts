import { CONFIG } from './config';
import type { Action } from './input';
import { applyShift, initWalls, isSafeShift, planShift } from './maze';
import type { GameState, ShiftDirection } from './state';
import type { Direction, Point } from './types';

const OPPOSITES: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left'
};

const isSamePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const randomApple = (gridSize: number, rng: () => number, snake: Point[], walls: boolean[][]): Point => {
  const totalCells = gridSize * gridSize;
  let x = 0;
  let y = 0;
  let attempts = 0;

  const isBlocked = (px: number, py: number) =>
    walls[px]?.[py] || snake.some((segment) => segment.x === px && segment.y === py);

  do {
    x = Math.floor(rng() * gridSize);
    y = Math.floor(rng() * gridSize);
    attempts += 1;
  } while (isBlocked(x, y) && attempts < totalCells * 2);

  if (isBlocked(x, y)) {
    for (let yy = 0; yy < gridSize; yy += 1) {
      for (let xx = 0; xx < gridSize; xx += 1) {
        if (!isBlocked(xx, yy)) {
          x = xx;
          y = yy;
          break;
        }
      }
    }
  }

  return { x, y };
};

export const initGame = (gridSize = CONFIG.gridSize, seed = Date.now()): GameState => {
  let t = seed >>> 0;
  const rng = () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };

  const mid = Math.floor(gridSize / 2);
  const snake: Point[] = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid }
  ];

  const walls = initWalls(gridSize, rng, snake);
  const apple = randomApple(gridSize, rng, snake, walls);

  return {
    snake,
    direction: 'right',
    pendingDirections: [],
    apple,
    score: 0,
    tickMs: CONFIG.baseTickMs,
    elapsedMs: 0,
    walls,
    shiftTimerMs: CONFIG.shiftIntervalMs,
    shiftWarningMs: 0,
    pendingShift: null,
    applesSinceShift: 0,
    flowTimerMs: 0,
    flowMultiplier: 1,
    applesSincePhase: 0,
    phaseCharges: 0,
    phaseWindowMoves: 0,
    isGameOver: false
  };
};

const getNextDirection = (state: GameState): { direction: Direction; remaining: Direction[] } => {
  if (state.pendingDirections.length === 0) {
    return { direction: state.direction, remaining: state.pendingDirections };
  }
  const [next, ...rest] = state.pendingDirections;
  return { direction: next, remaining: rest };
};

export const applyAction = (state: GameState, action: Action): GameState => {
  if (state.isGameOver) {
    return state;
  }
  const lastDir = state.pendingDirections[state.pendingDirections.length - 1] ?? state.direction;
  if (OPPOSITES[lastDir] === action.direction) {
    return state;
  }
  if (state.pendingDirections.length >= 2) {
    return state;
  }
  return {
    ...state,
    pendingDirections: [...state.pendingDirections, action.direction]
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

const handleWallCollision = (state: GameState): { state: GameState; allow: boolean } => {
  if (state.phaseWindowMoves > 0) {
    return {
      allow: true,
      state: {
        ...state,
        phaseWindowMoves: 0
      }
    };
  }
  if (state.phaseCharges > 0) {
    return {
      allow: true,
      state: {
        ...state,
        phaseCharges: state.phaseCharges - 1,
        phaseWindowMoves: CONFIG.phaseWindowMoves - 1
      }
    };
  }
  return { allow: false, state };
};

const updateSpeed = (state: GameState): GameState => {
  const t = clamp(state.elapsedMs / CONFIG.speedRampDurationMs, 0, 1);
  const tickMs = CONFIG.baseTickMs - (CONFIG.baseTickMs - CONFIG.minTickMs) * t;
  return { ...state, tickMs };
};

const updateFlow = (state: GameState): GameState => {
  if (state.flowTimerMs > 0) {
    return { ...state, flowTimerMs: Math.max(0, state.flowTimerMs - state.tickMs) };
  }
  if (state.flowMultiplier !== 1) {
    return { ...state, flowMultiplier: 1 };
  }
  return state;
};

const updateShiftTimers = (state: GameState): GameState => {
  let nextState = { ...state };
  if (nextState.shiftWarningMs > 0) {
    nextState.shiftWarningMs = Math.max(0, nextState.shiftWarningMs - nextState.tickMs);
    if (nextState.shiftWarningMs === 0 && nextState.pendingShift) {
      if (isSafeShift(nextState.walls, nextState.snake, nextState.pendingShift)) {
        nextState.walls = applyShift(nextState.walls, nextState.pendingShift);
        nextState.pendingShift = null;
      } else {
        nextState.pendingShift = null;
        nextState.shiftTimerMs = Math.min(nextState.shiftTimerMs, 2_000);
      }
    }
  } else {
    nextState.shiftTimerMs = Math.max(0, nextState.shiftTimerMs - nextState.tickMs);
    if (nextState.shiftTimerMs === 0 || nextState.applesSinceShift >= CONFIG.applesPerShift) {
      nextState.pendingShift = planShift(Math.random);
      nextState.shiftWarningMs = CONFIG.shiftWarningMs;
      nextState.shiftTimerMs = CONFIG.shiftIntervalMs;
      nextState.applesSinceShift = 0;
    }
  }
  return nextState;
};

const applyShiftSafety = (state: GameState): GameState => {
  if (!state.pendingShift && state.shiftWarningMs === 0) {
    return state;
  }
  if (state.shiftWarningMs > 0 || !state.pendingShift) {
    return state;
  }
  if (!isSafeShift(state.walls, state.snake, state.pendingShift)) {
    return {
      ...state,
      pendingShift: null,
      shiftTimerMs: Math.min(state.shiftTimerMs, 2_000)
    };
  }
  return state;
};

const respawnAppleIfBlocked = (state: GameState, gridSize: number, rng: () => number): GameState => {
  if (state.walls[state.apple.x]?.[state.apple.y]) {
    return {
      ...state,
      apple: randomApple(gridSize, rng, state.snake, state.walls)
    };
  }
  return state;
};

const tryShiftReroll = (state: GameState): GameState => {
  if (!state.pendingShift) {
    return state;
  }
  if (isSafeShift(state.walls, state.snake, state.pendingShift)) {
    return state;
  }
  const reroll = planShift(Math.random);
  if (isSafeShift(state.walls, state.snake, reroll)) {
    return { ...state, pendingShift: reroll };
  }
  return {
    ...state,
    pendingShift: null,
    shiftTimerMs: Math.min(state.shiftTimerMs, 2_000)
  };
};

export const step = (state: GameState, gridSize = CONFIG.gridSize): GameState => {
  if (state.isGameOver) {
    return state;
  }

  let nextState = updateSpeed({ ...state, elapsedMs: state.elapsedMs + state.tickMs });
  nextState = updateFlow(nextState);
  nextState = updateShiftTimers(nextState);
  nextState = tryShiftReroll(nextState);
  nextState = applyShiftSafety(nextState);

  const { direction, remaining } = getNextDirection(nextState);
  const head = nextState.snake[0];
  const newHead = nextHead(head, direction);

  nextState = {
    ...nextState,
    direction,
    pendingDirections: remaining
  };

  if (newHead.x < 0 || newHead.y < 0 || newHead.x >= gridSize || newHead.y >= gridSize) {
    return { ...nextState, isGameOver: true };
  }

  if (nextState.walls[newHead.x]?.[newHead.y]) {
    const wallCheck = handleWallCollision(nextState);
    if (!wallCheck.allow) {
      return { ...wallCheck.state, isGameOver: true };
    }
    nextState = wallCheck.state;
  }

  const willEat = isSamePoint(newHead, nextState.apple);
  const bodyToCheck = willEat ? nextState.snake : nextState.snake.slice(0, -1);
  if (bodyToCheck.some((segment) => isSamePoint(segment, newHead))) {
    return { ...nextState, isGameOver: true };
  }

  let nextSnake = [newHead, ...nextState.snake];
  if (!willEat) {
    nextSnake.pop();
  }

  nextState = {
    ...nextState,
    snake: nextSnake
  };

  if (nextState.phaseWindowMoves > 0) {
    nextState = {
      ...nextState,
      phaseWindowMoves: nextState.phaseWindowMoves - 1
    };
  }

  if (willEat) {
    const nextFlowIndex = nextState.flowTimerMs > 0
      ? Math.min(CONFIG.flowMultipliers.length - 1, CONFIG.flowMultipliers.indexOf(nextState.flowMultiplier) + 1)
      : 0;
    const multiplier = CONFIG.flowMultipliers[nextFlowIndex];

    nextState = {
      ...nextState,
      score: nextState.score + CONFIG.score.apple * multiplier,
      apple: randomApple(gridSize, Math.random, nextSnake, nextState.walls),
      flowTimerMs: CONFIG.flowWindowMs,
      flowMultiplier: multiplier,
      applesSinceShift: nextState.applesSinceShift + 1,
      applesSincePhase: nextState.applesSincePhase + 1
    };

    if (nextState.applesSincePhase % CONFIG.applesPerPhaseCharge === 0) {
      const nextCharges = Math.min(CONFIG.phaseChargesMax, nextState.phaseCharges + 1);
      nextState = {
        ...nextState,
        phaseCharges: nextCharges,
        score: nextState.score + CONFIG.score.phaseChargeBonus
      };
    }
  }

  nextState = respawnAppleIfBlocked(nextState, gridSize, Math.random);

  return nextState;
};
