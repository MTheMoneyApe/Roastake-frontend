import { createFileRoute, redirect } from "@tanstack/react-router";
import { seo } from '@/lib/seo';
export const Route = createFileRoute("/app/")({ head:()=>seo('Coffee App','Open the ROASTAKE simulated coffee portfolio and asset journey.'), beforeLoad: () => { throw redirect({ to: "/app/dashboard" }); } });
