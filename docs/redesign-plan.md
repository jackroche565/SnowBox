# Snowline redesign: plan of attack

Goal: move Snowline from a one-page resort directory to an app a serious Northeast skier would open every day and eventually pay for. The model is OpenSnow, Surfline and OnTheSnow: a personal home screen, deep forecasts, and a resort page that answers "should I go, and when?"

## 1. Draft plan (v1)

1. **App shell.** Bottom tab bar on phones (Home, Map, Compare, Resorts), top nav on desktop.
2. **Favorites.** Star any resort; saved in the browser.
3. **Home.** Favorites as cards, a "best bets" ranking, and a written storm summary.
4. **Resorts page.** Today's list moves to `/resorts`.
5. **Map page.** A full-screen map with forecast-snow layers and radar.
6. **Resort hub.** Four tabs as separate URLs: Forecast, Conditions, Cams & Maps, Info. Hourly, 16-day, model range, wind, rain/snow line, summit vs base.
7. **Data.** Extend the one forecast request to include hourly and multi-model data for every resort.
8. **Premium.** "Snowline Pro" badges and a paywall screen.
9. **Powder alerts.**

## 2. Scoring v1

Each criterion is scored 1–5.

| Criterion | Score | Notes |
|---|---|---|
| Value to a serious skier | 4 | The right features, taken from what competitors charge for. |
| Feels "pro" | 4 | Tabs, favorites and deep forecasts all help. |
| Data honesty | 2 | A paywall with nothing behind it and a written "storm summary" could pass for expert forecasting when neither is real. |
| Scope and risk | 1 | Nine workstreams in one go is too much for an owner who is new to code to review. Alerts and payments need accounts and a backend, which don't exist. |
| Performance | 2 | Hourly, multi-model data for all 19 resorts is about **1.2 MB** per load (measured: 132 KB for 2 resorts). |
| Fits the codebase and design rules | 3 | Four separate URLs per resort is 76 static pages for little gain. The map page duplicates the Overview map. |
| Handles today's reality | 1 | It's September and every number is 0″. v1 barely addresses the off-season, which is what every visitor sees for the next 6–8 weeks. |
| **Total** | **17 / 35** | |

## 3. Weaknesses found

1. **Payments and alerts are out of reach.** Without accounts, email or push there is nothing real to sell. A fake paywall is worse than none. → Cut. Record as a later phase.
2. **The data design is too heavy.** → Split it. The summary request (all resorts) stays light, adding only 16 days and wind. Each resort page makes its own detailed request: hourly, summit vs base, 3 models.
3. **The map page is redundant.** → Merge it into **Explore**, today's Overview with its map and list. Map pins scale with forecast snow.
4. **The Cams & Maps tab would be thin** (it's only outbound links). → Use 3 tabs: Forecast, Report & Cams, Mountain. The official links also stay in the resort header.
5. **Tabs as separate URLs add build weight and complexity.** → Switch tabs in the browser, remembered in the URL hash (`#report`).
6. **The off-season is an afterthought.** → Make it a first-class state. When the 16-day outlook is dry, Home says so plainly and shows the next signs of winter (first freezing mornings, the lowest freezing level, first snow in the outlook).
7. **The storm summary could look like expert forecasting.** → Keep it to a factual headline computed from the numbers ("Jay Peak leads with 9″ through Sat"), labeled as model-based.
8. **Pushing to production is risky for a big redesign.** → Build on a preview branch so Vercel produces a private preview link. The live site doesn't change until the owner approves.
9. **Four bottom tabs with "Resorts" and "Map" both showing lists is confusing.** → Use three tabs: Home, Explore, Compare.

## 4. Revised plan (v2)

**Branch:** `redesign/pro-app` (Vercel preview). Production is untouched.

**A. Data**
- `src/lib/forecast.ts`: 16-day daily outlook, max wind gust per day, and helpers for "today", "next 3 days", "next 7" and "days 8–16".
- New `src/app/api/resort/[id]/route.ts` and `src/lib/resortForecast.ts`, one request per resort page, cached 30 min:
  - hourly for 72 h at **summit and base** elevation: snow, temperature, precipitation, gusts, freezing level, weather code
  - daily for 16 days from **GFS, ECMWF and GEM**, giving a low/likely/high snowfall range

**B. Shell**
- `SiteHeader`: a full hero only where it earns it (Home, resort pages), a compact bar elsewhere.
- `BottomNav`: phone-only bottom tab bar (Home, Explore, Compare) with a badge for the compare count.
- `AppState`: favorites, saved in localStorage like compare.

**C. Home (`/`)**
- An outlook headline computed from the data, plus a region stat strip.
- **My Mountains**: favorite cards with today, 3-day and 7-day snow, a mini 7-day chart, and a "Powder" badge for ≥6″ in a day. The empty state suggests starring.
- **Best bets**: top 5 by next 3 days, next 7 or days 8–16, with a pass filter.
- **Off-season panel** when the outlook is dry.

**D. Explore (`/explore`)**
- Today's Overview (map and list) moves here, with star buttons and pins that scale with snow.

**E. Resort hub (`/resorts/[id]`)**
- Header: star, compare, official links.
- **Forecast** tab: snow summary strip, a 72 h hourly chart for summit vs base (snow bars, temperature, rain/snow line, wind-hold warning at ≥40 mph gusts), and a 16-day chart with the model range.
- **Report & Cams** tab: modeled depth, the past 7 days, and official snow report and webcam links.
- **Mountain** tab: stats, "est." flags and trail map.

**F. Compare**: compact header; point links to Explore.

**G. Verify**: lint, type-check, build; check at 390 px and desktop in the browser; push the preview branch.

**Later (not in this pass):** accounts, powder alerts, Pro tier with Stripe, radar layer, historical season totals.

## 5. Scoring v2

| Criterion | v1 | v2 |
|---|---|---|
| Value to a serious skier | 4 | 4 |
| Feels "pro" | 4 | 4 |
| Data honesty | 2 | 5 |
| Scope and risk | 1 | 4 |
| Performance | 2 | 4 |
| Fits the codebase and design rules | 3 | 4 |
| Handles today's reality | 1 | 4 |
| **Total** | **17** | **29 / 35** |

## 6. Status

Phases A–G are built on `redesign/pro-app`. Verified with lint, type-check and build, in the browser at 390 px and desktop, in today's off-season conditions and with temporary fake snow injected locally (removed before commit).

What changed from the v2 plan during the build:
- In the off-season, the Home hero shows the first signs of winter (first freezing night, coldest night ahead) instead of three "0″" boxes, so the separate Winter Watch section was dropped.
- Charts with no snow show a one-line note instead of an empty plot.

Data weight: the all-resort summary is about 44 KB, and each resort page adds about 20 KB.
