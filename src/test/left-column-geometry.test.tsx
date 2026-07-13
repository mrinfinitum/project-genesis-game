import { readFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AutoClickPanel, GameShell, RobloxNavigation } from "@/components/game-ui/genesis-ui";
import { createDashboardArtMap, getBundledStudioRuntimeSnapshot, type GameRuntimeData } from "@/lib/canonical-runtime";
import { createDashboardModel } from "@/lib/dashboard/dashboard-model";
import { ROBLOX_DASHBOARD_LAYOUT } from "@/lib/dashboard/dashboard-layout";

async function bundledRuntime() {
  const runtime = await getBundledStudioRuntimeSnapshot();
  expect(runtime).not.toBeNull();
  return runtime as GameRuntimeData;
}

function parseRect(rect: string) {
  return rect.split(",").map((value) => Number.parseFloat(value));
}

function expectInside(parent: string, child: string) {
  const [parentX, parentY, parentWidth, parentHeight] = parseRect(parent);
  const [childX, childY, childWidth, childHeight] = parseRect(child);

  expect(childX).toBeGreaterThanOrEqual(parentX);
  expect(childY).toBeGreaterThanOrEqual(parentY);
  expect(childX + childWidth).toBeLessThanOrEqual(parentX + parentWidth);
  expect(childY + childHeight).toBeLessThanOrEqual(parentY + parentHeight);
}

afterEach(() => cleanup());

describe("Roblox left column geometry", () => {
  it("preserves the canonical Rojo sidebar and clicker column coordinates", () => {
    expect(ROBLOX_DASHBOARD_LAYOUT.sidebar).toEqual({ x: 12, y: 126, width: 160, height: 944 });
    expect(ROBLOX_DASHBOARD_LAYOUT.leftColumn).toEqual({ x: 184, y: 126, width: 350, height: 823 });
  });

  it("uses the registered Roblox sidebar background without CSS divider duplication", async () => {
    const data = await bundledRuntime();
    const { container } = render(<RobloxNavigation active="dashboard" art={createDashboardArtMap(data.assets)} />);

    const background = screen.getByTestId("roblox-sidebar-background");
    expect(background).toHaveAttribute("data-art-key", "dashboard_nav_background");
    expect(background).toHaveAttribute("data-local-path", "/roblox-assets/UI/ui_panel_side_menu.png");
    expect(background).toHaveAttribute("data-native-size", "160x790");
    expect(background).toHaveAttribute("data-rendered-size", "160x944");
    expect(background).toHaveAttribute("data-background-size", "100% 100%");
    expect(background).toHaveAttribute("data-background-position", "0 0");
    expect(background).toHaveAttribute("data-repeat", "no-repeat");
    expect(background).toHaveClass("object-fill");
    expect(container.querySelectorAll("span[class*='h-px'], [data-testid='nav-css-divider']")).toHaveLength(0);
  });

  it("renders nav icons above decorative background layers", async () => {
    const data = await bundledRuntime();
    render(<RobloxNavigation active="dashboard" art={createDashboardArtMap(data.assets)} />);

    expect(screen.getByTestId("roblox-integrated-nav-hud")).toHaveAttribute("data-dom-model", "single-hud-image-with-absolute-overlays");
    expect(screen.getByTestId("roblox-nav-item-dashboard")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("roblox-nav-item-dashboard")).toHaveStyle({
      left: "8px",
      top: "10px",
      width: "144px",
      height: "103.84px"
    });
    expect(screen.getByTestId("roblox-nav-icon-dashboard")).toHaveAttribute("data-z-layer", "icon-above-background");
    expect(screen.getByTestId("roblox-nav-icon-dashboard")).toHaveClass("z-20");
    const dashboardLabelStyle = screen.getByTestId("roblox-nav-label-dashboard").style;
    expect(Number.parseFloat(dashboardLabelStyle.left)).toBeCloseTo(8);
    expect(Number.parseFloat(dashboardLabelStyle.top)).toBeCloseTo(78);
    expect(Number.parseFloat(dashboardLabelStyle.width)).toBeCloseTo(144);
    expect(Number.parseFloat(dashboardLabelStyle.height)).toBeCloseTo(28);
  });

  it("uses independent icon and label overlays instead of per-item visual containers", async () => {
    const data = await bundledRuntime();
    render(<RobloxNavigation active="dashboard" art={createDashboardArtMap(data.assets)} />);

    expect(screen.getByTestId("roblox-nav-item-dashboard").querySelector("img, span, svg")).toBeNull();
    expect(screen.getAllByTestId(/roblox-nav-icon-/)).toHaveLength(8);
    expect(screen.getAllByTestId(/roblox-nav-label-/)).toHaveLength(8);
    expect(screen.queryByTestId("roblox-nav-active-frame")).toBeNull();
  });

  it("does not draw separate bordered cards around inactive nav hit targets", async () => {
    const data = await bundledRuntime();
    render(<RobloxNavigation active="dashboard" art={createDashboardArtMap(data.assets)} />);

    const inactive = screen.getByTestId("roblox-nav-item-production");
    expect(inactive).toHaveAttribute("data-active", "false");
    expect(inactive).toHaveClass("border-0");
    expect(inactive).toHaveClass("bg-transparent");
    expect(inactive.className).not.toMatch(/rounded|shadow|border-cyan|bg-\[rgb|bg-\[rgba/);
  });

  it("uses one shared left-column clicker background for Click, Auto, and Critical", async () => {
    const { container } = render(<GameShell data={await bundledRuntime()} />);

    const backgrounds = screen.getAllByTestId("roblox-left-column-background");
    expect(backgrounds).toHaveLength(1);
    expect(backgrounds[0]).toHaveAttribute("data-art-key", "dashboard_click_panel_background");
    expect(backgrounds[0]).toHaveAttribute("data-local-path", "/roblox-assets/UI/hud_clicker_350x823.png");
    expect(backgrounds[0]).toHaveAttribute("data-rendered-size", "350x823");
    expect(backgrounds[0]).toHaveAttribute("data-background-size", "100% 100%");
    expect(screen.getByTestId("critical-stats-panel")).toHaveAttribute("data-rojo-rect", "0,638,350,185");
    expect(container.querySelectorAll("[data-art-key='dashboard_click_panel_background']")).toHaveLength(1);
    expect(container.querySelectorAll("[data-art-key='dashboard_auto_panel_background']")).toHaveLength(0);
    expect(container.querySelectorAll("[data-art-key='dashboard_critical_panel_background']")).toHaveLength(0);
  });

  it("uses exact registered action button art and removes non-canonical critical copy", async () => {
    const { container } = render(<GameShell data={await bundledRuntime()} />);

    expect(container.querySelector("[data-art-key='dashboard_click_button']")).toBeTruthy();
    expect(container.querySelector("[data-art-key='dashboard_auto_button_on'], [data-art-key='dashboard_auto_button_off']")).toBeTruthy();
    expect(screen.queryByText(/Next Milestone/i)).toBeNull();
  });

  it("keeps visible HUD images semantic through the dashboard art registry", async () => {
    const { container } = render(<GameShell data={await bundledRuntime()} />);
    const semanticImages = [...container.querySelectorAll("img[data-art-key]")];

    expect(semanticImages.length).toBeGreaterThanOrEqual(12);
    for (const image of semanticImages) {
      expect(image.getAttribute("data-art-key")).not.toMatch(/^\/|roblox-assets/);
    }
  });

  it("keeps HUD typography in the measured Roblox source ranges", async () => {
    const data = await bundledRuntime();
    render(<GameShell data={data} />);

    expect(screen.getByTestId("roblox-nav-label-dashboard")).toHaveClass("text-[15px]");
    expect(screen.getByText("Click Power")).toHaveClass("text-[18px]");
    expect(screen.getByText("Auto Click")).toHaveClass("text-[18px]");
    expect(screen.getByText("Critical Chance")).toHaveClass("text-[12px]");
  });

  it("keeps Auto Click controls inside the canonical panel bounds", async () => {
    const data = await bundledRuntime();
    const model = createDashboardModel(data, {
      activeEraId: data.eras[0]?.id ?? "survival",
      activeCategoryId: data.upgradeCategories[0]?.id ?? "workforce"
    });

    render(<AutoClickPanel model={model} art={createDashboardArtMap(data.assets)} />);

    const panel = screen.getByTestId("auto-click-panel").getAttribute("data-rojo-rect") ?? "";
    expect(panel).toBe("0,344,350,270");
    expectInside("0,0,350,270", screen.getByTestId("auto-click-ring").getAttribute("data-rojo-rect") ?? "");
    expectInside("0,0,350,270", screen.getByTestId("auto-click-stat-block").getAttribute("data-rojo-rect") ?? "");
    expectInside("0,0,350,270", screen.getByTestId("auto-click-button").getAttribute("data-rojo-rect") ?? "");
  });

  it("does not introduce direct Roblox asset paths in JSX", () => {
    const source = readFileSync("src/components/game-ui/genesis-ui.tsx", "utf8");

    expect(source).not.toContain("/roblox-assets/");
  });
});
