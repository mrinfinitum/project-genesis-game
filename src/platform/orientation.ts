import type { ClientProfile } from "@/lib/canonical-runtime";

export type OrientationState = {
  orientation: "landscape" | "portrait";
  landscapeRequired: boolean;
  portraitAllowed: boolean;
};

export function getOrientationState(profile: ClientProfile, screenName = "dashboard", viewport = currentViewport()): OrientationState {
  const orientationProfile = profile.orientation && typeof profile.orientation === "object" ? profile.orientation as Record<string, unknown> : {};
  const primary = orientationProfile.primary;
  const allowedScreens = Array.isArray(orientationProfile.portraitAllowedScreens) ? orientationProfile.portraitAllowedScreens : [];
  const orientation = viewport.width >= viewport.height ? "landscape" : "portrait";
  const landscapeRequired = primary === "landscape";
  const portraitAllowed = allowedScreens.includes(screenName);

  return { orientation, landscapeRequired, portraitAllowed };
}

export function shouldShowRotateDevice(profile: ClientProfile, screenName = "dashboard", viewport = currentViewport()) {
  const state = getOrientationState(profile, screenName, viewport);
  return state.landscapeRequired && state.orientation === "portrait" && !state.portraitAllowed;
}

export function onOrientationChange(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("resize", callback);
  window.screen.orientation?.addEventListener?.("change", callback);
  return () => {
    window.removeEventListener("resize", callback);
    window.screen.orientation?.removeEventListener?.("change", callback);
  };
}

function currentViewport() {
  if (typeof window === "undefined") return { width: 1920, height: 1080 };
  return { width: window.innerWidth, height: window.innerHeight };
}
