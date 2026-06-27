import type { Point } from '../types';

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function pointInRect(
  p: Point,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return p.x >= x && p.x <= x + width && p.y >= y && p.y <= y + height;
}
