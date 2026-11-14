import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import { seed } from "@/lib/demo/seed";
import { Route as DirectoryRoute } from "@/routes/roasters.index";
import { Route as ProfileRoute } from "@/routes/roasters.$id";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options, useParams: () => ({ id: "altura" }) }),
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string;
    params?: Record<string, string>;
    children?: ReactNode;
  }) => (
    <a href={to.replace("$id", params?.id ?? "")} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/shell", () => ({
  PublicShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  Section: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));
vi.mock("@/components/commerce", () => ({ ProductCard: () => <div>Sample coffee</div> }));
vi.mock("@/lib/demo/store", () => ({ useDemo: () => seed() }));
afterEach(cleanup);

const Directory = DirectoryRoute.options.component as ComponentType;
const Profile = ProfileRoute.options.component as ComponentType;
describe("roaster sample identity and photography", () => {
  it("replaces numeric review claims and empty directory media with explicit illustrations", () => {
    const { container } = render(<Directory />);
    expect(screen.getAllByText(/Illustrative demo rating/)).toHaveLength(5);
    expect(
      screen.getAllByText(/Sample profile status: Approved \(demo, not vetted\)/),
    ).toHaveLength(5);
    expect(
      screen.getAllByText(/Illustrative photography · not the actual lot\/roaster/),
    ).toHaveLength(5);
    expect(container.textContent).not.toContain("★");
    expect(container.querySelectorAll("img")).toHaveLength(5);
    expect(container.querySelectorAll('img[loading="lazy"]')).toHaveLength(5);
  });
  it("keeps demo status, origin and non-review semantics local on the profile", () => {
    const { container } = render(<Profile />);
    expect(screen.getByRole("heading", { level: 1, name: "Altura Roasters" })).toBeInTheDocument();
    expect(screen.getByText(/Illustrative location/)).toBeInTheDocument();
    expect(screen.getByText(/not customer reviews/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /no verified physical coffee backing, custody, shipment or real-world redemption/,
      ),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
    expect(container.textContent).not.toContain("★");
  });
});
