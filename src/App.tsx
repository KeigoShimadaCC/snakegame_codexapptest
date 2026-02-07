import { useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from './game/config';
import type { Direction, Point } from './game/types';
import { applyAction, initGame, step } from './game/logic';
import { keyToAction } from './game/input';

const COLORS = {
  background: '#f6f4ef',
  snake: '#2c2c2c',
  snakeBody: '#3a3a3a',
  food: '#d65235',
  wall: '#5f6a6b',
  wallWarn: '#b5533c',
  border: '#d8d3c7'
};

const drawCell = (ctx: CanvasRenderingContext2D, point: Point, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(point.x * CONFIG.cellSize, point.y * CONFIG.cellSize, CONFIG.cellSize, CONFIG.cellSize);
};

const useStableSeed = () => useMemo(() => Date.now(), []);

export default function App() {
  const seed = useStableSeed();
  const [state, setState] = useState(() => initGame(CONFIG.gridSize, seed));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const action = keyToAction(event.key);
      if (!action) {
        return;
      }
      event.preventDefault();
      setState((prev) => applyAction(prev, action));
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (state.isGameOver) {
      return;
    }
    const id = window.setInterval(() => {
      setState((prev) => step(prev, CONFIG.gridSize));
    }, state.tickMs);

    return () => window.clearInterval(id);
  }, [state.isGameOver, state.tickMs]);

  useEffect(() => {
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
      drawCell(ctx, segment, index === 0 ? COLORS.snake : COLORS.snakeBody);
    });

    drawCell(ctx, state.apple, COLORS.food);

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }, [state]);

  const handleRestart = () => {
    setState(initGame(CONFIG.gridSize));
  };

  const handleDirection = (direction: Direction) => {
    setState((prev) => applyAction(prev, { type: 'TURN', direction }));
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Snake+</h1>
          <p className="subtitle">Score: {state.score.toFixed(0)}</p>
        </div>
        <div className="status">{state.isGameOver ? 'Game Over' : 'Running'}</div>
      </header>

      <div className="hud">
        <div>Flow: x{state.flowMultiplier.toFixed(1)}</div>
        <div>Flow Window: {(state.flowTimerMs / 1000).toFixed(1)}s</div>
        <div>Phase: {state.phaseCharges}</div>
        <div>Shift in: {Math.ceil(state.shiftTimerMs / 1000)}s</div>
      </div>

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
        <span>Flow bonus chains apples within 5 seconds. Phase lets you slip through one wall.</span>
      </footer>
    </div>
  );
}
