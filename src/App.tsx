import { useEffect, useMemo, useRef, useState } from 'react';
import type { Direction, GameState, Point } from './game/types';
import { initGame, setDirection, step } from './game/logic';

const GRID_SIZE = 20;
const TICK_MS = 120;
const CELL_SIZE = 20;

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right'
};

const COLORS = {
  background: '#f6f4ef',
  snake: '#2c2c2c',
  food: '#d65235',
  border: '#d8d3c7'
};

const drawCell = (ctx: CanvasRenderingContext2D, point: Point, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(point.x * CELL_SIZE, point.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
};

const useStableRng = () => useMemo(() => Math.random, []);

export default function App() {
  const rng = useStableRng();
  const [state, setState] = useState<GameState>(() => initGame(GRID_SIZE, rng));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const nextDir = KEY_TO_DIR[event.key];
      if (!nextDir) {
        return;
      }
      event.preventDefault();
      setState((prev) => setDirection(prev, nextDir));
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (state.isGameOver) {
      return;
    }

    const id = window.setInterval(() => {
      setState((prev) => step(prev, GRID_SIZE, rng));
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [state.isGameOver, rng]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.width = GRID_SIZE * CELL_SIZE;
    canvas.height = GRID_SIZE * CELL_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    state.snake.forEach((segment, index) => {
      drawCell(ctx, segment, index === 0 ? COLORS.snake : '#3a3a3a');
    });

    drawCell(ctx, state.food, COLORS.food);

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }, [state]);

  const handleRestart = () => {
    setState(initGame(GRID_SIZE, rng));
  };

  const handleDirection = (direction: Direction) => {
    setState((prev) => setDirection(prev, direction));
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Snake</h1>
          <p className="subtitle">Score: {state.score}</p>
        </div>
        <div className="status">
          {state.isGameOver ? 'Game Over' : 'Running'}
        </div>
      </header>

      <div className="game">
        <canvas ref={canvasRef} className="board" aria-label="Snake board" />
        <div className="controls">
          <button type="button" onClick={() => handleDirection('up')} aria-label="Move up">
            Up
          </button>
          <div className="controls-row">
            <button type="button" onClick={() => handleDirection('left')} aria-label="Move left">
              Left
            </button>
            <button type="button" onClick={() => handleDirection('down')} aria-label="Move down">
              Down
            </button>
            <button type="button" onClick={() => handleDirection('right')} aria-label="Move right">
              Right
            </button>
          </div>
        </div>
        <button type="button" className="restart" onClick={handleRestart}>
          Restart
        </button>
      </div>

      <footer className="help">
        <span>Controls: Arrow keys or WASD</span>
      </footer>
    </div>
  );
}
