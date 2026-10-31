# PahaadPath Python pipeline

Standard library only (Python 3.9 or newer), so it runs on a laptop, in CI or on an Android phone with Termux.
Run every command from this folder: `python -m pahaadpath <command>`.

| Command | What it does | Needs internet |
|---|---|---|
| `fetch-train` | Downloads daily ERA5 rain (Open-Meteo archive) at every hill stretch for 1 May to 30 September, 2007 to 2017, plus the 30 days before each news closure day and the 2025 monsoon. Paced under the free API limits and cached in `data/cache/`, so a stopped run resumes. Writes `data/train/`. | yes |
| `train` | Fits the v5 model, checks it year by year against the v4 rain threshold, scores the news closure days it never saw, and writes `data/model/model_v5.json` and `data/model/REPORT.md`. | no |
| `pack` | Downloads today's forecast for every stretch and writes the data pack (about 6 KB compressed) that phones fetch in a moment of signal. | yes |
| `advisory` | Prints every hill stretch at Caution or Avoid in the next 72 hours from the pack. `--pack pack.json` uses a saved copy with no signal. | only without `--pack` |
| `closures` | Roads closed in Uttarakhand PWD's latest road closure report (SRMD, morning and evening in the monsoon), as the data pack carries them. `--at 2026-09-30T20:00+05:30` reads an older report. Needs `pdftotext` (poppler-utils). | yes |
| `serve` | Road report sync server (sqlite). Phones queue reports offline and send the whole queue in one request when signal returns. Open the app with `?sync=https://your.server` to use it. | serves it |

`python -m unittest discover -s tests` checks that the Python engine reproduces the app's own scores on all 176 replay rows and that the sync server handles an offline queue.

## Where the code runs

- **GitHub Actions** `model.yml`: fetch and train on every change to `python/pahaadpath/` (this is where Open-Meteo is reachable), and commit the results.
- **GitHub Actions** `pack.yml`: the data pack every 3 hours, published at `https://raw.githubusercontent.com/jatainsahil98-web/Pahaad-Path-app/datapack/pack.json`.
- **The app** never needs Python. `tools/build.py` bakes the trained model into the single HTML file.

## Model v5 in one paragraph

Each hill stretch and day gets six numbers: rain on the day, rain over the last 3 days, rain 3 to 9 days before, rain 10 to 30 days before (all as log of 1 + mm), terrain slope beside the road (Copernicus DEM) and the count of NASA catalog landslides near it. A logistic regression is fitted on 1 June to 30 September 2007 to 2017, where a stretch-day is positive when a catalog landslide lies within its location accuracy (at least 3 km) of the road. The Caution and Avoid cut-offs are set so that 10% and 2.5% of ordinary monsoon stretch-days are flagged. Rain memory: when a day's own rain reached Avoid, the stretch stays at Caution or worse for a few days (debris and wet slopes); the number of days is chosen by the year-by-year check. Scores rank days; the catalog only lists landslides that made the news, so they are not probabilities. See `data/model/REPORT.md` for the numbers.
