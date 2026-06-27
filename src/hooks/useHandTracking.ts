import { useEffect, useRef, useState } from 'react';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import type { Hand } from '../types';

const MEDIAPIPE_SOLUTION_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240';

interface UseHandTrackingResult {
  handsRef: React.MutableRefObject<Hand[]>;
  ready: boolean;
  error: string | null;
}

/**
 * Loads the MediaPipe Hands model via TensorFlow.js and continuously estimates
 * hand landmarks from the given video element. Detection runs its own async
 * loop (estimateHands is inherently slower than 60fps); results are written
 * into a mutable ref so consumers can read the latest landmarks every render
 * frame without forcing React re-renders.
 */
export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
): UseHandTrackingResult {
  const handsRef = useRef<Hand[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let detector: handPoseDetection.HandDetector | null = null;
    let rafId = 0;

    async function loop() {
      if (cancelled) return;
      const video = videoRef.current;
      if (detector && video && video.readyState >= 2) {
        try {
          const hands = await detector.estimateHands(video, { flipHorizontal: true });
          handsRef.current = hands as unknown as Hand[];
        } catch {
          // transient decode errors are expected while the stream warms up
        }
      }
      rafId = requestAnimationFrame(loop);
    }

    async function init() {
      detector = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        {
          runtime: 'mediapipe',
          modelType: 'lite',
          maxHands: 2,
          solutionPath: MEDIAPIPE_SOLUTION_PATH,
        },
      );
      if (cancelled) {
        detector.dispose();
        return;
      }
      setReady(true);
      loop();
    }

    init().catch((e) => setError(e instanceof Error ? e.message : String(e)));

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      detector?.dispose();
    };
  }, [enabled, videoRef]);

  return { handsRef, ready, error };
}
