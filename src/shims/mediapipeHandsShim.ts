/**
 * @mediapipe/hands ships a Closure-compiled script that attaches `Hands` to
 * a global object instead of using real ES module exports, which breaks
 * static import analysis in Rollup/Rolldown production builds. This shim
 * re-exports it as a real named export so bundlers can resolve it.
 *
 * Different bundlers interop with this script differently: esbuild (Vite
 * dev) detects it as CommonJS and rewrites its top-level `this` to the
 * module's `exports` object, so the library's "attach to global" call
 * actually lands on the CJS namespace instead of `globalThis`. Rolldown
 * (Vite build) leaves `this` alone, so it lands on `globalThis` as the
 * library intends. Checking both covers either outcome.
 */
import * as mediapipeHandsNamespace from '@mediapipe/hands/hands.js';

const ns = mediapipeHandsNamespace as unknown as { Hands?: unknown; HAND_CONNECTIONS?: unknown };
const globalScope = globalThis as unknown as { Hands?: unknown; HAND_CONNECTIONS?: unknown };

export const Hands = ns.Hands ?? globalScope.Hands;
export const HAND_CONNECTIONS = ns.HAND_CONNECTIONS ?? globalScope.HAND_CONNECTIONS;
