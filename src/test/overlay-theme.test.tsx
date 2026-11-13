// SPDX-License-Identifier: LicenseRef-ROASTAKE-Evaluation-Only
// Copyright © 2026 @MTheMoneyApe. All rights reserved.

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog, DialogOverlay } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogOverlay } from "@/components/ui/alert-dialog";
import { Drawer, DrawerOverlay } from "@/components/ui/drawer";
import { Sheet, SheetOverlay } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";

const themeState = vi.hoisted(() => ({ theme: "light" as "light" | "dark" }));
vi.mock("@/components/theme-provider", () => ({ useTheme: () => themeState }));
vi.mock("sonner", () => ({
  Toaster: ({ theme }: { theme: string }) => <output data-testid="toast-theme">{theme}</output>,
}));

afterEach(() => {
  cleanup();
  themeState.theme = "light";
});

describe("shared overlay themes", () => {
  it.each([
    [Dialog, DialogOverlay, "bg-overlay/55"],
    [AlertDialog, AlertDialogOverlay, "bg-overlay/80"],
    [Drawer, DrawerOverlay, "bg-overlay/80"],
    [Sheet, SheetOverlay, "bg-overlay/80"],
  ] as const)("uses a semantic scrim for overlay %#", (Root, Overlay, scrim) => {
    render(
      <Root open>
        <Overlay data-testid="overlay" />
      </Root>,
    );
    expect(screen.getByTestId("overlay")).toHaveClass(scrim);
    expect(screen.getByTestId("overlay")).not.toHaveClass("dark", "bg-black/80");
  });

  it("passes the selected root theme explicitly to Sonner in both directions", () => {
    const view = render(<Toaster />);
    expect(screen.getByTestId("toast-theme")).toHaveTextContent("light");
    themeState.theme = "dark";
    view.rerender(<Toaster />);
    expect(screen.getByTestId("toast-theme")).toHaveTextContent("dark");
    themeState.theme = "light";
    view.rerender(<Toaster />);
    expect(screen.getByTestId("toast-theme")).toHaveTextContent("light");
  });
});
