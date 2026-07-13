import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DASHBOARD_ART_REGISTRY,
  createDashboardArtMap,
  dashboardAssetFailureDiagnostic,
  getBundledStudioRuntimeSnapshot,
  type DashboardArtRegistryEntry,
  type GameRuntimeData
} from "@/lib/canonical-runtime";

const projectRoot = process.cwd();
const publicRoot = path.join(projectRoot, "public");
const vercelConfig = JSON.parse(readFileSync(path.join(projectRoot, "vercel.json"), "utf8")) as {
  rewrites?: Array<{ source: string; destination: string }>;
};

function exactFileExists(publicUrl: string) {
  const parts = publicUrl.replace(/^\//, "").split("/");
  let current = publicRoot;

  for (const part of parts) {
    if (!existsSync(current) || !statSync(current).isDirectory()) return false;
    const names = readdirSync(current);
    if (!names.includes(part)) return false;
    current = path.join(current, part);
  }

  return existsSync(current);
}

async function bundledRuntime() {
  const runtime = await getBundledStudioRuntimeSnapshot();
  expect(runtime).not.toBeNull();
  return runtime as GameRuntimeData;
}

function rewriteWouldSwallow(staticPath: string) {
  return (vercelConfig.rewrites ?? []).some((rewrite) => {
    if (rewrite.destination !== "/index.html") return false;
    return new RegExp(`^${rewrite.source}$`).test(staticPath);
  });
}

describe("dashboard static assets", () => {
  it("uses deployment-safe /roblox-assets URLs without /public prefixes", () => {
    const entries = (Object.values(DASHBOARD_ART_REGISTRY) as DashboardArtRegistryEntry[]).filter((entry): entry is DashboardArtRegistryEntry & { localPath: string } => Boolean(entry.localPath));

    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries) {
      expect(entry.localPath, entry.key).toMatch(/^\/roblox-assets\//);
      expect(entry.localPath, entry.key).not.toContain("/public/");
      expect(entry.localPath, entry.key).not.toContain("/Users/");
      expect(entry.localPath, entry.key).not.toMatch(/^\.\.?\//);
      expect([".gif", ".jpg", ".jpeg", ".png", ".svg", ".webp"]).toContain(path.extname(entry.localPath).toLowerCase());
    }
  });

  it("matches every registry fallback URL to a real case-sensitive public file", () => {
    const entries = (Object.values(DASHBOARD_ART_REGISTRY) as DashboardArtRegistryEntry[]).filter((entry): entry is DashboardArtRegistryEntry & { localPath: string } => Boolean(entry.localPath));

    for (const entry of entries) {
      expect(exactFileExists(entry.localPath), entry.localPath).toBe(true);
    }
  });

  it("keeps static Vercel asset routes out of the SPA fallback rewrite", () => {
    expect(rewriteWouldSwallow("/roblox-assets/UI/hud_background_1920x1080.png")).toBe(false);
    expect(rewriteWouldSwallow("/design-reference/roblox/dashboard/dashboard-main-1920.png")).toBe(false);
    expect(rewriteWouldSwallow("/assets/index-example.js")).toBe(false);
    expect(rewriteWouldSwallow("/research")).toBe(true);
  });

  it("reports failed dashboard image loads with the exact semantic key and URL", async () => {
    const runtime = await bundledRuntime();
    const art = createDashboardArtMap(runtime.assets).dashboard_background;
    const diagnostic = dashboardAssetFailureDiagnostic(art, "/roblox-assets/UI/hud_background_1920x1080.png");

    expect(diagnostic).toEqual({
      key: "dashboard_background",
      canonicalWebUrl: art.platformWebPath ?? "",
      localFallbackUrl: "/roblox-assets/UI/hud_background_1920x1080.png",
      resolvedUrl: "/roblox-assets/UI/hud_background_1920x1080.png",
      fallbackUsed: art.mappingStatus === "local-fallback"
    });
  });
});
