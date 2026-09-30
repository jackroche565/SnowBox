@AGENTS.md

# Snowline

Snowfall and forecasts for Northeast US ski resorts. Next.js (App Router, TypeScript, Tailwind v4), deployed on Vercel. The owner is new to coding: explain things plainly and keep changes focused.

## Deploying

Vercel auto-deploys the branch `claude/web-app-github-vercel-p9ocy4` as production. Pushing to it updates the live site (test123-iota-red.vercel.app). Other branches get Vercel preview URLs. Run `git pull` before starting work, since cloud and local sessions both push here.

## Before pushing

Run `npm run lint`, `npx tsc --noEmit` and `npm run build`. All must pass.

## Structure

- Routes: `/` Home (My Mountains favorites, Best Bets ranking, region headline; switches to an off-season view when the 16-day outlook is dry), `/explore` (map + list), `/compare` (up to 3 resorts), `/resorts/[id]` (tabbed hub: Forecast, Report & Cams, Mountain; tab kept in the URL hash; statically generated from the resort list).
- Navigation: `src/components/Nav.tsx` holds the tabs: top tabs in the header from tablet width up, and a bottom tab bar on phones (the root layout pads the page for it).
- `src/data/resorts.json` holds all resort data: coordinates, passes (`Epic`/`Ikon`/`Indy`), summit/base/vertical/trails, and official `trailMapUrl`/`snowReportUrl`/`webcamUrl`. `estimates` lists fields that are uncertain; the UI marks them "est.". Don't invent stats or URLs: look them up and flag anything unverified.
- `src/app/api/forecast/route.ts` fetches a light 16-day daily summary for all resorts from Open-Meteo in one request, cached 30 min. `src/lib/forecast.ts` parses it. Leave this data logic alone unless asked.
- `src/app/api/resort/[id]/route.ts` is the heavy per-resort forecast, fetched only on a resort page: 72 hours at summit and base elevation, and 16 days from three models (GFS, ECMWF, GEM) for a confidence range. `src/lib/resortForecast.ts` parses it and derives rain/snow type and wind holds. Keep heavy data here, not in the all-resort summary.
- `src/lib/outlook.ts` turns forecasts into Home's headline, rankings and winter signs. Its wording must state model numbers, never read like a human forecaster.
- `src/components/AppState.tsx` is shared state across pages: forecasts, user location, compare list and favorites (both saved in localStorage), pass filter and sort.
- `src/components/SiteHeader.tsx` is the navy band on every page: `size="hero"` (with the ridgeline art) for Home and resort pages, `size="compact"` for Explore and Compare.
- The map is Leaflet (`ResortMap.tsx`), loaded client-side only.

## Design language

Keep new UI consistent with these:
- Colors in `src/app/globals.css`: navy `#101826` (hero, map chrome), snow `#F5F7FA` (page), glacier `#4A90B8`, alpenglow `#E85D3D` (search button, user pin), barn red `#B5482E` (sparingly: featured badge, compare controls, wind-hold warnings), gold `#E0A526` (favorites star only). Rain/mix/snow colors are in `PRECIP_COLORS` in `src/lib/format.ts`. Epic/Ikon/Indy tag colors are fixed in `src/lib/format.ts`.
- Headings use Bebas Neue (`font-display`); body is Inter; numbers use `tabular-nums`.
- Motion stays restrained, and respects reduced-motion.
- Everything must work at phone width (390px) with no horizontal scroll.

## Roadmap

`docs/redesign-plan.md` has the redesign plan, how it was scored, and what's deliberately left for later (accounts, powder alerts, a paid tier, radar).
