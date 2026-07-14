import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutoClickPanel, ClickPowerPanel, GameShell, RobloxNavigation } from "@/components/game-ui/genesis-ui";
import { createDashboardArtMap, getBundledStudioRuntimeSnapshot, type GameRuntimeData } from "@/lib/canonical-runtime";
import { createDashboardModel } from "@/lib/dashboard/dashboard-model";
import { ROBLOX_DASHBOARD_LAYOUT } from "@/lib/dashboard/dashboard-layout";
import { createNewPlayerRuntimeState } from "@/lib/player-runtime";

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
    expect(backgrounds[0]).toHaveAttribute("data-native-size", "350x823");
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
    expect(screen.getByText("Click Power")).toHaveClass("text-[20px]");
    expect(screen.getByText("Auto Click")).toHaveClass("text-[20px]");
    expect(screen.getByText("Critical Chance")).toHaveClass("text-[15px]");
  });

  it("keeps Click Power controls inside the canonical panel bounds", async () => {
    const data = await bundledRuntime();
    const model = createDashboardModel(data, {
      activeEraId: data.eras[0]?.id ?? "survival",
      activeCategoryId: data.upgradeCategories[0]?.id ?? "workforce"
    });

    render(<ClickPowerPanel data={data} model={model} art={createDashboardArtMap(data.assets)} />);

    expectInside("0,0,350,344", screen.getByTestId("click-power-ring").getAttribute("data-rojo-rect") ?? "");
    expectInside("0,0,350,344", screen.getByTestId("click-power-button").getAttribute("data-rojo-rect") ?? "");
    expect(screen.getByTestId("click-power-ring")).toHaveAttribute("data-rojo-rect", "31,80,162,162");
    expect(screen.getByTestId("click-power-stat-block")).toHaveAttribute("data-rojo-rect", "196,82,126,145");
    expect(screen.getByTestId("click-power-button")).toHaveAttribute("data-rojo-rect", "32,250,294,66");
  });

  it("routes the Click Power ring and button through the same manual labor action", async () => {
    const data = await bundledRuntime();
    const performManualLaborClick = vi.fn();
    render(
      <GameShell
        data={data}
        playerState={{
          source: "player-runtime",
          sourceLabel: "Test Runtime",
          currentEraId: "survival",
          resourceInventory: {},
          resourceRates: {},
          upgradeLevels: {},
          clickOutput: {
            resourceId: "ECON-LABOR",
            label: "Labor",
            amount: 1,
            lastGain: 0,
            perClickLabel: "Per Click"
          },
          automation: {
            label: "Auto Click",
            amountPerSecond: 0,
            enabled: true
          }
        }}
        playerRuntimeActions={{
          saveNow: vi.fn(),
          resetSave: vi.fn(),
          deleteLocalSave: vi.fn(),
          exportSave: () => "{}",
          importSave: () => true,
          advanceSimulation: vi.fn(),
          grantTestResources: vi.fn(),
          grantTestPrimaryEconomy: vi.fn(),
          grantTestResearch: vi.fn(),
          performManualLaborClick,
          toggleAutomation: vi.fn()
        }}
      />
    );

    fireEvent.click(screen.getByTestId("click-power-ring"));
    fireEvent.click(screen.getByTestId("click-power-button"));

    expect(performManualLaborClick).toHaveBeenCalledTimes(2);
  });

  it("keeps Click controls disabled until the runtime is hydrated", async () => {
    const data = await bundledRuntime();
    const performManualLaborClick = vi.fn();
    render(
      <GameShell
        data={data}
        playerRuntimeActions={{
          saveNow: vi.fn(),
          resetSave: vi.fn(),
          deleteLocalSave: vi.fn(),
          exportSave: () => "{}",
          importSave: () => true,
          advanceSimulation: vi.fn(),
          grantTestResources: vi.fn(),
          grantTestPrimaryEconomy: vi.fn(),
          grantTestResearch: vi.fn(),
          performManualLaborClick,
          toggleAutomation: vi.fn()
        }}
        runtimeStatus={{ runtimeId: "hydrating", hydrationComplete: false, gameplayReady: false, actionOwner: "player-runtime-provider", isSimulationRunning: false, simulationStartCount: 0, tickCount: 0, controlsEnabled: false, disabledReason: "startup resolving save" }}
      />
    );

    fireEvent.click(screen.getByTestId("click-power-ring"));
    fireEvent.click(screen.getByTestId("click-power-button"));

    expect(performManualLaborClick).not.toHaveBeenCalled();
  });

  it("does not disable Click controls for pending cloud sync", async () => {
    const data = await bundledRuntime();
    const performManualLaborClick = vi.fn();
    render(
      <GameShell
        data={data}
        playerRuntimeActions={{
          saveNow: vi.fn(),
          resetSave: vi.fn(),
          deleteLocalSave: vi.fn(),
          exportSave: () => "{}",
          importSave: () => true,
          advanceSimulation: vi.fn(),
          grantTestResources: vi.fn(),
          grantTestPrimaryEconomy: vi.fn(),
          grantTestResearch: vi.fn(),
          performManualLaborClick,
          toggleAutomation: vi.fn()
        }}
        cloudSync={{ activeSaveSource: "cloud", status: "Pending Sync", dirty: true, pendingRetry: true, offlineProgressionApplyCount: 1 }}
        runtimeStatus={{ runtimeId: "runtime-1", hydrationComplete: true, gameplayReady: true, actionOwner: "player-runtime-provider", isSimulationRunning: true, activeSimulationRuntimeId: "runtime-1", simulationStartCount: 1, tickCount: 4, controlsEnabled: true }}
      />
    );

    fireEvent.click(screen.getByTestId("click-power-ring"));
    fireEvent.click(screen.getByTestId("click-power-button"));

    expect(performManualLaborClick).toHaveBeenCalledTimes(2);
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
    expect(screen.getByTestId("auto-click-ring")).toHaveAttribute("data-rojo-rect", "48,82,128,128");
    expect(screen.getByTestId("auto-click-stat-block")).toHaveAttribute("data-rojo-rect", "198,72,122,120");
    expect(screen.getByTestId("auto-click-button")).toHaveAttribute("data-rojo-rect", "33,209,286,47");
  });

  it("keeps Critical stats spacing aligned to the reference column", async () => {
    render(<GameShell data={await bundledRuntime()} />);

    expectInside("0,0,350,185", screen.getByTestId("critical-star-icon").getAttribute("data-rojo-rect") ?? "");
    expectInside("0,0,350,185", screen.getByTestId("critical-stats-block").getAttribute("data-rojo-rect") ?? "");
    expect(screen.getByTestId("critical-star-icon")).toHaveAttribute("data-rojo-rect", "46,31,94,94");
    expect(screen.getByTestId("critical-stats-block")).toHaveAttribute("data-rojo-rect", "154,35,170,136");
  });

  it("keeps the top HUD on measured fixed coordinates with source artwork", async () => {
    render(<GameShell data={await bundledRuntime()} />);

    expect(screen.getByTestId("roblox-top-hud")).toHaveAttribute("data-layout-mode", "fixed-rojo-coordinates");
    expect(screen.getByTestId("roblox-top-hud-background")).toHaveAttribute("data-art-key", "dashboard_top_hud");
    expect(screen.getByTestId("top-hud-economy-icon-ECON-LABOR")).toHaveAttribute("data-icon-key", "economy_labor");
    expect(screen.getByTestId("top-hud-economy-icon-ECON-LABOR")).toHaveAttribute("data-source-art-key", "hud_civilization_energy_icon");
    expect(screen.getByTestId("top-hud-economy-icon-ECON-LABOR")).toHaveAttribute("data-fallback-used", "true");
    expect(screen.getByTestId("top-hud-economy-icon-ECON-LABOR").getAttribute("src")).toContain("icon_civilization_energy_96x96.png");
    expect(screen.getByTestId("top-hud-economy-icon-ECON-CREDITS")).toHaveAttribute("data-icon-key", "economy_credits");
    expect(screen.getByTestId("top-hud-economy-icon-ECON-CREDITS")).toHaveAttribute("data-source-art-key", "hud_credits_icon");
    expect(screen.getByTestId("top-hud-economy-icon-ECON-CREDITS").getAttribute("src")).toContain("icon_credits_coin_96x96.png");
    expect(screen.getByTestId("top-hud-economy-icon-ECON-POPULATION").getAttribute("src")).toContain("icon_population_96x96.png");
    expect(screen.getByTestId("top-hud-economy-icon-ECON-RESEARCH").getAttribute("src")).toContain("icon_research_flask_96x96.png");
    expect(screen.getByTestId("top-hud-economy-icon-ECON-PREMIUM-CRYSTALS").getAttribute("src")).toContain("icon_civilization_points_crystal_96x96.png");
    expect(screen.getByTestId("top-hud-economy-icon-ECON-LABOR").getAttribute("src")).not.toBe(screen.getByTestId("top-hud-economy-icon-ECON-CREDITS").getAttribute("src"));
    expect(screen.getByTestId("top-hud-economy-icon-ECON-LABOR").getAttribute("src")).not.toContain("leaf");
    expect(screen.getByTestId("top-hud-civilization-identity")).toHaveStyle({
      left: "58px",
      width: "390px"
    });
    expect(screen.getByTestId("top-hud-civilization-title")).toHaveClass("left-[10px]");
    expect(screen.getByTestId("top-hud-civilization-title")).toHaveClass("top-[18px]");
    expect(screen.getByTestId("top-hud-civilization-title")).toHaveClass("w-[360px]");
    expect(screen.getByTestId("top-hud-left-utility-1")).toHaveStyle({
      left: "50px",
      top: "8px"
    });
    expect(screen.getByTestId("top-hud-right-utility-2")).toHaveStyle({
      left: "116px",
      top: "0px"
    });
  });

  it("swaps failed top HUD icon images to semantic fallback without broken-image chrome", async () => {
    render(<GameShell data={await bundledRuntime()} />);

    const creditsIcon = screen.getByTestId("top-hud-economy-icon-ECON-CREDITS");
    fireEvent.error(creditsIcon);

    const fallback = screen.getByTestId("top-hud-economy-icon-ECON-CREDITS");
    expect(fallback.tagName.toLowerCase()).toBe("div");
    expect(fallback).toHaveAttribute("data-image-status", "fallback");
    expect(fallback).toHaveAttribute("data-failure-reason", "image-load-error");
  });

  it("keeps compact top HUD values inside fixed slot bounds", async () => {
    const data = await bundledRuntime();
    render(
      <GameShell
        data={data}
        playerState={{
          source: "player-runtime",
          sourceLabel: "Large Value Test",
          civilizationName: "The Really Long Civilization Name",
          currentEraId: "survival",
          economyBalances: {
            "ECON-LABOR": 5392.3,
            "ECON-CREDITS": 13110,
            "ECON-POPULATION": 5,
            "ECON-RESEARCH": 1840000,
            "ECON-PREMIUM-CRYSTALS": 0
          },
          economyRates: {
            "ECON-LABOR": 1,
            "ECON-CREDITS": 0,
            "ECON-POPULATION": 0,
            "ECON-RESEARCH": 0,
            "ECON-PREMIUM-CRYSTALS": 0
          },
          resourceInventory: {},
          resourceRates: {},
          upgradeLevels: {}
        }}
      />
    );

    expect(screen.getByTestId("top-hud-economy-value-ECON-LABOR")).toHaveTextContent("5.39K");
    expect(screen.getByTestId("top-hud-economy-value-ECON-RESEARCH")).toHaveTextContent("1.84M");
    expect(screen.getByTestId("top-hud-economy-rate-ECON-LABOR")).toHaveTextContent("+1/s");
    expect(screen.getByTestId("top-hud-economy-icon-ECON-LABOR")).toHaveClass("h-[48px]");
    expect(screen.getByTestId("top-hud-economy-icon-ECON-LABOR")).toHaveClass("w-[48px]");
    expect(screen.getByTestId("top-hud-economy-value-ECON-LABOR")).toHaveClass("text-[31px]");
    expect(screen.getByTestId("top-hud-economy-rate-ECON-LABOR")).toHaveClass("text-[17px]");
    expect(screen.getByTestId("top-hud-civilization-title").style.fontSize).toBe("21px");
    expect(screen.getByTestId("top-hud-civilization-title")).toHaveClass("w-[360px]");
    expect(screen.getByTestId("top-hud-civilization-title")).toHaveAttribute("title", "The Really Long Civilization Name");
  });

  it("opens and closes the Settings modal from the top-right gear with focus restoration", async () => {
    const data = await bundledRuntime();
    render(<GameShell data={data} playerRuntime={createNewPlayerRuntimeState(data)} settingsAccount={{ status: "guest" }} />);

    const gear = screen.getByTestId("top-hud-right-utility-2");
    fireEvent.click(gear);

    expect(screen.getByRole("dialog", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText("Player Name")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /settings/i })).not.toBeInTheDocument();
    expect(gear).toHaveFocus();

    fireEvent.click(gear);
    expect(screen.getByRole("dialog", { name: /settings/i })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("settings-backdrop"));
    expect(screen.queryByRole("dialog", { name: /settings/i })).not.toBeInTheDocument();
  });

  it("switches Settings tabs and shows guest account actions", async () => {
    const data = await bundledRuntime();
    render(<GameShell data={data} playerRuntime={createNewPlayerRuntimeState(data)} settingsAccount={{ status: "guest" }} />);

    fireEvent.click(screen.getByTestId("top-hud-right-utility-2"));
    fireEvent.click(screen.getByRole("button", { name: "Account" }));

    expect(screen.getByText("Playing as Guest")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("shows authenticated Cloud Saves controls and disables Save Now when clean", async () => {
    const data = await bundledRuntime();
    const playerRuntime = createNewPlayerRuntimeState(data);
    render(
      <GameShell
        data={data}
        playerRuntime={playerRuntime}
        playerRuntimeActions={{
          saveNow: vi.fn(),
          resetSave: vi.fn(),
          deleteLocalSave: vi.fn(),
          saveToCloud: vi.fn(),
          chooseCloudSave: vi.fn(),
          deleteCloudSave: vi.fn(),
          exportSave: () => "{}",
          importSave: () => true,
          advanceSimulation: vi.fn(),
          grantTestResources: vi.fn(),
          grantTestPrimaryEconomy: vi.fn(),
          grantTestResearch: vi.fn(),
          performManualLaborClick: vi.fn(),
          toggleAutomation: vi.fn()
        }}
        cloudSync={{ activeSaveSource: "cloud", status: "Synced", dirty: false, pendingRetry: false, offlineProgressionApplyCount: 1, cloudRevision: 3, lastSyncedRevision: 3, lastSuccessfulSyncAt: "2026-07-14T12:00:00.000Z" }}
        cloudSave={{ id: "cloud", userId: "user", slotId: "primary", saveVersion: playerRuntime.saveVersion, contentVersion: playerRuntime.contentVersion, playerState: playerRuntime, unresolvedState: playerRuntime.unresolved, revision: 3, createdAt: playerRuntime.createdAt, updatedAt: playerRuntime.updatedAt }}
        settingsAccount={{ status: "authenticated", email: "player@noveris.life", supabaseStatus: "Available" }}
      />
    );

    fireEvent.click(screen.getByTestId("top-hud-right-utility-2"));
    fireEvent.click(screen.getByRole("button", { name: "Cloud Saves" }));

    expect(screen.getAllByText("Synced").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Save Now" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Progress to Cloud" })).toBeEnabled();
  });

  it("shows the authenticated player profile header from live runtime and sync state", async () => {
    const data = await bundledRuntime();
    const playerRuntime = {
      ...createNewPlayerRuntimeState(data, { civilizationName: "Planet Prime" }),
      civilization: {
        ...createNewPlayerRuntimeState(data).civilization,
        civilizationName: "Planet Prime"
      }
    };

    render(
      <GameShell
        data={data}
        playerRuntime={playerRuntime}
        cloudSync={{ activeSaveSource: "cloud", status: "Synced", dirty: false, pendingRetry: false, offlineProgressionApplyCount: 0 }}
        cloudSave={{ id: "cloud", userId: "user-123", slotId: "primary", saveVersion: playerRuntime.saveVersion, contentVersion: playerRuntime.contentVersion, playerState: playerRuntime, unresolvedState: playerRuntime.unresolved, revision: 2, createdAt: playerRuntime.createdAt, updatedAt: playerRuntime.updatedAt }}
        settingsAccount={{ status: "authenticated", email: "geoff@noveris.life", displayName: "Geoff Tracy" }}
        initialSettingsOpen
      />
    );

    const profile = screen.getByTestId("settings-profile-card");
    expect(profile).toHaveAttribute("data-profile-auth-state", "authenticated");
    expect(profile).toHaveTextContent("Geoff Tracy");
    expect(profile).toHaveTextContent("Planet Prime");
    expect(profile).toHaveTextContent("Era 1 · Survival");
    expect(screen.getByTestId("settings-profile-sync")).toHaveTextContent("Synced");
    expect(screen.queryByText("user-123")).not.toBeInTheDocument();
  });

  it("shows the guest profile header and opens Account without closing settings", async () => {
    const data = await bundledRuntime();
    render(
      <GameShell
        data={data}
        playerRuntime={createNewPlayerRuntimeState(data)}
        cloudSync={{ activeSaveSource: "new_game", status: "Local Only", dirty: false, pendingRetry: false, offlineProgressionApplyCount: 0 }}
        settingsAccount={{ status: "guest" }}
        initialSettingsOpen
      />
    );

    const profile = screen.getByTestId("settings-profile-card");
    expect(profile).toHaveAttribute("data-profile-auth-state", "guest");
    expect(profile).toHaveTextContent("Guest Player");
    expect(profile).toHaveTextContent("Local Only");
    expect(profile).toHaveTextContent("Save Progress to Cloud");

    fireEvent.click(profile);

    expect(screen.getByRole("dialog", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText("Playing as Guest")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Graphics" }));
    expect(screen.getByTestId("settings-profile-card")).toHaveTextContent("Guest Player");
  });

  it("falls back to the email prefix for the profile display name", async () => {
    const data = await bundledRuntime();
    render(
      <GameShell
        data={data}
        playerRuntime={createNewPlayerRuntimeState(data)}
        settingsAccount={{ status: "authenticated", email: "geoff.tracy@noveris.life" }}
        initialSettingsOpen
      />
    );

    expect(screen.getByTestId("settings-profile-card")).toHaveTextContent("Geoff Tracy");
  });

  it("updates the profile era when the runtime advances", async () => {
    const data = await bundledRuntime();
    const modern = data.eras.find((era) => era.id === "modern") ?? data.eras[0];
    const playerRuntime = createNewPlayerRuntimeState(data, { civilizationName: "Forward City" });
    playerRuntime.civilization.currentEraId = modern.id;

    render(
      <GameShell
        data={data}
        playerRuntime={playerRuntime}
        activeEraId={modern.id}
        settingsAccount={{ status: "authenticated", email: "pilot@noveris.life", displayName: "Pilot" }}
        initialSettingsOpen
      />
    );

    expect(screen.getByTestId("settings-profile-card")).toHaveTextContent(`Era ${modern.index} · ${modern.displayName.replace(" Era", "")}`);
  });

  it("reflects pending, offline, and conflict cloud sync states in the profile header", async () => {
    const data = await bundledRuntime();
    const { rerender } = render(
      <GameShell
        data={data}
        playerRuntime={createNewPlayerRuntimeState(data)}
        cloudSync={{ activeSaveSource: "cloud", status: "Pending Sync", dirty: true, pendingRetry: true, offlineProgressionApplyCount: 0 }}
        settingsAccount={{ status: "authenticated", email: "pilot@noveris.life", displayName: "Pilot" }}
        initialSettingsOpen
      />
    );

    expect(screen.getByTestId("settings-profile-sync")).toHaveTextContent("Pending");

    rerender(
      <GameShell
        data={data}
        playerRuntime={createNewPlayerRuntimeState(data)}
        cloudSync={{ activeSaveSource: "offline_local", status: "Offline", dirty: true, pendingRetry: true, offlineProgressionApplyCount: 0 }}
        settingsAccount={{ status: "authenticated", email: "pilot@noveris.life", displayName: "Pilot" }}
        initialSettingsOpen
      />
    );
    expect(screen.getByTestId("settings-profile-sync")).toHaveTextContent("Offline");

    rerender(
      <GameShell
        data={data}
        playerRuntime={createNewPlayerRuntimeState(data)}
        cloudSync={{ activeSaveSource: "local_selected_after_conflict", status: "Conflict", dirty: true, pendingRetry: false, offlineProgressionApplyCount: 0 }}
        settingsAccount={{ status: "authenticated", email: "pilot@noveris.life", displayName: "Pilot" }}
        initialSettingsOpen
      />
    );
    expect(screen.getByTestId("settings-profile-sync")).toHaveTextContent("Conflict");
  });

  it("does not introduce direct Roblox asset paths in JSX", () => {
    const source = readFileSync("src/components/game-ui/genesis-ui.tsx", "utf8");

    expect(source).not.toContain("/roblox-assets/");
  });
});
