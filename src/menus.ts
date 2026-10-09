import type { UpdateApi } from "@clockwyrks/simple-2d";
import * as C from "./constants";
import type { CaromState, MenuRect, State } from "./game";
import { startMatch, title } from "./world";
export function menuItems(s: State): readonly string[] {
  switch (s.screen) {
    case "title":
      return C.TITLE_ITEMS;
    case "paused":
      return C.PAUSE_ITEMS;
    case "matchover":
      return C.MATCHOVER_ITEMS;
    case "howto":
      return ["BACK TO MENU"];
    default:
      return [];
  }
}
export function menuItemRect(s: State, index: number): MenuRect | null {
  if (!Number.isInteger(index) || index < 0 || index >= menuItems(s).length)
    return null;
  return {
    x: s.screen === "title" ? 116 : 440,
    y:
      (s.screen === "title" ? 365 : s.screen === "howto" ? 594 : 376) +
      index * 66,
    w: 400,
    h: 54,
  };
}
function confirm(s: State): CaromState {
  if (s.screen === "title") {
    const next = { ...s, titleIndex: s.menuIndex };
    return s.menuIndex === 2
      ? { ...next, screen: "howto", menuIndex: 0 }
      : startMatch(next, s.menuIndex === 0 ? "solo" : "versus");
  }
  if (s.screen === "howto") return title(s);
  if (s.screen === "paused")
    return s.menuIndex === 0
      ? { ...s, screen: s.resumeScreen }
      : s.menuIndex === 1
        ? startMatch(s, s.mode)
        : title(s);
  return s.menuIndex === 0 ? startMatch(s, s.mode) : title(s);
}
export function readMenus(state: State, api: UpdateApi): CaromState {
  const edges = Object.fromEntries(
    C.ACTIONS.map((a) => [a, api.input.pressed(a)]),
  );
  const samples = api.input.pointerSamples();
  api.input.pointer();
  api.input.pointerContacts();
  let s: CaromState = {
    ...state,
    muted: edges.mute ? !state.muted : state.muted,
  };
  api.audio.setMuted(s.muted);
  const original = s.screen;
  if (original === "playing" || original === "countdown")
    return edges.pause
      ? {
          ...s,
          resumeScreen: original,
          screen: "paused",
          menuIndex: 0,
          menuPresses: {},
        }
      : s;
  if (original === "paused" && (edges.pause || edges.back))
    return { ...s, screen: s.resumeScreen, menuPresses: {} };
  if ((original === "howto" || original === "matchover") && edges.back)
    return title(s);
  const count = menuItems(s).length;
  const up = edges["p1-up"] || edges["p2-up"],
    down = edges["p1-down"] || edges["p2-down"];
  const moved = up || down;
  if (moved)
    s = { ...s, menuIndex: (s.menuIndex + (up ? -1 : 1) + count) % count };
  const keyboardConfirm = !moved && edges.confirm;
  if (keyboardConfirm) return { ...confirm(s), menuPresses: {} };
  const presses = { ...s.menuPresses };
  let pointerConfirm = false;
  for (const sample of samples) {
    const index = menuItems(s).findIndex((_, i) => {
      const r = menuItemRect(s, i)!;
      return (
        sample.x >= r.x &&
        sample.x <= r.x + r.w &&
        sample.y >= r.y &&
        sample.y <= r.y + r.h
      );
    });
    if (index >= 0) s = { ...s, menuIndex: index };
    if (sample.type === "down" && sample.button === "primary")
      presses[sample.id] = index;
    if (sample.type === "up") {
      if (index >= 0 && presses[sample.id] === index) pointerConfirm = true;
      delete presses[sample.id];
    }
  }
  return pointerConfirm
    ? { ...confirm(s), menuPresses: {} }
    : { ...s, menuPresses: presses };
}
