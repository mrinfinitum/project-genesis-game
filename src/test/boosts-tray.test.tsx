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
  it("opens and closes from the compact BOOSTS control", async () => {
    const user = userEvent.setup();
    render(<GameShell data={await bundledRuntime()} />);

    const trigger = screen.getByRole("button", { name: /toggle boosts tray/i });
    expect(screen.queryByTestId("boosts-tray")).not.toBeInTheDocument();

    await user.click(trigger);
    expect(screen.getByTestId("boosts-tray")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.click(trigger);
    expect(screen.queryByTestId("boosts-tray")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape and returns focus to the BOOSTS control", async () => {
    const user = userEvent.setup();
    render(<GameShell data={await bundledRuntime()} />);

    const trigger = screen.getByRole("button", { name: /toggle boosts tray/i });
    await user.click(trigger);
    expect(screen.getByTestId("boosts-tray")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByTestId("boosts-tray")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes on outside click and from the close button", async () => {
    const user = userEvent.setup();
    render(<GameShell data={await bundledRuntime()} />);

    const trigger = screen.getByRole("button", { name: /toggle boosts tray/i });
    await user.click(trigger);
    await user.click(document.body);
    await waitFor(() => expect(screen.queryByTestId("boosts-tray")).not.toBeInTheDocument());

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: /close boosts tray/i }));
    await waitFor(() => expect(screen.queryByTestId("boosts-tray")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("keeps Live empty state free of Storybook fixture boosts", async () => {
    const user = userEvent.setup();
    render(<GameShell data={await bundledRuntime()} />);

    await user.click(screen.getByRole("button", { name: /toggle boosts tray/i }));

    expect(screen.getByText("No boosts available")).toBeInTheDocument();
    expect(screen.getByText("Boost definitions will appear here when published from Project Genesis Studio.")).toBeInTheDocument();
    expect(screen.queryByText("Work Frenzy")).not.toBeInTheDocument();
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

  it("exposes a dedicated overlay layer so the tray is not clipped by dashboard panels", () => {
    render(<BoostsTray open slots={fixtureSlots} onClose={() => undefined} />);

    const overlay = document.querySelector("[data-dashboard-overlay='boosts']");
    const tray = screen.getByTestId("boosts-tray");

    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveStyle({ zIndex: "80" });
    expect(tray).toHaveClass("absolute");
  });

  it("disables the transition when reduced motion is requested", () => {
    render(<BoostsTray open slots={fixtureSlots} onClose={() => undefined} reducedMotion />);

    expect(screen.getByTestId("boosts-tray")).toHaveAttribute("data-transition", "none");
  });
});
