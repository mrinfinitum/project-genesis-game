import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

const app = await read("src/App.tsx");
const shell = await read("src/components/game-ui/genesis-ui.tsx");
const contract = await read("src/lib/app-shell/studio-shell-contract.ts");
const routeFiles = [
  "src/routes/production-route.tsx",
  "src/routes/buildings-route.tsx",
  "src/routes/research-route.tsx",
  "src/routes/upgrades-route.tsx",
  "src/routes/civilization-route.tsx",
  "src/routes/events-route.tsx",
  "src/routes/galaxy-route.tsx",
  "src/routes/spaceport-route.tsx",
  "src/routes/earth-route.tsx",
  "src/routes/solar-system-route.tsx",
  "src/routes/discovery-route.tsx"
];

assert(contract.includes("TEMPORARY_STUDIO_SHELL_CONTRACT"), "App shell temporary Studio bridge contract is missing.");
assert(contract.includes("mainWorkspaceSlot"), "App shell contract must define a main workspace slot.");
assert(contract.includes("fullScreenTakeovers"), "App shell contract must define full-screen takeover exceptions.");
assert(contract.includes("presentationMode: \"shell_workspace\""), "Normal routes must be shell_workspace routes.");
assert(app.includes("function NoverisAppShell"), "NoverisAppShell is missing.");
assert(app.includes("<GameShell"), "Runtime routes must mount the shared GameShell.");
assert(app.includes("workspace={workspace}"), "NoverisAppShell must pass a workspace outlet to GameShell.");
assert(app.includes("<Route index element={null} />"), "Overview route should use GameShell dashboard mode without a duplicate route shell.");
assert(app.includes("path=\"buildings\""), "Buildings route is missing.");
assert(app.includes("path=\"upgrades\""), "Upgrades route is missing.");
assert(app.includes("path=\"events\""), "Events route is missing.");
assert(app.includes("path=\"galaxy\""), "Galaxy route is missing.");
assert(app.includes("path=\"spaceport\""), "Spaceport route is missing.");
assert(shell.includes("data-testid=\"main-workspace-slot\""), "GameShell must expose MainWorkspaceSlot.");
assert(shell.includes("data-presentation-mode=\"shell_workspace\""), "MainWorkspaceSlot must declare shell_workspace mode.");
assert(shell.includes("onNavigate?.(item.id)"), "Left navigation must dispatch shell route navigation.");

for (const routeFile of routeFiles) {
  const source = await read(routeFile);
  assert(!source.includes("GameShell"), `${routeFile} must not render or import GameShell.`);
  assert(source.includes("Workspace"), `${routeFile} must render a workspace component.`);
}

console.log(JSON.stringify({
  ok: true,
  shell: "NoverisAppShell",
  contract: "TEMPORARY_STUDIO_SHELL_CONTRACT",
  workspaceRoutes: routeFiles.length,
  normalPresentationMode: "shell_workspace",
  fullScreenTakeovers: ["loading", "welcome", "login", "signup", "forgot-password", "reset-password", "save-conflict"]
}, null, 2));
