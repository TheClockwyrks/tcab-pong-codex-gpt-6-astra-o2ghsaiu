import { afterEach, describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import { game, BACKGROUND } from "./game";
import * as C from "./constants";
const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((fn) => fn()));
async function setup(step = 10) {
  const events = new EventTarget();
  const canvas = createCanvas(C.FIELD_W, C.FIELD_H);
  const engine = createEngine({
    canvas: canvas as unknown as HTMLCanvasElement,
    width: C.FIELD_W,
    height: C.FIELD_H,
    background: BACKGROUND,
    layout: C.LAYOUT,
    game,
    clock: new ConstantClock(step),
    surface: {
      cssWidth: () => C.FIELD_W,
      cssHeight: () => C.FIELD_H,
      dpr: () => 1,
      events: () => events,
    },
  });
  cleanups.push(() => engine.destroy());
  await engine.initialize();
  const key = (code: string, down = true) =>
    events.dispatchEvent(
      Object.assign(new Event(down ? "keydown" : "keyup"), {
        code,
        repeat: false,
      }),
    );
  const tap = async (code: string) => {
    key(code);
    await engine.advance(1);
    key(code, false);
  };
  const pointer = (
    type: string,
    x: number,
    y: number,
    id = 1,
    device = "mouse",
  ) =>
    events.dispatchEvent(
      Object.assign(new Event(type), {
        clientX: x,
        clientY: y,
        pointerId: id,
        pointerType: device,
        isPrimary: true,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
      }),
    );
  const d = engine.debug;
  const pose = (fn: Parameters<typeof engine.apply>[0]) => engine.apply(fn);
  const flight = (x: number, y: number, vx: number, vy: number, spin = 0) => {
    pose((s) => d.clearWorld(s));
    pose((s) => d.spawnBall(s));
    pose((s) => d.setScreen(s, "playing"));
    pose((s) => d.setMode(s, "versus"));
    pose((s) => d.setBallHeld(s, false));
    pose((s) => d.setBallPosition(s, x, y));
    pose((s) => d.setBallVelocity(s, vx, vy));
    pose((s) => d.setBallSpin(s, spin));
  };
  return { engine, d, pose, key, tap, pointer, flight };
}
describe("state, input and screens", () => {
  it("initializes the complete title and diagnostics", async () => {
    const { engine, d } = await setup();
    const s = d.snapshot(engine.state);
    expect(s.screen).toBe("title");
    expect(s.ball?.held).toBe(true);
    expect(s.obstacles).toHaveLength(2);
    expect(d.version).toBe(C.CAROM_DEBUG_VERSION);
    expect(engine.diagnostics().every((v) => !v.error)).toBe(true);
    await engine.advance(2);
    expect(engine.state.simTime).toBeCloseTo(0.02);
  });
  it("prioritizes up over down and movement over confirmation", async () => {
    const { engine, key } = await setup();
    key("KeyW");
    key("KeyS");
    key("Enter");
    await engine.advance(1);
    expect(engine.state.screen).toBe("title");
    expect(engine.state.menuIndex).toBe(2);
  });
  it("remembers title choices and navigates how-to", async () => {
    const { engine, tap } = await setup();
    await tap("KeyW");
    await tap("Enter");
    expect(engine.state.screen).toBe("howto");
    await tap("Escape");
    expect(engine.state.menuIndex).toBe(2);
    expect(engine.state.titleIndex).toBe(2);
  });
  it("starts versus and freezes exactly across Escape", async () => {
    const { engine, tap, key } = await setup();
    await tap("KeyS");
    await tap("Enter");
    expect(engine.state.mode).toBe("versus");
    key("KeyW");
    key("ArrowDown");
    await engine.advance(2);
    expect(engine.state.paddles.left.cy).toBeLessThan(C.FIELD_CY);
    expect(engine.state.paddles.right.cy).toBeGreaterThan(C.FIELD_CY);
    await tap("Escape");
    const b = engine.state.ball,
      p = engine.state.paddles;
    await engine.advance(10);
    expect(engine.state.screen).toBe("paused");
    expect(engine.state.ball).toEqual(b);
    expect(engine.state.paddles).toEqual(p);
    await tap("Escape");
    expect(engine.state.screen).toBe("countdown");
  });
  it("restarts and quits from pause, preserving title selection", async () => {
    const { engine, tap } = await setup();
    await tap("KeyS");
    await tap("Enter");
    await tap("KeyP");
    await tap("KeyS");
    await tap("Enter");
    expect(engine.state.score).toEqual({ p1: 0, p2: 0 });
    await tap("KeyP");
    await tap("KeyW");
    await tap("Enter");
    expect(engine.state.screen).toBe("title");
    expect(engine.state.menuIndex).toBe(1);
  });
  it("uses arrow keys for the solo human and respects the clamp", async () => {
    const { engine, tap, key } = await setup();
    await tap("Enter");
    key("ArrowUp");
    await engine.advance(90);
    expect(engine.state.paddles.left.cy).toBe(C.PADDLE_MIN_CY);
    expect(engine.state.paddles.left.vy).toBe(0);
  });
  it("selects and confirms mouse and touch across frame boundaries", async () => {
    const { engine, d, pointer } = await setup();
    const r = d.menuItemRect(engine.state, 1)!;
    pointer("pointerdown", r.x + 10, r.y + 10);
    await engine.advance(1);
    expect(engine.state.menuIndex).toBe(1);
    pointer("pointerup", r.x + 10, r.y + 10);
    await engine.advance(1);
    expect(engine.state.mode).toBe("versus");
    engine.apply((s) => d.reset(s));
    const h = d.menuItemRect(engine.state, 2)!;
    pointer("pointerdown", h.x + 10, h.y + 10, 2, "touch");
    pointer("pointerup", h.x + 10, h.y + 10, 2, "touch");
    await engine.advance(1);
    expect(engine.state.screen).toBe("howto");
  });
  it("rejects releases in another region or with no matching press", async () => {
    const { engine, d, pointer } = await setup();
    const a = d.menuItemRect(engine.state, 0)!,
      b = d.menuItemRect(engine.state, 1)!;
    pointer("pointerdown", a.x + 5, a.y + 5);
    await engine.advance(1);
    pointer("pointerup", b.x + 5, b.y + 5);
    await engine.advance(1);
    expect(engine.state.screen).toBe("title");
    expect(engine.state.menuIndex).toBe(1);
  });
  it("toggles mute on every screen and keeps it through reset", async () => {
    const { engine, d, tap } = await setup();
    await tap("KeyM");
    expect(engine.state.muted).toBe(true);
    engine.apply((s) => d.reset(s));
    expect(engine.state.muted).toBe(true);
    engine.apply((s) => d.setMuted(s, false));
    await engine.advance(1);
    expect(engine.state.muted).toBe(false);
  });
});
describe("simulation", () => {
  it("serves with the posed sign, without moving on that frame", async () => {
    const { engine, d, pose } = await setup();
    pose((s) => d.setScreen(s, "countdown"));
    pose((s) => d.setBallHoldTimer(s, 0.005));
    pose((s) => d.setBallServeSign(s, -1));
    await engine.advance(1);
    expect(engine.state.ball?.x).toBe(C.FIELD_CX);
    expect(engine.state.ball?.vy).toBeCloseTo(
      -C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
    );
    expect(engine.state.ball?.vx).toBeLessThan(0);
    expect(engine.state.screen).toBe("playing");
    await engine.advance(1);
    expect(engine.state.ball?.x).toBeLessThan(C.FIELD_CX);
  });
  it("decays spin while preserving speed, and records a bounded trail", async () => {
    const { engine, flight } = await setup();
    flight(600, 300, 300, 0, 500);
    await engine.advance(80);
    const b = engine.state.ball!;
    expect(b.spin).toBeCloseTo(250, 5);
    expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(300, 5);
    expect(
      b.trail.every((p) => engine.state.simTime - p.t <= C.TRAIL_TIME),
    ).toBe(true);
    expect(b.vy).toBeGreaterThan(0);
  });
  it.each([2, 8, 16])("resolves a fast paddle hit at %i ms", async (step) => {
    const { engine, d, pose, flight } = await setup(step);
    flight(100, C.FIELD_CY, -C.SPEED_CAP, 0);
    pose((s) => d.setPaddleDriven(s, "left", true));
    pose((s) => d.setPaddleVy(s, "left", 200));
    await engine.advance(Math.ceil(50 / step));
    const b = engine.state.ball!;
    expect(b.vx).toBeGreaterThan(0);
    expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(C.SPEED_CAP);
    expect(b.spin).toBeGreaterThan(100);
  });
  it("reflects walls without changing speed and emits one cue per frame", async () => {
    const { engine, flight } = await setup(16);
    flight(300, 12, 0, -800);
    const cues: string[] = [];
    engine.events.on("cue:played", (e) => cues.push(e.cue));
    await engine.advance(1);
    expect(engine.state.ball?.vy).toBe(800);
    expect(cues).toEqual([C.CUES.wallBounce]);
  });
  it("resolves paddle end caps without adding spin or speed", async () => {
    const { engine, flight } = await setup();
    flight(C.P1_X0 + 8, C.FIELD_CY - C.PADDLE_HALF - C.BALL_R - 1, 0, 400, 0);
    await engine.advance(1);
    expect(engine.state.ball?.vy).toBe(-400);
    expect(engine.state.ball?.spin).toBe(0);
  });
  it("banks off either obstacle at unchanged speed", async () => {
    const { engine, d, pose, flight } = await setup();
    flight(465, 220, 600, 0);
    pose((s) => d.spawnObstacle(s, 0));
    await engine.advance(2);
    expect(engine.state.ball?.vx).toBe(-600);
  });
  it("scores only after completely crossing a goal and parks for the receiver", async () => {
    const { engine, flight } = await setup();
    flight(C.FIELD_W + C.BALL_R - 1, 100, 100, 0);
    await engine.advance(1);
    expect(engine.state.score.p1).toBe(0);
    await engine.advance(1);
    expect(engine.state.score.p1).toBe(1);
    expect(engine.state.receiver).toBe("right");
    expect(engine.state.ball?.held).toBe(true);
    expect(engine.state.ball?.trail).toHaveLength(0);
  });
  it("requires a two-point lead at deuce, then shows final score", async () => {
    const { engine, d, pose, flight, tap } = await setup();
    flight(C.FIELD_W + 20, 120, 100, 0);
    pose((s) => d.setScore(s, 10, 10));
    await engine.advance(1);
    expect(engine.state.screen).toBe("countdown");
    flight(C.FIELD_W + 20, 120, 100, 0);
    await engine.advance(1);
    expect(engine.state.screen).toBe("matchover");
    expect(engine.state.winner).toBe("left");
    expect(engine.state.score).toEqual({ p1: 12, p2: 10 });
    await tap("Enter");
    expect(engine.state.screen).toBe("countdown");
    expect(engine.state.score.p1).toBe(0);
  });
  it("allows the right side to win and back to restore the title", async () => {
    const { engine, d, pose, flight, tap } = await setup();
    flight(-20, 120, -100, 0);
    pose((s) => d.setScore(s, 0, 10));
    await engine.advance(1);
    expect(engine.state.winner).toBe("right");
    await tap("Escape");
    expect(engine.state.screen).toBe("title");
    expect(engine.state.winner).toBeNull();
  });
  it("gates AI tracking and movement separately", async () => {
    const { engine, d, pose, flight } = await setup();
    flight(900, 580, 200, 100);
    pose((s) => d.setMode(s, "solo"));
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(C.AI_SPEED);
    pose((s) => d.setAiMovement(s, false));
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(0);
    pose((s) => d.setAiMovement(s, true));
    pose((s) => d.setAiTracking(s, false));
    pose((s) => d.setPaddleCy(s, "right", 600));
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(-C.AI_SPEED);
  });
  it("keeps driven velocity separate from integrated velocity", async () => {
    const { engine, d, pose } = await setup();
    pose((s) => d.setScreen(s, "playing"));
    pose((s) => d.setPaddleVy(s, "left", 300));
    expect(engine.state.paddles.left.vy).toBe(0);
    pose((s) => d.setPaddleDriven(s, "left", true));
    await engine.advance(1);
    expect(engine.state.paddles.left.cy).toBe(C.FIELD_CY + 3);
    pose((s) => d.setPaddleCy(s, "left", C.PADDLE_MAX_CY));
    await engine.advance(1);
    expect(engine.state.paddles.left.vy).toBe(0);
    expect(engine.state.paddles.left.drivenVy).toBe(300);
  });
  it("is independent of timestep for spin flight", async () => {
    const results = [];
    for (const step of [2, 16]) {
      const { engine, flight } = await setup(step);
      flight(650, 350, 400, 40, 170);
      await engine.advance(800 / step);
      results.push(engine.state.ball!);
    }
    expect(Math.hypot(results[0].vx, results[0].vy)).toBeCloseTo(
      Math.hypot(results[1].vx, results[1].vy),
      6,
    );
    expect(Math.abs(results[0].vy - results[1].vy)).toBeLessThan(3);
  });
});
describe("debug value semantics", () => {
  it("poses without mutating the previous state and derives readings immediately", async () => {
    const { engine, d, pose } = await setup();
    const old = structuredClone(engine.state);
    pose((s) => d.setBallVelocity(s, 30, 40));
    expect(d.snapshot(engine.state).ball?.speed).toBe(50);
    expect(old.ball?.vx).toBe(0);
    const before = structuredClone(engine.state);
    pose((s) => d.reconcile(s));
    pose((s) => d.reconcile(s));
    expect(engine.state).toEqual(before);
    expect(d.menuItemRect(engine.state, 9)).toBeNull();
    pose((s) => d.setScreen(s, "playing"));
    expect(d.menuItemRect(engine.state, 0)).toBeNull();
  });
  it("clears entities, rejects absent ball poses and invalid obstacles", async () => {
    const { engine, d, pose } = await setup();
    pose((s) => d.clearWorld(s));
    expect(() => pose((s) => d.setBallSpin(s, 2))).toThrow("absent");
    expect(() => pose((s) => d.spawnObstacle(s, 2))).toThrow("obstacle");
    pose((s) => d.setScreen(s, "playing"));
    await engine.advance(2);
    expect(engine.state.ball).toBeNull();
    expect(engine.state.obstacles).toEqual([]);
    pose((s) => d.spawnObstacle(s, 1));
    pose((s) => d.spawnObstacle(s, 0));
    pose((s) => d.spawnObstacle(s, 1));
    expect(engine.state.obstacles.map((o) => o.index)).toEqual([0, 1]);
  });
  it("supports every independent pose and resets all declared fields", async () => {
    const { engine, d, pose } = await setup();
    pose((s) => d.setTitleIndex(s, 2));
    pose((s) => d.setMenuIndex(s, 1));
    pose((s) => d.setResumeScreen(s, "countdown"));
    pose((s) => d.setReceiver(s, "right"));
    pose((s) => d.setWinner(s, "right"));
    pose((s) => d.setBallHoldTimer(s, 4));
    pose((s) => d.drawBallServeSign(s));
    const snap = d.snapshot(engine.state);
    expect(snap.titleIndex).toBe(2);
    expect(snap.menuIndex).toBe(1);
    expect(snap.resumeScreen).toBe("countdown");
    expect(snap.receiver).toBe("right");
    expect(snap.winner).toBe("right");
    expect(snap.ball?.holdTimer).toBe(4);
    pose((s) => d.reset(s));
    expect(engine.state.simTime).toBe(0);
    expect(engine.state.titleIndex).toBe(0);
    expect(engine.state.ai).toEqual({ tracking: true, movement: true });
  });
});
