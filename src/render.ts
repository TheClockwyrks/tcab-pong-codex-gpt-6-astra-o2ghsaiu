import type { RenderApi } from "@clockwyrks/simple-2d";
import * as C from "./constants";
import type { State } from "./game";
import { menuItemRect, menuItems } from "./menus";
const ink = "#ecf3ed",
  muted = "#7d969e",
  mint = "#84f6cd",
  coral = "#ff8d79",
  amber = "#f5c66b";
function text(
  ctx: CanvasRenderingContext2D,
  t: string,
  x: number,
  y: number,
  size = 16,
  color = ink,
  align: CanvasTextAlign = "left",
  weight = 500,
) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${size < 18 ? "monospace" : "sans-serif"}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(t, x, y);
}
function line(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  x2: number,
  y2: number,
  color: string,
  width = 1,
) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  glow = 0,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(w / 2, 8));
  ctx.fill();
  ctx.restore();
}
function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function court(s: State, ctx: CanvasRenderingContext2D) {
  const wash = ctx.createRadialGradient(
    C.FIELD_CX,
    C.FIELD_CY,
    30,
    C.FIELD_CX,
    C.FIELD_CY,
    740,
  );
  wash.addColorStop(0, "#14242c");
  wash.addColorStop(1, "#0b141b");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  ctx.fillStyle = "#25343b";
  for (let x = 96; x < C.FIELD_W; x += 32)
    for (let y = 104; y < C.FIELD_H - 60; y += 32) ctx.fillRect(x, y, 1, 1);
  line(ctx, 24, 1, C.FIELD_W - 24, 1, "#43545a", 2);
  line(ctx, 24, C.FIELD_H - 1, C.FIELD_W - 24, C.FIELD_H - 1, "#43545a", 2);
  ctx.save();
  ctx.setLineDash([5, 13]);
  line(ctx, C.NET_X, 110, C.NET_X, C.FIELD_H - 66, "#34454b");
  ctx.restore();
  ctx.beginPath();
  ctx.strokeStyle = "#263a41";
  ctx.lineWidth = 1;
  ctx.arc(C.FIELD_CX, C.FIELD_CY, 78, 0, Math.PI * 2);
  ctx.stroke();
  for (const o of s.obstacles) {
    bar(
      ctx,
      o.cx - C.OBSTACLE_HW - 5,
      o.cy - C.OBSTACLE_HH - 5,
      C.OBSTACLE_W + 10,
      C.OBSTACLE_H + 10,
      "#302f29",
    );
    bar(
      ctx,
      o.cx - C.OBSTACLE_HW,
      o.cy - C.OBSTACLE_HH,
      C.OBSTACLE_W,
      C.OBSTACLE_H,
      amber,
      12,
    );
    line(ctx, o.cx, o.cy - 42, o.cx, o.cy + 42, "#fff0bf", 2);
  }
  bar(
    ctx,
    C.P1_X0,
    s.paddles.left.cy - C.PADDLE_HALF,
    C.PADDLE_W,
    C.PADDLE_H,
    mint,
    18,
  );
  bar(
    ctx,
    C.P2_X0,
    s.paddles.right.cy - C.PADDLE_HALF,
    C.PADDLE_W,
    C.PADDLE_H,
    coral,
    18,
  );
  if (s.ball) {
    const b = s.ball;
    for (let i = 1; i < b.trail.length; i++) {
      const a = b.trail[i - 1],
        p = b.trail[i];
      ctx.save();
      ctx.globalAlpha = (i / b.trail.length) * 0.42;
      ctx.lineCap = "round";
      line(ctx, a.x, a.y, p.x, p.y, ink, 2 + (C.BALL_R * i) / b.trail.length);
      ctx.restore();
    }
    ctx.save();
    ctx.shadowBlur = 22;
    ctx.shadowColor = mint;
    circle(ctx, b.x, b.y, C.BALL_R, ink);
    ctx.restore();
  }
}
function menu(s: State, ctx: CanvasRenderingContext2D) {
  menuItems(s).forEach((item, i) => {
    const r = menuItemRect(s, i)!,
      selected = i === s.menuIndex;
    ctx.fillStyle = selected ? mint : "#172830";
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 6);
    ctx.fill();
    text(
      ctx,
      `0${i + 1}`,
      r.x + 20,
      r.y + r.h / 2,
      12,
      selected ? "#346355" : muted,
    );
    text(
      ctx,
      item,
      r.x + 60,
      r.y + r.h / 2,
      17,
      selected ? "#0b2923" : ink,
      "left",
      700,
    );
    text(
      ctx,
      selected ? "↗" : "→",
      r.x + r.w - 25,
      r.y + r.h / 2,
      24,
      selected ? "#0b2923" : muted,
      "center",
    );
  });
}
function footer(s: State, ctx: CanvasRenderingContext2D) {
  text(ctx, "CAROM  /  A GAME OF ANGLES", 40, 680, 11, muted);
  text(
    ctx,
    `M  SOUND ${s.muted ? "OFF" : "ON"}    ·    P  PAUSE`,
    C.FIELD_W - 40,
    680,
    11,
    muted,
    "right",
  );
}
function titleArt(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(765, 180);
  ctx.strokeStyle = "#34474d";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-30, -44, 370, 406, 16);
  ctx.stroke();
  text(ctx, "THE ANGLE IS YOURS.", 0, -16, 12, muted);
  ctx.save();
  ctx.setLineDash([4, 9]);
  line(ctx, 155, 24, 155, 324, "#34474d");
  ctx.restore();
  bar(ctx, 8, 145, 12, 80, mint, 18);
  bar(ctx, 286, 61, 12, 80, coral, 18);
  bar(ctx, 114, 63, 14, 96, amber, 10);
  bar(ctx, 194, 225, 14, 96, amber, 10);
  ctx.beginPath();
  ctx.moveTo(26, 188);
  ctx.bezierCurveTo(75, 165, 90, 192, 155, 197);
  ctx.bezierCurveTo(239, 203, 217, 84, 280, 89);
  ctx.strokeStyle = mint;
  ctx.lineWidth = 3;
  ctx.stroke();
  circle(ctx, 280, 89, 9, ink);
  text(ctx, "MOVE. STRIKE. BEND THE RALLY.", 155, 384, 11, muted, "center");
  ctx.restore();
}
export function render(s: State, { ctx }: RenderApi): void {
  ctx.save();
  court(s, ctx);
  if (s.screen === "title") {
    ctx.fillStyle = "rgba(11,20,27,.94)";
    ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
    text(ctx, "01 / THE PADDLE DUEL", 116, 112, 13, mint);
    text(ctx, C.TITLE_TEXT, 108, 230, 116, ink, "left", 900);
    text(ctx, "A little spin. A different game.", 116, 308, 23, muted);
    titleArt(ctx);
    menu(s, ctx);
    text(ctx, "↑ ↓ / W S  SELECT     ENTER  PLAY", 116, 599, 12, muted);
  } else if (s.screen === "howto") {
    ctx.fillStyle = "rgba(11,20,27,.96)";
    ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
    text(ctx, "FIELD GUIDE", C.FIELD_CX, 88, 13, mint, "center");
    text(
      ctx,
      "Make every angle count.",
      C.FIELD_CX,
      144,
      42,
      ink,
      "center",
      700,
    );
    const cards = [
      {
        x: 116,
        n: "01",
        title: "Take your side",
        color: mint,
        lines: [
          "SOLO  ·  W / S or ↑ / ↓",
          "VERSUS  ·  Left: W / S",
          "Right: ↑ / ↓",
          "Touch: use the side sliders.",
        ],
      },
      {
        x: 482,
        n: "02",
        title: "Put spin on it",
        color: coral,
        lines: [
          "Move your paddle as you hit.",
          "Motion curves the next flight.",
          "Hit near an edge to send it",
          "away at a sharper angle.",
        ],
      },
      {
        x: 848,
        n: "03",
        title: "Play the banks",
        color: amber,
        lines: [
          "The amber bars bounce it back.",
          "Find an angle. Break a rhythm.",
          `First to ${C.WIN_SCORE}, lead by ${C.WIN_LEAD}.`,
          "P / ESC pauses. M mutes.",
        ],
      },
    ];
    for (const c of cards) {
      bar(ctx, c.x - 20, 227, 336, 291, "#14252d");
      text(ctx, c.n, c.x, 263, 14, c.color);
      text(ctx, c.title, c.x, 313, 26, ink, "left", 700);
      c.lines.forEach((t, i) => text(ctx, t, c.x, 369 + i * 29, 15, muted));
    }
    menu(s, ctx);
  } else {
    text(ctx, "PLAYER 01", C.FIELD_CX - 145, 33, 12, mint, "center");
    text(
      ctx,
      s.mode === "solo" ? "COMPUTER" : "PLAYER 02",
      C.FIELD_CX + 145,
      33,
      12,
      coral,
      "center",
    );
    text(
      ctx,
      String(s.score.p1).padStart(2, "0"),
      C.FIELD_CX - 145,
      79,
      58,
      ink,
      "center",
      700,
    );
    text(
      ctx,
      String(s.score.p2).padStart(2, "0"),
      C.FIELD_CX + 145,
      79,
      58,
      ink,
      "center",
      700,
    );
    text(
      ctx,
      s.mode === "solo" ? "SOLO / HUMAN vs MACHINE" : "VERSUS / LOCAL DUEL",
      40,
      39,
      11,
      muted,
    );
    text(
      ctx,
      `FIRST TO ${C.WIN_SCORE} · WIN BY ${C.WIN_LEAD}`,
      C.FIELD_W - 40,
      39,
      11,
      muted,
      "right",
    );
    if (s.screen === "countdown" && s.ball) {
      text(ctx, "GET READY", C.FIELD_CX, 258, 14, mint, "center");
      text(
        ctx,
        `${s.receiver === "left" ? "←" : "→"} SERVE`,
        C.FIELD_CX,
        451,
        12,
        muted,
        "center",
      );
      ctx.strokeStyle = mint;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        C.FIELD_CX,
        C.FIELD_CY,
        29,
        -Math.PI / 2,
        -Math.PI / 2 +
          Math.PI * 2 * Math.max(0, s.ball.holdTimer / C.HOLD_TIME),
      );
      ctx.stroke();
    }
    if (s.screen === "paused" || s.screen === "matchover") {
      ctx.fillStyle = "rgba(7,15,21,.84)";
      ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
      text(
        ctx,
        s.screen === "paused" ? "TAKE A BREATHER" : "MATCH COMPLETE",
        C.FIELD_CX,
        198,
        12,
        mint,
        "center",
      );
      text(
        ctx,
        s.screen === "paused"
          ? "Paused."
          : s.winner === "left"
            ? "Player 01 wins."
            : s.mode === "solo"
              ? "Computer wins."
              : "Player 02 wins.",
        C.FIELD_CX,
        266,
        54,
        ink,
        "center",
        750,
      );
      text(
        ctx,
        s.screen === "paused"
          ? "The next angle can wait."
          : `${s.score.p1}  —  ${s.score.p2}`,
        C.FIELD_CX,
        326,
        22,
        muted,
        "center",
      );
      menu(s, ctx);
    }
  }
  footer(s, ctx);
  ctx.restore();
}
