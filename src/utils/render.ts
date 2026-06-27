import type { Point, Rect } from '../types';

export function drawMirroredVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  monochrome: boolean,
): void {
  ctx.save();
  ctx.filter = monochrome ? 'grayscale(1) contrast(1.2) brightness(0.92)' : 'none';
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  ctx.restore();
}

let grainTile: HTMLCanvasElement | null = null;

function getGrainTile(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const cx = c.getContext('2d')!;
  const imageData = cx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.random() * 255;
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = Math.random() * 40;
  }
  cx.putImageData(imageData, 0, 0);
  grainTile = c;
  return c;
}

export function drawGrain(ctx: CanvasRenderingContext2D, width: number, height: number, alpha = 0.16): void {
  const tile = getGrainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  const ox = Math.random() * 128;
  const oy = Math.random() * 128;
  ctx.translate(-ox, -oy);
  ctx.fillStyle = pattern;
  ctx.fillRect(ox, oy, width, height);
  ctx.restore();
}

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export function drawHandSkeleton(ctx: CanvasRenderingContext2D, points: Point[], color: string): void {
  if (points.length === 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  for (const [a, b] of HAND_CONNECTIONS) {
    const pa = points[a];
    const pb = points[b];
    if (!pa || !pb) continue;
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
  }
  ctx.stroke();

  ctx.fillStyle = color;
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(minX - 14, minY - 14, maxX - minX + 28, maxY - minY + 28);
  ctx.restore();
}

export function drawFrameGuide(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  progress: number,
  color = '#e8ff3c',
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.setLineDash([]);

  const cornerLen = Math.min(rect.width, rect.height) * 0.12;
  ctx.lineWidth = 3;
  const corners: [number, number, number, number][] = [
    [rect.x, rect.y, 1, 1],
    [rect.x + rect.width, rect.y, -1, 1],
    [rect.x, rect.y + rect.height, 1, -1],
    [rect.x + rect.width, rect.y + rect.height, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + cornerLen * dy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + cornerLen * dx, cy);
    ctx.stroke();
  }

  if (progress > 0) {
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const radius = Math.min(rect.width, rect.height) * 0.18;
    ctx.beginPath();
    ctx.strokeStyle = '#39ff6a';
    ctx.shadowColor = '#39ff6a';
    ctx.lineWidth = 5;
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Draws a big countdown number at the center of the frame rect while it's held. */
export function drawCountdownNumber(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  secondsLeft: number,
  color = '#39ff6a',
): void {
  if (secondsLeft <= 0) return;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const fontSize = Math.max(28, Math.min(rect.width, rect.height) * 0.32);
  ctx.save();
  ctx.font = `700 ${fontSize}px 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillText(String(secondsLeft), cx, cy);
  ctx.restore();
}
