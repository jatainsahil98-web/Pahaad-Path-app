# Backtest against PWD road closures

Season 2026-06-26 to 2026-09-03: 70 days, 118 PWD reports, 330 closures matched to PahaadPath stretches (relaxed matching).

| Thresholds | Cut-off | POD | FAR | CSI | TSS | Brier |
|---|---|---|---|---|---|---|
| Caine 1980 (in use) | Caution | 10% | 66% | 8% | 0.05 | 0.17 |
| Caine 1980 (in use) | Avoid | 1% | 70% | 1% | 0.00 |  |
| Fitted, 20% level | Caution | 98% | 78% | 22% | 0.05 | 0.47 |
| Fitted, 20% level | Avoid | 66% | 78% | 20% | 0.02 |  |

TSS at Caution for Caine: 95% interval -0.00 to 0.10.
Median warning lead time (Caine, Caution or worse before the closure): 0 h over 298 closures with a time.

Fitted thresholds are not in use: they did not beat Caine on held-out days by more than the interval.

Ground truth: Uttarakhand PWD SRMD closure reports. PWD names roads, not points, so matches to stretches are approximate. Rain: ERA5 hourly from Open-Meteo, the same source the Proof tab replays.
