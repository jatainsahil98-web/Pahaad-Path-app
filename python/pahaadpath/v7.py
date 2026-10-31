"""Risk model v7: one model learned from several monsoons, checked one season at a time.

Why: v6 was learned from the 2026 PWD season alone. It scored well there but on other years (NASA catalogues) it
caught fewer landslides than the rain-threshold engine at the same share of days flagged. v7 learns from every season
with ground truth together, so what it learns has to hold across years:
  NASA catalogued landslides near the hill roads (Global Landslide Catalog / COOLR), monsoons 2010 to 2015
  PWD SRMD road closures, monsoon 2026
Inputs exist for every year (ERA5 rain and soil moisture, GSI susceptibility and GSI-mapped landslides, DEM slope).
Nothing that only exists for some years: no past PWD closures, no NASA catalogue counts (they are also the labels).

Models tried (scikit-learn):
  logit  logistic regression on standardised inputs
  hgb    gradient-boosted trees (HistGradientBoostingClassifier), rain inputs constrained to only raise risk
Each season counts equally (sample weights), so 450 PWD closures do not drown 126 NASA landslides.

Check: leave one season out; each method ranks that season's stretch-days; compared with the engine at the same
share of days flagged (10 % and 25 %), pooled over the NASA seasons and separately on the PWD season. v7 is
`adopted` only when the better of the two models catches at least as many as the engine on BOTH, at BOTH shares.
The final model is then fitted on every season; Caution and Avoid flag 10 % and 3 % of ordinary stretch-days."""
import datetime as dt
import math
import os
import pickle

from . import path, v6
from .backtest import closed_days, labels, score_rows
from .independent import at_rate, days_of, season_labels

FEATURES = ['log_p24', 'log_p72', 'log_a7', 'log_a30', 'log_i1', 'log_i3', 'sm0', 'sm1', 'sm2', 'log_r92',
            'gsi_mean', 'gsi_high100', 'log_gsi_ls1k', 'slope']
RAIN = {'log_p24', 'log_p72', 'log_a7', 'log_a30', 'log_i1', 'log_i3', 'log_r92'}
CAUTION_RATE, AVOID_RATE = 0.10, 0.03
RATES = (0.10, 0.25)
NASA_SEASONS = (2010, 2011, 2012, 2013, 2015)


def season_rows(net_v6, net_engine, vars_, start, days, lab, skip):
    """(X rows, y, engine scores, keys) for every hill stretch and day, leaving out `skip`"""
    t0 = dt.datetime.fromisoformat(start + 'T00:00') - dt.timedelta(hours=5, minutes=30)
    t0_utc = t0.replace(tzinfo=dt.timezone.utc).timestamp()
    eng = {(lid, day): s for lid, day, s, h in score_rows(net_engine, vars_['precipitation'], start, days)}
    X, y, e, keys = [], [], [], []
    for day in days:
        i0 = (dt.date.fromisoformat(day) - dt.date.fromisoformat(start)).days * 24
        for l in net_v6.hill():
            k = (l['id'], day)
            if k in skip or l['key'] not in vars_['precipitation']:
                continue
            f = v6.day_features(l, vars_, i0, 0, None, t0_utc)
            X.append([f[n] for n in FEATURES])
            y.append(1 if k in lab else 0)
            e.append(eng.get(k, 0))
            keys.append(k)
    return X, y, e, keys


STACK = ['log_a30', 'sm0', 'sm1', 'gsi_high100', 'log_gsi_ls1k']


def design(kind, X, e):
    """inputs per method: 'stack' starts from the engine score and adds a few slow-changing corrections"""
    if kind == 'stack':
        idx = [FEATURES.index(n) for n in STACK]
        return [[s / 100.0] + [x[i] for i in idx] for x, s in zip(X, e)]
    return X


def make(kind):
    from sklearn.ensemble import HistGradientBoostingClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    if kind == 'logit':
        return make_pipeline(StandardScaler(), LogisticRegression(C=0.5, max_iter=2000))
    if kind == 'stack':
        return make_pipeline(StandardScaler(), LogisticRegression(C=0.05, max_iter=2000))
    return HistGradientBoostingClassifier(max_iter=250, learning_rate=0.05, max_leaf_nodes=15, min_samples_leaf=80,
                                          l2_regularization=1.0, monotonic_cst=[1 if n in RAIN else 0 for n in FEATURES],
                                          random_state=7)


def fit(m, kind, X, y, sw):
    import numpy as np
    if kind in ('logit', 'stack'):
        m.fit(np.array(X), np.array(y), logisticregression__sample_weight=np.array(sw))
    else:
        m.fit(np.array(X), np.array(y), sample_weight=np.array(sw))


def weights(seasons, y):
    """each season weighs the same in total; positives and negatives balanced inside a season"""
    w = [None] * len(y)
    by = {}
    for i, (s, yy) in enumerate(zip(seasons, y)):
        by.setdefault((s, yy), []).append(i)
    n_seasons = len({s for s in seasons})
    for (s, yy), idx in by.items():
        for i in idx:
            w[i] = 1.0 / (2 * n_seasons * len(idx))
    tot = sum(w)
    return [x * len(w) / tot for x in w]


def logodds(p):
    p = min(max(p, 1e-9), 1 - 1e-9)
    return math.log(p / (1 - p))


def cuts_from(z_neg):
    s = sorted(z_neg)
    q = lambda r: s[min(len(s) - 1, int(round((1 - r) * len(s))))]
    zc, za = q(CAUTION_RATE), q(AVOID_RATE)
    return {'zc': zc, 'za': max(za, zc + 1e-6), 'z0': s[len(s) // 2], 'zspan': 1.0}


def to_score(z, c):
    if z < c['zc']:
        s = 34 * min(1, max(0, (z - c['z0']) / ((c['zc'] - c['z0']) or 1)))
    elif z < c['za']:
        s = 35 + 29 * (z - c['zc']) / ((c['za'] - c['zc']) or 1)
    else:
        s = 65 + 35 * min(1, (z - c['za']) / c['zspan'])
    return int(math.floor(s + .5))


def qrank(v):
    """scores to their rank in 0..1 (ties broken by position), so every method flags exactly the same share"""
    order = sorted(range(len(v)), key=lambda i: v[i])
    q = [0.0] * len(v)
    for r, i in enumerate(order):
        q[i] = r / max(1, len(v) - 1)
    return q


def ranks(scores, y, rate):
    rows = [(i, 'd', s, 0) for i, s in enumerate(qrank(scores))]
    lab = {(i, 'd') for i, t in enumerate(y) if t}
    return at_rate(rows, lab, set(), rate)


def run(data, log=print):
    """data: {season: (X, y, engine, keys, source)} with source 'nasa' or 'pwd'"""
    import numpy as np
    seasons = sorted(data)
    out = {'seasons': {str(s): {'source': data[s][4], 'days': len(data[s][1]), 'events': sum(data[s][1])} for s in seasons},
           'features': FEATURES, 'models': {}}
    held = {k: {} for k in ('logit', 'hgb', 'stack')}
    for kind in held:
        for s in seasons:
            tr = [t for t in seasons if t != s]
            X = [x for t in tr for x in design(kind, data[t][0], data[t][2])]
            y = [v for t in tr for v in data[t][1]]
            sw = weights([t for t in tr for _ in data[t][1]], y)
            m = make(kind)
            fit(m, kind, X, y, sw)
            held[kind][s] = list(m.predict_proba(np.array(design(kind, data[s][0], data[s][2])))[:, 1])
            log('v7 %s: season %s held out' % (kind, s))

    def pooled(src, scores_of):
        sc, yy = [], []
        for s in seasons:
            if data[s][4] != src:
                continue
            # ranks are compared within each season: scale to the season's own quantiles
            sc += qrank(scores_of(s))
            yy += data[s][1]
        return {('%d' % round(r * 100)): ranks(sc, yy, r) for r in RATES} if yy else None

    # blend: average rank of the engine and the logistic model inside each season
    held['blend'] = {s: [a + b for a, b in zip(qrank(data[s][2]), qrank(held['logit'][s]))] for s in seasons}
    res = {'engine': {src: pooled(src, lambda s: data[s][2]) for src in ('nasa', 'pwd')}}
    for kind in held:
        res[kind] = {src: pooled(src, lambda s, k=kind: held[k][s]) for src in ('nasa', 'pwd')}
    out['check'] = res
    for s in seasons:  # per season, at 10 %
        out['seasons'][str(s)].update({k: ranks(held[k][s], data[s][1], .10) for k in held})
        out['seasons'][str(s)]['engine'] = ranks(data[s][2], data[s][1], .10)

    def wins(kind):
        for src in ('nasa', 'pwd'):
            e, m = res['engine'][src], res[kind][src]
            if not e or not m:
                return False
            if any(m[r] is None or e[r] is None or m[r] < e[r] for r in e):
                return False
        return True
    ok = [k for k in held if wins(k)]
    best = max(held, key=lambda k: sum((res[k][src] or {}).get('10', 0) or 0 for src in ('nasa', 'pwd')))
    out['best'] = best
    out['adopted'] = bool(ok)
    kind = max(ok or list(held), key=lambda k: sum((res[k][src] or {}).get('10', 0) or 0 for src in ('nasa', 'pwd')))
    # final model on every season
    if kind == 'blend':  # deployable form not built: blends are reported, the logistic model is kept
        kind = 'logit'
        out['adopted'] = False
    X = [x for s in seasons for x in design(kind, data[s][0], data[s][2])]
    y = [v for s in seasons for v in data[s][1]]
    sw = weights([s for s in seasons for _ in data[s][1]], y)
    m = make(kind)
    fit(m, kind, X, y, sw)
    p = m.predict_proba(np.array(X))[:, 1]
    cuts = cuts_from([logodds(v) for v, t in zip(p, y) if not t])
    out['model'] = {'kind': kind, 'cuts': cuts}
    return out, m


def save(out, m):
    with open(path('data', 'model', 'model_v7.pkl'), 'wb') as f:
        pickle.dump({'model': m, 'features': FEATURES, 'cuts': out['model']['cuts'], 'kind': out['model']['kind'],
                     'adopted': out['adopted']}, f)


def load():
    p = path('data', 'model', 'model_v7.pkl')
    if not os.path.exists(p):
        return None
    try:
        with open(p, 'rb') as f:
            return pickle.load(f)
    except Exception:  # noqa: BLE001 - a model from another scikit-learn version: treat as absent
        return None


def score_now(M, net, vars_, start, i0):
    """{stretch: [score, band, 0]} for the day starting at hour i0, like v6.score_now"""
    import numpy as np
    t0 = dt.datetime.fromisoformat(start + 'T00:00') - dt.timedelta(hours=5, minutes=30)
    t0_utc = t0.replace(tzinfo=dt.timezone.utc).timestamp()
    ids, X = [], []
    for l in net.hill():
        if l['key'] not in vars_['precipitation']:
            continue
        f = v6.day_features(l, vars_, i0, 0, None, t0_utc)
        ids.append(l['id'])
        X.append([f[n] for n in M['features']])
    if M['kind'] == 'stack':  # the engine's own score for the day (GSI class, as the app uses), then the corrections
        from .engine import PAST, SERIES_LEN, seg_score
        from .network import Network
        from . import read_json
        try:
            susc = read_json('data', 'model', 'thresholds.json').get('susc') or 'slope'
        except Exception:  # noqa: BLE001
            susc = 'slope'
        ne = Network(susc=susc)
        e = []
        for lid in ids:
            l = ne.links[lid]
            raw = vars_['precipitation'][l['key']]
            ser = [(raw[j] or 0) if 0 <= j < len(raw) else 0 for j in range(i0 - PAST, i0 - PAST + SERIES_LEN)]
            e.append(max(seg_score(l, ser, a)['score'] for a in range(24)))
        X = design('stack', X, e)
    p = M['model'].predict_proba(np.array(X))[:, 1]
    out = {}
    for lid, v in zip(ids, p):
        s = to_score(logodds(v), M['cuts'])
        out[lid] = [s, 0 if s < 35 else 1 if s < 65 else 2, 0]
    return out


def build(net_v6, net_engine, fetch_vars, inv, coolr, log=print):
    """every season's rows: NASA seasons from the catalogues, the PWD season from the closure inventory"""
    from .independent import catalog_events
    data = {}
    labs = season_labels(net_v6, catalog_events(net_v6, coolr))
    for y in NASA_SEASONS:
        lab = labs.get(y, set())
        if len(lab) < 3:
            continue
        skip = {(lid, (dt.date.fromisoformat(d) + dt.timedelta(days=k)).isoformat()) for lid, d in lab for k in (-1, 1)} - lab
        start = (dt.date(y, 6, 1) - dt.timedelta(days=v6.LEAD_DAYS + 1)).isoformat()
        vars_ = fetch_vars(net_v6.keys(hill_only=True), start, '%d-09-30' % y)
        X, yy, e, k = season_rows(net_v6, net_engine, vars_, start, days_of(y), lab, skip)
        data[y] = (X, yy, e, k, 'nasa')
        log('v7 data: %d NASA season, %d stretch-days, %d with a landslide' % (y, len(yy), sum(yy)))
    if inv and inv.get('reports'):
        covered = sorted({r['date'] for r in inv['reports']})
        first, last = covered[0], min(covered[-1], (dt.date.today() - dt.timedelta(days=6)).isoformat())
        start = (dt.date.fromisoformat(first) - dt.timedelta(days=v6.LEAD_DAYS + 1)).isoformat()
        vars_ = fetch_vars(net_v6.keys(hill_only=True), start, last)
        days = [d for d in covered if d <= last]
        lab = {k for k in labels(inv, net_v6, 'relaxed') if k[1] in set(days)}
        skip = closed_days(inv, net_v6, 'relaxed')
        X, yy, e, k = season_rows(net_v6, net_engine, vars_, start, days, lab, skip)
        yr = int(first[:4])
        data[yr] = (X, yy, e, k, 'pwd')
        log('v7 data: %d PWD season, %d stretch-days, %d with a closure' % (yr, len(yy), sum(yy)))
    return data


def report_md(o):
    p = lambda v: '-' if v is None else '%d%%' % round(v * 100)
    L = ['# Model v7: learned from several monsoons', '',
         'Seasons: ' + ', '.join('%s (%s, %d events)' % (s, v['source'].upper(), v['events']) for s, v in o['seasons'].items()) + '.',
         'Each season held out in turn. Share of reported landslides / closures caught when each method flags the same share of stretch-days:', '',
         '| Method | NASA years, 10% of days | NASA years, 25% | PWD 2026, 10% | PWD 2026, 25% |', '|---|---|---|---|---|']
    names = {'engine': 'Rain threshold engine (Caine, GSI)', 'logit': 'v7 logistic regression', 'hgb': 'v7 gradient-boosted trees',
             'stack': 'Engine + small corrections (soil, 30-day rain, GSI)', 'blend': 'Average of engine and v7 logistic'}
    for k in ('engine', 'logit', 'hgb', 'stack', 'blend'):
        c = o['check'][k]
        L.append('| %s | %s | %s | %s | %s |' % (names[k], p((c['nasa'] or {}).get('10')), p((c['nasa'] or {}).get('25')),
                                                p((c['pwd'] or {}).get('10')), p((c['pwd'] or {}).get('25'))))
    L += ['', 'Per season at 10% of days flagged:', '', '| Season | Engine | v7 logistic | v7 trees | Engine + corrections | Average |', '|---|---|---|---|---|---|']
    for s, v in o['seasons'].items():
        L.append('| %s (%s) | %s | %s | %s | %s | %s |' % (s, v['source'].upper(), p(v.get('engine')), p(v.get('logit')), p(v.get('hgb')),
                                                         p(v.get('stack')), p(v.get('blend'))))
    L += ['', 'v7 (%s) is %s.' % (o['model']['kind'], 'adopted: it catches at least as many as the engine on both kinds of ground truth'
                                    if o['adopted'] else 'not adopted: it does not beat the engine on both kinds of ground truth')]
    return '\n'.join(L) + '\n'
