"""Rainfall thresholds fitted to Uttarakhand closures (roadmap 1.1).

For every closure that names a PahaadPath stretch, the hourly ERA5 rain at that stretch is cut into rainfall events
(wet hours joined across dry gaps shorter than DRY_H), and the event that was running when the road closed gives one
point: cumulated rain E (mm) and duration D (h). The points are fitted with the frequentist method of Brunetti et al.
(2010) and Peruccacci et al. (2012): log E against log D by least squares, a Gaussian kernel density of the residuals,
and the threshold E = alpha * D^gamma read at an exceedance level (1, 5, 10 or 20 per cent of closures fall below it).
Uncertainty comes from bootstrap resampling. One curve per zone (the stretch's slope class until GSI susceptibility
arrives) when a zone has at least MIN_EVENTS closures, otherwise the pooled curve.

The level is not taken by convention: each one is scored on stretch-days (backtest.py) and the one with the best true
skill statistic is kept. The app only switches from Caine (1980) to these curves when the backtest says they do better
(`adopted`), so a thin or noisy season can never make the warnings worse.

Standard library only, like the rest of the pipeline."""
import math
import random

DRY_H = 48          # dry gap that ends a rainfall event in the monsoon
WET_MM = 0.2        # an hour with at least this much rain is wet
MIN_EVENTS = 30     # closures a zone needs for its own curve
LEVELS = (1, 5, 10, 20)


def events(series, dry_h=DRY_H, wet=WET_MM):
    """rainfall events as (first wet hour, last wet hour) index pairs"""
    out, start, last = [], None, None
    for i, v in enumerate(series):
        if v is not None and v >= wet:
            if start is None or i - last > dry_h:
                if start is not None:
                    out.append((start, last))
                start = i
            last = i
    if start is not None:
        out.append((start, last))
    return out


def event_at(series, i, dry_h=DRY_H, wet=WET_MM):
    """(E mm, D h) of the event running at hour i, or one that ended less than a day before; None if it was dry"""
    for a, b in events(series[:i + 1], dry_h, wet):
        if a <= i and i - b <= 24:
            e = sum(v or 0 for v in series[a:min(b, i) + 1])
            return (e, min(b, i) - a + 1) if e > 0 else None
    return None


def _silverman(x):
    n = len(x)
    m = sum(x) / n
    sd = math.sqrt(sum((v - m) ** 2 for v in x) / max(1, n - 1)) or 1e-3
    return 1.06 * sd * n ** -0.2


def kde_quantile(x, p):
    """the p quantile (0..1) of a Gaussian kernel density over x"""
    h = _silverman(x)
    lo, hi = min(x) - 4 * h, max(x) + 4 * h

    def cdf(t):
        return sum(0.5 * (1 + math.erf((t - v) / (h * math.sqrt(2)))) for v in x) / len(x)
    for _ in range(60):  # bisection
        mid = (lo + hi) / 2
        if cdf(mid) < p:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def fit_ed(points, levels=LEVELS):
    """least squares of log10 E on log10 D, then each level's shift of the line from the residual density"""
    xs = [math.log10(d) for e, d in points]
    ys = [math.log10(e) for e, d in points]
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    gamma = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx if sxx > 0 else 0.0
    icpt = my - gamma * mx
    res = [y - (icpt + gamma * x) for x, y in zip(xs, ys)]
    return {'n': n, 'gamma': gamma, 'alpha': {str(p): 10 ** (icpt + kde_quantile(res, p / 100)) for p in levels}}


def bootstrap(points, level, reps=500, seed=7):
    """spread (standard deviation) of alpha and gamma at one level over resampled points"""
    rnd = random.Random(seed)
    al, ga = [], []
    for _ in range(reps):
        s = [points[rnd.randrange(len(points))] for _ in points]
        if len({d for e, d in s}) < 2:
            continue
        f = fit_ed(s, (level,))
        al.append(f['alpha'][str(level)])
        ga.append(f['gamma'])

    def sd(v):
        m = sum(v) / len(v)
        return math.sqrt(sum((x - m) ** 2 for x in v) / max(1, len(v) - 1))
    return {'alpha_sd': sd(al), 'gamma_sd': sd(ga)} if al else None


def closure_points(net, rain, start, labels):
    """(zone, E, D) for every labelled closure with a time; rain[key] is hourly from 00:00 IST on `start`"""
    import datetime as dt
    t0 = dt.datetime.fromisoformat(start + 'T00:00')
    out = []
    for (lid, day), at in labels.items():
        link = net.links.get(lid)
        if not link or link['plain'] or link['key'] not in rain:
            continue
        when = dt.datetime.fromisoformat(at) if at and 'T' in at else dt.datetime.fromisoformat(day + 'T12:00')
        i = int((when - t0).total_seconds() // 3600)
        ser = rain[link['key']]
        if not 0 <= i < len(ser):
            continue
        ev = event_at(ser, i)
        if ev and ev[1] >= 1:
            out.append((str(link['susc']), ev[0], ev[1]))
    return out


def fit_zones(points, levels=LEVELS):
    """a curve per zone with enough closures, and the pooled curve; None when there are too few closures at all"""
    if len(points) < MIN_EVENTS:
        return None
    pooled = fit_ed([(e, d) for z, e, d in points], levels)
    zones = {}
    for z in sorted({z for z, e, d in points}):
        pz = [(e, d) for zz, e, d in points if zz == z]
        if len(pz) >= MIN_EVENTS:
            zones[z] = fit_ed(pz, levels)
    return {'pooled': pooled, 'zones': zones}


def at_level(fits, level):
    """the threshold set the engine takes (engine.ed_threshold) at one exceedance level"""
    pick = lambda f: {'alpha': f['alpha'][str(level)], 'gamma': f['gamma'], 'n': f['n']}
    return {'level': level, 'pooled': pick(fits['pooled']), 'zones': {z: pick(f) for z, f in fits['zones'].items()}}
