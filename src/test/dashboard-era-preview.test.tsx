import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CivilizationEraCarousel } from "@/components/game-ui/genesis-ui";
import { createDashboardArtMap, getBundledStudioRuntimeSnapshot, type GameRuntimeData } from "@/lib/canonical-runtime";

async function bundledRuntime() {
  const runtime = await getBundledStudioRuntimeSnapshot();
  expect(runtime).not.toBeNull();
  return runtime as GameRuntimeData;
}

function renderEraRail(data: GameRuntimeData, options: { activeEraId?: string; previewEraId?: string; progressPercent?: number } = {}) {
  return render(
    <CivilizationEraCarousel
      eras={data.eras}
      activeEraId={options.activeEraId ?? "renaissance"}
      assets={data.assets}
      art={createDashboardArtMap(data.assets)}
      visibleEraCount={data.clientProfiles.default.eraNavigation?.visibleEraCount ?? 3}
      progressPercent={options.progressPercent ?? 42}
      initialPreviewEraId={options.previewEraId}
    />
  );
}

function rectFrom(element: HTMLElement) {
  const rect = element.getAttribute("data-layout-rect");
  expect(rect).toBeTruthy();
  const [x, y, width, height] = rect?.split(",").map((value) => Number.parseFloat(value)) ?? [];
  return { x, y, width, height, right: x + width, bottom: y + height };
}

afterEach(() => cleanup());

describe("dashboard era rail", () => {
  it("renders all nine compact era positions without carousel controls", async () => {
    const data = await bundledRuntime();
    renderEraRail(data, { activeEraId: "renaissance", progressPercent: 42 });

    expect(screen.getByTestId("dashboard-era-rail")).toHaveAttribute("data-era-count", "9");
    expect(screen.getAllByTestId(/^era-rail-node-/)).toHaveLength(9);
    expect(screen.getAllByTestId(/^era-rail-label-/)).toHaveLength(9);
    expect(screen.queryByText(/return to current/i)).toBeNull();
    expect(screen.queryByTestId("era-preview-control-row")).toBeNull();
  });

  it("emphasizes the current era with larger hexes, larger numbers, and a progress ring", async () => {
    const data = await bundledRuntime();
    renderEraRail(data, { activeEraId: "renaissance", progressPercent: 42 });

    const current = screen.getByTestId("era-rail-node-renaissance");
    const adjacent = screen.getByTestId("era-rail-node-medieval");
    const currentRect = rectFrom(current);
    const adjacentRect = rectFrom(adjacent);

    expect(current).toHaveAttribute("data-era-state", "current");
    expect(currentRect.width / adjacentRect.width).toBeCloseTo(64 / 50, 2);
    expect(currentRect.width).toBe(64);
    expect(adjacentRect.width).toBe(50);
    expect(current).toContainElement(screen.getByTestId("era-node-progress-ring"));
    expect(current.querySelector(".genesis-era-current-card")).toBeTruthy();
    expect(current.querySelector("span")?.className).toContain("text-[1.65rem]");
  });

  it("marks completed and future eras with distinct states", async () => {
    const data = await bundledRuntime();
    renderEraRail(data, { activeEraId: "renaissance" });

    expect(screen.getByTestId("era-rail-node-medieval")).toHaveAttribute("data-era-state", "completed");
    expect(screen.getByTestId("era-rail-node-industrial")).toHaveAttribute("data-era-state", "locked");
    expect(screen.getByTestId("era-rail-node-industrial")).toContainElement(screen.getByTestId("era-lock-inside-industrial"));
  });

  it("shows only current and immediate-next era names while hiding deeper future names", async () => {
    const data = await bundledRuntime();
    renderEraRail(data, { activeEraId: "survival" });

    expect(screen.getByTestId("era-rail-label-survival")).toHaveTextContent("Survival");
    expect(screen.getByTestId("era-rail-label-ancient")).toHaveTextContent("Ancient");
    expect(screen.getByTestId("era-rail-label-medieval")).toHaveTextContent("???");
    expect(screen.getByTestId("era-rail-label-galactic")).toHaveTextContent("???");
    expect(screen.getByTestId("era-rail-node-medieval")).toContainElement(screen.getByTestId("era-lock-inside-medieval"));
  });

  it("uses a premium animated progression connector instead of a static line", async () => {
    const data = await bundledRuntime();
    renderEraRail(data, { activeEraId: "renaissance", progressPercent: 42 });

    expect(screen.getByTestId("era-rail-connector")).toBeInTheDocument();
    expect(screen.getByTestId("era-rail-connector-completed")).toBeInTheDocument();
    expect(screen.getByTestId("era-rail-connector-sweep")).toHaveClass("genesis-era-sweep");
  });

  it("opens only the compact mystery HUD when a deep future era is clicked", async () => {
    const data = await bundledRuntime();
    renderEraRail(data, { activeEraId: "survival" });

    fireEvent.click(screen.getByTestId("era-rail-node-galactic"));

    expect(screen.queryByTestId("era-floating-preview-panel")).toBeNull();
    expect(screen.getByTestId("era-hover-tooltip")).toHaveTextContent("Mystery Era");
    expect(screen.getByTestId("era-hover-tooltip")).toHaveTextContent("???");
    expect(screen.getByTestId("era-hover-tooltip")).toHaveTextContent("Locked");
    expect(screen.getByTestId("era-hover-tooltip")).toHaveTextContent("Continue progressing to reveal this era.");
    expect(screen.getByTestId("era-hover-tooltip")).not.toHaveTextContent("Galactic");
  });

  it("shows a high-tech hover HUD with era, name, unlock requirements, and progress", async () => {
    const data = await bundledRuntime();
    renderEraRail(data, { activeEraId: "renaissance" });

    fireEvent.mouseEnter(screen.getByTestId("era-rail-node-industrial"));

    const tooltip = screen.getByTestId("era-hover-tooltip");
    expect(tooltip).toHaveClass("era-hover-hud");
    expect(tooltip).toHaveTextContent("Era 5");
    expect(tooltip).toHaveTextContent("Industrial");
    expect(tooltip).toHaveTextContent("Unlock Requirements");
    expect(tooltip).toHaveTextContent("Progress Channel");
    expect(tooltip.textContent).toMatch(/Complete|Requires|Starting/);
  });

  it("does not reveal canonical names in mystery hover HUDs", async () => {
    const data = await bundledRuntime();
    renderEraRail(data, { activeEraId: "survival" });

    fireEvent.mouseEnter(screen.getByTestId("era-rail-node-galactic"));

    const tooltip = screen.getByTestId("era-hover-tooltip");
    expect(tooltip).toHaveTextContent("Mystery Era");
    expect(tooltip).toHaveTextContent("???");
    expect(tooltip).not.toHaveTextContent("Galactic");
  });
});
