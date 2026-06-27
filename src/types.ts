export interface Point {
  x: number;
  y: number;
}

export interface Hand {
  keypoints: Point[];
  handedness: 'Left' | 'Right';
  score: number;
}

export type GamePhase =
  | 'menu'
  | 'tracking'
  | 'framing'
  | 'flash'
  | 'puzzle'
  | 'complete';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameGestureResult {
  valid: boolean;
  rect: Rect | null;
}

export interface PinchInfo {
  isPinching: boolean;
  point: Point;
  distance: number;
}

export interface PuzzlePiece {
  id: number;
  correctIndex: number;
  image: HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
  cellIndex: number | null;
}

export interface Difficulty {
  label: string;
  gridSize: number;
}

export interface CompletionStats {
  elapsedMs: number;
  moves: number;
  score: number;
}
