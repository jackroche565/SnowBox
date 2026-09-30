@AGENTS.md

# Snowbox

Snowfall and forecasts for Northeast US ski resorts. (The project and repo were first called Snowline; the app is now Snowbox.) Next.js (App Router, TypeScript, Tailwind v4), deployed on Vercel. The owner is new to coding: explain things plainly and keep changes focused.

## Deploying

Vercel auto-deploys the branch `claude/web-app-github-vercel-p9ocy4` as production. Pushing to it updates the live site (test123-iota-red.vercel.app). Other branches get Vercel preview URLs. Run `git pull` before starting work, since cloud and local sessions both push here.

## Before pushing

Run `npm run lint`, `npx tsc --noEmit` and `npm run build`. All must pass.

## Structure

- Each tab has one job. `/` Home: your starred mountains as compact rows, readable at a glance (first visit shows a mountain picker), plus one "best bet this week" card. `/explore`: every resort on a map and list, leading to `/resorts/[id]` (tabbed detail: Forecast, Report & Cams, Mountain; tab kept in the URL hash; statically generated). `/decide`: pick a day, passes, starting point and max drive to get a ranked list, and tick 2–3 resorts for a side-by-side. `/compare` redirects to `/decide` (in `next.config.ts`).
- Copy rules: the only title is "Snowbox" in the bar. No generated or changing headlines ("Storm Watch" and the like), no marketing sentences. Section labels are small uppercase labels, not big headings. State numbers plainly.
- Navigation: `src/components/Nav.tsx` holds the tabs: top tabs in the header from tablet width up, and a bottom tab bar on phones (the root layout pads the page for it).
- `src/data/resorts.json` holds all resort data: coordinates, passes (`Epic`/`Ikon`/`Indy`), summit/base/vertical/trails, and official `trailMapUrl`/`snowReportUrl`/`webcamUrl`. `estimates` lists fields that are uncertain; the UI marks them "est.". Don't invent stats or URLs: look them up and flag anything unverified.
- `src/app/api/forecast/route.ts` fetches a light 16-day daily summary for all resorts from Open-Meteo in one request, cached 30 min. `src/lib/forecast.ts` parses it. Leave this data logic alone unless asked.
- `src/app/api/resort/[id]/route.ts` is the heavy per-resort forecast, fetched only on a resort page: 72 hours at summit and base elevation, and 16 days from three models (GFS, ECMWF, GEM) for a confidence range. `src/lib/resortForecast.ts` parses it and derives rain/snow type and wind holds. Keep heavy data here, not in the all-resort summary.
- `src/lib/outlook.ts` makes Home's one-line note per mountain (powder day, next snow, flurries, or none). `src/lib/decide.ts` scores a resort for a day (weights at the top of the file) and estimates drive time from straight-line distance. Drive times are always labelled as estimates without traffic.
- `src/components/AppState.tsx` is shared state across pages: forecasts, favorites, the passes you hold, your starting point and the Decide side-by-side list (all saved in localStorage under the older `snowline:` keys, kept so saved lists survive), plus Explore's sort. `PassPicker` and `LocationSearch` edit the shared passes and location from any page.
- `src/components/SiteHeader.tsx` is the navy bar on every page (Snowbox name and tabs). Resort pages pass children for a banner with the ridgeline art.
- The map is Leaflet (`ResortMap.tsx`), loaded client-side only.

## Design language

Keep new UI consistent with these:
- Colors in `src/app/globals.css`: navy `#101826` (hero, map chrome), snow `#F5F7FA` (page), glacier `#4A90B8`, alpenglow `#E85D3D` (search button, user pin), barn red `#B5482E` (sparingly: wind-hold and rain warnings, errors), gold `#E0A526` (favorites star only). Rain/mix/snow colors are in `PRECIP_COLORS` in `src/lib/format.ts`. Epic/Ikon/Indy tag colors are fixed in `src/lib/format.ts`.
- Headings use Bebas Neue (`font-display`); body is Inter; numbers use `tabular-nums`.
- Motion stays restrained, and respects reduced-motion.
- Everything must work at phone width (390px) with no horizontal scroll.

## Roadmap

`docs/redesign-plan.md` has the redesign plan, how it was scored, and what's deliberately left for later (accounts, powder alerts, a paid tier, radar, real drive times with traffic).
