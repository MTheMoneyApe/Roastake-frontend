import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEGEN_MODE_STORAGE_KEY,
  DegenModeProvider,
  useDegenMode,
} from "@/hooks/useDegenMode";

function DegenModeHarness() {
  const { degenMode, toggleDegenMode, copy } = useDegenMode();
  return (
    <div>
      <p>{degenMode ? copy.active : copy.standard}</p>
      <button type="button" onClick={toggleDegenMode}>
        {copy.toggle}
      </button>
    </div>
  );
}

describe("Degen Mode preference", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.body.dataset.degen;
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    delete document.body.dataset.degen;
  });

  it("defaults to Standard and leaves Degen Mode inactive", async () => {
    render(
      <DegenModeProvider>
        <DegenModeHarness />
      </DegenModeProvider>,
    );

    expect(screen.getByText("Standard")).toBeInTheDocument();
    await waitFor(() => expect(document.body).not.toHaveAttribute("data-degen"));
    expect(window.localStorage.getItem(DEGEN_MODE_STORAGE_KEY)).toBeNull();
  });

  it("persists activation and applies data-degen=true to the body", async () => {
    render(
      <DegenModeProvider>
        <DegenModeHarness />
      </DegenModeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Degen Mode" }));

    expect(await screen.findByText("DEGEN ACTIVE ☕📈")).toBeInTheDocument();
    await waitFor(() => expect(document.body).toHaveAttribute("data-degen", "true"));
    expect(window.localStorage.getItem(DEGEN_MODE_STORAGE_KEY)).toBe("true");
  });

  it("restores a stored preference after remount", async () => {
    window.localStorage.setItem(DEGEN_MODE_STORAGE_KEY, "true");

    render(
      <DegenModeProvider>
        <DegenModeHarness />
      </DegenModeProvider>,
    );

    expect(await screen.findByText("DEGEN ACTIVE ☕📈")).toBeInTheDocument();
    await waitFor(() => expect(document.body).toHaveAttribute("data-degen", "true"));
  });
});
