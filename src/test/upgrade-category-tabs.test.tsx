import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameShell } from "@/components/game-ui/genesis-ui";
import { getBundledStudioRuntimeSnapshot, type GameRuntimeData } from "@/lib/canonical-runtime";
import { createDashboardModel } from "@/lib/dashboard/dashboard-model";
import { resolveSelectedUpgradeCategory, resolveUpgradeCategories, resolveUpgradesForCategory } from "@/lib/dashboard/upgrade-categories";
import { UPGRADE_TAB_LAYOUT, type UpgradeTabLayoutKey } from "@/lib/dashboard/upgrade-tabs-layout";

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

    for (const categoryId of ["workforce", "industry", "science", "technology"] as UpgradeTabLayoutKey[]) {
      const tab = UPGRADE_TAB_LAYOUT[categoryId].tab;
      const label = UPGRADE_TAB_LAYOUT[categoryId].label;
      expect(label.y).toBeCloseTo(657.392, 3);
      expect(label.height).toBeCloseTo(24.192, 3);
      expect(label.x).toBeGreaterThanOrEqual(550);
      expect(label.x + label.width).toBeLessThanOrEqual(1460);
      expect(tab.height).toBeCloseTo(67.2, 3);
    }

    const industryLabel = screen.getByTestId("upgrade-tab-label-industry");
    const before = industryLabel.getAttribute("style");
    await user.click(screen.getByTestId("upgrade-tab-industry"));
    expect(industryLabel.getAttribute("style")).toBe(before);
  });
});
