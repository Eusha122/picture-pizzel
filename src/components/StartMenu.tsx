import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Difficulty } from '../types';

const DIFFICULTIES: Difficulty[] = [
  { label: 'EASY · 3×3', gridSize: 3 },
  { label: 'HARD · 4×4', gridSize: 4 },
];

interface StartMenuProps {
  onStart: (gridSize: number) => void;
  cameraError: string | null;
}

export function StartMenu({ onStart, cameraError }: StartMenuProps) {
  const [gridSize, setGridSize] = useState(3);

  return (
    <motion.div
      className="start-menu"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="start-title">GESTURE://PUZZLE</h1>
      <p className="start-subtitle">
        Pinch with both hands and drag to draw a frame. Hold still while it counts down to
        capture. Solve the puzzle with a pinch.
      </p>

      <div className="difficulty-row">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.gridSize}
            className={`difficulty-button ${gridSize === d.gridSize ? 'active' : ''}`}
            onClick={() => setGridSize(d.gridSize)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <button className="start-button" onClick={() => onStart(gridSize)}>
        ENABLE CAMERA &amp; START
      </button>

      {cameraError && <p className="start-error">{cameraError}</p>}
    </motion.div>
  );
}
