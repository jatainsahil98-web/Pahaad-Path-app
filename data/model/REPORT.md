# PahaadPath risk model v5: validation

Trained 2026-10-31 on 58766 hill stretch-days (1 June to 30 September, 2007 to 2017) with 147 stretch-days that had a landslide in the NASA catalog.

Scores rank stretch-days by how much they look like days with a reported landslide. The catalog only has landslides that made the news, so this is not a probability.

## Year by year (each year scored by a model that never saw it)

Area under the ROC curve: v5 0.81, v4 0.82 (0.5 is a coin toss).

| | v5 model | v4 rain threshold |
|---|---|---|
| Landslide days at Avoid | 13% | 8% |
| Landslide days at Caution or worse | 46% | 29% |
| Ordinary days at Avoid | 3% | 1% |
| Ordinary days at Caution or worse | 10% | 4% |

Set to flag as many ordinary days as v4 does at Caution (4%), v5 would catch 18% of landslide days and v4 catches 29%.

Set to flag as many ordinary days as v4 does at Avoid (1%), v5 would catch 3% of landslide days and v4 catches 8%.

**Verdict: v5 does not catch more landslide days than v4 at the same alarm rate, so the app keeps v4 as its default and offers v5 only as an experiment.**

Rain memory: a day whose own rain reaches Avoid keeps the stretch at Caution or worse for the next days (debris, wet slopes). Chosen by this check: 7 days.

| Memory days | Landslide days at Caution or worse | Ordinary days at Caution or worse |
|---|---|---|
| 0 | 46% | 10% |
| 3 | 46% | 11% |
| 5 | 48% | 11% |
| 7 | 50% | 12% |

| Year | Landslide days | v5 Avoid | v5 Caution or worse | v4 Avoid | v4 Caution or worse |
|---|---|---|---|---|---|
| 2009 | 2 | 1 | 2 | 0 | 1 |
| 2010 | 42 | 9 | 27 | 5 | 24 |
| 2011 | 10 | 0 | 2 | 0 | 0 |
| 2012 | 11 | 0 | 2 | 0 | 0 |
| 2013 | 46 | 6 | 18 | 3 | 9 |
| 2014 | 7 | 0 | 4 | 0 | 2 |
| 2015 | 18 | 1 | 6 | 0 | 1 |
| 2016 | 11 | 2 | 6 | 4 | 6 |

## Closure days from the news (2025 and 2026, never used in training)

| Day | Closed stretches | v5 Avoid | v5 Caution or worse | v5 other Avoid | v4 Avoid | v4 Caution or worse | v4 other Avoid |
|---|---|---|---|---|---|---|---|
| 2025-08-20 | 5 | 0 | 2 | 0 | 0 | 0 | 0 |
| 2026-07-09 | 4 | 1 | 2 | 1 | 0 | 1 | 0 |
| 2025-11-12 (dry control) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2025-12-10 (dry control) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Daily rain here is ERA5 reanalysis, which smooths out short cloudbursts, so these rows can differ from the hourly replay in the app.

## How often it would warn (2025 monsoon, 122 days by 44 stretches)

| | Go | Caution | Avoid |
|---|---|---|---|
| v5 | 92% | 7% | 1% |
| v5 without memory | 93% | 6% | 1% |
| v4 | 99% | 1% | 0% |

## Weights (raw feature units)

| Feature | Weight |
|---|---|
| log_r1 | 0.104 |
| log_r3 | 0.922 |
| log_a7 | 0.375 |
| log_a30 | 0.061 |
| slope | -0.034 |
| log_hist | 1.369 |
| intercept | -13.776 |

Features: log of 1 + rain on the day, the last 3 days, days 3 to 9 before and days 10 to 30 before (mm); slope is (75th percentile side slope in degrees minus 34) / 5; log of 1 + catalog landslides near the road.

Limits: the catalog ends in 2017 and only lists landslides that made the news; ERA5 rain is on a 9 to 25 km grid; closure records from the State Emergency Operations Centre or BRO would make a much better label set.
