import { useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from './game/config';
import type { Direction, Point } from './game/types';
import { applyAction, initGame, step } from './game/logic';
import { keyToAction } from './game/input';
import { drawSprite, SPRITES, type Sprite } from './game/sprites';
import { playSound, setSoundEnabled } from './game/sound';
import type { FoodType } from './game/state';

const COLORS = {
  background: '#e6efe0',
  wall: '#5b6a4b',
  wallWarn: '#b5533c',
  border: '#c9d6c1'
};

const drawCell = (ctx: CanvasRenderingContext2D, point: Point, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(point.x * CONFIG.cellSize, point.y * CONFIG.cellSize, CONFIG.cellSize, CONFIG.cellSize);
};

const useStableSeed = () => useMemo(() => Date.now(), []);

type Screen = 'INTRO' | 'PLAYING';

type ItemInfo = {
  type: FoodType;
  sprite: Sprite;
  name: string;
  description: string;
};

type RunRecord = {
  score: number;
  timeSec: number;
  dateISO: string;
};

const STORAGE_KEYS = {
  best: 'willowglade_best_score',
  recent: 'willowglade_recent_runs'
};

const ITEM_LEGEND: ItemInfo[] = [
  {
    type: 'RED_APPLE',
    sprite: SPRITES.redApple,
    name: 'Red Apple',
    description: 'Classic snack. Keeps Flow going.'
  },
  {
    type: 'BLUE_BIRD',
    sprite: SPRITES.blueBird,
    name: 'Blue Bird',
    description: 'Darts away. Worth extra points.'
  },
  {
    type: 'YELLOW_BANANA',
    sprite: SPRITES.yellowBanana,
    name: 'Yellow Banana',
    description: 'Slows the trail for a few seconds.'
  },
  {
    type: 'PINK_STRAWBERRY',
    sprite: SPRITES.strawberry,
    name: 'Pink Strawberry',
    description: 'Big score bonus.'
  },
  {
    type: 'GREEN_CLOVER',
    sprite: SPRITES.clover,
    name: 'Green Clover',
    description: 'Grants a Phase charge.'
  },
  {
    type: 'GOLD_ACORN',
    sprite: SPRITES.acorn,
    name: 'Gold Acorn',
    description: 'Clears a few vines.'
  },
  {
    type: 'GLOW_SEED',
    sprite: SPRITES.glowSeed,
    name: 'Glow Seed',
    description: 'Adds a Burst charge (Space/Z/X).'
  }
];

const INTRO_ITEMS = [
  ITEM_LEGEND[0],
  ITEM_LEGEND[1],
  ITEM_LEGEND[3],
  ITEM_LEGEND[6]
];

const spriteForFood = (type: FoodType) =>
  ITEM_LEGEND.find((item) => item.type === type)?.sprite ?? SPRITES.redApple;

const ItemIcon = ({ sprite }: { sprite: Sprite }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) {
      return;
    }
    const size = 24;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, size, size);
    drawSprite(ctx, sprite, { x: 0, y: 0 }, size);
  }, [sprite]);
  return <canvas ref={ref} className="item-icon" aria-hidden="true" />;
};

const loadBestScore = (): number => {
  const raw = localStorage.getItem(STORAGE_KEYS.best);
  return raw ? Number(raw) || 0 : 0;
};

const loadRecentRuns = (): RunRecord[] => {
  const raw = localStorage.getItem(STORAGE_KEYS.recent);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as RunRecord[];
    }
  } catch {
    return [];
  }
  return [];
};

const formatTime = (timeSec: number): string => {
  const minutes = Math.floor(timeSec / 60);
  const seconds = timeSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default function App() {
  const seed = useStableSeed();
  const [state, setState] = useState(() => initGame(CONFIG.gridSize, seed));
  const [screen, setScreen] = useState<Screen>('INTRO');
  const [soundOn, setSoundOn] = useState(true);
  const [bestScore, setBestScore] = useState(0);
  const [recentRuns, setRecentRuns] = useState<RunRecord[]>([]);
  const [scorePulse, setScorePulse] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevGameOver = useRef(false);
  const prevShiftWarning = useRef(0);
  const prevLastEaten = useRef(state.lastEatenType);
  const prevPhaseCharges = useRef(state.phaseCharges);
  const prevBurstUsed = useRef(state.lastBurstUsed);
  const prevScore = useRef(state.score);

  useEffect(() => {
    setBestScore(loadBestScore());
    setRecentRuns(loadRecentRuns());
  }, []);

  useEffect(() => {
    setSoundEnabled(soundOn);
  }, [soundOn]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (screen === 'INTRO') {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          setScreen('PLAYING');
        }
        return;
      }
      const action = keyToAction(event.key);
      if (!action) {
        return;
      }
      event.preventDefault();
      setState((prev) => applyAction(prev, action));
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'PLAYING') {
      return;
    }
    if (state.isGameOver) {
      return;
    }
    const id = window.setInterval(() => {
      setState((prev) => step(prev, CONFIG.gridSize));
    }, state.tickMs);

    return () => window.clearInterval(id);
  }, [screen, state.isGameOver, state.tickMs]);

  useEffect(() => {
    if (screen !== 'PLAYING') {
      return;
    }
    if (!prevGameOver.current && state.isGameOver) {
      playSound('gameover');
      const timeSec = Math.round(state.elapsedMs / 1000);
      const record: RunRecord = {
        score: Math.round(state.score),
        timeSec,
        dateISO: new Date().toISOString()
      };
      const nextRuns = [record, ...recentRuns].slice(0, 5);
      const nextBest = Math.max(bestScore, record.score);
      setRecentRuns(nextRuns);
      setBestScore(nextBest);
      localStorage.setItem(STORAGE_KEYS.recent, JSON.stringify(nextRuns));
      localStorage.setItem(STORAGE_KEYS.best, String(nextBest));
    }
    prevGameOver.current = state.isGameOver;

    if (state.shiftWarningMs > 0 && prevShiftWarning.current === 0) {
      playSound('shift');
    }
    prevShiftWarning.current = state.shiftWarningMs;

    if (state.lastEatenType && prevLastEaten.current !== state.lastEatenType) {
      if (state.lastEatenType === 'RED_APPLE') {
        playSound('eat');
      } else if (state.lastEatenType === 'BLUE_BIRD') {
        playSound('bird');
      } else if (state.lastEatenType === 'YELLOW_BANANA') {
        playSound('banana');
      } else {
        playSound('bonus');
      }
    }
    prevLastEaten.current = state.lastEatenType;

    if (state.phaseCharges > prevPhaseCharges.current) {
      playSound('phase');
    }
    prevPhaseCharges.current = state.phaseCharges;

    if (state.lastBurstUsed && !prevBurstUsed.current) {
      playSound('burst');
    }
    prevBurstUsed.current = state.lastBurstUsed;
  }, [screen, state, bestScore, recentRuns]);

  useEffect(() => {
    if (state.score !== prevScore.current) {
      setScorePulse(true);
      const id = window.setTimeout(() => setScorePulse(false), 220);
      prevScore.current = state.score;
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [state.score]);

  useEffect(() => {
    if (screen !== 'PLAYING') {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.width = CONFIG.gridSize * CONFIG.cellSize;
    canvas.height = CONFIG.gridSize * CONFIG.cellSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const blink = state.shiftWarningMs > 0 && Math.floor(state.shiftWarningMs / 150) % 2 === 0;
    for (let x = 0; x < CONFIG.gridSize; x += 1) {
      for (let y = 0; y < CONFIG.gridSize; y += 1) {
        if (state.walls[x]?.[y]) {
          drawCell(ctx, { x, y }, blink ? COLORS.wallWarn : COLORS.wall);
        }
      }
    }

    state.snake.forEach((segment, index) => {
      if (index === 0) {
        drawSprite(ctx, SPRITES.snakeHead, segment, CONFIG.cellSize);
      } else if (index === state.snake.length - 1) {
        drawSprite(ctx, SPRITES.snakeTail, segment, CONFIG.cellSize);
      } else {
        drawSprite(ctx, SPRITES.snakeBody, segment, CONFIG.cellSize);
      }
    });

    state.foods.forEach((food) => {
      drawSprite(ctx, spriteForFood(food.type), food.pos, CONFIG.cellSize);
    });

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }, [screen, state]);

  const handleRestart = () => {
    const next = initGame(CONFIG.gridSize);
    setState(next);
    setScreen('PLAYING');
  };

  if (screen === 'INTRO') {
    return (
      <div className="app intro">
        <div className="storybook">
          <div className="storybook-card">
            <p className="eyebrow">Willowglade Woods</p>
            <h1>Willowglade Dash</h1>
            <p className="subtitle">Follow the shifting forest paths.</p>
            <p className="intro-copy">
              Sprout is a tiny guardian racing the living woods. Vines slide, trails glow, and every
              snack changes the path ahead. Can you keep the forest in rhythm?
            </p>
            <div className="intro-items">
              {INTRO_ITEMS.map((item) => (
                <div key={item.type} className="intro-item">
                  <ItemIcon sprite={item.sprite} />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
            <div className="storybook-cta">
              <button type="button" onClick={() => setScreen('PLAYING')}>
                Begin the Dash
              </button>
              <button type="button" className="ghost" onClick={() => setSoundOn((prev) => !prev)}>
                Sound: {soundOn ? 'On' : 'Off'}
              </button>
            </div>
            <div className="storybook-notes">
              <p>Chain apples to build Flow. Press Space/Z/X to Burst when glow seeds appear.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <button type="button" className="sound-toggle" onClick={() => setSoundOn((prev) => !prev)}>
        Sound: {soundOn ? 'On' : 'Off'}
      </button>

      <header className="header">
        <div>
          <p className="eyebrow">Willowglade Woods</p>
          <h1>Willowglade Dash</h1>
          <p className="subtitle">Follow the shifting forest paths.</p>
        </div>
        <div className="status">{state.isGameOver ? 'Game Over' : 'Trail Running'}</div>
      </header>

      <div className="game">
        <aside className="legend">
          <h2>Forest Finds</h2>
          <div className="legend-items">
            {ITEM_LEGEND.map((item) => (
              <div className="legend-item" key={item.type}>
                <ItemIcon sprite={item.sprite} />
                <div>
                  <div className="legend-name">{item.name}</div>
                  <div className="legend-desc">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="legend-tip">Burst: press Space, Z, or X to clear vines in a 5x5 area.</div>
        </aside>

        <div className="board-frame">
          <div className="score-hero">
            <div className={scorePulse ? 'score-value pulse' : 'score-value'}>
              {state.score.toFixed(0)}
              <span className="score-label">Score</span>
            </div>
            <div className="shift-timer">
              <span className="shift-label">Next Shift</span>
              <span className="shift-value">{Math.ceil(state.shiftTimerMs / 1000)}s</span>
              {state.shiftWarningMs > 0 ? <span className="shift-glow">Glow</span> : null}
            </div>
          </div>

          <div className="stat-chips">
            <div className="stat-chip">Flow x{state.flowMultiplier.toFixed(1)}</div>
            <div className="stat-chip">Phase {state.phaseCharges}</div>
            <div className="stat-chip">Burst {state.burstCharges}</div>
            {state.slowTimerMs > 0 ? (
              <div className="stat-chip">Slow {Math.ceil(state.slowTimerMs / 1000)}s</div>
            ) : null}
          </div>

          <canvas ref={canvasRef} className="board" aria-label="Snake board" />
          <div className="board-caption">Watch the vines glow before they move.</div>

          <div className="scoreboard">
            <div className="scoreboard-header">
              <div>
                <div className="scoreboard-title">Scoreboard</div>
                <div className="scoreboard-sub">Best Score</div>
              </div>
              <div className="scoreboard-best">{bestScore}</div>
            </div>
            <div className="scoreboard-list">
              {recentRuns.length === 0 ? (
                <div className="scoreboard-empty">No runs yet. Start a new dash!</div>
              ) : (
                recentRuns.map((run, index) => (
                  <div className="scoreboard-row" key={`${run.dateISO}-${index}`}>
                    <span>#{index + 1}</span>
                    <span>{run.score}</span>
                    <span>{formatTime(run.timeSec)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button type="button" className="restart" onClick={handleRestart}>
            Start a New Dash
          </button>
        </div>
      </div>

      <footer className="help">
        <span>Controls: Arrow keys or WASD. Burst: Space/Z/X.</span>
      </footer>
    </div>
  );
}
