import type { UpdateApi } from "@clockwyrks/simple-2d";
import * as C from "./constants";
import type { CaromState, PaddleState, State } from "./game";
import { readMenus } from "./menus";
import { clamp, parkedBall } from "./world";
import { fly } from "./physics";
function move(p: PaddleState, vy: number, dt: number): PaddleState {
  if (p.driven) vy = p.drivenVy;
  const raw = p.cy + vy * dt,
    cy = clamp(raw, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  if (raw !== cy && dt > 0) vy = (cy - p.cy) / dt;
  return { ...p, cy, vy };
}
function paddles(s: State, api: UpdateApi, dt: number): CaromState["paddles"] {
  const held = (a: C.ActionName) => api.input.value(a) > 0;
  const solo = s.mode === "solo";
  const up = held("p1-up") || (solo && held("p2-up")),
    down = held("p1-down") || (solo && held("p2-down"));
  let rightVy =
    (Number(held("p2-down")) - Number(held("p2-up"))) * C.PADDLE_SPEED;
  if (solo) {
    let target = C.AI_HOME_Y,
      deadzone = C.AI_HOME_DEADZONE;
    if (s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0) {
      target = s.ball.y - s.ball.vy * C.AI_REACT;
      deadzone = C.AI_DEADZONE;
    }
    const diff = target - s.paddles.right.cy;
    rightVy =
      s.ai.movement && Math.abs(diff) > deadzone && dt > 0
        ? Math.sign(diff) * Math.min(C.AI_SPEED, Math.abs(diff) / dt)
        : 0;
  }
  return {
    left: move(
      s.paddles.left,
      (Number(down) - Number(up)) * C.PADDLE_SPEED,
      dt,
    ),
    right: move(s.paddles.right, rightVy, dt),
  };
}
export function update(state: State, api: UpdateApi, dt: number): CaromState {
  let s = readMenus(state, api);
  s = { ...s, simTime: state.simTime + dt, muted: api.audio.muted() };
  if (s.screen !== "countdown" && s.screen !== "playing") return s;
  s = { ...s, paddles: paddles(s, api, dt) };
  if (!s.ball) return s;
  let b = { ...s.ball };
  const cues = new Set<C.CueName>();
  if (s.screen === "countdown") {
    b.holdTimer -= dt;
    if (b.holdTimer <= 0) {
      b = {
        ...b,
        held: false,
        holdTimer: 0,
        trail: [],
        vx:
          (s.receiver === "left" ? -1 : 1) *
          C.SERVE_SPEED *
          Math.cos(C.SERVE_ANGLE),
        vy: b.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
      };
      s = { ...s, screen: "playing" };
    }
  } else if (!b.held) b = fly(s, b, dt, cues);
  b = {
    ...b,
    trail: [...b.trail, { x: b.x, y: b.y, t: s.simTime }].filter(
      (p) => s.simTime - p.t <= C.TRAIL_TIME,
    ),
  };
  s = { ...s, ball: b };
  if (!b.held && (b.x - C.BALL_R > C.FIELD_W || b.x + C.BALL_R < 0)) {
    const left = b.x > C.FIELD_W,
      score = { p1: s.score.p1 + Number(left), p2: s.score.p2 + Number(!left) };
    cues.add(C.CUES.score);
    const won =
      Math.max(score.p1, score.p2) >= C.WIN_SCORE &&
      Math.abs(score.p1 - score.p2) >= C.WIN_LEAD;
    s = won
      ? {
          ...s,
          score,
          winner: left ? "left" : "right",
          screen: "matchover",
          menuIndex: 0,
        }
      : {
          ...s,
          score,
          ball: parkedBall(),
          receiver: left ? "right" : "left",
          screen: "countdown",
        };
  }
  for (const cue of cues) api.audio.play(cue);
  return s;
}
