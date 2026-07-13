import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { BoostsTray, GameShell, type BoostTraySlot } from "@/components/game-ui/genesis-ui";
import { getBundledStudioRuntimeSnapshot, type GameRuntimeData } from "@/lib/canonical-runtime";
import { createNewPlayerRuntimeState, playerRuntimeToDashboardPlayerState, type PlayerRuntimeState } from "@/lib/player-runtime";

async function bundledRuntime() {
  const runtime = await getBundledStudioRuntimeSnapshot();
  expect(runtime).not.toBeNull();
  return runtime as GameRuntimeData;
}

function activeBoostRuntime(data: GameRuntimeData): PlayerRuntimeState {
  return {
    ...createNewPlayerRuntimeState(data),
    boosts: {
      active: [{
        id: "runtime-click-surge",
        definitionId: "BOOST-CLICK-SURGE",
        targetSystem: "click",
        startedAt: new Date(Date.now() - 10_000).toISOString(),
        endsAt: new Date(Date.now() + 60_000).toISOString(),
        multiplier: 2
      }]
    }
  };
}

const fixtureSlots: BoostTraySlot[] = [
  {
    id: "story-work-frenzy",
    name: "Work Frenzy",
    shortEffect: "2x production loop",
    multiplier: "WK",
    duration: "00:30",
    cost: "25 Energy",
    state: "available",
    accent: "cyan",
    targetSystem: "auto"
  }
];

afterEach(() => cleanup());

describe("dashboard boosts tray", () => {
  it("mounts inside the clipped 1920 by 1080 game overlay root", async () => {
    render(<GameShell data={await bundledRuntime()} />);

    const overlayRoot = screen.getByTestId("game-overlay-root");
    const overlay = screen.getByTestId("boosts-overlay-layer");

    expect(overlayRoot).toHaveAttribute("id", "game-overlay-root");
    expect(overlayRoot).toHaveStyle({
      width: "1920px",
      height: "1080px"
    });
    expect(overlayRoot).toHaveClass("overflow-hidden");
    expect(overlayRoot).toContainElement(overlay);
  });

  it("shows the compact BOOSTS launcher while closed", async () => {
    render(<GameShell data={await bundledRuntime()} />);

    const trigger = screen.getByRole("button", { name: /toggle boosts tray/i });
    expect(trigger).toBeVisible();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("boosts-tray")).toHaveAttribute("data-state", "closed");
  });

  it("opens from the compact BOOSTS control and hides the launcher while open", async () => {
    const user = userEvent.setup();
    render(<GameShell data={await bundledRuntime()} />);

    const trigger = screen.getByRole("button", { name: /toggle boosts tray/i });
    expect(screen.getByTestId("boosts-tray")).toHaveAttribute("data-state", "closed");

    await user.click(trigger);
    expect(screen.getByTestId("boosts-tray")).toHaveAttribute("data-state", "open");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-hidden", "true");
    expect(trigger).toHaveAttribute("tabindex", "-1");
    expect(screen.queryByRole("button", { name: /toggle boosts tray/i })).not.toBeInTheDocument();
    expect(trigger.closest("div")).toHaveStyle({ position: "absolute" });

    await user.click(screen.getByRole("button", { name: /close boosts tray/i }));
    await waitFor(() => expect(screen.getByTestId("boosts-tray")).toHaveAttribute("data-state", "closed"));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape and returns focus to the BOOSTS control", async () => {
    const user = userEvent.setup();
    render(<GameShell data={await bundledRuntime()} />);

    const trigger = screen.getByRole("button", { name: /toggle boosts tray/i });
    await user.click(trigger);
    expect(screen.getByTestId("boosts-tray")).toHaveAttribute("data-state", "open");
    await waitFor(() => expect(screen.getByRole("button", { name: /close boosts tray/i })).toHaveFocus());

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.getByTestId("boosts-tray")).toHaveAttribute("data-state", "closed"));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes on outside click and from the close button", async () => {
    const user = userEvent.setup();
    render(<GameShell data={await bundledRuntime()} />);

    const trigger = screen.getByRole("button", { name: /toggle boosts tray/i });
    await user.click(trigger);
    await user.click(document.body);
    await waitFor(() => expect(screen.getByTestId("boosts-tray")).toHaveAttribute("data-state", "closed"));

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: /close boosts tray/i }));
    await waitFor(() => expect(screen.getByTestId("boosts-tray")).toHaveAttribute("data-state", "closed"));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("keeps Live empty state free of Storybook fixture boosts", async () => {
    const user = userEvent.setup();
    render(<GameShell data={await bundledRuntime()} />);

    await user.click(screen.getByRole("button", { name: /toggle boosts tray/i }));

    expect(screen.getByText("No boosts available")).toBeInTheDocument();
    expect(screen.getByText("Boosts will appear here when published.")).toBeInTheDocument();
    expect(screen.queryByText("Work Frenzy")).not.toBeInTheDocument();
    expect(screen.queryByText(/runtime tray/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^close$/i)).not.toBeInTheDocument();
  });

  it("renders Storybook/mock fixture slots only when provided", () => {
    render(<BoostsTray open slots={fixtureSlots} onClose={() => undefined} onActivate={() => undefined} />);

    expect(screen.getByText("Work Frenzy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activate" })).toBeEnabled();
  });

  it("renders active runtime boost fields and uses active count", async () => {
    const data = await bundledRuntime();
    const playerRuntime = activeBoostRuntime(data);
    const playerState = playerRuntimeToDashboardPlayerState(data, playerRuntime);

    render(<GameShell data={data} playerRuntime={playerRuntime} playerState={playerState} />);

    const trigger = screen.getByRole("button", { name: /1 boosts available/i });
    expect(trigger).toHaveTextContent("1");
    await userEvent.click(trigger);
    expect(screen.getByText("BOOST-CLICK-SURGE")).toBeInTheDocument();
    expect(screen.getByText(/click system boost/i)).toBeInTheDocument();
  });

  it("positions the drawer from the Roblox closed and open tray coordinates", () => {
    const { rerender } = render(<BoostsTray open={false} slots={fixtureSlots} onClose={() => undefined} />);
    const closedTray = screen.getByTestId("boosts-tray");

    expect(closedTray).toHaveAttribute("data-state", "closed");
    expect(closedTray).toHaveAttribute("data-open-position", "left:12,right:12,bottom:8");
    expect(closedTray).toHaveAttribute("data-closed-position", "translateY(calc(100% + 24px))");
    expect(closedTray).toHaveAttribute("data-bottom-offset", "8");
    expect(closedTray).toHaveStyle({
      left: "12px",
      right: "12px",
      bottom: "8px",
      height: "170px",
      transform: "translateY(calc(100% + 24px))",
      opacity: "0"
    });

    rerender(<BoostsTray open slots={fixtureSlots} onClose={() => undefined} />);
    expect(screen.getByTestId("boosts-tray")).toHaveStyle({
      transform: "translateY(0)",
      opacity: "1"
    });
  });

  it("keeps the open drawer inside the 1920 by 1080 game frame", () => {
    render(<BoostsTray open slots={fixtureSlots} onClose={() => undefined} />);
    const tray = screen.getByTestId("boosts-tray");
    const left = Number.parseFloat(tray.style.left);
    const right = Number.parseFloat(tray.style.right);
    const bottom = Number.parseFloat(tray.style.bottom);
    const height = Number.parseFloat(tray.style.height);

    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(0);
    expect(bottom).toBeGreaterThanOrEqual(8);
    expect(left + right).toBeLessThan(1920);
    expect(bottom + height).toBeLessThanOrEqual(1080);
    expect(tray.style.top).toBe("");
  });

  it("exposes a dedicated overlay layer so the tray is not clipped by dashboard panels", () => {
    render(<BoostsTray open slots={fixtureSlots} onClose={() => undefined} />);

    const overlay = document.querySelector("[data-dashboard-overlay='boosts']");
    const tray = screen.getByTestId("boosts-tray");

    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveStyle({ zIndex: "80" });
    expect(tray).toHaveClass("absolute");
    expect(overlay).toHaveClass("overflow-hidden");
  });

  it("opening the drawer does not change document scroll height or create a vertical scrollbar", async () => {
    const user = userEvent.setup();
    render(<GameShell data={await bundledRuntime()} />);

    const beforeHeight = document.documentElement.scrollHeight;
    const beforeBodyHeight = document.body.scrollHeight;
    await user.click(screen.getByRole("button", { name: /toggle boosts tray/i }));

    expect(document.documentElement.scrollHeight).toBe(beforeHeight);
    expect(document.body.scrollHeight).toBe(beforeBodyHeight);
    expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight);
  });

  it("keeps the drawer aligned in design space when the stage is scaled for 4K", async () => {
    render(<GameShell data={await bundledRuntime()} embedded frameScale={2} />);

    expect(screen.getByTestId("game-overlay-root")).toHaveStyle({
      width: "1920px",
      height: "1080px"
    });
    expect(document.querySelector("[data-game-viewport]")).toHaveAttribute("data-game-scale", "2.0000");
    expect(screen.getByTestId("boosts-tray")).toHaveStyle({
      left: "12px",
      right: "12px",
      bottom: "8px"
    });
  });

  it("disables the transition when reduced motion is requested", () => {
    render(<BoostsTray open slots={fixtureSlots} onClose={() => undefined} reducedMotion />);

    expect(screen.getByTestId("boosts-tray")).toHaveAttribute("data-transition", "none");
    expect(screen.getByTestId("boosts-tray")).toHaveStyle({ transition: "none" });
  });
});
