import type { Point, PuzzlePiece, Rect } from '../types';
import { clamp, pointInRect } from './geometry';

/** Crops the (already-mirrored) frame region from the live video and returns a square snapshot. */
export function captureFrameRegion(
  video: HTMLVideoElement,
  rect: Rect,
  outputSize = 512,
): HTMLCanvasElement {
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  const mirrored = document.createElement('canvas');
  mirrored.width = vw;
  mirrored.height = vh;
  const mctx = mirrored.getContext('2d')!;
  mctx.translate(vw, 0);
  mctx.scale(-1, 1);
  mctx.drawImage(video, 0, 0, vw, vh);

  const sx = clamp(rect.x, 0, vw);
  const sy = clamp(rect.y, 0, vh);
  const sw = clamp(rect.width, 10, vw - sx);
  const sh = clamp(rect.height, 10, vh - sy);

  const out = document.createElement('canvas');
  out.width = outputSize;
  out.height = outputSize;
  const octx = out.getContext('2d')!;
  octx.filter = 'grayscale(1) contrast(1.2) brightness(0.95)';
  octx.drawImage(mirrored, sx, sy, sw, sh, 0, 0, outputSize, outputSize);
  return out;
}

export function createPieces(
  sourceImage: HTMLCanvasElement,
  gridSize: number,
  cellSize: number,
): PuzzlePiece[] {
  const pieces: PuzzlePiece[] = [];
  const srcCell = sourceImage.width / gridSize;
  let id = 0;
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const correctIndex = row * gridSize + col;
      const canvas = document.createElement('canvas');
      canvas.width = cellSize;
      canvas.height = cellSize;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(
        sourceImage,
        col * srcCell,
        row * srcCell,
        srcCell,
        srcCell,
        0,
        0,
        cellSize,
        cellSize,
      );
      pieces.push({
        id: id++,
        correctIndex,
        image: canvas,
        x: 0,
        y: 0,
        width: cellSize,
        height: cellSize,
        cellIndex: null,
      });
    }
  }
  return pieces;
}

function rectsOverlap(
  x: number,
  y: number,
  width: number,
  height: number,
  other: Rect,
  pad: number,
): boolean {
  return (
    x < other.x + other.width + pad &&
    x + width > other.x - pad &&
    y < other.y + other.height + pad &&
    y + height > other.y - pad
  );
}

/** Scatters pieces randomly across the canvas, avoiding the empty board region when possible. */
export function shuffleScatter(
  pieces: PuzzlePiece[],
  boardRect: Rect,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const margin = 16;
  for (const piece of pieces) {
    let x = 0;
    let y = 0;
    let attempts = 0;
    do {
      x = margin + Math.random() * Math.max(1, canvasWidth - piece.width - margin * 2);
      y = margin + Math.random() * Math.max(1, canvasHeight - piece.height - margin * 2);
      attempts++;
    } while (rectsOverlap(x, y, piece.width, piece.height, boardRect, 6) && attempts < 25);
    piece.x = x;
    piece.y = y;
    piece.cellIndex = null;
  }
}

export function cellRect(index: number, boardRect: Rect, gridSize: number): Rect {
  const cellSize = boardRect.width / gridSize;
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  return {
    x: boardRect.x + col * cellSize,
    y: boardRect.y + row * cellSize,
    width: cellSize,
    height: cellSize,
  };
}

/** Finds the grid cell whose center is nearest to the given point, or null if outside the board. */
export function nearestCellIndex(point: Point, boardRect: Rect, gridSize: number): number | null {
  const pad = (boardRect.width / gridSize) * 0.5;
  if (!pointInRect(point, boardRect.x - pad, boardRect.y - pad, boardRect.width + pad * 2, boardRect.height + pad * 2)) {
    return null;
  }
  const cellSize = boardRect.width / gridSize;
  const col = clamp(Math.floor((point.x - boardRect.x) / cellSize), 0, gridSize - 1);
  const row = clamp(Math.floor((point.y - boardRect.y) / cellSize), 0, gridSize - 1);
  return row * gridSize + col;
}

export function isPuzzleComplete(pieces: PuzzlePiece[]): boolean {
  return pieces.every((p) => p.cellIndex === p.correctIndex);
}

export function computeScore(elapsedMs: number, moves: number, gridSize: number): number {
  const base = gridSize * gridSize * 2000;
  const timePenalty = Math.floor(elapsedMs / 100);
  const movePenalty = moves * 25;
  return Math.max(0, base - timePenalty - movePenalty);
}
