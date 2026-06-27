import type { Hand, FrameGestureResult, PinchInfo, Point } from '../types';
import { distance, midpoint } from './geometry';

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;

const PINCH_CLOSE_RATIO = 0.45;
const PINCH_OPEN_RATIO = 0.62;

function handScale(hand: Hand): number {
  return distance(hand.keypoints[WRIST], hand.keypoints[MIDDLE_MCP]) || 1;
}

/** Evaluates thumb-index pinch distance with hysteresis to avoid flicker at the threshold. */
export function evaluatePinch(hand: Hand, wasPinching: boolean): PinchInfo {
  const thumb = hand.keypoints[THUMB_TIP];
  const index = hand.keypoints[INDEX_TIP];
  const ratio = distance(thumb, index) / handScale(hand);
  const isPinching = wasPinching ? ratio < PINCH_OPEN_RATIO : ratio < PINCH_CLOSE_RATIO;
  return { isPinching, point: midpoint(thumb, index), distance: ratio };
}

/**
 * Builds the "photo frame" rectangle from two pinch points (one per hand),
 * treating them as opposite corners of a drag-to-resize selection box.
 */
export function frameRectFromPinches(
  a: Point,
  b: Point,
  canvasWidth: number,
  canvasHeight: number,
): FrameGestureResult {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.abs(a.x - b.x);
  const height = Math.abs(a.y - b.y);

  const minWidth = canvasWidth * 0.12;
  const minHeight = canvasHeight * 0.12;
  if (width < minWidth || height < minHeight) return { valid: false, rect: null };

  return { valid: true, rect: { x, y, width, height } };
}
