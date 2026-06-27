import { useEffect, useRef } from 'react';
import type { Hand, PinchInfo, Rect } from '../types';
import { evaluatePinch, frameRectFromPinches } from '../utils/gestures';
import { drawCountdownNumber, drawFrameGuide } from '../utils/render';

const FRAME_HOLD_MS = 3000;

interface GestureDetectorProps {
  handsRef: React.MutableRefObject<Hand[]>;
  pinchesRef: React.MutableRefObject<PinchInfo[]>;
  width: number;
  height: number;
  captureEnabled: boolean;
  onFramingChange: (active: boolean) => void;
  onCapture: (rect: Rect) => void;
}

/**
 * Headless-ish gesture logic component. The "frame" gesture is a pinch on
 * each hand, used as opposite corners of a drag-to-resize rectangle; holding
 * both pinches for FRAME_HOLD_MS counts down to a capture. The same per-hand
 * pinch state is continuously written into a shared ref so PuzzleBoard can
 * read it later for dragging pieces, without forcing React re-renders.
 */
export function GestureDetector({
  handsRef,
  pinchesRef,
  width,
  height,
  captureEnabled,
  onFramingChange,
  onCapture,
}: GestureDetectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holdProgressRef = useRef(0);
  const wasFramingRef = useRef(false);
  const capturedGuardRef = useRef(false);
  const pinchWasRef = useRef<[boolean, boolean]>([false, false]);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (captureEnabled) {
      holdProgressRef.current = 0;
      capturedGuardRef.current = false;
      wasFramingRef.current = false;
    }
  }, [captureEnabled]);

  useEffect(() => {
    let rafId = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    function tick(ts: number) {
      const dt = lastTsRef.current == null ? 16 : ts - lastTsRef.current;
      lastTsRef.current = ts;

      const hands = handsRef.current;

      const nextPinches: PinchInfo[] = [0, 1].map((i) => {
        const hand = hands[i];
        if (!hand) {
          pinchWasRef.current[i] = false;
          return { isPinching: false, point: { x: 0, y: 0 }, distance: 1 };
        }
        const info = evaluatePinch(hand, pinchWasRef.current[i]);
        pinchWasRef.current[i] = info.isPinching;
        return info;
      });
      pinchesRef.current = nextPinches;

      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (captureEnabled && !capturedGuardRef.current) {
          const bothPinching = hands.length >= 2 && nextPinches[0].isPinching && nextPinches[1].isPinching;
          const frame = bothPinching
            ? frameRectFromPinches(nextPinches[0].point, nextPinches[1].point, width, height)
            : { valid: false, rect: null };

          if (frame.valid && frame.rect) {
            holdProgressRef.current = Math.min(1, holdProgressRef.current + dt / FRAME_HOLD_MS);
            drawFrameGuide(ctx, frame.rect, holdProgressRef.current);
            const secondsLeft = Math.ceil((1 - holdProgressRef.current) * (FRAME_HOLD_MS / 1000));
            drawCountdownNumber(ctx, frame.rect, secondsLeft);
            if (!wasFramingRef.current) {
              wasFramingRef.current = true;
              onFramingChange(true);
            }
            if (holdProgressRef.current >= 1) {
              capturedGuardRef.current = true;
              onCapture(frame.rect);
            }
          } else {
            holdProgressRef.current = 0;
            if (wasFramingRef.current) {
              wasFramingRef.current = false;
              onFramingChange(false);
            }
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [captureEnabled, handsRef, height, onCapture, onFramingChange, pinchesRef, width]);

  return <canvas ref={canvasRef} width={width} height={height} className="layer-canvas" />;
}
