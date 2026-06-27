import { useEffect, useRef } from 'react';
import type { Hand } from '../types';
import { drawHandSkeleton } from '../utils/render';

interface HandTrackerProps {
  handsRef: React.MutableRefObject<Hand[]>;
  width: number;
  height: number;
  active: boolean;
}

const HAND_COLORS = ['#39ff6a', '#e8ff3c'];

/** Renders neon hand-landmark skeletons and bounding boxes from the latest tracked hands. */
export function HandTracker({ handsRef, width, height, active }: HandTrackerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let rafId = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    function tick() {
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (active) {
          handsRef.current.forEach((hand, i) => {
            drawHandSkeleton(ctx, hand.keypoints, HAND_COLORS[i % HAND_COLORS.length]);
          });
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(rafId);
  }, [active, handsRef]);

  return <canvas ref={canvasRef} width={width} height={height} className="layer-canvas" />;
}
