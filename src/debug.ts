import * as C from "./constants";
import type {
  BallState,
  CaromDebugApi,
  CaromState,
  PaddleState,
  Side,
  State,
} from "./game";
import { initialState, parkedBall, serveSign } from "./world";
import { menuItemRect } from "./menus";
function ball(s: State, patch: Partial<BallState>): CaromState {
  if (!s.ball) throw new Error("Carom: ball is absent");
  return { ...s, ball: { ...s.ball, ...patch } };
}
function paddle(s: State, side: Side, patch: Partial<PaddleState>): CaromState {
  return {
    ...s,
    paddles: { ...s.paddles, [side]: { ...s.paddles[side], ...patch } },
  };
}
export function createDebug(): CaromDebugApi {
  return {
    version: C.CAROM_DEBUG_VERSION,
    clearWorld: (s) => ({ ...s, ball: null, obstacles: [] }),
    spawnBall: (s) => ({ ...s, ball: parkedBall() }),
    spawnObstacle: (s, index) => {
      const p = C.OBSTACLE_CENTERS[index];
      if (!p) throw new Error(`Carom: unknown obstacle ${index}`);
      return {
        ...s,
        obstacles: [
          ...s.obstacles.filter((o) => o.index !== index),
          { index, cx: p.x, cy: p.y },
        ].sort((a, b) => a.index - b.index),
      };
    },
    reset: (s) => initialState(s.muted),
    reconcile: (s) => ({ ...s }),
    setScreen: (s, screen) => ({ ...s, screen }),
    setMode: (s, mode) => ({ ...s, mode }),
    setMenuIndex: (s, menuIndex) => ({ ...s, menuIndex }),
    setTitleIndex: (s, titleIndex) => ({ ...s, titleIndex }),
    setResumeScreen: (s, resumeScreen) => ({ ...s, resumeScreen }),
    setScore: (s, p1, p2) => ({ ...s, score: { p1, p2 } }),
    setWinner: (s, winner) => ({ ...s, winner }),
    setReceiver: (s, receiver) => ({ ...s, receiver }),
    setPaddleCy: (s, side, cy) => paddle(s, side, { cy }),
    setPaddleVy: (s, side, drivenVy) => paddle(s, side, { drivenVy }),
    setPaddleDriven: (s, side, driven) => paddle(s, side, { driven }),
    setBallPosition: (s, x, y) => ball(s, { x, y }),
    setBallVelocity: (s, vx, vy) => ball(s, { vx, vy }),
    setBallSpin: (s, spin) => ball(s, { spin }),
    setBallHeld: (s, held) => ball(s, { held }),
    setBallHoldTimer: (s, holdTimer) => ball(s, { holdTimer }),
    setBallServeSign: (s, serveSign) => ball(s, { serveSign }),
    drawBallServeSign: (s) => ball(s, { serveSign: serveSign() }),
    setAiTracking: (s, tracking) => ({ ...s, ai: { ...s.ai, tracking } }),
    setAiMovement: (s, movement) => ({ ...s, ai: { ...s.ai, movement } }),
    setMuted: (s, muted) => ({ ...s, muted }),
    snapshot: (s) => ({
      ...structuredClone(s),
      version: C.CAROM_DEBUG_VERSION,
      ball: s.ball
        ? {
            ...structuredClone(s.ball),
            speed: Math.hypot(s.ball.vx, s.ball.vy),
          }
        : null,
    }),
    menuItemRect,
  };
}
