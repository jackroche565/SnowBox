# Snowline

Snowfall and forecasts for ski resorts, starting in the Northeast US, built with [Next.js](https://nextjs.org) and hosted on [Vercel](https://vercel.com). Weather data comes from [Open-Meteo](https://open-meteo.com), which is free and needs no API key.

## Adding or editing resorts

All resorts live in `src/data/resorts.json`. To add one, copy an existing entry and change the values:

```json
{
  "id": "smugglers-notch",
  "name": "Smugglers' Notch",
  "state": "VT",
  "lat": 44.588,
  "lon": -72.79,
  "passes": [],
  "summitFt": 3640,
  "baseFt": 1030,
  "verticalFt": 2610,
  "trails": 78,
  "trailMapUrl": "https://…",
  "snowReportUrl": "https://…",
  "webcamUrl": "https://…",
  "estimates": ["trails"]
}
```

- `id`: a unique short name with no spaces
- `lat` / `lon`: coordinates of the base area. In Google Maps, right-click the spot and click the numbers to copy them.
- `summitFt`, `baseFt`, `verticalFt`, `trails` (optional): lift-served mountain stats, in feet.
- `trailMapUrl`, `snowReportUrl`, `webcamUrl` (optional): links to the resort's own pages, shown on its detail page.
- `estimates` (optional): names of any fields above that are estimates or disagree between sources. They get an "est." marker. For `webcamUrl` it means the link goes to a conditions page rather than a dedicated webcam page.
- `passes`: any of `"Epic"`, `"Ikon"`, `"Indy"`, e.g. `["Ikon", "Indy"]`. Use `[]` for none.

Pass lineups change every season, so check them each fall. Mountain stats come from published resort figures (via Wikipedia, OnTheSnow and resort sites) as of fall 2026.

## How the snow numbers work

- **Last 7 days / Next 7 days**: total snowfall from Open-Meteo's weather models, in inches.
- **Snow depth**: Open-Meteo's *modeled* snow on the ground. It is not the resort's reported base depth, which usually runs higher because of snowmaking and grooming.
- Forecasts are cached for 30 minutes, so every visitor shares one request to Open-Meteo.

## How the pieces fit together

- **This code** is the web app.
- **GitHub** stores the code and keeps its history.
- **Vercel** watches the GitHub repo. Every time new code is pushed, it builds the app and puts it online at a public URL.

## Put the app online with Vercel (one-time setup)

1. Go to [vercel.com/signup](https://vercel.com/signup) and choose **Continue with GitHub**.
2. Click **Add New… → Project**.
3. Find the **Test123** repository and click **Import**. If it isn't listed, click **Adjust GitHub App Permissions** and give Vercel access to it.
4. Leave every setting as it is. Vercel detects Next.js by itself. Click **Deploy**.
5. After about a minute you get a live URL like `https://test123-xxxx.vercel.app`.

After that, every push to the production branch updates the live site automatically. Pushes to any other branch get their own **preview URL**, so you can check changes before they go live.

## Run it on your own computer (optional)

You need [Node.js](https://nodejs.org) (the LTS version) and [Git](https://git-scm.com).

```bash
git clone https://github.com/jackroche565/Test123.git
cd Test123
npm install
npm run dev
```

Then open http://localhost:3000. The page reloads automatically when you edit files.

## Where things live

| File | What it does |
| --- | --- |
| `src/data/resorts.json` | The list of resorts. |
| `src/app/page.tsx`, `src/components/Overview.tsx` | Overview (`/`): location search, pass filter, sorting, map and list. |
| `src/app/compare/page.tsx`, `src/components/CompareView.tsx` | Compare (`/compare`): chart and table for up to 3 resorts. |
| `src/app/resorts/[id]/page.tsx`, `src/components/ResortDetail.tsx` | A resort's detail page (`/resorts/stowe` etc.). |
| `src/components/AppState.tsx` | State shared by every page: forecasts, your location, the compare list (remembered in the browser). |
| `src/components/SiteHeader.tsx` | The navy header band with the Overview / Compare tabs. |
| `src/components/SnowfallChart.tsx`, `src/components/CompareChart.tsx` | The bar charts. |
| `src/components/ResortMap.tsx` | The map. |
| `src/components/Ridgeline.tsx` | Shows the mountain silhouette (`public/ridgeline.svg`) in the header. |
| `src/components/ResortEntries.tsx` | The featured resort card and the compact list rows. |
| `src/components/DailySnow.tsx` | The day-by-day snowfall bars. |
| `src/app/api/forecast/route.ts` | Fetches snow forecasts from Open-Meteo. |
| `src/app/api/geocode/route.ts` | Turns a city or zip code into map coordinates. |
| `src/app/layout.tsx` | The shell around every page (page title, fonts). |
| `src/app/globals.css` | Colors (navy, snow, glacier, alpenglow, barn red), pass-tag patches, and map styling. Styling uses [Tailwind CSS](https://tailwindcss.com) classes. |
| `public/topo.svg`, `public/topo-map.svg` | The contour-line textures around and over the map. |

To add a new page at `/about`, create `src/app/about/page.tsx`.

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Build the app the same way Vercel does, which catches errors before you push |
| `npm run lint` | Check the code for common mistakes |
