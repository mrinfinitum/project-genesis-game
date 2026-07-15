import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameShell } from "@/components/game-ui/genesis-ui";
import { getBundledStudioRuntimeSnapshot, type GameRuntimeData } from "@/lib/canonical-runtime";
import { createNewPlayerRuntimeState } from "@/lib/player-runtime";
import {
  getMobilePresentationProfiles,
  getPresentationProfile,
  MemoryStorageService,
  resolveDeviceClass,
  resolveSafeAreaInsets,
  resolveTouchProfile,
  shouldShowRotateDevice
} from "@/platform";

async function bundledRuntime() {
  const runtime = await getBundledStudioRuntimeSnapshot();
  expect(runtime).not.toBeNull();
  return runtime as GameRuntimeData;
}

describe("mobile platform preparation", () => {
  it("loads Studio iOS and Android presentation profiles from current content", async () => {
    const runtime = await bundledRuntime();
    const profiles = getMobilePresentationProfiles(runtime);

    expect(runtime.metadata.contentVersion).toBeGreaterThanOrEqual(20);
    expect(profiles.ios?.platform).toBe("ios");
    expect(profiles.android?.platform).toBe("android");
    expect(profiles.ios?.safeAreaPolicy).toMatchObject({ minimumEdgePadding: 16, topHudSafeOffset: 20 });
    expect(profiles.android?.hudProfile).toMatchObject({ slotWidth: 116, minimumTouchTarget: 48 });
  });

  it("resolves device class, safe area, and touch hints from the Studio profile", async () => {
    const runtime = await bundledRuntime();
    const profile = getPresentationProfile(runtime, "ios");

    expect(resolveDeviceClass(profile, 852, 393)).toMatchObject({
      id: "phone_large",
      hudScale: 0.94,
      typographyScale: 1
    });
    expect(resolveSafeAreaInsets(profile, { width: 852, height: 393 })).toEqual({
      top: 24,
      right: 24,
      bottom: 28,
      left: 24
    });
    expect(resolveTouchProfile(profile)).toMatchObject({
      minimumTouchTarget: 48,
      dragThreshold: 8,
      swipeThreshold: 36
    });
  });

  it("shows the rotate-device warning for portrait gameplay but not landscape", async () => {
    const runtime = await bundledRuntime();
    const profile = getPresentationProfile(runtime, "ios");

    expect(shouldShowRotateDevice(profile, "dashboard", { width: 393, height: 852 })).toBe(true);
    expect(shouldShowRotateDevice(profile, "dashboard", { width: 852, height: 393 })).toBe(false);
    expect(shouldShowRotateDevice(profile, "login", { width: 393, height: 852 })).toBe(false);

    render(
      <GameShell
        data={runtime}
        playerRuntime={createNewPlayerRuntimeState(runtime)}
        platform="ios"
        profileViewport={{ width: 393, height: 852 }}
      />
    );

    expect(screen.getByTestId("rotate-device-overlay")).toHaveTextContent("Landscape Required");
  });

  it("uses StorageService for key-value persistence without browser storage", () => {
    const storage = new MemoryStorageService();
    storage.setItem("mobile-readiness", "ready");

    expect(storage.getItem("mobile-readiness")).toBe("ready");
    storage.removeItem("mobile-readiness");
    expect(storage.getItem("mobile-readiness")).toBeNull();
  });
});
