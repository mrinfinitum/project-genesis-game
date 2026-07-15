import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";

describe("Project Genesis app", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Studio offline"));
    window.localStorage.clear();
    window.history.pushState({}, "", "/research");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("renders the routed game shell without the Vite starter", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(await screen.findByRole("button", { name: /continue as guest/i }));
    expect(await screen.findByText("Local Genesis Initiative")).toBeInTheDocument();
    expect(screen.getByText("Era 1 - Survival")).toBeInTheDocument();
    await user.click(screen.getByTestId("roblox-nav-item-research"));
    expect(await screen.findByTestId("research-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("main-workspace-slot")).toHaveAttribute("data-active-screen", "research");
    expect(screen.getAllByTestId("roblox-integrated-nav-hud")).toHaveLength(1);
    expect(container.querySelectorAll('[data-safe-area-target="top-hud"]')).toHaveLength(1);
    expect(screen.queryByText("Get started")).not.toBeInTheDocument();
    expect(screen.queryByText(/Count is/)).not.toBeInTheDocument();
  });

  it("keeps the shell mounted while left navigation swaps only the workspace", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(await screen.findByRole("button", { name: /continue as guest/i }));
    await user.click(await screen.findByTestId("roblox-nav-item-research"));
    expect(await screen.findByTestId("research-workspace")).toBeInTheDocument();
    const nav = screen.getByTestId("roblox-integrated-nav-hud");
    const topHud = container.querySelector('[data-safe-area-target="top-hud"]');

    await user.click(screen.getByTestId("roblox-nav-item-upgrades"));

    expect(await screen.findByTestId("upgrades-workspace")).toBeInTheDocument();
    expect(screen.queryByTestId("research-workspace")).not.toBeInTheDocument();
    expect(screen.getByTestId("roblox-integrated-nav-hud")).toBe(nav);
    expect(container.querySelector('[data-safe-area-target="top-hud"]')).toBe(topHud);
    expect(screen.getAllByTestId("roblox-integrated-nav-hud")).toHaveLength(1);
    expect(container.querySelectorAll('[data-safe-area-target="top-hud"]')).toHaveLength(1);
  });

  it("routes /discoveries through the persistent shell Discovery Journal", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /continue as guest/i }));
    window.history.pushState({}, "", "/discoveries");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(await screen.findByTestId("discovery-workspace", undefined, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByTestId("main-workspace-slot")).toHaveAttribute("data-presentation-mode", "shell_workspace");
    expect(screen.getAllByTestId("roblox-integrated-nav-hud")).toHaveLength(1);
  });
});
