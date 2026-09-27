# Snowline

Snowfall and forecasts for ski resorts, starting in the Northeast US, built with [Next.js](https://nextjs.org) and hosted on [Vercel](https://vercel.com). Weather data comes from [Open-Meteo](https://open-meteo.com), which is free and needs no API key.

## Adding or editing resorts

All resorts live in `src/data/resorts.json`. To add one, copy an existing entry and change the values:

```json
{ "id": "smugglers-notch", "name": "Smugglers' Notch", "state": "VT", "lat": 44.588, "lon": -72.790, "passes": [], "summitFt": 3640, "verticalFt": 2610 }
```

- `id`: a unique short name with no spaces
- `lat` / `lon`: coordinates of the base area. In Google Maps, right-click the spot and click the numbers to copy them.
- `summitFt` / `verticalFt` (optional): top of the lift-served terrain and vertical drop, in feet. They appear in the compare view.
- `passes`: any of `"Epic"`, `"Ikon"`, `"Indy"`, e.g. `["Ikon", "Indy"]`. Use `[]` for none.

Pass lineups change every season, so check them each fall. The elevations are approximate; the resorts' own trail maps are the best source.

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
| `src/components/SnowApp.tsx` | The main screen: location search, pass filter, sorting, compare tray. |
| `src/components/CompareDialog.tsx` | The side-by-side compare view. |
| `src/components/ResortMap.tsx` | The map. |
| `src/components/Hero.tsx` | The navy header band with the search box. |
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
