import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameShell } from "@/components/game-ui/genesis-ui";
import { getBundledStudioRuntimeSnapshot, type GameRuntimeData } from "@/lib/canonical-runtime";
import { createDashboardModel } from "@/lib/dashboard/dashboard-model";
import { resolveSelectedUpgradeCategory, resolveUpgradeCategories, resolveUpgradesForCategory } from "@/lib/dashboard/upgrade-categories";
import { UPGRADE_TAB_ASSET, UPGRADE_TAB_LAYOUT, UPGRADE_TAB_TYPOGRAPHY, type UpgradeTabLayoutKey } from "@/lib/dashboard/upgrade-tabs-layout";

async function bundledRuntime() {
  const runtime = await getBundledStudioRuntimeSnapshot();
  expect(runtime).not.toBeNull();
  return runtime as GameRuntimeData;
}

function categoryIdsFromRows() {
  return screen.getAllByTestId("dashboard-upgrade-row").map((row) => row.getAttribute("data-upgrade-category-id"));
}

describe("Roblox upgrade category tabs", () => {
  it("resolves canonical categories by id and legacy Roblox labels", async () => {
    const runtime = await bundledRuntime();

    expect(resolveUpgradeCategories(runtime).map((category) => category.id)).toEqual(["workforce", "industry", "science", "technology"]);
    expect(resolveSelectedUpgradeCategory(runtime, "TECHNOLOGY")?.id).toBe("technology");
    expect(resolveSelectedUpgradeCategory(runtime, "Science")?.id).toBe("science");
    expect(resolveUpgradesForCategory(runtime, "INDUSTRY").every((upgrade) => upgrade.categoryId === "industry")).toBe(true);
  });

  it("filters dashboard model rows from the selected canonical category id", async () => {
    const runtime = await bundledRuntime();
    const industry = createDashboardModel(runtime, { activeEraId: "survival", activeCategoryId: "industry" });
    const science = createDashboardModel(runtime, { activeEraId: "survival", activeCategoryId: "science" });

    expect(industry.selectedUpgradeCategory?.id).toBe("industry");
    expect(industry.upgradeRows.every((row) => row.upgrade.categoryId === "industry")).toBe(true);
    expect(industry.upgradeRows[0].upgrade.displayName).toBe("Worker");
    expect(science.selectedUpgradeCategory?.id).toBe("science");
    expect(science.upgradeRows.every((row) => row.upgrade.categoryId === "science")).toBe(true);
    expect(science.upgradeRows[0].upgrade.displayName).toBe("Storytelling");
  });

  it("clicking each tab once updates aria-selected and the visible rows", async () => {
    const user = userEvent.setup();
    const runtime = await bundledRuntime();
    render(<GameShell data={runtime} activeEraId="survival" />);

    const tablist = screen.getByTestId("upgrade-category-tablist");
    const cases = [
      ["Workforce", "workforce", "Stone Tools"],
      ["Industry", "industry", "Worker"],
      ["Science", "science", "Storytelling"],
      ["Technology", "technology", "Resource Management"]
    ] as const;

    for (const [label, categoryId, expectedRow] of cases) {
      const tab = within(tablist).getByRole("tab", { name: label });
      await user.click(tab);

      expect(tab).toHaveAttribute("aria-selected", "true");
      expect(screen.getByTestId("dashboard-upgrade-tabpanel")).toHaveAttribute("data-upgrade-category-id", categoryId);
      expect(categoryIdsFromRows().every((id) => id === categoryId)).toBe(true);
      expect(screen.getByText(expectedRow)).toBeInTheDocument();
    }
  });

  it("supports arrow, Home, and End keyboard category changes", async () => {
    const user = userEvent.setup();
    const runtime = await bundledRuntime();
    render(<GameShell data={runtime} activeEraId="survival" />);

    const workforce = screen.getByTestId("upgrade-tab-workforce");
    workforce.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByTestId("upgrade-tab-industry")).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{End}");
    expect(screen.getByTestId("upgrade-tab-technology")).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Home}");
    expect(screen.getByTestId("upgrade-tab-workforce")).toHaveAttribute("aria-selected", "true");
  });

  it("keeps decorative layers from blocking tab and row pointer targets", async () => {
    const runtime = await bundledRuntime();
    const { container } = render(<GameShell data={runtime} activeEraId="survival" />);

    expect(screen.getByTestId("upgrade-category-tablist")).toHaveClass("pointer-events-none");
    expect(screen.getByTestId("upgrade-tab-industry")).toHaveClass("pointer-events-auto");
    expect(container.querySelector('[alt=""].pointer-events-none')).not.toBeNull();
  });

  it("uses the fixed Roblox tab label geometry without selected-state shifts", async () => {
    const user = userEvent.setup();
    const runtime = await bundledRuntime();
    render(<GameShell data={runtime} activeEraId="survival" />);

    expect(UPGRADE_TAB_ASSET.path).toBe("/roblox-assets/UI/folder-tabs-base-920.png");
    expect(UPGRADE_TAB_ASSET.nativeWidth).toBe(920);
    expect(UPGRADE_TAB_ASSET.nativeHeight).toBe(420);
    expect(UPGRADE_TAB_ASSET.robloxAssetId).toBe("rbxassetid://137465475952770");

    const expectedLabelRects = {
      workforce: { x: 580.6630434782609, y: 664, width: 195.84782608695653, height: 28 },
      industry: { x: 831.9021739130435, y: 664, width: 187.93478260869566, height: 28 },
      science: { x: 1070.2826086956522, y: 664, width: 156.2826086956522, height: 28 },
      technology: { x: 1271.0760869565217, y: 664, width: 158.26086956521738, height: 28 }
    } satisfies Record<UpgradeTabLayoutKey, { x: number; y: number; width: number; height: number }>;

    for (const categoryId of ["workforce", "industry", "science", "technology"] as UpgradeTabLayoutKey[]) {
      const tab = UPGRADE_TAB_LAYOUT[categoryId].tab;
      const label = UPGRADE_TAB_LAYOUT[categoryId].label;
      expect(label.x).toBeCloseTo(expectedLabelRects[categoryId].x, 3);
      expect(label.y).toBeCloseTo(expectedLabelRects[categoryId].y, 3);
      expect(label.width).toBeCloseTo(expectedLabelRects[categoryId].width, 3);
      expect(label.height).toBeCloseTo(expectedLabelRects[categoryId].height, 3);
      expect(label.x).toBeGreaterThanOrEqual(tab.x);
      expect(label.x + label.width).toBeLessThanOrEqual(tab.x + tab.width);
      expect(label.y).toBeGreaterThanOrEqual(tab.y);
      expect(label.y + label.height).toBeLessThanOrEqual(tab.y + tab.height);
      expect(tab.height).toBeCloseTo(53, 3);
    }

    const industryLabel = screen.getByTestId("upgrade-tab-label-industry");
    const before = industryLabel.getAttribute("style");
    await user.click(screen.getByTestId("upgrade-tab-industry"));
    expect(industryLabel.getAttribute("style")).toBe(before);
  });

  it("centers every label with the shared typography token and no offset utilities", async () => {
    const user = userEvent.setup();
    const runtime = await bundledRuntime();
    render(<GameShell data={runtime} activeEraId="survival" />);

    for (const categoryId of ["workforce", "industry", "science", "technology"] as UpgradeTabLayoutKey[]) {
      const tab = screen.getByTestId(`upgrade-tab-${categoryId}`);
      const label = screen.getByTestId(`upgrade-tab-label-${categoryId}`);
      expect(label).toHaveClass("absolute", "flex", "items-center", "justify-center", "text-center", "m-0", "p-0");
      expect(label).toHaveClass(...UPGRADE_TAB_TYPOGRAPHY.className.split(" "));
      expect(label.className).not.toMatch(/translate|ml-|mt-|pl-|pt-/);
      expect(tab).toHaveClass("m-0", "p-0", "border-0", "bg-transparent");
    }

    const technology = screen.getByTestId("upgrade-tab-label-technology");
    const technologyRect = UPGRADE_TAB_LAYOUT.technology.label;
    const estimatedTechnologyTextWidth = "Technology".length * UPGRADE_TAB_TYPOGRAPHY.fontSizePx * 0.62;
    expect(technologyRect.width).toBeGreaterThan(estimatedTechnologyTextWidth);
    const before = technology.getAttribute("style");
    await user.click(screen.getByTestId("upgrade-tab-technology"));
    expect(technology.getAttribute("style")).toBe(before);
    expect(screen.getByTestId("upgrade-tab-technology")).toHaveClass("text-white");
    expect(screen.getByTestId("upgrade-tab-workforce")).toHaveClass("text-cyan-100/72");
  });
});
