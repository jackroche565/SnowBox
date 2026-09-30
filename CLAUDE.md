@AGENTS.md

# Snowline

Snowfall and forecasts for Northeast US ski resorts. Next.js (App Router, TypeScript, Tailwind v4), deployed on Vercel. The owner is new to coding: explain things plainly and keep changes focused.

## Deploying

Vercel auto-deploys the branch `claude/web-app-github-vercel-p9ocy4` as production. Pushing to it updates the live site (test123-iota-red.vercel.app). Other branches get Vercel preview URLs. Run `git pull` before starting work, since cloud and local sessions both push here.

## Before pushing

Run `npm run lint`, `npx tsc --noEmit` and `npm run build`. All must pass.

## Structure

- Routes: `/` Overview (map + list), `/compare` (up to 3 resorts), `/resorts/[id]` (detail, statically generated from the resort list).
- `src/data/resorts.json` holds all resort data: coordinates, passes (`Epic`/`Ikon`/`Indy`), summit/base/vertical/trails, and official `trailMapUrl`/`snowReportUrl`/`webcamUrl`. `estimates` lists fields that are uncertain; the UI marks them "est.". Don't invent stats or URLs: look them up and flag anything unverified.
- `src/app/api/forecast/route.ts` fetches all resorts from Open-Meteo in one request, cached 30 min. `src/lib/forecast.ts` parses it. Leave this data logic alone unless asked.
- `src/components/AppState.tsx` is shared state across pages: forecasts, user location, compare list (saved in localStorage), pass filter and sort.
- `src/components/SiteHeader.tsx` is the navy hero band with nav tabs, used by every page.
- The map is Leaflet (`ResortMap.tsx`), loaded client-side only.

## Design language

Keep new UI consistent with these:
- Colors in `src/app/globals.css`: navy `#101826` (hero, map chrome), snow `#F5F7FA` (page), glacier `#4A90B8`, alpenglow `#E85D3D` (search button, user pin), barn red `#B5482E` (sparingly: featured badge, compare controls). Epic/Ikon/Indy tag colors are fixed in `src/lib/format.ts`.
- Headings use Bebas Neue (`font-display`); body is Inter; numbers use `tabular-nums`.
- Motion stays restrained, and respects reduced-motion.
- Everything must work at phone width (390px) with no horizontal scroll.
