import type { ClientProfile, GameRuntimeData } from "@/lib/canonical-runtime";

export type RuntimePlatform = "web" | "ios" | "android";

export function detectRuntimePlatform(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent): RuntimePlatform {
  if (/\bAndroid\b/i.test(userAgent)) return "android";
  if (/\b(iPhone|iPad|iPod)\b/i.test(userAgent)) return "ios";
  return "web";
}

export function getPresentationProfile(content: GameRuntimeData, platform: RuntimePlatform = detectRuntimePlatform()): ClientProfile {
  return content.clientProfiles[platform] ?? content.clientProfiles.web ?? content.clientProfiles.default;
}

export function getMobilePresentationProfiles(content: GameRuntimeData) {
  return {
    ios: content.clientProfiles.ios,
    android: content.clientProfiles.android
  };
}

export function isMobilePlatform(platform: RuntimePlatform) {
  return platform === "ios" || platform === "android";
}
