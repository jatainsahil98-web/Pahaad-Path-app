# PahaadPath

Hill-road landslide, traffic and entry-rule advisory for Uttarakhand, in English and Hindi. SAARTHI'26, Track 3 (Smart Cities, Mobility and Public Safety). Team Coding Club MCTE.

**Live app:** https://jatainsahil98-web.github.io/Pahaad-Path-app/ (one HTML file; it also works opened straight from disk, offline).

Advisory only. It is not an official warning. Follow police, BRO and district administration notices on the road.

## What it does

It runs on today's data. On opening it fetches the live hourly rain forecast for every road stretch (Open-Meteo, past 3 days and next 16), refreshes it every hour and again when a lost connection returns, and keeps the last forecast for up to 36 hours offline. Road distances and shapes come from OpenStreetMap through OSRM, slope from the Copernicus DEM, incident history from the NASA landslide catalog, and road reports are shared between phones as they are made. With no connection and nothing saved it shows no landslide risk and says so, rather than showing made-up weather.

- **Plan trip:** any source, destination and date from today up to 14 days ahead. Fastest and lower-risk roads, landslide risk per stretch at the hour you reach it, long-weekend traffic, best departure window, night halts, entry rules with sources, road profile, safety kit with helplines and SOS, trip from a typed or spoken sentence.
- **Control room:** all 44 hill stretches over 72 hours, animated map, advisory draft in English or Hindi, expected jams, road reports shared across phones.
- **Proof:** replays real closure days (20 Aug 2025, 9 Jul 2026) and dry control days on recorded rain or on forecasts issued 1 or 2 days before. It compares Avoid stretches with closures named in the news. Threshold sensitivity chart. What the stored real-data run found (recorded rain, DEM slope, NASA history; see `data/replay_results.json`): on 9 Jul 2026, 1 of the 4 named closed stretches reached Avoid and 3 of 4 reached Caution or worse; on 20 Aug 2025 none of the 5 did; on the two dry control days no stretch reached Avoid. On forecasts issued 1 or 2 days before it catches fewer. It is a small sample, so read it as an honest check, not a measured accuracy. Open data builder for road distances (OSRM), terrain slope (Copernicus DEM). Incident history comes from the NASA Global Landslide Catalog (2007 to 2017): 124 events in Uttarakhand located to 10 km or better are built into the app (`data/nasa_glc_uttarakhand_bbox.json`, taken from NASA's legacy export on data.nasa.gov because the live COOLR service is gone).

The repository root holds the built app (`index.html`, identical to `PahaadPath.html`) so GitHub Pages can serve it. CI rebuilds it from `src/` and checks the copies match.

## Offline first (v5)

PahaadPath is meant for people who are out of network most of the time.

- **Install once, use offline:** open the live app and add it to the home screen, or install the Android APK (`https://github.com/jatainsahil98-web/Pahaad-Path-app/releases/latest/download/PahaadPath.apk`). Either works with no signal afterwards.
- **Pass it on with no internet:** the footer button saves the whole app as one file (the APK itself inside the Android app) to send by WhatsApp, Bluetooth or a memory card.
- **Small daily data:** every 3 hours CI publishes a data pack with rain for every road stretch (about 6 KB compressed). A phone needs only a moment of signal to fetch it, and then plans offline from it for days. The header always says how old the forecast is.
- **Road reports** made with no signal wait on the phone and go out when the connection returns.
- **On the road with no data (v6):** "Where am I on this trip?" uses GPS only and says the risk where you are now, the next risky stretch and the next town with lodging. "Tell family (SMS)" sends the plan, "reached safely" or "stuck, here is my location" from the user's own phone, which often works where data does not. "My trips" re-checks saved trips on every forecast update and says when the risk went up. Fuel and cost from the user's own mileage and price. Fuel, hospitals, ATMs and mechanics per town from OpenStreetMap (`python -m pahaadpath stops`, open data workflow), and NDMA Sachet alerts for Uttarakhand carried in the data pack.

## Python

`python/` holds the data and model pipeline (standard library only): rain download, model training and checking against the v4 engine, the data pack, a control room advisory and an optional road report sync server. See `python/README.md` and the latest model check in `data/model/REPORT.md`.

## Build

1. `npm install && npm run vendor` gets Playwright for the tests and the two libraries that are inlined so the app works offline.
2. `npm run build` (or `python3 tools/build.py`) writes `dist/PahaadPath.html` (one file) and `dist/site/` (installable web app for GitHub Pages).
3. `npm run build` bakes in the real data run from `data/`; `npm run build:demo` builds without it. To bake in a newer run fetched in a browser: `python3 tools/build.py pahaadpath_open_data.json pahaadpath_replay_results.json` (use `-` for the first file if you only have replay results).

## Files

- `src/app.html`: the Stage 1 prototype (road graph, risk engine, traffic model, planner, trip screens) with hooks for v4.
- `src/features.js`, `src/features2.js`, `src/features.css`: v4 views (control room, proof), Leaflet map, open data builder, safety tab, sentence and voice entry, QR.
- `src/features3.js`: v5 data pack loader, offline forecast age, rain memory note, experimental trained model, share the app.
- `src/features4.js`: v6 my trips watch list, family SMS, where am I (GPS), fuel cost, official warning links.
- `android/`: Android wrapper (WebView, assets/index.html copied in by CI).
- `replay_source/gt.json`: closures named in news reports for 20 Aug 2025 and 9 Jul 2026, mapped to road links, plus two dry control days.
- `tools/basemap.json`: Natural Earth rivers, roads and Indian state lines clipped to the map area (made by `tools/clip_ne.py`).
- `tests/`: `matrix.js` (connectivity and 240 random trips per scenario), `textaudit.js` (house style on 88 screens), `features.js` (proof, control room, open data and sentence entry with mocked web replies), `smoke.js` (screenshots).
  `npm test` runs them all; `features2.js` covers shared reports between two simulated phones, NASA catalog history, threshold sensitivity and the road profile; `features3.js` covers the data pack, offline age, report outbox, sharing the app and the model matching Python. `npm run test:py` runs the Python tests.

## Licences

Leaflet (BSD 2-Clause), qrcode-generator (MIT), Natural Earth (public domain), OpenStreetMap data (ODbL) via OSRM, Open-Meteo data (CC BY 4.0), Copernicus GLO-90 DEM (free licence, credit Copernicus), NASA Global Landslide Catalog (NASA open data), ntfy.sh (public test channel for shared reports). Credits are shown in the app footer.

After a build, copy `dist/site/*` (including `.nojekyll`) and `dist/PahaadPath.html` to the repository root before committing.
