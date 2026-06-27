import { useCallback, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { WebcamFeed } from './components/WebcamFeed';
import { HandTracker } from './components/HandTracker';
import { GestureDetector } from './components/GestureDetector';
import { PuzzleBoard } from './components/PuzzleBoard';
import { HUDOverlay } from './components/HUDOverlay';
import { StartMenu } from './components/StartMenu';
import { useHandTracking } from './hooks/useHandTracking';
import { captureFrameRegion } from './utils/puzzle';
import { playShutterSound } from './utils/sound';
import type { CompletionStats, GamePhase, PinchInfo, Rect } from './types';
import './App.css';

const FLASH_DURATION_MS = 450;

function App() {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [gridSize, setGridSize] = useState(3);
  const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<HTMLCanvasElement | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [moves, setMoves] = useState(0);
  const [puzzleStartTime, setPuzzleStartTime] = useState<number | null>(null);
  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const pinchesRef = useRef<PinchInfo[]>([
    { isPinching: false, point: { x: 0, y: 0 }, distance: 1 },
    { isPinching: false, point: { x: 0, y: 0 }, distance: 1 },
  ]);

  const cameraEnabled = phase !== 'menu';
  const { handsRef, ready: handTrackingReady, error: trackerError } = useHandTracking(videoRef, cameraEnabled);

  const handleDimensions = useCallback((width: number, height: number) => {
    setDimensions({ width, height });
  }, []);

  const handleCameraError = useCallback((message: string) => {
    setCameraError(message);
    setPhase('menu');
  }, []);

  const handleFramingChange = useCallback((active: boolean) => {
    setPhase((prev) => {
      if (prev !== 'tracking' && prev !== 'framing') return prev;
      return active ? 'framing' : 'tracking';
    });
  }, []);

  const handleCapture = useCallback((rect: Rect) => {
    const video = videoRef.current;
    if (!video) return;
    const snapshot = captureFrameRegion(video, rect, 512);
    playShutterSound();
    setCapturedImage(snapshot);
    setFlashKey((k) => k + 1);
    setMoves(0);
    setCompletionStats(null);
    setPhase('flash');
    setTimeout(() => {
      setPuzzleStartTime(performance.now());
      setPhase('puzzle');
    }, FLASH_DURATION_MS);
  }, []);

  const handleMove = useCallback(() => {
    setMoves((m) => m + 1);
  }, []);

  const handleComplete = useCallback((stats: CompletionStats) => {
    setCompletionStats(stats);
    setPhase('complete');
  }, []);

  const handleStart = useCallback((selectedGridSize: number) => {
    setGridSize(selectedGridSize);
    setCameraError(null);
    setPhase('tracking');
  }, []);

  const handleRestart = useCallback(() => {
    setCapturedImage(null);
    setCompletionStats(null);
    setMoves(0);
    setPuzzleStartTime(null);
    setPhase('tracking');
  }, []);

  const captureEnabled = phase === 'tracking' || phase === 'framing';
  const dimBackdrop = phase === 'puzzle' || phase === 'complete';

  return (
    <div className="app-root">
      <div className="stage" style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}>
        {cameraEnabled && (
          <>
            <WebcamFeed
              enabled={cameraEnabled}
              videoRef={videoRef}
              onDimensions={handleDimensions}
              onError={handleCameraError}
              monochrome
              opacity={dimBackdrop ? 0.18 : 1}
            />
            <HandTracker
              handsRef={handsRef}
              width={dimensions.width}
              height={dimensions.height}
              active={phase !== 'puzzle' && phase !== 'complete'}
            />
            <GestureDetector
              handsRef={handsRef}
              pinchesRef={pinchesRef}
              width={dimensions.width}
              height={dimensions.height}
              captureEnabled={captureEnabled}
              onFramingChange={handleFramingChange}
              onCapture={handleCapture}
            />
            <PuzzleBoard
              phase={phase}
              sourceImage={capturedImage}
              gridSize={gridSize}
              width={dimensions.width}
              height={dimensions.height}
              pinchesRef={pinchesRef}
              onComplete={handleComplete}
              onMove={handleMove}
            />
          </>
        )}

        <HUDOverlay
          phase={phase}
          flashKey={flashKey}
          startTime={puzzleStartTime}
          moves={moves}
          gridSize={gridSize}
          completionStats={completionStats}
          cameraError={cameraError}
          trackerError={trackerError}
          handTrackingReady={handTrackingReady}
          onRestart={handleRestart}
        />

        <AnimatePresence>
          {phase === 'menu' && <StartMenu onStart={handleStart} cameraError={cameraError} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
