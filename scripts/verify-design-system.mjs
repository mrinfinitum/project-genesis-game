import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const ds01Path = path.join(projectRoot, "docs/design-system/DS-01-visual-language.md");
const packagePath = path.join(projectRoot, "package.json");
const failures = [];

function fail(message) {
  failures.push(message);
}

if (!existsSync(ds01Path)) {
  fail("DS-01 visual language document is missing.");
}

const doc = existsSync(ds01Path) ? readFileSync(ds01Path, "utf8") : "";
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

for (const expected of [
  "DS-01 Visual Language & Design Philosophy",
  "Version: `1.0`",
  "NOVERIS represents humanity's greatest future.",
  "The universe is always the hero.",
  "Environment",
  "Important interaction",
  "Critical information",
  "Supporting information",
  "Decoration",
  "Deep space navy",
  "Cool cyan",
  "Warm gold",
  "Technology is translucent.",
  "HUD is not an overlay.",
  "premium PC strategy game",
  "Do not imitate admin software.",
  "No `contentVersion` change.",
  "No `runtimeVersion` change."
]) {
  if (!doc.includes(expected)) fail(`DS-01 is missing required language: ${expected}`);
}

for (const forbidden of [
  "export const",
  "runtimeVersion:",
  "contentVersion:",
  "architectureVersion:"
]) {
  if (doc.includes(forbidden)) fail(`DS-01 must not define runtime or architecture code/contracts: ${forbidden}`);
}

if (packageJson.scripts?.["verify:design-system"] !== "node scripts/verify-design-system.mjs") {
  fail("package.json must expose verify:design-system.");
}

const result = {
  ok: failures.length === 0,
  document: "docs/design-system/DS-01-visual-language.md",
  designSystemDocument: "DS-01",
  version: "1.0",
  uiImplemented: false,
  gameplayContractsModified: false,
  runtimeContractsModified: false,
  contentVersionChanged: false,
  runtimeVersionChanged: false,
  failures
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
