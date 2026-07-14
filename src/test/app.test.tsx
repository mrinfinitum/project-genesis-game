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

  it("renders the routed game dashboard without the Vite starter", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /continue as guest/i }));
    expect(await screen.findByText("Local Genesis Initiative")).toBeInTheDocument();
    expect(screen.getByText("Era 1 - Survival")).toBeInTheDocument();
    expect(screen.getByTestId("era-rail-label-survival")).toHaveTextContent("Survival");
    expect(screen.getByTestId("era-rail-label-ancient")).toHaveTextContent("Ancient");
    expect(screen.getByTestId("era-rail-label-medieval")).toHaveTextContent("???");
    expect(screen.queryByText("Get started")).not.toBeInTheDocument();
    expect(screen.queryByText(/Count is/)).not.toBeInTheDocument();
  });
});
