import { afterEach, describe, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const setReplay = vi.hoisted(() => vi.fn());
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: () => [0, setReplay],
}));
vi.mock("../app/opening-animation", () => ({
  default: () => createElement("div", { "data-testid": "opening" }),
}));
import IntroHandshake, { INTRO_ARTWORK_ID } from "../app/intro-handshake";
import IntroController from "../app/intro-controller";
const retired = JSON.parse(
  readFileSync("tests/fixtures/retired-handshake-hashes.json", "utf8"),
) as string[];
const normalize = (path: string) =>
  (path.match(/[a-zA-Z]|-?(?:\d*\.?\d+)(?:e[-+]?\d+)?/g) || []).join(" ");
afterEach(() => {
  vi.unstubAllEnvs();
  setReplay.mockClear();
});
describe("reference V4 handshake and replay boundary", () => {
  it("contains zero normalized paths from either retired inline illustration", () => {
    const svg = renderToStaticMarkup(createElement(IntroHandshake));
    const paths = [...svg.matchAll(/\bd="([^"]+)"/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(20);
    const reused = paths.filter((d) =>
      retired.includes(createHash("sha256").update(normalize(d)).digest("hex")),
    );
    expect(reused).toEqual([]);
    expect(svg).toContain(`data-artwork="${INTRO_ARTWORK_ID}"`);
    expect(svg).not.toContain("<image");
  });
  it.each(["production", "test"])(
    "does not expose a replay button in %s",
    (env) => {
      vi.stubEnv("NODE_ENV", env);
      const html = renderToStaticMarkup(createElement(IntroController));
      expect(html).toContain('data-testid="opening"');
      expect(html).not.toContain("Replay Intro");
    },
  );
  it("exposes replay only in development and increments the remount key", () => {
    vi.stubEnv("NODE_ENV", "development");
    const branch = IntroController() as ReactElement;
    const tree = (branch.type as () => ReactElement)();
    const [, button] = (tree.props as { children: ReactElement[] }).children;
    (button.props as { onClick: () => void }).onClick();
    const increment = setReplay.mock.calls[0][0] as (n: number) => number;
    expect(increment(4)).toBe(5);
    expect(renderToStaticMarkup(createElement(IntroController))).toContain(
      "Replay Intro",
    );
  });
});
