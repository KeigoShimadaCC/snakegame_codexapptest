import type { Direction } from './types';

export type Action = { type: 'TURN'; direction: Direction };

const KEY_TO_ACTION: Record<string, Action> = {
  ArrowUp: { type: 'TURN', direction: 'up' },
  ArrowDown: { type: 'TURN', direction: 'down' },
  ArrowLeft: { type: 'TURN', direction: 'left' },
  ArrowRight: { type: 'TURN', direction: 'right' },
  w: { type: 'TURN', direction: 'up' },
  s: { type: 'TURN', direction: 'down' },
  a: { type: 'TURN', direction: 'left' },
  d: { type: 'TURN', direction: 'right' },
  W: { type: 'TURN', direction: 'up' },
  S: { type: 'TURN', direction: 'down' },
  A: { type: 'TURN', direction: 'left' },
  D: { type: 'TURN', direction: 'right' }
};

export const keyToAction = (key: string): Action | null => KEY_TO_ACTION[key] ?? null;
