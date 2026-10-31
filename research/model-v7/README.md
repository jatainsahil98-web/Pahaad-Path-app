# Model v7 research: can ML or a hybrid beat the rain-threshold engine?

Research only. Nothing here changes the app, the engine, the data pack or the workflows. The scripts read the repo's
data and code (`python/pahaadpath`) and print results; the outputs are in `results/`.

## Short answer

| Version | 2026 PWD closures (AUC) | Other years, NASA landslides 2009 to 2016 (AUC) | Verdict |
|---|---|---|---|
| Engine: Caine (1980) + GSI class (in the app) | 0.680 | 0.816 | Baseline |
| v6, trained on 2026 PWD (owner's `data/model/`) | wins (TSS 0.58 vs 0.04 at Caution) | loses (13% vs 37% caught at 10% of days) | Fits the season it learned from |
| Physics LR, trained on NASA only | 0.607 (loss) | 0.812 (tie) | |
| Blend, NASA only | 0.653 (loss) | 0.828 (tie; win at 25% of days) | |
| Pooled physics LR, both sources | 0.852 (win) | 0.720 (loss) | Same trade-off as v6 |
| **Pooled blend, both sources** | **0.705 (win)** | **0.798 (tie)** | **First to win on one source without losing on the other** |

**Pooled blend vs the engine** (95% interval, resampling weeks for 2026 and years for 2009 to 2016):
- 2026, WIN: AUC +0.024 [+0.020, +0.031]; caught at 10% of days +2.7 pts [+0.5, +6.1]; at 25% +3.5 pts [+1.3, +8.3].
- Other years, tie: AUC -0.018 [-0.065, +0.022]; at 10% -6.1 pts [-11.6, +1.7]; at 25% +0.0 [-11.2, +10.2].

The gate in HANDOFF.md asks a new model to win on both the 2026 season and other years. The pooled blend wins one and ties the other, so it does not pass yet. It is the first candidate that does not lose on either.

## What each model is

- **Physics-guided LR:** ridge-penalised logistic regression. Inputs:
  - rain as multiples of the Caine trigger depth for 24 h and 72 h;
  - two antecedent wetness indices: earlier days' rain decayed by 0.8 and 0.95 per day, over 30 days (a daily stand-in for a soil water index);
  - DEM slope, NASA landslide history, and the GSI mean, high share and mapped landslides.

  Rain and wetness weights may not be negative.
- **Blend:** the average of the engine's percentile and the model's percentile. Each percentile is taken against that method's own scores on the training folds only.
- **Pooled:** one model trained on both NASA landslides (2007 to 2017) and PWD closure starts (2026), with one intercept per source. The two sources are weighted equally. The intercept is constant within a fold, so it never changes the ranking inside a fold.
- **Hold-out:** each NASA year and each 2026 month (26 Jun to 31 Jul, August, September) is predicted by a model trained on every other fold. The same folds are used for every method. NASA history counts exclude the held-out year.
- **Labels:**
  - 2026: `backtest.labels(inventory, net, 'relaxed')`. A stretch-day is positive on the day its closure starts; days a stretch is already closed are left out, as in the owner's backtest.
  - NASA: `dataset.training_rows`.

## Data

- `data/train/era5_daily_2007_2017.json`: ERA5 daily rain, already in the repo.
- `rain_2026_daily.json` (new, 36 KB): ERA5 daily `precipitation_sum` for the 44 hill stretches, 1 May to 30 Sep 2026, IST days. Source: Open-Meteo archive API, CC BY 4.0. Made by `get_rain_2026.py` (standard library only).
- 2026 PWD closures: `inventory.json` from the `truth` branch.

## Caveats

- **2026 folds are months of the same season.** Weather and closures within a season are correlated, so 2026 scores are optimistic for every trained method. This is the same fold scheme as the owner's v6 backtest, so the comparison with v6 is fair. A true test is the 2027 monsoon.
- **Daily rain, not hourly.** The app's engine works hourly; here the engine is run on daily totals (`model.v4_score`). The engine's 2026 Caution TSS here (0.04) matches the owner's backtest.
- **Soil moisture is not used** (it needs the hourly Open-Meteo archive). The wetness indices stand in for it.
- **Many comparisons.** About 30 were run across these tests, so a single 95% win can be chance. The pooled blend's 2026 win holds on AUC and at two alarm levels, with intervals well clear of zero.

## How to run

Needs Python 3.12 with `numpy` and `scikit-learn` (research only; the pipeline itself stays standard library).
Every script takes `repo/python` and the repo root as its first two arguments.

```
cd python
git show origin/truth:inventory.json > /tmp/inventory.json
python ../research/model-v7/pooled.py "$PWD" .. ../research/model-v7/rain_2026_daily.json /tmp/inventory.json
python ../research/model-v7/blend_check.py "$PWD" ..
python ../research/model-v7/physics_guided.py "$PWD" .. /tmp/physics.json
```

| Script | What it tests | Output |
|---|---|---|
| `compare_models.py` | LR vs gradient boosting vs random forest vs engine, NASA years | `results/compare_models.txt` |
| `retrain_lr.py` | LR without 2026-only inputs, with and without GSI | `results/retrain_lr.txt` |
| `physics_guided.py` | physics-guided LR and blends, NASA years | `results/physics_guided.txt` |
| `blend_check.py` | blend year by year, blend weight 0.3 to 0.7, 2025 and 2026 closure days | `results/blend_check.txt` |
| `blend_2026.py` | NASA-only blend on the 2026 season | numbers repeated in `results/pooled.txt` |
| `pooled.py` | pooled model and blend, both sources, both tests | `results/pooled.txt` |

## Proposed next step (owner's decision)

Run the pooled blend in the backtest with the pipeline's hourly rain and soil moisture, the same gate and folds as v6. Keep it only if it wins on 2026 and does not lose on other years, or wins both. Engine, scoring and data pack are unchanged until then.
