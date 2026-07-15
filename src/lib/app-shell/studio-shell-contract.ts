import { ROBLOX_DASHBOARD_LAYOUT, type RobloxRect } from "@/lib/dashboard/dashboard-layout";

export type ShellPresentationMode = "shell_workspace" | "full_screen_takeover";

export type NoverisShellRoute = {
  id: string;
  label: string;
  path: string;
  screenId: string;
  presentationMode: ShellPresentationMode;
};

export type StudioShellContract = {
  shellId: string;
  shellVersion: string;
  source: "studio-runtime" | "temporary-adapter";
  bridgeNote: string;
  topHud: RobloxRect;
  leftNavigation: RobloxRect;
  mainWorkspaceSlot: RobloxRect;
  desktopProfile: string;
  mobileProfile: string;
  routes: NoverisShellRoute[];
  fullScreenTakeovers: string[];
};

const workspaceLeft = ROBLOX_DASHBOARD_LAYOUT.leftColumn.x;
const workspaceTop = ROBLOX_DASHBOARD_LAYOUT.leftColumn.y;
const workspaceRight = ROBLOX_DASHBOARD_LAYOUT.rightColumn.x + ROBLOX_DASHBOARD_LAYOUT.rightColumn.width;
const workspaceBottom = ROBLOX_DASHBOARD_LAYOUT.rightColumn.y + ROBLOX_DASHBOARD_LAYOUT.rightColumn.height;

export const TEMPORARY_STUDIO_SHELL_CONTRACT: StudioShellContract = {
  shellId: "noveris-civilization-shell",
  shellVersion: "temporary-adapter-v1",
  source: "temporary-adapter",
  bridgeNote: "Temporary bridge until Project Genesis Studio publishes the app shell contract in public runtime. Keep all shell geometry centralized here.",
  topHud: ROBLOX_DASHBOARD_LAYOUT.topHud,
  leftNavigation: ROBLOX_DASHBOARD_LAYOUT.sidebar,
  mainWorkspaceSlot: {
    x: workspaceLeft,
    y: workspaceTop,
    width: workspaceRight - workspaceLeft,
    height: workspaceBottom - workspaceTop
  },
  desktopProfile: "fixed-top-hud-left-navigation-workspace",
  mobileProfile: "shared-shell-collapsible-navigation-workspace",
  routes: [
    { id: "dashboard", label: "Overview", path: "/", screenId: "dashboard", presentationMode: "shell_workspace" },
    { id: "production", label: "Buildings", path: "/buildings", screenId: "buildings", presentationMode: "shell_workspace" },
    { id: "research", label: "Research", path: "/research", screenId: "research", presentationMode: "shell_workspace" },
    { id: "upgrades", label: "Upgrades", path: "/upgrades", screenId: "upgrades", presentationMode: "shell_workspace" },
    { id: "civilization", label: "Civilization", path: "/civilization", screenId: "civilization", presentationMode: "shell_workspace" },
    { id: "events", label: "Events", path: "/events", screenId: "events", presentationMode: "shell_workspace" },
    { id: "galaxy", label: "Galaxy", path: "/galaxy", screenId: "galaxy", presentationMode: "shell_workspace" },
    { id: "spaceport", label: "Spaceport", path: "/spaceport", screenId: "spaceport", presentationMode: "shell_workspace" },
    { id: "resources", label: "Resources", path: "/resources", screenId: "resources", presentationMode: "shell_workspace" },
    { id: "earth", label: "Earth", path: "/earth", screenId: "earth", presentationMode: "shell_workspace" },
    { id: "solar-system", label: "Solar System", path: "/solar-system", screenId: "solar-system", presentationMode: "shell_workspace" },
    { id: "discovery", label: "Discovery", path: "/discovery", screenId: "discovery", presentationMode: "shell_workspace" }
  ],
  fullScreenTakeovers: ["loading", "welcome", "login", "signup", "forgot-password", "reset-password", "save-conflict"]
};

export function resolveStudioShellContract(): StudioShellContract {
  return TEMPORARY_STUDIO_SHELL_CONTRACT;
}

export function routePathForShellId(id: string) {
  return TEMPORARY_STUDIO_SHELL_CONTRACT.routes.find((route) => route.id === id)?.path ?? "/";
}

export function resolveWorkspaceLayout({ workspaceSlot, screenLayout }: { shellProfile?: StudioShellContract; workspaceSlot?: RobloxRect; screenLayout?: Partial<RobloxRect> }) {
  const slot = workspaceSlot ?? TEMPORARY_STUDIO_SHELL_CONTRACT.mainWorkspaceSlot;
  return {
    origin: { x: slot.x, y: slot.y },
    bounds: {
      x: screenLayout?.x ?? 0,
      y: screenLayout?.y ?? 0,
      width: screenLayout?.width ?? slot.width,
      height: screenLayout?.height ?? slot.height
    },
    slot
  };
}
