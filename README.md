# Carom

A browser paddle duel about spin, sharp angles, and bank shots. Move as you strike
to curve the ball around two fixed obstacles. Play against the computer or share
a keyboard with a friend. First to 11 wins, with a two-point lead.

Everything is drawn and synthesized in code with the Simple 2D engine. No server,
accounts, external assets, or runtime downloads are needed.

## Run

```sh
npm ci
npm run dev
```

Open the local address Vite prints. For a production build:

```sh
npm run build
npm run preview
```

`dist/` is the complete static site. Serve it at the root of any static host.

## Controls

| Action | Controls |
| --- | --- |
| Solo paddle | W / S or ↑ / ↓ |
| Versus left paddle | W / S |
| Versus right paddle | ↑ / ↓ |
| Select menu item | W / S or ↑ / ↓, mouse, or touch |
| Confirm | Enter / Space, click, or tap |
| Pause / resume | P or Escape |
| Back | Escape |
| Toggle sound | M |
| Debug overlay | Backtick |

Touch controls appear when you touch the screen. Use the side sliders to move;
landscape orientation gives the court more room.

## Development

The immutable game state and public debug contract live in `src/game.ts`.
`simulation.ts` and `physics.ts` advance the game; `menus.ts` handles menu input;
`render.ts` draws the court and screens. The engine supplies time, input, audio,
the canvas fit, recording, and diagnostics. The debug API is available through
an engine instance's `debug` property, with poses applied using `engine.apply`.

```sh
npm run typecheck
npm run lint
npm run format
npm test
```

Tests run the real engine with a canvas and counted clock ticks, covering menus,
physics, AI, scoring, audio events, and debug poses. `showcase/` contains the
player description, screenshots, and a 4.8-second engine-recorded rally.
