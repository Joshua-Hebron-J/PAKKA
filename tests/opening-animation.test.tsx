import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";
const hooks = vi.hoisted(() => ({
  dismissed: false,
  setDismissed: vi.fn(),
  effects: [] as (() => (() => void) | void)[],
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: () => [hooks.dismissed, hooks.setDismissed],
  useEffect: (effect: () => void) => hooks.effects.push(effect),
}));
import OpeningAnimation from "../app/opening-animation";
function children(node: ReactElement): ReactElement[] {
  const value = (node.props as { children?: unknown }).children;
  return (Array.isArray(value) ? value : [value])
    .flat()
    .filter((v) => v && typeof v === "object") as ReactElement[];
}
function find(
  node: ReactElement,
  predicate: (node: ReactElement) => boolean,
): ReactElement | undefined {
  if (predicate(node)) return node;
  for (const child of children(node)) {
    const found = find(child, predicate);
    if (found) return found;
  }
}
const listeners = new Map<string, () => void>();
let motion = false;
const media = {
  get matches() {
    return motion;
  },
  addEventListener: vi.fn((_: string, fn: () => void) =>
    listeners.set("motion", fn),
  ),
  removeEventListener: vi.fn(),
};
beforeEach(() => {
  vi.useFakeTimers();
  hooks.dismissed = false;
  hooks.effects = [];
  hooks.setDismissed.mockClear();
  listeners.clear();
  motion = false;
  vi.stubGlobal("window", {
    matchMedia: () => media,
    setTimeout,
    clearTimeout,
    addEventListener: vi.fn((name: string, fn: () => void) =>
      listeners.set(name, fn),
    ),
    removeEventListener: vi.fn((name: string) => listeners.delete(name)),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function mount() {
  const tree = OpeningAnimation()!;
  const cleanup = hooks.effects[0]?.();
  return { tree, cleanup };
}
describe("decorative intro lifecycle and fail-open behavior", () => {
  it("is input-transparent, hidden from assistive tech, and uses the exact existing logo", () => {
    const { tree } = mount();
    expect(tree.props).toMatchObject({
      "aria-hidden": "true",
      style: { position: "fixed", inset: 0, pointerEvents: "none" },
    });
    const logo = find(
      tree,
      (n) => (n.props as { src?: string }).src === "/pakka-mark.svg",
    );
    expect(logo).toBeDefined();
    expect(logo!.props as { width: number; height: number }).toMatchObject({
      width: 104,
      height: 114,
    });
  });
  it("dismisses by its bounded JS deadline even if CSS animations never run", () => {
    mount();
    vi.advanceTimersByTime(2849);
    expect(hooks.setDismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(hooks.setDismissed).toHaveBeenCalledWith(true);
  });
  it.each(["pointerdown", "keydown", "motion"])(
    "immediately dismisses on %s without cancelling the input",
    (name) => {
      mount();
      listeners.get(name)!();
      expect(hooks.setDismissed).toHaveBeenCalledWith(true);
    },
  );
  it("uses a brief static-logo interval for reduced motion rather than the full intro", () => {
    motion = true;
    mount();
    vi.advanceTimersByTime(179);
    expect(hooks.setDismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(hooks.setDismissed).toHaveBeenCalledWith(true);
  });
  it("dismisses immediately if the logo asset fails", () => {
    const { tree } = mount();
    const logo = find(
      tree,
      (n) => typeof (n.props as { onError?: unknown }).onError === "function",
    )!;
    (logo.props as { onError: () => void }).onError();
    expect(hooks.setDismissed).toHaveBeenCalledWith(true);
  });
  it("ignores child animation-end events and completes only the root animation", () => {
    const { tree } = mount(),
      root = {},
      child = {};
    const finish = (
      tree.props as {
        onAnimationEnd: (e: {
          target: unknown;
          currentTarget: unknown;
        }) => void;
      }
    ).onAnimationEnd;
    finish({ target: child, currentTarget: root });
    expect(hooks.setDismissed).not.toHaveBeenCalled();
    finish({ target: root, currentTarget: root });
    expect(hooks.setDismissed).toHaveBeenCalledWith(true);
  });
  it("cleans timers/listeners on unmount and does not remount a dismissed intro on navigation", () => {
    const { cleanup } = mount();
    cleanup?.();
    vi.runAllTimers();
    expect(hooks.setDismissed).not.toHaveBeenCalled();
    expect(listeners.has("pointerdown")).toBe(false);
    expect(listeners.has("keydown")).toBe(false);
    hooks.dismissed = true;
    expect(OpeningAnimation()).toBeNull();
  });
});
