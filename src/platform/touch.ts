import type { ClientProfile } from "@/lib/canonical-runtime";

export type TouchProfile = {
  minimumTouchTarget: number;
  dragThreshold: number;
  swipeThreshold: number;
  touchPadding: number;
  longPressMs: number;
};

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function resolveTouchProfile(profile: ClientProfile): TouchProfile {
  const touch = profile.touchProfile && typeof profile.touchProfile === "object" ? profile.touchProfile as Record<string, unknown> : {};
  const accessibility = profile.accessibilityProfile && typeof profile.accessibilityProfile === "object" ? profile.accessibilityProfile as Record<string, unknown> : {};

  return {
    minimumTouchTarget: Math.max(asNumber(touch.minimumTouchTarget, 44), asNumber(accessibility.minimumTouchTarget, 44)),
    dragThreshold: asNumber(touch.dragThreshold, 8),
    swipeThreshold: asNumber(touch.swipeThreshold, 36),
    touchPadding: asNumber(touch.touchPadding, 8),
    longPressMs: 450
  };
}
