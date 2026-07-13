import { readFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AutoClickPanel, ClickPowerPanel, GameShell, RobloxNavigation } from "@/components/game-ui/genesis-ui";
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

  it("uses the registered Roblox sidebar background with one measured separator between each slot", async () => {
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
    expect(container.querySelectorAll("[data-testid='nav-css-divider']")).toHaveLength(0);
    const masks = screen.getAllByTestId(/roblox-nav-baked-separator-mask-/);
    expect(masks).toHaveLength(6);
    expect(masks[0]).toHaveStyle({
      left: "24px",
      top: "127.5px",
      width: "112px"
    });
    const separators = screen.getAllByTestId(/roblox-nav-separator-/);
    expect(separators).toHaveLength(7);
    expect(separators[0]).toHaveStyle({
      left: "27px",
      top: "130.5px",
      width: "106px"
    });
    expect(Number.parseFloat(separators[6].style.top)).toBeCloseTo(805.5);
  });

  it("renders nav icons above decorative background layers", async () => {
    const data = await bundledRuntime();
    render(<RobloxNavigation active="dashboard" art={createDashboardArtMap(data.assets)} />);

    expect(screen.getByTestId("roblox-integrated-nav-hud")).toHaveAttribute("data-dom-model", "single-hud-image-with-absolute-overlays");
    expect(screen.getByTestId("roblox-nav-item-dashboard")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("roblox-nav-item-dashboard")).toHaveStyle({
      left: "8px",
      top: "18px",
      width: "144px",
      height: "112.5px"
    });
    expect(screen.getByTestId("roblox-nav-icon-dashboard")).toHaveAttribute("data-z-layer", "icon-above-background");
    expect(screen.getByTestId("roblox-nav-icon-dashboard")).toHaveClass("z-20");
    const dashboardLabelStyle = screen.getByTestId("roblox-nav-label-dashboard").style;
    expect(Number.parseFloat(dashboardLabelStyle.left)).toBeCloseTo(8);
    expect(Number.parseFloat(dashboardLabelStyle.top)).toBeCloseTo(95.25);
    expect(Number.parseFloat(dashboardLabelStyle.width)).toBeCloseTo(144);
    expect(Number.parseFloat(dashboardLabelStyle.height)).toBeCloseTo(28);
    expect(Number.parseFloat(screen.getByTestId("roblox-nav-label-events").style.top)).toBeCloseTo(657.75);
  });

  it("keeps every left nav item in an identical vertical slot", async () => {
    const data = await bundledRuntime();
    render(<RobloxNavigation active="dashboard" art={createDashboardArtMap(data.assets)} />);

    const items = [
      "dashboard",
      "production",
      "research",
      "upgrades",
      "civilization",
      "events",
      "galaxy",
      "spaceport"
    ].map((id) => screen.getByTestId(`roblox-nav-item-${id}`));
    const itemTops = items.map((item) => Number.parseFloat(item.style.top));
    const labelTops = [
      "dashboard",
      "production",
      "research",
      "upgrades",
      "civilization",
      "events",
      "galaxy",
      "spaceport"
    ].map((id) => Number.parseFloat(screen.getByTestId(`roblox-nav-label-${id}`).style.top));

    for (let index = 1; index < itemTops.length; index += 1) {
      expect(itemTops[index] - itemTops[index - 1]).toBeCloseTo(112.5);
      expect(labelTops[index] - labelTops[index - 1]).toBeCloseTo(112.5);
    }
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
    expect(screen.getByText("Click Power")).toHaveClass("text-[28px]");
    expect(screen.getByText("Auto Click")).toHaveClass("text-[28px]");
    expect(screen.getByText("Critical Chance")).toHaveClass("text-[17px]");
  });

  it("keeps Click Power controls inside the canonical panel bounds", async () => {
    const data = await bundledRuntime();
    const model = createDashboardModel(data, {
      activeEraId: data.eras[0]?.id ?? "survival",
      activeCategoryId: data.upgradeCategories[0]?.id ?? "workforce"
    });

    render(<ClickPowerPanel data={data} model={model} art={createDashboardArtMap(data.assets)} />);

    expectInside("0,0,350,344", screen.getByTestId("click-power-ring").getAttribute("data-rojo-rect") ?? "");
    expect(screen.getByTestId("click-power-ring")).toHaveAttribute("data-rojo-rect", "25,82,174,174");
    expect(screen.getByTestId("click-power-stat-block")).toHaveAttribute("data-rojo-rect", "196,82,126,152");
    expect(screen.getByTestId("click-power-button")).toHaveAttribute("data-rojo-rect", "39,267,272,55");
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
    expect(screen.getByTestId("auto-click-ring")).toHaveAttribute("data-rojo-rect", "35,76,150,150");
    expect(screen.getByTestId("auto-click-stat-block")).toHaveAttribute("data-rojo-rect", "198,70,122,128");
    expect(screen.getByTestId("auto-click-button")).toHaveAttribute("data-rojo-rect", "33,206,286,55");
  });

  it("keeps Critical stats spacing aligned to the reference column", async () => {
    render(<GameShell data={await bundledRuntime()} />);

    expectInside("0,0,350,185", screen.getByTestId("critical-star-icon").getAttribute("data-rojo-rect") ?? "");
    expectInside("0,0,350,185", screen.getByTestId("critical-stats-block").getAttribute("data-rojo-rect") ?? "");
    expect(screen.getByTestId("critical-star-icon")).toHaveAttribute("data-rojo-rect", "42,30,104,104");
    expect(screen.getByTestId("critical-stats-block")).toHaveAttribute("data-rojo-rect", "158,38,168,132");
  });

  it("does not introduce direct Roblox asset paths in JSX", () => {
    const source = readFileSync("src/components/game-ui/genesis-ui.tsx", "utf8");

    expect(source).not.toContain("/roblox-assets/");
  });
});
