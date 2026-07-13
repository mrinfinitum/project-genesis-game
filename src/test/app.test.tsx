import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";

describe("Project Genesis app", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Studio offline"));
    window.history.pushState({}, "", "/research");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("renders the routed game dashboard without the Vite starter", async () => {
    render(<App />);

    expect(await screen.findByText("No Civilization Profile")).toBeInTheDocument();
    expect(screen.getByText("Project Genesis")).toBeInTheDocument();
    expect(screen.queryByText("Get started")).not.toBeInTheDocument();
    expect(screen.queryByText(/Count is/)).not.toBeInTheDocument();
  });
});
