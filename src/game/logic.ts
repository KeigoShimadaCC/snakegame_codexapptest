import { CONFIG } from './config';
import type { Action } from './input';
import { addWalls, applyShift, initWalls, isSafeShift, planShift, removeWalls, targetWallCount } from './maze';
import type { FoodItem, FoodType, GameState } from './state';
import type { Direction, Point } from './types';

const OPPOSITES: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left'
};

const isSamePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const FOOD_ORDER: FoodType[] = [
  'RED_APPLE',
  'BLUE_BIRD',
  'YELLOW_BANANA',
  'PINK_STRAWBERRY',
  'GREEN_CLOVER',
  'GOLD_ACORN',
  'GLOW_SEED'
];

const randomFoodType = (rng: () => number): FoodType => {
  const roll = rng();
  if (roll < 0.5) {
    return 'RED_APPLE';
  }
  if (roll < 0.66) {
    return 'YELLOW_BANANA';
  }
  if (roll < 0.8) {
    return 'PINK_STRAWBERRY';
  }
  if (roll < 0.9) {
    return 'GREEN_CLOVER';
  }
  if (roll < 0.96) {
    return 'GOLD_ACORN';
  }
  if (roll < 0.99) {
    return 'GLOW_SEED';
  }
  return 'BLUE_BIRD';
};

const isBlocked = (px: number, py: number, snake: Point[], walls: boolean[][], foods: FoodItem[]) =>
  walls[px]?.[py] ||
  snake.some((segment) => segment.x === px && segment.y === py) ||
  foods.some((food) => food.pos.x === px && food.pos.y === py);

const spawnFood = (
  gridSize: number,
  rng: () => number,
  snake: Point[],
  walls: boolean[][],
  foods: FoodItem[],
  type?: FoodType
): FoodItem => {
  const totalCells = gridSize * gridSize;
  let x = 0;
  let y = 0;
  let attempts = 0;

  do {
    x = Math.floor(rng() * gridSize);
    y = Math.floor(rng() * gridSize);
    attempts += 1;
  } while (isBlocked(x, y, snake, walls, foods) && attempts < totalCells * 2);

  if (isBlocked(x, y, snake, walls, foods)) {
    for (let yy = 0; yy < gridSize; yy += 1) {
      for (let xx = 0; xx < gridSize; xx += 1) {
        if (!isBlocked(xx, yy, snake, walls, foods)) {
          x = xx;
          y = yy;
          break;
        }
      }
    }
  }

  const foodType = type ?? randomFoodType(rng);
  const direction: Direction | undefined = foodType === 'BLUE_BIRD' ? 'right' : undefined;

  return { pos: { x, y }, type: foodType, direction };
};

const ensureFoodTargets = (
  gridSize: number,
  rng: () => number,
  snake: Point[],
  walls: boolean[][],
  foods: FoodItem[]
): FoodItem[] => {
  let nextFoods = [...foods];
  for (const type of FOOD_ORDER) {
    const target = CONFIG.foodTargets[type] ?? 0;
    const count = nextFoods.filter((food) => food.type === type).length;
    for (let i = count; i < target; i += 1) {
      nextFoods = [...nextFoods, spawnFood(gridSize, rng, snake, walls, nextFoods, type)];
    }
  }
  return nextFoods;
};

const moveFoods = (
  foods: FoodItem[],
  rng: () => number,
  snake: Point[],
  walls: boolean[][],
  gridSize: number
): FoodItem[] => {
  return foods.map((food) => {
    if (food.type !== 'BLUE_BIRD') {
      return food;
    }
    if (rng() > CONFIG.items.birdMoveChance) {
      return food;
    }

    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    const tryDir = directions[Math.floor(rng() * directions.length)];
    const next = nextHead(food.pos, tryDir);
    if (
      next.x < 0 ||
      next.y < 0 ||
      next.x >= gridSize ||
      next.y >= gridSize ||
      walls[next.x]?.[next.y] ||
      snake.some((segment) => isSamePoint(segment, next)) ||
      foods.some((other) => other !== food && isSamePoint(other.pos, next))
    ) {
      return food;
    }

    return { ...food, pos: next, direction: tryDir };
  });
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
  const foods = ensureFoodTargets(gridSize, rng, snake, walls, []);

  return {
    snake,
    direction: 'right',
    pendingDirections: [],
    foods,
    score: 0,
    tickMs: CONFIG.baseTickMs,
    elapsedMs: 0,
    walls,
    shiftTimerMs: CONFIG.shiftIntervalMs,
    shiftWarningMs: 0,
    pendingShift: null,
    foodsSinceShift: 0,
    flowTimerMs: 0,
    flowMultiplier: 1,
    foodsSincePhase: 0,
    phaseCharges: 0,
    phaseWindowMoves: 0,
    slowTimerMs: 0,
    burstCharges: 0,
    lastEatenType: null,
    lastBurstUsed: false,
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
  if (action.type === 'BURST') {
    if (state.burstCharges <= 0) {
      return state;
    }
    const head = state.snake[0];
    const nextWalls = state.walls.map((col) => col.slice());
    for (let x = Math.max(0, head.x - CONFIG.burstRadius); x <= Math.min(CONFIG.gridSize - 1, head.x + CONFIG.burstRadius); x += 1) {
      for (let y = Math.max(0, head.y - CONFIG.burstRadius); y <= Math.min(CONFIG.gridSize - 1, head.y + CONFIG.burstRadius); y += 1) {
        nextWalls[x][y] = false;
      }
    }
    return {
      ...state,
      walls: nextWalls,
      burstCharges: state.burstCharges - 1,
      lastBurstUsed: true
    };
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
  let tickMs = CONFIG.baseTickMs - (CONFIG.baseTickMs - CONFIG.minTickMs) * t;
  if (state.slowTimerMs > 0) {
    tickMs *= CONFIG.items.bananaSlowMultiplier;
  }
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
        const target = targetWallCount(CONFIG.gridSize, nextState.snake.length);
        const anchor = nextState.foods[0]?.pos ?? nextState.snake[0];
        nextState.walls = addWalls(
          nextState.walls,
          Math.random,
          nextState.snake,
          anchor,
          target,
          CONFIG.walls.spawnPerShift
        );
        nextState.pendingShift = null;
      } else {
        nextState.pendingShift = null;
        nextState.shiftTimerMs = Math.min(nextState.shiftTimerMs, 2_000);
      }
    }
  } else {
    nextState.shiftTimerMs = Math.max(0, nextState.shiftTimerMs - nextState.tickMs);
    if (nextState.shiftTimerMs === 0 || nextState.foodsSinceShift >= CONFIG.foodsPerShift) {
      nextState.pendingShift = planShift(Math.random);
      nextState.shiftWarningMs = CONFIG.shiftWarningMs;
      nextState.shiftTimerMs = CONFIG.shiftIntervalMs;
      nextState.foodsSinceShift = 0;
    }
  }
  return nextState;
};

const respawnFoodIfBlocked = (state: GameState, gridSize: number, rng: () => number): GameState => {
  const blocked = state.foods.some((food) => state.walls[food.pos.x]?.[food.pos.y]);
  if (!blocked) {
    return state;
  }
  const filtered = state.foods.filter((food) => !state.walls[food.pos.x]?.[food.pos.y]);
  return {
    ...state,
    foods: ensureFoodTargets(gridSize, rng, state.snake, state.walls, filtered)
  };
};

const scoreForFood = (type: FoodType): number => {
  switch (type) {
    case 'BLUE_BIRD':
      return CONFIG.score.blueBird;
    case 'YELLOW_BANANA':
      return CONFIG.score.yellowBanana;
    case 'PINK_STRAWBERRY':
      return CONFIG.score.strawberry;
    case 'GREEN_CLOVER':
      return CONFIG.score.clover;
    case 'GOLD_ACORN':
      return CONFIG.score.acorn;
    case 'GLOW_SEED':
      return CONFIG.score.glowSeed;
    default:
      return CONFIG.score.redApple;
  }
};

export const step = (state: GameState, gridSize = CONFIG.gridSize): GameState => {
  if (state.isGameOver) {
    return state;
  }

  let nextState = updateSpeed({
    ...state,
    elapsedMs: state.elapsedMs + state.tickMs,
    lastEatenType: null,
    lastBurstUsed: false
  });
  nextState = updateFlow(nextState);
  nextState = updateShiftTimers(nextState);

  if (nextState.slowTimerMs > 0) {
    nextState = {
      ...nextState,
      slowTimerMs: Math.max(0, nextState.slowTimerMs - nextState.tickMs)
    };
  }

  nextState = {
    ...nextState,
    foods: moveFoods(nextState.foods, Math.random, nextState.snake, nextState.walls, gridSize)
  };

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

  const eaten = nextState.foods.find((food) => isSamePoint(food.pos, newHead));
  const willEat = Boolean(eaten);
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

  if (willEat && eaten) {
    const nextFlowIndex = nextState.flowTimerMs > 0
      ? Math.min(CONFIG.flowMultipliers.length - 1, CONFIG.flowMultipliers.indexOf(nextState.flowMultiplier) + 1)
      : 0;
    const multiplier = CONFIG.flowMultipliers[nextFlowIndex];

    nextState = {
      ...nextState,
      score: nextState.score + scoreForFood(eaten.type) * multiplier,
      flowTimerMs: CONFIG.flowWindowMs,
      flowMultiplier: multiplier,
      foodsSinceShift: nextState.foodsSinceShift + 1,
      foodsSincePhase: nextState.foodsSincePhase + 1,
      lastEatenType: eaten.type
    };

    let remainingFoods = nextState.foods.filter((food) => food !== eaten);
    remainingFoods = ensureFoodTargets(gridSize, Math.random, nextSnake, nextState.walls, remainingFoods);

    nextState = {
      ...nextState,
      foods: remainingFoods
    };

    if (eaten.type === 'YELLOW_BANANA') {
      nextState = {
        ...nextState,
        slowTimerMs: CONFIG.items.bananaSlowMs
      };
    }

    if (eaten.type === 'GREEN_CLOVER') {
      const nextCharges = Math.min(CONFIG.phaseChargesMax, nextState.phaseCharges + 1);
      nextState = {
        ...nextState,
        phaseCharges: nextCharges
      };
    }

    if (eaten.type === 'GOLD_ACORN') {
      nextState = {
        ...nextState,
        walls: removeWalls(nextState.walls, Math.random, CONFIG.items.acornClearWalls)
      };
    }

    if (eaten.type === 'GLOW_SEED') {
      const nextBurst = Math.min(CONFIG.burstChargesMax, nextState.burstCharges + 1);
      nextState = {
        ...nextState,
        burstCharges: nextBurst
      };
    }

    if (nextState.foodsSincePhase % CONFIG.foodsPerPhaseCharge === 0) {
      const nextCharges = Math.min(CONFIG.phaseChargesMax, nextState.phaseCharges + 1);
      nextState = {
        ...nextState,
        phaseCharges: nextCharges,
        score: nextState.score + CONFIG.score.phaseChargeBonus,
        walls: removeWalls(nextState.walls, Math.random, CONFIG.walls.clearOnPhase)
      };
    }
  }

  nextState = respawnFoodIfBlocked(nextState, gridSize, Math.random);

  return nextState;
};
