# RideShare CPM

Loaded cost-per-mile planner for rideshare drivers. Static site. No server.

**Free with ads** — all features unlocked: vehicle setup, offer checks, live shift, shift log, dashboard history, export/import JSON.

## Monetization

Free + ads. Stripe checkout is paused; `STRIPE_LINK` is empty in `app.js`.

Former Payment Link (deactivate in Stripe if still live):

`https://buy.stripe.com/28E14g5K7asc5Ax4jz4AU00`

## Go live (GitHub Pages)

1. Repo is public.
2. GitHub → Settings → Pages → Deploy from branch `main` / root.
3. Site URL will be `https://ashleyfarms.github.io/rideshare-cpm/`

## Privacy

No accounts. Numbers stay in `localStorage` on the phone. Export is user-initiated. Card data never touches this page.

## Tax

IRS 2026 business rates used as a benchmark only: $0.725 Jan–Jun, $0.76 Jul–Dec. Not tax advice. Drivers choose standard *or* actual expenses per car per year.
