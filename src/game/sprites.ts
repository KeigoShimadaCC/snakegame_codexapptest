import type { Point } from './types';

export type Sprite = {
  size: number;
  pixels: string[];
};

const makeSprite = (pixels: string[]): Sprite => ({
  size: pixels[0]?.length ?? 0,
  pixels
});

export const SPRITES = {
  redApple: makeSprite([
    "....GG..",
    "...GGG..",
    "..RRRR..",
    ".RRRRRR.",
    "RRRRRRR.",
    "RRRRRRR.",
    ".RRRRR..",
    "..RRR..."
  ]),
  blueBird: makeSprite([
    "..bb....",
    ".bBBb...",
    "bBBBBb..",
    "BBBBBB..",
    ".bBBb...",
    "..bb....",
    "....Y...",
    "........"
  ]),
  yellowBanana: makeSprite([
    "..YY....",
    ".YYYY...",
    "YYYYY...",
    "YYYYY...",
    ".YYYY...",
    "..YY....",
    "...y....",
    "........"
  ]),
  strawberry: makeSprite([
    "..pp....",
    ".pppp...",
    "pPPPPp..",
    "PPPPPPp.",
    "PPPPPPp.",
    ".PPPPp..",
    "..PPP...",
    "...g...."
  ]),
  clover: makeSprite([
    "..g.g...",
    ".ggggg..",
    "ggggggg.",
    "ggggggg.",
    ".ggggg..",
    "..g.g...",
    "...g....",
    "........"
  ]),
  acorn: makeSprite([
    "...AA...",
    "..AAAA..",
    ".AAAAAA.",
    "AAAAAAaa",
    "AAAAAAaa",
    ".AAAAAA.",
    "..AAAA..",
    "...AA..."
  ]),
  snakeHead: makeSprite([
    "..GGGG..",
    ".GGGGGG.",
    "GGWGGWGG",
    "GGGGGGGG",
    "GGGKGGGG",
    ".GGGGGG.",
    "..GGGG..",
    "...gg..."
  ]),
  snakeBody: makeSprite([
    "..gggg..",
    ".gggggg.",
    "gggggggg",
    "gggggggg",
    "gggggggg",
    "gggggggg",
    ".gggggg.",
    "..gggg.."
  ]),
  snakeTail: makeSprite([
    "..gggg..",
    ".gggggg.",
    "gggggggg",
    "gggggggg",
    "ggggg...",
    ".ggg....",
    "..gg....",
    "........"
  ])
};

const PALETTE: Record<string, string> = {
  R: '#e04b3a',
  G: '#4d7a3b',
  b: '#2f61ad',
  B: '#3f7fd6',
  Y: '#f3d34a',
  y: '#d6a62f',
  P: '#ff5aa0',
  p: '#d03472',
  g: '#4ea865',
  W: '#f5f7f3',
  K: '#24311f',
  A: '#c98b4b',
  a: '#9a6b3c'
};

export const drawSprite = (
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  cell: Point,
  cellSize: number
) => {
  const pixelSize = cellSize / sprite.size;
  sprite.pixels.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const key = row[x];
      if (key === '.') {
        continue;
      }
      const color = PALETTE[key] ?? '#000';
      ctx.fillStyle = color;
      ctx.fillRect(
        cell.x * cellSize + x * pixelSize,
        cell.y * cellSize + y * pixelSize,
        pixelSize,
        pixelSize
      );
    }
  });
};
