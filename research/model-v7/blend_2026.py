"""Scratch: the v7 blend on the 2026 PWD season, a season it never saw.

Models are trained only on 2007 to 2017 (NASA landslides). They are scored on every hill stretch-day from 26 Jun to
30 Sep 2026 with ERA5 daily rain, and checked against PWD closures (backtest.labels, relaxed matching: a stretch-day is
positive on the day its closure starts; days while it stays closed are left out, as in the owner's backtest).
Methods are compared at the same share of ordinary days flagged. The 95 % interval resamples whole weeks.
args: repo/python  repo  rain_2026.json  inventory.json
"""
import bisect
import datetime as dt
import json
import math
import random
import sys

import numpy as np
from sklearn.metrics import roc_auc_score

sys.path.insert(0, sys.argv[1])
from pahaadpath import backtest  # noqa: E402
from pahaadpath.dataset import hist_counts, training_rows, window_sums  # noqa: E402
from pahaadpath.engine import caine  # noqa: E402
from pahaadpath.model import fit, logit, v4_score  # noqa: E402
from pahaadpath.network import Network  # noqa: E402

C24, C72 = caine(24), caine(72)
RATES = (0.025, 0.10, 0.25)


def wet(ser, i, k):
    return sum((ser[i - j] or 0) * k ** j for j in range(1, 31) if i - j >= 0)


def main():
    repo = sys.argv[2]
    train = json.load(open(repo + '/data/train/era5_daily_2007_2017.json'))
    r26 = json.load(open(sys.argv[3]))
    inv = json.load(open(sys.argv[4]))
    net, net_gsi = Network(), Network(susc='gsi')
    gcls = {l['id']: l['susc'] for l in net_gsi.hill()}

    def gsi(lid):
        g = net.links[lid].get('gsi') or {}
        return [(g.get('mean') or 1.5), g.get('high100', 0) or 0.0, math.log1p(g.get('ls1k', 0) or 0)]

    def phys(r1, r3, w80, w95, slope, h, lid):
        return [math.log1p(r1 / C24 * 10), math.log1p(r3 / C72 * 10), math.log1p(w80), math.log1p(w95),
                ((slope if slope is not None else 34.0) - 34.0) / 5.0, math.log1p(h)] + gsi(lid)

    # ---- fit on all of 2007 to 2017 (nothing from 2026)
    rows = training_rows(net, train)
    for r in rows:
        s = train['by_year'][str(r['year'])][r['key']]
        r['w80'], r['w95'] = wet(s, r['i'], .8), wet(s, r['i'], .95)
    years = sorted(set(r['year'] for r in rows))
    h = hist_counts(net, set(years))
    X = [phys(r['r1'], r['r3'], r['w80'], r['w95'], r['slope'], h[r['link']], r['link']) for r in rows]
    m = fit(X, [r['y'] for r in rows])
    etr = sorted(v4_score(r['r1'], r['r3'], gcls[r['link']], h[r['link']]) for r in rows)
    mtr = sorted(logit(m, x) for x in X)
    pe = lambda v: bisect.bisect_right(etr, v) / len(etr)
    pm = lambda v: bisect.bisect_right(mtr, v) / len(mtr)

    # ---- score 2026
    lab = backtest.labels(inv, net, 'relaxed')
    skip = backtest.closed_days(inv, net, 'relaxed')
    start = dt.date.fromisoformat(r26['start'])
    d0, d1 = dt.date(2026, 6, 26), dt.date(2026, 9, 30)
    E, M, B, Y, WK, BAND = [], [], [], [], [], []
    day = d0
    while day <= d1:
        i = (day - start).days
        ds = day.isoformat()
        for l in net.hill():
            if (l['id'], ds) in skip and (l['id'], ds) not in lab:
                continue
            ser = r26['by'].get(l['key'])
            if not ser or ser[i] is None:
                continue
            r1, r3, _, _ = window_sums(ser, i)
            e = v4_score(r1, r3, gcls[l['id']], h[l['id']])
            s = logit(m, phys(r1, r3, wet(ser, i, .8), wet(ser, i, .95), l['slope'], h[l['id']], l['id']))
            E.append(e); M.append(s); B.append(.5 * pe(e) + .5 * pm(s)); BAND.append(e >= 35)
            Y.append(1 if (l['id'], ds) in lab else 0); WK.append((day - d0).days // 7)
        day += dt.timedelta(days=1)
    E, M, B, Y, WK, BAND = map(np.array, (E, M, B, Y, WK, BAND))
    print('2026 stretch-days scored %d, closure starts %d' % (len(Y), Y.sum()))
    rate_c = BAND[Y == 0].mean()  # the share of ordinary days the engine flags at Caution (score 35 or more)
    print('engine flags %.1f%% of ordinary days at Caution' % (100 * rate_c))

    def stats(s, idx):
        y = Y[idx]; s = s[idx]
        neg = np.sort(s[y == 0])
        out = [roc_auc_score(y, s)]
        for r in RATES + (rate_c,):
            cut = neg[min(len(neg) - 1, int((1 - r) * (len(neg) - 1)))]
            hit = (s[y == 1] > cut).mean(); fa = (s[y == 0] > cut).mean()
            out += [hit, hit - fa]
        return np.array(out)

    allidx = np.arange(len(Y))
    names = {'Old engine (Caine + GSI)': E.astype(float), 'Physics-guided LR': M, 'Blend (v7)': B}
    res = {n: stats(s, allidx) for n, s in names.items()}
    lab_cols = ['AUC'] + ['caught at %g%%' % (100 * r) for r in RATES] + ['caught at engine Caution rate (%.0f%%)' % (100 * rate_c)]
    print('\n%-26s ' % '' + ' | '.join(lab_cols))
    for n, v in res.items():
        print('%-26s %.3f | ' % (n, v[0]) + ' | '.join('%5.1f%% (TSS %.2f)' % (100 * v[1 + 2 * k], v[2 + 2 * k]) for k in range(4)))
    weeks = sorted(set(WK.tolist()))
    byw = {w: np.where(WK == w)[0] for w in weeks}
    rnd = random.Random(3)
    print('\nGate vs old engine, 95% interval resampling weeks (WIN = interval above zero)')
    for n in ('Physics-guided LR', 'Blend (v7)'):
        diffs = []
        for _ in range(2000):
            idx = np.concatenate([byw[rnd.choice(weeks)] for _ in weeks])
            if Y[idx].sum() == 0:
                continue
            diffs.append(stats(names[n], idx) - stats(names['Old engine (Caine + GSI)'], idx))
        d = np.array(diffs); lo, hi = np.percentile(d, [2.5, 97.5], axis=0)
        diff = res[n] - res['Old engine (Caine + GSI)']
        cells = []
        for k, lbl in enumerate(lab_cols):
            j = 0 if k == 0 else 1 + 2 * (k - 1)
            sc = 1 if k == 0 else 100
            cells.append('%s %+.3g [%+.3g, %+.3g] %s' % (lbl, sc * diff[j], sc * lo[j], sc * hi[j], 'WIN' if lo[j] > 0 else 'LOSS' if hi[j] < 0 else 'tie'))
        print('  ' + n + ':\n    ' + '\n    '.join(cells))


if __name__ == '__main__':
    main()
