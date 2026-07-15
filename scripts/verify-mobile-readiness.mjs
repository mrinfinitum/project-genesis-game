import fs from "node:fs";
import path from "node:path";
import runtime from "../src/content/generated/studio-runtime.snapshot.json" with { type: "json" };

const root = process.cwd();
const requiredPlatformFiles = [
  "platform.ts",
  "storage.ts",
  "lifecycle.ts",
  "safe-area.ts",
  "orientation.ts",
  "touch.ts",
  "haptics.ts",
  "notifications.ts",
  "deep-links.ts",
  "auth.ts",
  "purchases.ts",
  "sharing.ts"
];

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "storybook-static") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results);
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function rel(file) {
  return path.relative(root, file);
}

const srcFiles = walk(path.join(root, "src"));
const platformMissing = requiredPlatformFiles.filter((file) => !fs.existsSync(path.join(root, "src/platform", file)));
const appSourceFiles = srcFiles.filter((file) => !rel(file).startsWith("src/platform/") && !rel(file).startsWith("src/test/"));
const directLocalStorage = appSourceFiles
  .flatMap((file) => {
    const text = fs.readFileSync(file, "utf8");
    return /\b(window\.)?localStorage\.(getItem|setItem|removeItem|clear)\b/.test(text) ? [rel(file)] : [];
  });
const hoverUsage = appSourceFiles
  .flatMap((file) => {
    const text = fs.readFileSync(file, "utf8");
    return text.includes("hover:") || text.includes("onMouseEnter") ? [rel(file)] : [];
  });
const windowUsage = appSourceFiles
  .flatMap((file) => {
    const text = fs.readFileSync(file, "utf8");
    return /\bwindow\./.test(text) || /\bdocument\./.test(text) ? [rel(file)] : [];
  });
const safeAreaTargets = appSourceFiles
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n")
  .match(/data-safe-area-target/g)?.length ?? 0;

const ios = runtime.clientProfiles?.ios;
const android = runtime.clientProfiles?.android;
const failures = [];
const warnings = [];

if ((runtime.metadata?.contentVersion ?? 0) < 20) failures.push(`Expected Studio contentVersion 20 or newer, got ${runtime.metadata?.contentVersion ?? "missing"}.`);
if (!ios) failures.push("Missing clientProfiles.ios.");
if (!android) failures.push("Missing clientProfiles.android.");
if (platformMissing.length) failures.push(`Missing platform modules: ${platformMissing.join(", ")}.`);
if (directLocalStorage.length) failures.push(`Direct localStorage usage outside platform/tests: ${directLocalStorage.join(", ")}.`);
if (safeAreaTargets < 5) failures.push(`Expected at least 5 safe-area targets, found ${safeAreaTargets}.`);
if (hoverUsage.length) warnings.push(`Hover affordances still need touch review: ${hoverUsage.length} files.`);
if (windowUsage.length) warnings.push(`Browser API usage remains behind web implementation review: ${windowUsage.length} files.`);

const report = {
  ok: failures.length === 0,
  contentVersion: runtime.metadata?.contentVersion,
  checksum: runtime.metadata?.checksum,
  profiles: {
    ios: Boolean(ios),
    android: Boolean(android),
    iosDeviceClasses: ios?.supportedDeviceClasses?.map((item) => item.id) ?? [],
    androidDeviceClasses: android?.supportedDeviceClasses?.map((item) => item.id) ?? [],
    iosMinimumTouchTarget: ios?.touchProfile?.minimumTouchTarget,
    androidMinimumTouchTarget: android?.touchProfile?.minimumTouchTarget
  },
  platformFiles: requiredPlatformFiles,
  safeAreaTargets,
  audits: {
    directLocalStorage,
    hoverFiles: hoverUsage,
    browserApiFiles: windowUsage
  },
  warnings,
  failures
};

console.log(JSON.stringify(report, null, 2));

if (failures.length) {
  process.exit(1);
}
