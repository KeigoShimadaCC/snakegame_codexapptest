# Snake Game (Codex App Test)

A minimal, classic Snake game built with React + Vite and rendered on a `<canvas>`. Includes deterministic game logic with unit tests.

## Features
- Classic snake gameplay: grid movement, growth, food spawn, score, game-over, restart
- Deterministic core logic (pure functions) with unit tests
- Keyboard controls (Arrow keys or WASD)
- On-screen directional controls for mobile
- Minimal, clean UI

## Tech Stack
- React 18
- Vite 5
- TypeScript 5
- Vitest 2

## Quick Start

### 1) Install dependencies
```bash
npm install
```

### 2) Run the dev server
```bash
npm run dev
```
Open the URL printed by Vite (usually `http://localhost:5173`).

### 3) Run tests
```bash
npm run test
```

## How To Play
- The snake moves automatically.
- Use **Arrow keys** or **WASD** to change direction.
- On mobile, use the on-screen controls.
- Eat food to grow and increase your score.
- Colliding with the wall or yourself ends the game.
- Click **Restart** to play again.

## Project Structure
```
/Users/keigoshimada/Documents/codexapptest
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ tsconfig.node.json
└─ src
   ├─ App.tsx
   ├─ main.tsx
   ├─ index.css
   └─ game
      ├─ types.ts
      ├─ logic.ts
      └─ logic.test.ts
```

## Core Logic Overview
The game logic is pure and deterministic, so it is easy to test:
- `initGame(gridSize, rng)`
- `step(state, gridSize, rng)`
- `setDirection(state, nextDir)`
- `spawnFood(snake, gridSize, rng)`

Randomness is injected via `rng` so tests can be deterministic.

## Default Gameplay Settings
- Grid size: **20x20**
- Tick speed: **120ms**
- No wraparound at borders (wall collision ends the game)

These values live in `src/App.tsx` and can be adjusted.

## Manual QA Checklist
- Snake moves automatically on load
- Arrow keys and WASD change direction (no reversal)
- On-screen buttons change direction
- Eating food increases score and length
- Wall collision triggers game over
- Self collision triggers game over
- Restart resets the game

## Scripts
- `npm run dev` — start dev server
- `npm run build` — build for production
- `npm run preview` — preview production build
- `npm run test` — run logic tests

## License
This project is provided as-is for demonstration purposes.
