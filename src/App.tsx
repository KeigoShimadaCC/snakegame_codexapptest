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

export default function App() {
  const seed = useStableSeed();
  const [state, setState] = useState(() => initGame(CONFIG.gridSize, seed));
  const [screen, setScreen] = useState<Screen>('INTRO');
  const [soundOn, setSoundOn] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevGameOver = useRef(false);
  const prevShiftWarning = useRef(0);
  const prevLastEaten = useRef(state.lastEatenType);
  const prevPhaseCharges = useRef(state.phaseCharges);
  const prevBurstUsed = useRef(state.lastBurstUsed);

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
  }, [screen, state]);

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
            <h1>Sprout the Serpent</h1>
            <p className="subtitle">
              A gentle forest is always in motion. Guide Sprout through the shifting vines, gather
              apples and travelers, and keep the trail alive.
            </p>
            <div className="storybook-cta">
              <button type="button" onClick={() => setScreen('PLAYING')}>
                Begin the Trail
              </button>
              <button type="button" className="ghost" onClick={() => setSoundOn((prev) => !prev)}>
                Sound: {soundOn ? 'On' : 'Off'}
              </button>
            </div>
            <div className="storybook-notes">
              <p>Red apples are steady. Blue birds dart away. Yellow bananas slow you down.</p>
              <p>Strawberries score big, clovers boost Phase, acorns clear vines, glow seeds add Burst.</p>
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
          <h1>Sprout the Serpent</h1>
          <p className="subtitle">
            Guide Sprout through the shifting forest paths. Gather apples, earn Flow, and slip through
            vines with Phase.
          </p>
        </div>
        <div className="status">{state.isGameOver ? 'Game Over' : 'Trail Running'}</div>
      </header>

      <div className="story">
        <p>
          The forest rearranges itself every few moments. Keep Sprout moving, follow the glow of
          apples, and trust your instincts when the vines shift.
        </p>
      </div>

      <div className="hud">
        <div>Score: {state.score.toFixed(0)}</div>
        <div>Flow: x{state.flowMultiplier.toFixed(1)}</div>
        <div>Flow Window: {(state.flowTimerMs / 1000).toFixed(1)}s</div>
        <div>Phase: {state.phaseCharges}</div>
        <div>Burst: {state.burstCharges}</div>
        <div>Shift in: {Math.ceil(state.shiftTimerMs / 1000)}s</div>
        <div>Slow: {state.slowTimerMs > 0 ? `${Math.ceil(state.slowTimerMs / 1000)}s` : '—'}</div>
      </div>

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
          <div className="legend-tip">
            Burst: press Space, Z, or X to clear vines in a 5x5 area.
          </div>
        </aside>

        <div className="board-frame">
          <canvas ref={canvasRef} className="board" aria-label="Snake board" />
          <div className="board-caption">Watch the vines glow before they move.</div>
          <button type="button" className="restart" onClick={handleRestart}>
            Start a New Trail
          </button>
        </div>
      </div>

      <section className="tips">
        <h2>Forest Notes</h2>
        <ul>
          <li>Chain apples quickly to raise your Flow bonus.</li>
          <li>Every third snack grants a Phase charge. Use it to pass through one wall.</li>
          <li>Blue birds are skittish. Yellow bananas slow the trail.</li>
          <li>Strawberries score big, clovers boost Phase, and acorns clear vines.</li>
        </ul>
      </section>

      <footer className="help">
        <span>Controls: Arrow keys or WASD. Burst: Space/Z/X.</span>
      </footer>
    </div>
  );
}
