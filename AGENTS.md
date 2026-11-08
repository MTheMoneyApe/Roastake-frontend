<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep coffee accounting and activity aggregation in shared demo utilities, so all MVP screens use the same quantity definitions.
- All prototype actions mutate the existing browser-only demo store atomically; never add production infrastructure to simulation flows.
- Compute marketplace line totals and shipment totals in shared demo calculations; keep EUR commissions separate from USD-equivalent protocol revenue to avoid implicit currency conversion.
- Treat conversion fee quantities as protocol-owned inventory recorded in conversions and exclude them from swap inventory; redemption reserves contain already-burned tokens, so subtract reserves only from physical mass, not token supply.
