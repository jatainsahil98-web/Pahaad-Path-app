# Backtest against PWD road closures

Season 2026-06-26 to 2026-09-30: 92 days, 174 PWD reports, 450 closures matched to PahaadPath stretches (relaxed matching).

| Thresholds | Cut-off | POD | FAR | CSI | TSS | Brier |
|---|---|---|---|---|---|---|
| Caine 1980 | Caution | 10% | 68% | 8% | 0.04 | 0.17 |
| Caine 1980 | Avoid | 1% | 70% | 1% | 0.00 |  |
| Fitted, 20% level (in use) | Caution | 92% | 74% | 25% | 0.16 | 0.34 |
| Fitted, 20% level (in use) | Avoid | 54% | 72% | 23% | 0.15 |  |

TSS at Caution for Caine: 95% interval -0.00 to 0.09.
Median warning lead time (Caine, Caution or worse before the closure): 0 h over 418 closures with a time.

Fitted thresholds are in use: they beat Caine on held-out days by more than the interval.

Ground truth: Uttarakhand PWD SRMD closure reports. PWD names roads, not points, so matches to stretches are approximate. Rain: ERA5 hourly from Open-Meteo, the same source the Proof tab replays.

Susceptibility class: TSS at Caution 0.037547989351268046 with the DEM slope class, 0.07973938629676335 with the GSI NLSM class; the engine uses the GSI class.

# Model v6: more than rain

Stretch-days 2026-06-26 to 2026-09-30, 450 PWD closures (relaxed match). Cut-offs flag the same share of ordinary days as the current engine.

| | Closures warned (Caution) | Precision (Caution) | TSS (Caution) | Closures warned (Avoid) | Precision (Avoid) |
|---|---|---|---|---|---|
| Current engine (Caine) | 10% | 32% | 0.04 | 1% | 30% |
| v6: rain + static + gsi + soil + season | 69% | 65% | 0.58 | 16% | 72% |

Parameter groups, added one at a time on held-out folds (kept when TSS rises by 0.01 or more):

| Groups | TSS (Caution) | Precision (Caution) | Kept |
|---|---|---|---|
| rain + static | 0.26 | 58% | yes |
| rain + static + gsi | 0.53 | 71% | yes |
| rain + static + gsi + soil | 0.56 | 70% | yes |
| rain + static + gsi + soil + season | 0.58 | 65% | yes |
| rain + static + gsi + soil + season + peak | 0.59 | 66% | no |
| rain + static + gsi + soil + season + cold | 0.58 | 65% | no |
| rain + static + gsi + soil + season + quake | 0.57 | 63% | no |

v6 is in use for the data pack and phone alerts: its TSS 0.58 is above the top of the current engine's 95% range (-0.00 to 0.09).
