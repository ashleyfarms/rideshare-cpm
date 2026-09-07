# RideShare CPM

Loaded cost-per-mile planner for rideshare drivers. Static site. No server, no secret Stripe keys.

**Free:** vehicle setup + one-off TAKE / THIN / SKIP offer checks  
**Pro:** live shift, shift log, dashboard history, export/import JSON

## Go live (GitHub Pages)

1. Repo is public.
2. GitHub → Settings → Pages → Deploy from branch `main` / root.
3. Site URL will be `https://ashleyfarms.github.io/rideshare-cpm/`
4. In Stripe Payment Link settings, set **Success URL** to:

   `https://ashleyfarms.github.io/rideshare-cpm/?paid=1`

   Optional cancel URL:

   `https://ashleyfarms.github.io/rideshare-cpm/?sub=canceled`

5. Payment Link must use a **recurring subscription price**, not a one-time price.
6. Customer portal: Stripe Dashboard → Billing → Customer portal. Copy the login URL into `STRIPE_PORTAL` in `index.html`.
7. Put license key `RIDE-PRO-2026` in the Stripe after-payment / receipt message so a driver can restore Pro on a new phone. Change the key in `index.html` if you want a private code.

## Honest limits

This is a **device license**, not server-verified access.

- `?paid=1` marks *this browser* as Pro.
- Anyone can set `paid: true` in DevTools.
- Cancel in Stripe does **not** automatically lock the page. Drivers tap “Mark this device unpaid,” or you send them `?sub=canceled`.
- Do not market this as DRM. Market it as a planning tool with optional support / Pro conveniences.

For real enforcement you need a backend that checks Stripe subscription status.

## Privacy

No accounts. Numbers stay in `localStorage` on the phone. Export is user-initiated. Card data never touches this page.

## Tax

IRS 2026 business rates used as a benchmark only: $0.725 Jan–Jun, $0.76 Jul–Dec. Not tax advice. Drivers choose standard *or* actual expenses per car per year.
