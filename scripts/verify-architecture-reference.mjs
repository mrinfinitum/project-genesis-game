import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import runtime from "../src/content/generated/studio-runtime.snapshot.json" with { type: "json" };

const projectRoot = process.cwd();
const docPath = path.join(projectRoot, "docs/ARCHITECTURE.md");
const referencePath = path.join(projectRoot, "src/config/architecture-reference.ts");
const failures = [];

function fail(message) {
  failures.push(message);
}

if (!existsSync(docPath)) fail("docs/ARCHITECTURE.md is missing.");
if (!existsSync(referencePath)) fail("src/config/architecture-reference.ts is missing.");

const doc = existsSync(docPath) ? readFileSync(docPath, "utf8") : "";
const reference = existsSync(referencePath) ? readFileSync(referencePath, "utf8") : "";

if (!reference.includes('owner: "Project Genesis Studio"')) fail("Architecture owner must be Project Genesis Studio.");
if (!reference.includes('architectureVersion: "1.0.0"')) fail("Architecture version must be 1.0.0.");
if (!reference.includes('runtimeVersion: "game-runtime-v1"')) fail("Runtime version must be game-runtime-v1.");
if (!reference.includes("minimumContentVersion: 12")) fail("Minimum contentVersion must be 12.");
if (!reference.includes('policy: "studio-wins"')) fail("Architecture policy must be studio-wins.");

if (!doc.includes("Project Genesis Studio owns the canonical NOVERIS Architecture Workspace")) fail("Architecture doc must state Studio ownership.");
if (!doc.includes("architectureVersion: `1.0.0`")) fail("Architecture doc must reference version 1.0.0.");
if (!doc.includes("contentVersion: `12`")) fail("Architecture doc must reference contentVersion 12.");

const forbiddenPatterns = [
  new RegExp(`Architecture Workspace ${"Section"}\\s+\\d+`, "i"),
  new RegExp(`Permanent Decision ${"Log Entry"}`, "i"),
  new RegExp(["", "Users", "geofftracy", "projects", "neo-city-tycoon"].join("\\/"), "i"),
  new RegExp(`Studio\\/${"Architecture Workspace"}`, "i")
];

for (const [file, body] of [[docPath, doc], [referencePath, reference]]) {
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(body)) fail(`${path.relative(projectRoot, file)} appears to include private Studio architecture details: ${pattern}.`);
  }
}

const exportedArchitectureVersion = runtime.metadata?.architectureVersion ?? runtime.architectureVersion;
const loadedRuntimeVersion = runtime.metadata?.runtimeVersion ?? runtime.metadata?.schemaVersion ?? runtime.runtimeVersion;
if (exportedArchitectureVersion && exportedArchitectureVersion !== "1.0.0") fail(`Runtime architectureVersion ${exportedArchitectureVersion} does not match 1.0.0.`);
if (loadedRuntimeVersion !== "game-runtime-v1") fail(`Runtime version ${loadedRuntimeVersion ?? "missing"} is not game-runtime-v1.`);
if ((runtime.metadata?.contentVersion ?? 0) < 12) fail(`Runtime contentVersion ${runtime.metadata?.contentVersion ?? "missing"} is below 12.`);

const test = spawnSync("npm", ["test", "--", "src/test/architecture-reference.test.tsx"], {
  cwd: projectRoot,
  stdio: "inherit"
});
if (test.status !== 0) fail("Architecture compatibility resolver tests failed.");

const result = {
  ok: failures.length === 0,
  architectureVersion: "1.0.0",
  exportedArchitectureVersion: exportedArchitectureVersion ?? "Unknown",
  runtimeVersion: loadedRuntimeVersion,
  contentVersion: runtime.metadata?.contentVersion,
  testsPassed: test.status === 0,
  failures
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
