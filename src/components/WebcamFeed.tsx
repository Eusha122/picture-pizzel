import { useEffect, useRef, useState } from 'react';
import { drawGrain, drawMirroredVideoFrame } from '../utils/render';

interface WebcamFeedProps {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onDimensions: (width: number, height: number) => void;
  onError?: (message: string) => void;
  monochrome: boolean;
  opacity?: number;
}

/** Acquires the webcam stream and continuously renders it to a canvas with a dark, grainy, monochrome look. */
export function WebcamFeed({ enabled, videoRef, onDimensions, onError, monochrome, opacity = 1 }: WebcamFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 1280, height: 720 });

  useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        setSize({ width, height });
        onDimensions(width, height);
      } catch (e) {
        onError?.(e instanceof Error ? e.message : 'Unable to access webcam');
      }
    }

    start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let rafId = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    function tick() {
      const video = videoRef.current;
      if (canvas && ctx && video && video.readyState >= 2) {
        drawMirroredVideoFrame(ctx, video, canvas.width, canvas.height, monochrome);
        drawGrain(ctx, canvas.width, canvas.height);
      }
      rafId = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(rafId);
  }, [enabled, monochrome, videoRef]);

  return (
    <>
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        className="layer-canvas"
        style={{ opacity }}
      />
    </>
  );
}
