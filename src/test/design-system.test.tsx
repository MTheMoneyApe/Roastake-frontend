import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DataTable,
  DemoBadge,
  Empty,
  MaturityBadge,
  PageHeader,
  Panel,
  Pill,
} from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: React.PropsWithChildren<{ to: string }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
afterEach(cleanup);

describe("shared ROASTAKE visual primitives", () => {
  it("uses one page-title hierarchy with breadcrumbs and an explicit demo disclosure", () => {
    render(
      <PageHeader
        title="Coffee assets"
        subtitle="All custody and inventory records are simulated."
        crumbs={[{ label: "Dashboard", to: "/app/dashboard" }, { label: "Coffee assets" }]}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Coffee assets" })).toHaveClass(
      "brand-page-title",
    );
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/app/dashboard",
    );
    expect(screen.getByText(/All custody/)).toBeVisible();
    expect(screen.getByText(/DEMO/)).toBeVisible();
  });

  it("keeps testnet, demo, preview, and warning labels readable through semantic colors", () => {
    render(
      <>
        <MaturityBadge variant="testnet">NEAR TESTNET</MaturityBadge>
        <MaturityBadge variant="preview">PLANNED</MaturityBadge>
        <DemoBadge>SIMULATED</DemoBadge>
        <Pill tone="warn">Pending</Pill>
      </>,
    );
    expect(screen.getByText("NEAR TESTNET")).toHaveClass("text-accent-foreground");
    expect(screen.getByText("PLANNED")).toHaveClass("border-dashed");
    expect(screen.getByText(/SIMULATED/)).toHaveClass("text-warning-foreground");
    expect(screen.getByText("Pending")).toHaveClass("text-warning-foreground");
  });

  it("provides a focusable, locally scrollable semantic table without changing values", () => {
    render(
      <DataTable
        cols={[
          { key: "name", label: "Lot", render: (r: { name: string; qty: number }) => r.name },
          { key: "qty", label: "Quantity", align: "right", render: (r) => r.qty },
        ]}
        rows={[{ name: "Huila", qty: 12000 }]}
      />,
    );
    expect(screen.getByRole("region", { name: "Scrollable data table" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("columnheader", { name: "Quantity" })).toHaveAttribute("scope", "col");
    expect(screen.getByRole("cell", { name: "12000" })).toBeVisible();
  });

  it("shares panel and empty-state surfaces and preserves actionable controls", () => {
    const retry = vi.fn();
    render(
      <Panel title="Inventory">
        <Empty text="No lots match." action={<Button onClick={retry}>Clear filters</Button>} />
      </Panel>,
    );
    expect(
      screen.getByRole("heading", { name: "Inventory", level: 2 }).closest("section"),
    ).toHaveClass("brand-surface");
    expect(screen.getByText("No lots match.").parentElement).toHaveClass("brand-surface");
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("retains disabled inputs and buttons plus accessible selected tabs", () => {
    render(
      <>
        <Input aria-label="Amount" disabled />
        <Button disabled>Submit</Button>
        <Tabs defaultValue="inventory">
          <TabsList aria-label="Asset views">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="inventory">Recorded lots</TabsContent>
          <TabsContent value="history">Lot history</TabsContent>
        </Tabs>
      </>,
    );
    expect(screen.getByRole("textbox", { name: "Amount" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Inventory" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Recorded lots");
  });
});
