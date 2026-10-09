import * as C from "./constants";
import type { BallState, State } from "./game";
import { clamp } from "./world";
type MovingBall = { -readonly [K in keyof BallState]: BallState[K] };
type Face = "left" | "right" | "top" | "bottom";
/** Separates a circle from an expanded rectangle with deterministic face ties. */
function contact(b: MovingBall, r: C.Rect): Face | null {
  const depths = [
    b.x - (r.x0 - C.BALL_R),
    r.x1 + C.BALL_R - b.x,
    b.y - (r.y0 - C.BALL_R),
    r.y1 + C.BALL_R - b.y,
  ];
  if (depths.some((d) => d <= 0)) return null;
  const face = (["left", "right", "top", "bottom"] as const)[
    depths.indexOf(Math.min(...depths))
  ];
  if (face === "left") b.x = r.x0 - C.BALL_R;
  if (face === "right") b.x = r.x1 + C.BALL_R;
  if (face === "top") b.y = r.y0 - C.BALL_R;
  if (face === "bottom") b.y = r.y1 + C.BALL_R;
  return face;
}
function reflect(b: MovingBall, face: Face): boolean {
  if ((face === "left" && b.vx > 0) || (face === "right" && b.vx < 0)) {
    b.vx = -b.vx;
    return true;
  }
  if ((face === "top" && b.vy > 0) || (face === "bottom" && b.vy < 0)) {
    b.vy = -b.vy;
    return true;
  }
  return false;
}
export function fly(
  s: State,
  ball: BallState,
  dt: number,
  cues: Set<C.CueName>,
): BallState {
  const b = { ...ball };
  const n = Math.max(
      1,
      Math.ceil((Math.hypot(b.vx, b.vy) * dt) / C.MAX_SUBSTEP),
    ),
    h = dt / n;
  for (let i = 0; i < n; i++) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > 0) {
      const a = (b.spin / speed) * h,
        cos = Math.cos(a),
        sin = Math.sin(a),
        vx = b.vx;
      b.vx = vx * cos - b.vy * sin;
      b.vy = vx * sin + b.vy * cos;
    }
    b.spin *= Math.pow(0.5, h / C.SPIN_HALFLIFE);
    b.x += b.vx * h;
    b.y += b.vy * h;
    if (b.y - C.BALL_R < 0 && b.vy < 0) {
      b.y = C.BALL_R;
      b.vy = -b.vy;
      cues.add(C.CUES.wallBounce);
    } else if (b.y + C.BALL_R > C.FIELD_H && b.vy > 0) {
      b.y = C.FIELD_H - C.BALL_R;
      b.vy = -b.vy;
      cues.add(C.CUES.wallBounce);
    }
    for (const side of ["left", "right"] as const) {
      const p = s.paddles[side],
        left = side === "left";
      const face = contact(b, {
        x0: left ? C.P1_X0 : C.P2_X0,
        x1: left ? C.P1_X1 : C.P2_X1,
        y0: p.cy - C.PADDLE_HALF,
        y1: p.cy + C.PADDLE_HALF,
      });
      if (!face) continue;
      if (face === "top" || face === "bottom") {
        if (reflect(b, face)) cues.add(C.CUES.wallBounce);
        continue;
      }
      const theta =
        clamp((b.y - p.cy) / C.PADDLE_HALF, -1, 1) * C.MAX_BOUNCE_ANGLE;
      const v = Math.min(Math.hypot(b.vx, b.vy) * C.SPEED_MULT, C.SPEED_CAP);
      b.vx = (left ? 1 : -1) * v * Math.cos(theta);
      b.vy = v * Math.sin(theta);
      b.spin = clamp(
        b.spin + p.vy * C.SPIN_FROM_PADDLE,
        -C.SPIN_CLAMP,
        C.SPIN_CLAMP,
      );
      b.x = left ? C.P1_X1 + C.BALL_R : C.P2_X0 - C.BALL_R;
      cues.add(C.CUES.paddleHit);
    }
    for (const obstacle of s.obstacles) {
      const face = contact(b, C.OBSTACLES[obstacle.index]);
      if (face && reflect(b, face)) cues.add(C.CUES.obstacleBounce);
    }
  }
  return b;
}
