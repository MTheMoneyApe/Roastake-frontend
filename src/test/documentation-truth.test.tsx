import { cleanup, render, screen, within } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SCOPE_LABELS } from "@/lib/navigation";
import { Route } from "@/routes/app.docs";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
afterEach(cleanup);

describe("documentation product truth", () => {
  it("shares canonical maturity labels and sends planned products to the roadmap", () => {
    const Page = Route.options.component as ComponentType;
    render(<Page />);
    expect(screen.getAllByText(SCOPE_LABELS.live)).toHaveLength(3);
    expect(screen.getByText(SCOPE_LABELS.demo)).toBeInTheDocument();
    const row = screen.getByText(SCOPE_LABELS.planned).parentElement!.parentElement!;
    expect(within(row).getByRole("link", { name: "Open" })).toHaveAttribute("href", "/roadmap");
    expect(screen.getByText(/1 token = 1 kg are proposed accounting concepts/)).toBeInTheDocument();
    expect(screen.getByText(/green input and roasted output are not 1:1/)).toBeInTheDocument();
    expect(screen.getByText(/does not verify physical coffee/)).toBeInTheDocument();
  });
});
