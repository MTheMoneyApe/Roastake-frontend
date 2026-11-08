import { createFileRoute, redirect } from "@tanstack/react-router";
import { seo } from '@/lib/seo';
export const Route = createFileRoute("/roaster/")({ head:()=>seo('Roaster Portal','ROASTAKE roaster portal preview. Roaster management tools are coming soon.'), beforeLoad: () => { throw redirect({ to: "/roaster/$section", params: { section: "dashboard" } }); } });
