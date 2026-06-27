import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CompletionStats, GamePhase } from '../types';

interface HUDOverlayProps {
  phase: GamePhase;
  flashKey: number;
  startTime: number | null;
  moves: number;
  gridSize: number;
  completionStats: CompletionStats | null;
  cameraError: string | null;
  trackerError: string | null;
  handTrackingReady: boolean;
  onRestart: () => void;
}

const PHASE_MESSAGES: Record<GamePhase, string | null> = {
  menu: null,
  tracking: 'PINCH BOTH HANDS & DRAG TO DRAW A FRAME',
  framing: 'FRAME DETECTED — HOLD STILL',
  flash: 'CAPTURED',
  puzzle: null,
  complete: null,
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function HUDOverlay({
  phase,
  flashKey,
  startTime,
  moves,
  gridSize,
  completionStats,
  cameraError,
  trackerError,
  handTrackingReady,
  onRestart,
}: HUDOverlayProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (phase !== 'puzzle' || startTime == null) return;
    const id = setInterval(() => setElapsed(performance.now() - startTime), 100);
    return () => clearInterval(id);
  }, [phase, startTime]);

  const message = PHASE_MESSAGES[phase];

  return (
    <div className="hud-overlay">
      <div className="scanlines" />

      <div className="hud-corner hud-top-left">
        <span className={`status-dot ${handTrackingReady ? 'status-online' : 'status-offline'}`} />
        {handTrackingReady ? 'HAND TRACKING: ONLINE' : 'CALIBRATING TRACKER…'}
      </div>
      <div className="hud-corner hud-top-right">
        <span className="rec-dot" />
        REC
      </div>

      {cameraError && <div className="hud-error">CAMERA ERROR: {cameraError}</div>}
      {!cameraError && trackerError && <div className="hud-error">TRACKER ERROR: {trackerError}</div>}

      <div className="hud-floating-text-wrap">
        <AnimatePresence mode="wait">
          {message && (
            <motion.div
              key={message}
              className="hud-floating-text"
              initial={{ opacity: 0, y: 14, letterSpacing: '0.04em' }}
              animate={{ opacity: 1, y: 0, letterSpacing: '0.12em' }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35 }}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {phase === 'flash' && (
          <motion.div
            key={flashKey}
            className="flash-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.45, times: [0, 0.15, 1] }}
          />
        )}
      </AnimatePresence>

      {phase === 'puzzle' && (
        <div className="hud-puzzle-stats">
          <div>TIME {formatTime(elapsed)}</div>
          <div>MOVES {moves}</div>
          <div>GRID {gridSize}×{gridSize}</div>
        </div>
      )}

      <AnimatePresence>
        {phase === 'complete' && completionStats && (
          <div className="hud-complete-wrap">
            <motion.div
              className="hud-complete-panel"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div className="hud-complete-title">PUZZLE COMPLETE</div>
              <div className="hud-complete-stats">
                <div>TIME: {formatTime(completionStats.elapsedMs)}</div>
                <div>MOVES: {completionStats.moves}</div>
                <div>SCORE: {completionStats.score}</div>
              </div>
              <button className="hud-button" onClick={onRestart}>
                PLAY AGAIN
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
