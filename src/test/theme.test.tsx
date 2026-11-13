import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import {
  ThemeProvider,
  ThemeToggle,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
} from "@/components/theme-provider";

function bootstrap() {
  // Execute the exact pre-paint script used in the root document.
  new Function(THEME_INIT_SCRIPT)();
}
function expectTheme(theme: "light" | "dark") {
  expect(document.documentElement.dataset.theme).toBe(theme);
  expect(document.documentElement.classList.contains("dark")).toBe(theme === "dark");
  expect(document.documentElement.style.colorScheme).toBe(theme);
  expect(document.querySelector('meta[name="color-scheme"]')).toHaveAttribute("content", theme);
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("class");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("style");
  document.head.innerHTML = '<meta name="color-scheme" content="light">';
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Site-wide day/night theme", () => {
  it("defaults to light on first visit even when the OS prefers dark", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    bootstrap();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expectTheme("light");
    expect(screen.getByRole("button", { name: "Night mode" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it.each(["dark", "light"] as const)("applies stored %s before React renders", (theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    bootstrap();
    expectTheme(theme);
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expectTheme(theme);
    expect(screen.getByRole("button", { name: "Night mode" })).toHaveAttribute(
      "aria-pressed",
      String(theme === "dark"),
    );
  });

  it("uses light for invalid storage without throwing", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "system-or-invalid");
    bootstrap();
    expectTheme("light");
  });

  it("uses a native keyboard-operable toggle with stable name, pressed state and action title", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const button = screen.getByRole("button", { name: "Night mode" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("title", "Day mode — switch to night mode");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(button.className).toContain("focus-visible");
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expectTheme("dark");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("title", "Night mode — switch to day mode");
    expect(button).toHaveFocus();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    fireEvent.click(button);
    expectTheme("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("keeps multiple controls consistent and does not reset on route-like rerenders", () => {
    const page = (route: string) => (
      <ThemeProvider>
        <ThemeToggle />
        <ThemeToggle />
        <main>{route}</main>
      </ThemeProvider>
    );
    const { rerender } = render(page("public"));
    fireEvent.click(screen.getAllByRole("button", { name: "Night mode" })[0]);
    rerender(page("assets"));
    expectTheme("dark");
    for (const button of screen.getAllByRole("button", { name: "Night mode" }))
      expect(button).toHaveAttribute("aria-pressed", "true");
    cleanup();
    bootstrap();
    render(page("perps reload"));
    expectTheme("dark");
  });

  it("stays usable when storage reads and writes are denied", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    expect(bootstrap).not.toThrow();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Night mode" }));
    expectTheme("dark");
    fireEvent.click(screen.getByRole("button", { name: "Night mode" }));
    expectTheme("light");
  });

  it("syncs a preference from another tab, ignores unrelated keys, and handles clearing", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "dark" }),
      ),
    );
    expectTheme("dark");
    expect(screen.getByRole("button", { name: "Night mode" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    act(() =>
      window.dispatchEvent(new StorageEvent("storage", { key: "other", newValue: "light" })),
    );
    expectTheme("dark");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: null })));
    expectTheme("light");
  });

  it("does not read localStorage on the server", () => {
    const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SSR storage access");
    });
    const html = renderToString(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(read).not.toHaveBeenCalled();
    expect(html).toContain('aria-pressed="false"');
  });

  it("hydrates light server markup with a pre-bootstrapped dark document without mismatch", async () => {
    const view = (
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const host = document.createElement("div");
    host.innerHTML = renderToString(view);
    document.body.append(host);
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    bootstrap();
    const errors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(host, view, { onRecoverableError: (error) => errors.push(error) });
    });
    expect(errors).toEqual([]);
    expectTheme("dark");
    expect(host.querySelector("button")).toHaveAttribute("aria-pressed", "true");
    act(() => root.unmount());
    host.remove();
  });

  it("bootstraps once at the document shell before route styles, not inside any leaf route", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    expect(root.indexOf("__html: THEME_INIT_SCRIPT")).toBeLessThan(root.indexOf("<HeadContent />"));
    expect(root).toContain("<ThemeProvider>{children}</ThemeProvider>");
    for (const file of readdirSync("src/routes").filter(
      (name) => name.endsWith(".tsx") && name !== "__root.tsx",
    )) {
      const source = readFileSync(`src/routes/${file}`, "utf8");
      expect(source, file).not.toMatch(/className=["']dark(?:\s|["'])|<AppShell[^>]*\bdark[\s=>]/);
      expect(source, file).not.toContain(THEME_STORAGE_KEY);
    }
  });
});
