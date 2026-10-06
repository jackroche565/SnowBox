@AGENTS.md

# Snowbox

Snowfall and forecasts for Northeast US ski resorts. (First called Snowline; the repo is now `SnowBox`.) Next.js (App Router, TypeScript, Tailwind v4), deployed on Vercel. The owner is new to coding: explain things plainly and keep changes focused.

## Deploying

Vercel auto-deploys the branch `claude/web-app-github-vercel-p9ocy4` as production. Pushing to it updates the live site (test123-iota-red.vercel.app). Other branches get Vercel preview URLs. Run `git pull` before starting work, since cloud and local sessions both push here.

## Before pushing

Run `npm run lint`, `npx tsc --noEmit` and `npm run build`. All must pass.

## Structure

- Each tab has one job. `/` Home: one headline number (most snow this week, or the next snow) and the "Your week" board: your mountains as rows, the next 7 days as columns, cells shaded deeper blue for more snow, plus a total. Edit opens the picker. `/explore`: map-first on phones (List/Map toggle), list beside the map on desktop; tapping a dot opens a preview card with View mountain. Leads to `/resorts/[id]` (one page, no tabs, statically generated): Conditions (last 48 hrs, last 7 days, modeled base, next 3 days, wind, rain/snow line, link to the official lifts & trails report), a 7-day list, a one-line days 8–16 summary, hour by hour folded away, then mountain facts and links. `/decide`: day, rank by (Best overall / Most snow / Closest), passes, starting point and max drive give a ranked list; tick 2–3 for a side-by-side. `/compare` redirects to `/decide` (in `next.config.ts`).
- Nothing unnecessary: people have limited time and attention. Before adding anything, ask whether it repeats something already on screen or makes someone stop and decode it; if so, leave it out. One entry point per action.
- Copy rules: the only title is "Snowbox" in the bar. No generated or changing headlines ("Storm Watch" and the like), no marketing sentences. Section labels are small uppercase labels, not big headings. State numbers plainly.
- Navigation: `src/components/Nav.tsx` holds the tabs: top tabs in the header from tablet width up, and a bottom tab bar on phones (the root layout pads the page for it).
- `src/data/resorts.json` holds all resort data for 76 areas: every public, lift-served downhill area in New England with at least 2 lifts or 300 ft of vertical, plus Hunter (NY). The original 19 have hand-checked stats and links. The other 57 came from OpenSkiMap (location, lift-served top and bottom elevation, all flagged as estimates) with homepages checked to load, stored as `websiteUrl`. Passes were checked against the Epic, Ikon and Indy sites in Sept 2026; they change yearly. The file holds coordinates, passes (`Epic`/`Ikon`/`Indy`), summit/base/vertical/trails, and official `trailMapUrl`/`snowReportUrl`/`webcamUrl`. `estimates` lists fields that are uncertain; the UI marks them "est.". `opensOn` is this season's projected opening day for 55 areas, from OnTheSnow's projected-openings pages (Oct 2026); the rest have no announced date. Refresh it every fall. `src/lib/season.ts` uses it: before opening day there are no wind holds, Decide ranks only open mountains, and the resort page shows the opening date in place of wind. Don't invent stats or URLs: look them up and flag anything unverified.
- `src/app/api/forecast/route.ts` fetches a light 16-day daily summary for all resorts from Open-Meteo in one request, cached 30 min. `src/lib/forecast.ts` parses it. Leave this data logic alone unless asked.
- `src/app/api/resort/[id]/route.ts` is the heavy per-resort forecast, fetched only on a resort page: 72 hours at summit and base elevation, and 16 days from three models (GFS, ECMWF, GEM) for a confidence range. `src/lib/resortForecast.ts` parses it and derives rain/snow type and wind holds. Keep heavy data here, not in the all-resort summary.
- `src/lib/outlook.ts` makes Home's one-line note per mountain (powder day, next snow, flurries, or none). `src/lib/decide.ts` scores a resort for a day (weights at the top of the file) and estimates drive time from straight-line distance. Drive times are always labelled as estimates without traffic.
- `src/components/AppState.tsx` is shared state across pages: forecasts, favorites, the passes you hold, your starting point and the Decide side-by-side list (all saved in localStorage under the older `snowline:` keys, kept so saved lists survive), plus Explore's sort. `PassPicker` and `LocationSearch` edit the shared passes and location from any page.
- `src/components/SiteHeader.tsx` is the same plain bar on every tab: Snowbox wordmark on the snow ground, tabs from tablet width up. Terrain imagery sits below it, never behind it.
- The Explore map is MapLibre (`ResortMap.tsx`), loaded client-side only, on Snowbox's own style (`QUIET_STYLE` in `src/lib/terrain.ts`): snow land, ice-blue water, relief, dashed state lines, state and city names only. Flat and north-up. Dots are one size, colored by pass (`resortColor`; independents are ink, never grey); your mountains are labelled; the selected dot gets a soft ring. No legend, zoom buttons or hover pop-ups. Layers are added on `style.load` (not `load`, which a background tab can hold back).
- Lifts and trails open: no free reliable source (Liftie blocks server requests; OnTheSnow's feed is paid), so resort pages link to the official report. Don't fake these numbers.

## Design language

"Alpine editorial": light only, calm and spacious, with real terrain as the signature image. Keep new UI consistent with these:
- Tokens in `src/app/globals.css`: snow `#F3F5F8` (page), sheet white (surfaces), ink `#0F1A2A` (text, active controls), slate `#4B5668` / faint `#6B7585` (secondary text), zero `#A3ACB9` (a 0" figure, so real snow stands out), hairline `#EDF1F5` (dividers in sheets), glacier `#2F76A3` (snow figures, links), ice `#E6F0F7` (snow tint), alpenglow `#E0532F` (powder only), barn `#A9442B` (wind holds, rain, errors), gold (favorites star only). Pass dot colors are fixed in `src/lib/format.ts`.
- Type: Archivo (variable width) for names and numbers via the `type-hero` (75% width, resort names on imagery), `type-name` (85%, list names) and `type-figure` (85%, tabular snow figures) utilities; Instrument Sans for everything you read. Sentence case, no all-caps labels. Three text sizes: 15 body, 13 secondary, 11 captions.
- Surfaces: `sheet` utility (white, 18px corners, one soft shadow) with hairline dividers inside, not bordered boxes. Controls: 10–12px corners or full pills; selected = ink fill.
- Signature pieces: the snow stake (`SnowStake.tsx`, fills against 24"), trail-marker shapes (◆ ● ■) as icons in ink only, never meaning difficulty.
- Terrain: free, keyless sources in `src/lib/terrain.ts` (AWS Terrain Tiles elevation, OpenFreeMap Positron basemap). Resort pages render a live 3D hero (`TerrainHero.tsx`, auto-aims at the high ground); Home uses a pre-rendered panorama of the Mount Mansfield range (`public/terrain/green-mountains.jpg`) whose sky is exactly the page color, so the ridgeline rises out of the page under the bar; re-render it the same way if it changes. The Explore map stays 2D.
- Snow figures always say which window they cover ("next 7 days", "Last 48 hrs"); never a bare "7 days".
- Motion stays restrained and respects reduced-motion. Everything must work at phone width (390px) with no horizontal scroll; phones get the bottom tab bar, wider screens the top tabs.

## Roadmap

`docs/redesign-plan.md` has the redesign plan, how it was scored, and what's deliberately left for later (accounts, powder alerts, a paid tier, radar, real drive times with traffic).
