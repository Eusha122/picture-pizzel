import { useEffect, useRef } from 'react';
import type { CompletionStats, GamePhase, PinchInfo, PuzzlePiece, Rect } from '../types';
import { pointInRect } from '../utils/geometry';
import {
  cellRect,
  computeScore,
  createPieces,
  isPuzzleComplete,
  nearestCellIndex,
  shuffleScatter,
} from '../utils/puzzle';
import { playBlip, playSuccessChime } from '../utils/sound';

interface DragState {
  pieceId: number;
  offsetX: number;
  offsetY: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const NEON_COLORS = ['#39ff6a', '#e8ff3c', '#3cf0ff', '#ff3cf0'];

interface PuzzleBoardProps {
  phase: GamePhase;
  sourceImage: HTMLCanvasElement | null;
  gridSize: number;
  width: number;
  height: number;
  pinchesRef: React.MutableRefObject<PinchInfo[]>;
  onComplete: (stats: CompletionStats) => void;
  onMove: () => void;
}

/** Owns the puzzle pieces: slicing, scattering, pinch-drag/drop, cell snapping, completion detection. */
export function PuzzleBoard({
  phase,
  sourceImage,
  gridSize,
  width,
  height,
  pinchesRef,
  onComplete,
  onMove,
}: PuzzleBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const piecesRef = useRef<PuzzlePiece[]>([]);
  const boardRectRef = useRef<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const dragRef = useRef<(DragState | null)[]>([null, null]);
  const pinchWasRef = useRef<[boolean, boolean]>([false, false]);
  const movesRef = useRef(0);
  const startTimeRef = useRef(0);
  const completedRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const lastTsRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    if (!sourceImage || width === 0 || height === 0) return;
    const boardSize = Math.min(width, height) * 0.6;
    const boardRect: Rect = {
      x: (width - boardSize) / 2,
      y: (height - boardSize) / 2,
      width: boardSize,
      height: boardSize,
    };
    boardRectRef.current = boardRect;

    const cellSize = boardSize / gridSize;
    const pieces = createPieces(sourceImage, gridSize, cellSize);
    shuffleScatter(pieces, boardRect, width, height);
    piecesRef.current = pieces;

    dragRef.current = [null, null];
    pinchWasRef.current = [false, false];
    movesRef.current = 0;
    completedRef.current = false;
    particlesRef.current = [];
    startTimeRef.current = performance.now();
  }, [sourceImage, gridSize, width, height]);

  useEffect(() => {
    let rafId = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    function spawnCompletionParticles() {
      const board = boardRectRef.current;
      for (let i = 0; i < 90; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 220;
        particlesRef.current.push({
          x: board.x + board.width / 2,
          y: board.y + board.height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 1 + Math.random() * 0.6,
          color: NEON_COLORS[i % NEON_COLORS.length],
          size: 2 + Math.random() * 3,
        });
      }
    }

    function updateDrag(dtSeconds: number) {
      const pieces = piecesRef.current;
      const board = boardRectRef.current;
      const pinches = pinchesRef.current;

      for (let handIndex = 0; handIndex < 2; handIndex++) {
        const pinch = pinches[handIndex];
        const wasPinching = pinchWasRef.current[handIndex];
        let drag = dragRef.current[handIndex];

        if (pinch?.isPinching) {
          if (!drag) {
            const heldIds = new Set(dragRef.current.filter(Boolean).map((d) => d!.pieceId));
            for (let i = pieces.length - 1; i >= 0; i--) {
              const piece = pieces[i];
              if (heldIds.has(piece.id)) continue;
              if (pointInRect(pinch.point, piece.x, piece.y, piece.width, piece.height)) {
                drag = { pieceId: piece.id, offsetX: pinch.point.x - piece.x, offsetY: pinch.point.y - piece.y };
                dragRef.current[handIndex] = drag;
                piece.cellIndex = null;
                pieces.splice(i, 1);
                pieces.push(piece);
                break;
              }
            }
          }
          if (drag) {
            const piece = pieces.find((p) => p.id === drag!.pieceId);
            if (piece) {
              piece.x = pinch.point.x - drag.offsetX;
              piece.y = pinch.point.y - drag.offsetY;
            }
          }
        } else if (wasPinching && drag) {
          const piece = pieces.find((p) => p.id === drag!.pieceId);
          if (piece) {
            const center = { x: piece.x + piece.width / 2, y: piece.y + piece.height / 2 };
            const target = nearestCellIndex(center, board, gridSize);
            const occupied = target != null && pieces.some((p) => p.cellIndex === target && p.id !== piece.id);
            if (target != null && !occupied) {
              const rect = cellRect(target, board, gridSize);
              piece.x = rect.x;
              piece.y = rect.y;
              piece.cellIndex = target;
              movesRef.current += 1;
              onMoveRef.current();
              playBlip(piece.correctIndex === target ? 1100 : 520, 0.08, 0.12);
            } else {
              piece.x = Math.max(4, Math.min(width - piece.width - 4, piece.x));
              piece.y = Math.max(4, Math.min(height - piece.height - 4, piece.y));
            }
          }
          dragRef.current[handIndex] = null;
        }
        pinchWasRef.current[handIndex] = Boolean(pinch?.isPinching);
      }

      void dtSeconds;
    }

    function updateParticles(dtSeconds: number) {
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      for (const p of particlesRef.current) {
        p.x += p.vx * dtSeconds;
        p.y += p.vy * dtSeconds;
        p.vy += 140 * dtSeconds;
        p.life -= dtSeconds / p.maxLife;
      }
    }

    function drawBoardGuide() {
      if (!ctx) return;
      const board = boardRectRef.current;
      ctx.save();
      ctx.strokeStyle = 'rgba(57,255,106,0.35)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= gridSize; i++) {
        const cell = board.width / gridSize;
        ctx.beginPath();
        ctx.moveTo(board.x + i * cell, board.y);
        ctx.lineTo(board.x + i * cell, board.y + board.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(board.x, board.y + i * cell);
        ctx.lineTo(board.x + board.width, board.y + i * cell);
        ctx.stroke();
      }
      ctx.strokeStyle = '#39ff6a';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#39ff6a';
      ctx.shadowBlur = 8;
      ctx.strokeRect(board.x, board.y, board.width, board.height);
      ctx.restore();
    }

    function drawPieces() {
      if (!ctx) return;
      const heldIds = new Set(dragRef.current.filter(Boolean).map((d) => d!.pieceId));
      for (const piece of piecesRef.current) {
        const held = heldIds.has(piece.id);
        ctx.save();
        if (held) {
          ctx.shadowColor = '#e8ff3c';
          ctx.shadowBlur = 18;
          const cx = piece.x + piece.width / 2;
          const cy = piece.y + piece.height / 2;
          const scale = 1.06;
          ctx.translate(cx, cy);
          ctx.scale(scale, scale);
          ctx.translate(-cx, -cy);
        }
        ctx.drawImage(piece.image, piece.x, piece.y, piece.width, piece.height);
        ctx.strokeStyle = held ? '#e8ff3c' : 'rgba(255,255,255,0.25)';
        ctx.lineWidth = held ? 2.5 : 1;
        ctx.strokeRect(piece.x, piece.y, piece.width, piece.height);
        ctx.restore();
      }
    }

    function drawParticles() {
      if (!ctx) return;
      ctx.save();
      for (const p of particlesRef.current) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function tick(ts: number) {
      const dt = lastTsRef.current == null ? 16 : ts - lastTsRef.current;
      lastTsRef.current = ts;
      const dtSeconds = Math.min(0.05, dt / 1000);

      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (sourceImage) {
          drawBoardGuide();

          if (phase === 'puzzle') {
            updateDrag(dtSeconds);
          }

          drawPieces();

          if (phase === 'puzzle' && !completedRef.current && isPuzzleComplete(piecesRef.current)) {
            completedRef.current = true;
            spawnCompletionParticles();
            playSuccessChime();
            const elapsedMs = performance.now() - startTimeRef.current;
            const stats: CompletionStats = {
              elapsedMs,
              moves: movesRef.current,
              score: computeScore(elapsedMs, movesRef.current, gridSize),
            };
            onCompleteRef.current(stats);
          }

          updateParticles(dtSeconds);
          drawParticles();
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [gridSize, height, phase, pinchesRef, sourceImage, width]);

  return <canvas ref={canvasRef} width={width} height={height} className="layer-canvas" />;
}
