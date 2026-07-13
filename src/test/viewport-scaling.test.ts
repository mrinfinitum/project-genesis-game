import { describe, expect, it } from "vitest";
import {
  calculateGameViewportScale,
  DEFAULT_GAME_DISPLAY_PREFERENCES,
  normalizeGameDisplayPreferences
} from "@/lib/dashboard/viewport-scaling";

describe("game viewport scaling", () => {
  it.each([
    [1366, 768, 0.711],
    [1440, 900, 0.75],
    [1920, 1080, 1],
    [2560, 1440, 1.319],
    [3440, 1440, 1.319],
    [3840, 2160, 1.985],
    [5120, 2880, 2]
  ])("calculates fit scale for %sx%s", (viewportWidth, viewportHeight, expectedScale) => {
    const scale = calculateGameViewportScale({
      viewportWidth,
      viewportHeight,
      displayMode: "auto",
      minScale: DEFAULT_GAME_DISPLAY_PREFERENCES.minScale,
      maxScale: DEFAULT_GAME_DISPLAY_PREFERENCES.maxScale,
      outerPadding: DEFAULT_GAME_DISPLAY_PREFERENCES.outerPadding
    });

    expect(scale.scale).toBeCloseTo(expectedScale, 3);
    expect(scale.renderedWidth / scale.renderedHeight).toBeCloseTo(16 / 9, 5);
  });

  it("supports actual and fill modes without changing canonical aspect ratio", () => {
    const actual = calculateGameViewportScale({ viewportWidth: 3840, viewportHeight: 2160, displayMode: "actual" });
    const fill = calculateGameViewportScale({ viewportWidth: 3840, viewportHeight: 2160, displayMode: "fill", maxScale: 2 });

    expect(actual.scale).toBe(1);
    expect(fill.scale).toBeCloseTo(1.992, 3);
    expect(fill.renderedWidth / fill.renderedHeight).toBeCloseTo(16 / 9, 5);
  });

  it("normalizes local display preferences", () => {
    expect(normalizeGameDisplayPreferences({ displayMode: "fill", minScale: 0.7, maxScale: 1.8, outerPadding: 0 })).toMatchObject({
      displayMode: "fill",
      minScale: 0.7,
      maxScale: 1.8,
      outerPadding: 0
    });
    expect(normalizeGameDisplayPreferences({ displayMode: "wide-open", minScale: -1, maxScale: 0, outerPadding: -5 })).toEqual(DEFAULT_GAME_DISPLAY_PREFERENCES);
  });
});
