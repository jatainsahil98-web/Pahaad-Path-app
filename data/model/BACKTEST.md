# Backtest against PWD road closures

Season 2026-06-26 to 2026-09-03: 64 days, 118 PWD reports, 330 closures matched to PahaadPath stretches (relaxed matching).

| Thresholds | Cut-off | POD | FAR | CSI | TSS | Brier |
|---|---|---|---|---|---|---|
| Caine 1980 (in use) | Caution | 10% | 66% | 8% | 0.04 | 0.18 |
| Caine 1980 (in use) | Avoid | 1% | 70% | 1% | 0.00 |  |
| Fitted, 20% level | Caution | 95% | 77% | 23% | 0.04 | 0.44 |
| Fitted, 20% level | Avoid | 65% | 76% | 22% | 0.06 |  |

TSS at Caution for Caine: 95% interval -0.01 to 0.10.
Median warning lead time (Caine, Caution or worse before the closure): 0 h over 298 closures with a time.

Fitted thresholds are not in use: they did not beat Caine on held-out days by more than the interval.

Ground truth: Uttarakhand PWD SRMD closure reports. PWD names roads, not points, so matches to stretches are approximate. Rain: ERA5 hourly from Open-Meteo, the same source the Proof tab replays.

Susceptibility class: TSS at Caution 0.043035125793746486 with the DEM slope class, 0.09025801784422474 with the GSI NLSM class; the engine uses the GSI class.

# Model v6: more than rain

Stretch-days 2026-06-26 to 2026-09-03, 330 PWD closures (relaxed match). Cut-offs flag the same share of ordinary days as the current engine.

| | Closures warned (Caution) | Precision (Caution) | TSS (Caution) | Closures warned (Avoid) | Precision (Avoid) |
|---|---|---|---|---|---|
| Current engine (Caine) | 10% | 34% | 0.04 | 1% | 30% |
| v6: rain + static + history + gsi + soil | 73% | 84% | 0.69 | 64% | 86% |

Parameter groups, added one at a time on held-out folds (kept when TSS rises by 0.01 or more):

| Groups | TSS (Caution) | Precision (Caution) | Kept |
|---|---|---|---|
| rain + static | 0.28 | 76% | yes |
| rain + static + history | 0.64 | 87% | yes |
| rain + static + history + gsi | 0.67 | 84% | yes |
| rain + static + history + gsi + soil | 0.69 | 84% | yes |
| rain + static + history + gsi + soil + cold | 0.69 | 84% | no |
| rain + static + history + gsi + soil + peak | 0.68 | 82% | no |
| rain + static + history + gsi + soil + season | 0.66 | 85% | no |
| rain + static + history + gsi + soil + quake | 0.69 | 84% | no |

v6 is in use for the data pack and phone alerts: its TSS 0.69 is above the top of the current engine's 95% range (-0.01 to 0.10).
