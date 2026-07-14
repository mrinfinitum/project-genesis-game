import type { ClientProfile } from "@/lib/canonical-runtime";

export type SafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

const ZERO_INSETS: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

type DeviceClassHint = {
  id?: string;
  minimumLogicalWidth?: number;
  minimumLogicalHeight?: number;
  safeAreaPadding?: Partial<SafeAreaInsets>;
  hudScale?: number;
  typographyScale?: number;
  touchScale?: number;
};

export type ResolvedDeviceClass = DeviceClassHint & {
  id: string;
  hudScale: number;
  typographyScale: number;
  touchScale: number;
  safeAreaPadding: SafeAreaInsets;
};

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeAreaPolicy(profile: ClientProfile) {
  return profile.safeAreaPolicy && typeof profile.safeAreaPolicy === "object" ? profile.safeAreaPolicy as Record<string, unknown> : {};
}

export function resolveDeviceClass(profile: ClientProfile, width: number, height: number): ResolvedDeviceClass {
  const classes = Array.isArray(profile.supportedDeviceClasses) ? profile.supportedDeviceClasses as DeviceClassHint[] : [];
  const sorted = [...classes].sort((a, b) => asNumber(b.minimumLogicalWidth, 0) - asNumber(a.minimumLogicalWidth, 0));
  const match = sorted.find((item) => width >= asNumber(item.minimumLogicalWidth, 0) && height >= asNumber(item.minimumLogicalHeight, 0)) ?? sorted.at(-1);
  const padding = match?.safeAreaPadding ?? {};

  return {
    ...match,
    id: match?.id ?? "desktop_web",
    hudScale: asNumber(match?.hudScale, 1),
    typographyScale: asNumber(match?.typographyScale, 1),
    touchScale: asNumber(match?.touchScale, 1),
    safeAreaPadding: {
      top: asNumber(padding.top, 0),
      right: asNumber(padding.right, 0),
      bottom: asNumber(padding.bottom, 0),
      left: asNumber(padding.left, 0)
    }
  };
}

export function resolveSafeAreaInsets(profile: ClientProfile, viewport: { width: number; height: number }): SafeAreaInsets {
  const policy = safeAreaPolicy(profile);
  const min = asNumber(policy.minimumEdgePadding, 0);
  const device = resolveDeviceClass(profile, viewport.width, viewport.height);

  return {
    top: Math.max(min, device.safeAreaPadding.top, asNumber(policy.topHudSafeOffset, 0)),
    right: Math.max(min, device.safeAreaPadding.right),
    bottom: Math.max(min, device.safeAreaPadding.bottom, asNumber(policy.bottomDrawerSafeOffset, 0)),
    left: Math.max(min, device.safeAreaPadding.left)
  };
}

export function cssSafeAreaVariables(insets: SafeAreaInsets = ZERO_INSETS): Record<string, string> {
  return {
    "--safe-top": `max(env(safe-area-inset-top), ${insets.top}px)`,
    "--safe-right": `max(env(safe-area-inset-right), ${insets.right}px)`,
    "--safe-bottom": `max(env(safe-area-inset-bottom), ${insets.bottom}px)`,
    "--safe-left": `max(env(safe-area-inset-left), ${insets.left}px)`
  };
}
