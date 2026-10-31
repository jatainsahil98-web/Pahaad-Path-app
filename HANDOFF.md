# PahaadPath: handoff for a new collaborator (and their Claude)

Read this first, then README.md. It says what exists, how it fits together, what was decided and why, and what is open.
State as of 31 Oct 2026.

## 1. Get started

```bash
git clone https://github.com/jatainsahil98-web/Pahaad-Path-app.git
cd Pahaad-Path-app
npm ci                      # Node 20
npm run build               # dist/PahaadPath.html (single file) and dist/site/
npm test                    # 11 Playwright suites; all must pass
npm run dev                 # local dev server
cd python && python3 -m unittest discover -s tests     # pipeline tests (standard library only)
```

Live app: https://jatainsahil98-web.github.io/Pahaad-Path-app/ ·
APK: https://github.com/jatainsahil98-web/Pahaad-Path-app/releases/download/android-latest/PahaadPath.apk

## 2. How it fits together

| Part | Where | What it does |
|---|---|---|
| App | `src/app/core.js` + `src/features*.js` + `src/shell.js` (spliced into one scope at build), `src/*.css` | Offline single-file PWA. Routing, risk engine, traffic, daylight and halt rules, map-first UI |
| Build | `vite.config.mjs` | Bakes data into the app through `/*__NAME__*/null` placeholders (MODEL, THRESH, GSI, BACKTEST, INDEP, …) |
| Android | `android/` | WebView wrapper, `PPAndroid` bridge (share, WhatsApp, speech, TTS, files), `WatchWorker` background trip alerts |
| Pipeline | `python/pahaadpath/` | Data pack, closure collector, backtest, model v6, check on other years |
| Reports API | `server/` | FastAPI, ECDSA-signed road reports, officer verification (not hosted yet) |
| Data | `data/` | Open data, GSI layer (`gsi_uttarakhand.json`), model outputs (`data/model/`) |

Branches: `main` (code), `truth` (PWD closure inventory, written by CI), `datapack` (`pack.json`, written by CI).

## 3. Automations (.github/workflows)

| Workflow | When | Output |
|---|---|---|
| test | every push / PR | build + all tests |
| android apk | every push | signed APK on release `android-latest` (keystore in Actions secrets only) |
| data pack | every few hours | `pack.json` on `datapack`: rain, NDMA alerts, PWD closures, `risk24`, `v6` day scores (today + 7 days) |
| closure inventory | 05:43 and 12:43 UTC daily | reads new PWD SRMD reports → `truth/inventory.json` |
| backtest | after each inventory run, weekly | `data/model/backtest.json`, `thresholds.json`, `model_v6.json`, `BACKTEST.md`, rebuilds app on main |
| independent check | after backtest, monthly | `data/model/independent.json`, `INDEPENDENT.md` (other years, NASA catalogues) |

Bots commit to `main`. **Never push directly to main; use a branch and a PR.** Never commit the root build files
(`index.html`, `PahaadPath.html`, `sw.js`, `manifest.webmanifest`); CI and bots rebuild them.

## 4. Risk models and the evidence

The gate (agreed with the owner): a new model or threshold is switched on only if it beats the current engine on
held-out data by more than the current engine's 95 % interval.

**2026 PWD season** (26 Jun to 30 Sep, 174 reports, 450 closures matched to hill stretches; folds by month):

| | Closures warned (Caution) | Caution warnings correct | TSS |
|---|---|---|---|
| Caine 1980 threshold (old engine) | 10 % | 32 % | 0.04 |
| Fitted thresholds (20 % level) | 92 % | 26 % | 0.16 |
| **Model v6** (rain, slope + past landslides, past PWD closures, soil moisture) | **81 %** | **70 %** | **0.71** |

GSI susceptibility class in place of DEM slope class: old engine TSS 0.04 → 0.08, so GSI class is used.
Groups tested and dropped from v6: cloudburst intensity, 92-day rain, freeze-thaw, earthquakes (GSI group: borderline).

**Check on other years** (2014 to 2018, 68 NASA-catalogued landslides near hill roads; neither method fitted on them):

| | Caught at Caution | Days at Caution | Caught when both flag 10 % of days | 25 % of days |
|---|---|---|---|---|
| Old engine (Caine + GSI) | 22 % | 7 % | **25 %** | **50 %** |
| Model v6 | 49 % | 33 % | 18 % | 37 % |

**Open concern:** v6 over-warns in other years and loses at equal alarm rate. Likely cause: the "past PWD closures"
input describes 2026 only. Proposed next step (awaiting owner's decision): retrain v6 without 2026-only inputs, keep
it only if it wins on both the 2026 season and 2014 to 2018.

**What the app does now:** the trip screen, best time to leave and halts use v6 day scores from the data pack on live
or saved forecasts; with no pack (replays, offline over 10 days) it falls back to Caine with the GSI class.
Phone alerts (WatchWorker) use `risk24` from the pack.

## 5. Data sources and limits

- PWD Uttarakhand SRMD daily closure reports: only 2026 is online; the 2025 listing was removed (not in web archive).
- GSI NLSM susceptibility (1:50,000) and GSI landslide inventory (5,523 Uttarakhand points, no dates): read via the
  National Geoscience Data Repository map services (geodataindia.gov.in, needs a login in a browser).
- NASA COOLR / GLC: `https://gis.earthdata.nasa.gov/portal/rest/services/Landslides/COOLR_Reports_Points/FeatureServer/0`
  (moved under /portal/ in 2026). No Uttarakhand events after 2018.
- ERA5 rain, soil moisture, temperature (Open-Meteo archive); forecasts (Open-Meteo); NDMA Sachet alerts; USGS quakes.
- Open-Meteo free tier: about 5,000 weighted calls per hour; the pipeline paces and caches (`data/cache`, Actions cache).

## 6. Left to implement (in priority order)

The frontend is done; all further work goes into this same app (no rewrite, no second app).

1. **Model v6 credibility (decision pending with the owner).** v6 wins on the 2026 PWD season but loses to the old
   engine at equal alarm rate on 2014 to 2018. Proposed: retrain v6 without 2026-only inputs (the "past PWD closures"
   group), test on both the 2026 season and 2014 to 2018 (`python -m pahaadpath backtest`, `independent`), keep it only
   if it wins both; otherwise the trip screen returns to Caine + GSI. Do not change what the trip screen shows until
   the owner decides.
2. **Wider check on other years:** run the independent check on 2007 to 2013 as well
   (`python -m pahaadpath independent --first 2007 --until 2018`), for more events than 68.
3. **Background trip alerts on a real device:** save a trip on Android, allow notifications, confirm the WorkManager
   check (every 3 h) fires and the notification opens the app. Fix anything found in `android/.../WatchWorker.java`.
4. **Road reports API hosting:** deploy `server/` (Dockerfile ready) on an India-region host, set the app's API
   address (`API_DEFAULT` in `src/features2.js`), create officer tokens (`PYTHONPATH=python:server python -m pahaadpath_api add-officer --name ... --role district_officer`).
5. **Control room uses v6:** show the v6 day score next to the rain-threshold score per stretch (data is in the pack).
6. **PWD alternative routes:** PWD publishes "alternative routes in case of frequent road closures"
   (PDF on pwd.uk.gov.in/srmd-reports/); parse it and suggest the alternative when a stretch is closed.
7. **More ground truth:** SEOC / USDMA daily disaster reports and BRO road status (not obtained yet); keep the
   closure collector running so the 2027 monsoon becomes a true held-out season.
8. **Blocked on external access:** Firebase push (`google-services.json` not provided), IMD API (needs IP
   whitelisting).
9. **CI upkeep:** GitHub warns that actions on Node 20 are deprecated and `ubuntu-latest` moves to Ubuntu 26;
   bump action versions (checkout, setup-node, setup-python, cache) and confirm all workflows still pass.

## 7. Working conventions

- Small PRs from branches; describe what changed and why; all tests green.
- Do not touch the risk engine, scoring, data pack format or workflows without agreeing with the owner first.
- Never commit secrets (signing keystore and passwords live only in Actions secrets).
- Report numbers from `data/model/*.json` rather than restating them by hand.
