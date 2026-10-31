# Backtest against PWD road closures

Season 2026-06-26 to 2026-09-03: 70 days, 118 PWD reports, 330 closures matched to PahaadPath stretches (relaxed matching).

| Thresholds | Cut-off | POD | FAR | CSI | TSS | Brier |
|---|---|---|---|---|---|---|
| Caine 1980 (in use) | Caution | 10% | 66% | 8% | 0.05 | 0.17 |
| Caine 1980 (in use) | Avoid | 1% | 70% | 1% | 0.00 |  |
| Fitted, 20% level | Caution | 95% | 78% | 22% | 0.05 | 0.44 |
| Fitted, 20% level | Avoid | 65% | 77% | 21% | 0.08 |  |

TSS at Caution for Caine: 95% interval -0.00 to 0.10.
Median warning lead time (Caine, Caution or worse before the closure): 0 h over 298 closures with a time.

Fitted thresholds are not in use: they did not beat Caine on held-out days by more than the interval.

Ground truth: Uttarakhand PWD SRMD closure reports. PWD names roads, not points, so matches to stretches are approximate. Rain: ERA5 hourly from Open-Meteo, the same source the Proof tab replays.

# Model v6: more than rain

Stretch-days 2026-06-26 to 2026-09-03, 330 PWD closures (relaxed match). Cut-offs flag the same share of ordinary days as the current engine.

| | Closures warned (Caution) | Precision (Caution) | TSS (Caution) | Closures warned (Avoid) | Precision (Avoid) |
|---|---|---|---|---|---|
| Current engine (Caine) | 10% | 34% | 0.05 | 1% | 30% |
| v6: rain + static + history | 66% | 84% | 0.63 | 58% | 93% |

Parameter groups, added one at a time on held-out folds (kept when TSS rises by 0.01 or more):

| Groups | TSS (Caution) | Precision (Caution) | Kept |
|---|---|---|---|
| rain + static | 0.24 | 75% | yes |
| rain + static + history | 0.63 | 84% | yes |
| rain + static + history + soil | 0.63 | 84% | no |
| rain + static + history + peak | 0.62 | 88% | no |
| rain + static + history + season | 0.61 | 91% | no |
| rain + static + history + cold | 0.63 | 84% | no |
| rain + static + history + quake | 0.62 | 84% | no |

v6 is in use for the data pack and phone alerts: its TSS 0.63 is above the top of the current engine's 95% range (-0.00 to 0.10).
