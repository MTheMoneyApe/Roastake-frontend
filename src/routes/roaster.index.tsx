import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/roaster/")({ beforeLoad: () => { throw redirect({ to: "/roaster/$section", params: { section: "dashboard" } }); } });
