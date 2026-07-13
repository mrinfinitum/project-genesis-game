import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CivilizationEraCarousel } from "@/components/game-ui/genesis-ui";
import { createDashboardArtMap, getBundledStudioRuntimeSnapshot, type GameRuntimeData } from "@/lib/canonical-runtime";

async function bundledRuntime() {
  const runtime = await getBundledStudioRuntimeSnapshot();
  expect(runtime).not.toBeNull();
  return runtime as GameRuntimeData;
}

function renderEraPreview(data: GameRuntimeData, options: { activeEraId?: string; previewEraId?: string; progressPercent?: number } = {}) {
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

function overlaps(a: ReturnType<typeof rectFrom>, b: ReturnType<typeof rectFrom>) {
  return a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
}

afterEach(() => cleanup());

describe("dashboard era preview strip", () => {
  it("keeps default state minimal with no preview-only controls or duplicate era labels", async () => {
    const data = await bundledRuntime();
    renderEraPreview(data, { activeEraId: "renaissance", progressPercent: 42 });

    expect(screen.getByTestId("dashboard-era-preview-strip")).toHaveAttribute("data-previewing", "false");
    expect(screen.queryByTestId("era-preview-control-row")).toBeNull();
    expect(screen.queryByText(/return to current/i)).toBeNull();
    expect(screen.queryByText(/preview only/i)).toBeNull();
    expect(screen.queryByText(/^locked$/i)).toBeNull();
    expect(screen.getAllByText(/^renaissance$/i)).toHaveLength(1);
    expect(screen.getByTestId("era-center-meta")).toHaveTextContent("42%");
  });

  it("uses one compact preview badge and one return action while previewing", async () => {
    const data = await bundledRuntime();
    renderEraPreview(data, { activeEraId: "renaissance", previewEraId: "industrial", progressPercent: 52 });

    expect(screen.getByTestId("dashboard-era-preview-strip")).toHaveAttribute("data-previewing", "true");
    expect(screen.getByTestId("era-preview-control-row")).toBeInTheDocument();
    expect(screen.getAllByText(/^preview$/i)).toHaveLength(1);
    expect(screen.getByText(/return to current/i)).toBeInTheDocument();
    expect(screen.queryByText(/preview only/i)).toBeNull();
    expect(screen.getByTestId("era-center-label")).toHaveTextContent("Industrial");
    expect(screen.getByTestId("era-center-meta")).toHaveTextContent("Era 5");
  });

  it("renders locked future state inside the adjacent node instead of floating text", async () => {
    const data = await bundledRuntime();
    renderEraPreview(data, { activeEraId: "renaissance" });

    const nextNode = screen.getByTestId("era-node-next");
    const lock = screen.getByTestId("era-lock-inside-industrial");

    expect(nextNode).toHaveAttribute("data-era-state", "locked");
    expect(nextNode).toContainElement(lock);
    expect(screen.queryByText(/^locked$/i)).toBeNull();
  });

  it("renders the nine-step track as a separate row with one current step", async () => {
    const data = await bundledRuntime();
    renderEraPreview(data, { activeEraId: "renaissance" });

    expect(screen.getByTestId("era-progress-track")).toBeInTheDocument();
    expect(screen.getAllByTestId("era-track-step-current")).toHaveLength(1);
    expect(screen.getByTestId("era-progress-track")).not.toContainElement(screen.getByTestId("era-node-current"));
  });

  it("keeps preview controls outside the node cluster by measured bounds", async () => {
    const data = await bundledRuntime();
    renderEraPreview(data, { activeEraId: "renaissance", previewEraId: "industrial" });

    const controls = rectFrom(screen.getByTestId("era-preview-control-row"));
    const centerNode = rectFrom(screen.getByTestId("era-node-current"));
    const previousNode = rectFrom(screen.getByTestId("era-node-previous"));
    const nextNode = rectFrom(screen.getByTestId("era-node-next"));

    expect(overlaps(controls, centerNode)).toBe(false);
    expect(overlaps(controls, previousNode)).toBe(false);
    expect(overlaps(controls, nextNode)).toBe(false);
    expect(centerNode.y - controls.bottom).toBeGreaterThanOrEqual(16);
  });
});
