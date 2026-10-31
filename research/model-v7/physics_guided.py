"""Scratch experiment, not part of the repo: does a physics-guided model, or a blend with the formula, beat the old
engine on years it never saw?

Data and hold-out exactly as model.py (v5 training): 2007 to 2017, every hill stretch-day 1 Jun to 30 Sep, ERA5 daily
rain, NASA catalog labels; each year predicted by models trained on the other years; history excludes the held-out year.

Candidates
- Old engine: Caine (1980) + GSI class, as the app runs it (the baseline every candidate must beat).
- LR, raw rain windows (v5 inputs), for reference.
- Physics-guided LR: rain as multiples of the Caine trigger depth (24 h, 72 h), two antecedent wetness indices (rain
  of earlier days decayed by 0.8 and 0.95 per day: a daily stand-in for a soil water index), GSI, slope, history.
  Sign-constrained: rain and wetness weights may not be negative (dropped and refitted if they come out negative).
- Blends: the average of the formula's and a model's percentile, each percentile taken against that model's own
  scores on the TRAINING years (so nothing about the held-out year leaks in).
"""
import bisect
import json
import math
import random
import sys

import numpy as np
from sklearn.metrics import roc_auc_score

sys.path.insert(0, sys.argv[1])
from pahaadpath.dataset import hist_counts, training_rows, features as v5_features  # noqa: E402
from pahaadpath.engine import caine  # noqa: E402
from pahaadpath.model import fit, logit, v4_score  # noqa: E402
from pahaadpath.network import Network  # noqa: E402

RATES = {'Avoid (2.5%)': 0.025, 'Caution (10%)': 0.10, '25% of days': 0.25}
C24, C72 = caine(24), caine(72)


def wetness(ser, i, k, days=30):
    return sum((ser[i - j] or 0) * k ** j for j in range(1, days + 1) if i - j >= 0)


def main():
    repo = sys.argv[2]
    rain = json.load(open(repo + '/data/train/era5_daily_2007_2017.json'))
    net, net_gsi = Network(), Network(susc='gsi')
    gsi_cls = {l['id']: l['susc'] for l in net_gsi.hill()}
    rows = training_rows(net, rain)
    for r in rows:  # antecedent wetness from the stretch's own series, days before this one only
        ser = rain['by_year'][str(r['year'])][r['key']]
        r['w80'], r['w95'] = wetness(ser, r['i'], .8), wetness(ser, r['i'], .95)
    ys = np.array([r['y'] for r in rows])
    years = sorted(set(r['year'] for r in rows))
    print('stretch-days %d, landslide days %d' % (len(rows), ys.sum()), flush=True)

    def gsi(l):
        g = net.links[l].get('gsi') or {}
        return [(g.get('mean') or 1.5), g.get('high100', 0) or 0.0, math.log1p(g.get('ls1k', 0) or 0)]

    def phys(r, h):
        return [math.log1p(r['r1'] / C24 * 10), math.log1p(r['r3'] / C72 * 10), math.log1p(r['w80']), math.log1p(r['w95']),
                ((r['slope'] if r['slope'] is not None else 34.0) - 34.0) / 5.0, math.log1p(h)] + gsi(r['link'])
    SIGNED = 4  # first 4 physics inputs (rain ratios, wetness) may not get a negative weight

    def fit_signed(X, y):
        keep = list(range(len(X[0])))
        while True:
            m = fit([[x[j] for j in keep] for x in X], y)
            bad = [keep[k] for k, c in enumerate(m['coef']) if keep[k] < SIGNED and c < 0]
            if not bad:
                return m, keep
            keep = [j for j in keep if j not in bad]

    def pct(train_scores):
        s = sorted(train_scores)
        return lambda v: bisect.bisect_right(s, v) / len(s)

    names = ['Old engine: Caine + GSI (app today)', 'LR, raw rain windows (v5)', 'Physics-guided LR (signed)',
             'Blend: engine + physics-guided LR', 'Blend: engine + v5 LR']
    per = {n: [] for n in names}
    dropped = []
    for y in years:
        te = [i for i, r in enumerate(rows) if r['year'] == y]
        if not ys[te].any():
            continue
        print('holding out', y, flush=True)
        tr = [i for i, r in enumerate(rows) if r['year'] != y]
        h = hist_counts(net, set(years) - {y})
        eng = lambda i: v4_score(rows[i]['r1'], rows[i]['r3'], gsi_cls[rows[i]['link']], h[rows[i]['link']])
        e_tr, e_te = [eng(i) for i in tr], np.array([eng(i) for i in te], float)
        x5 = lambda i: v5_features(rows[i]['r1'], rows[i]['r3'], rows[i]['a7'], rows[i]['a30'], rows[i]['slope'], h[rows[i]['link']])
        m5 = fit([x5(i) for i in tr], ys[tr].tolist())
        s5_tr, s5_te = [logit(m5, x5(i)) for i in tr], np.array([logit(m5, x5(i)) for i in te])
        Xp_tr = [phys(rows[i], h[rows[i]['link']]) for i in tr]
        mp, keep = fit_signed(Xp_tr, ys[tr].tolist())
        dropped.append([j for j in range(SIGNED) if j not in keep])
        sp_tr = [logit(mp, [x[j] for j in keep]) for x in Xp_tr]
        sp_te = np.array([logit(mp, [x[j] for j in keep]) for x in (phys(rows[i], h[rows[i]['link']]) for i in te)])
        pe, pp, p5 = pct(e_tr), pct(sp_tr), pct(s5_tr)
        yt = ys[te]
        per[names[0]].append((e_te, yt)); per[names[1]].append((s5_te, yt)); per[names[2]].append((sp_te, yt))
        per[names[3]].append((np.array([(pe(a) + pp(b)) / 2 for a, b in zip(e_te, sp_te)]), yt))
        per[names[4]].append((np.array([(pe(a) + p5(b)) / 2 for a, b in zip(e_te, s5_te)]), yt))

    def fold(s, yy):
        neg = np.sort(s[yy == 0])
        return roc_auc_score(yy, s), [int((s[yy == 1] > neg[min(len(neg) - 1, int((1 - r) * (len(neg) - 1)))]).sum()) for r in RATES.values()], int(yy.sum())
    st = {n: [fold(s, yy) for s, yy in f] for n, f in per.items()}

    def summ(x, idx=None):
        x = x if idx is None else [x[i] for i in idx]
        tot = sum(t for *_, t in x)
        return np.array([np.mean([a for a, _, _ in x])] + [sum(hh[k] for _, hh, _ in x) / tot for k in range(len(RATES))])

    print('\nwetness inputs dropped for a negative weight, per held-out year:', dropped)
    print('\n%-40s  AUC  | ' % '' + ' | '.join('caught at ' + k for k in RATES))
    out = {}
    for n in names:
        r = summ(st[n]); out[n] = r.tolist()
        print('%-40s %.3f | ' % (n, r[0]) + ' | '.join('%16.1f%%' % (100 * r[i + 1]) for i in range(len(RATES))))
    base = names[0]
    rnd = random.Random(1)
    B = [[rnd.randrange(len(st[base])) for _ in st[base]] for _ in range(5000)]
    print('\nGate: difference vs the old engine, 95% interval from resampling years (WIN = interval above zero)')
    for n in names[1:]:
        d = np.array([summ(st[n], k) - summ(st[base], k) for k in B])
        lo, hi = np.percentile(d, [2.5, 97.5], axis=0)
        diff = summ(st[n]) - summ(st[base])
        cells = []
        for i, lab in enumerate(['AUC'] + list(RATES)):
            sc = 1 if i == 0 else 100
            cells.append('%s %+.3g [%+.3g, %+.3g] %s' % (lab, sc * diff[i], sc * lo[i], sc * hi[i], 'WIN' if lo[i] > 0 else 'LOSS' if hi[i] < 0 else 'tie'))
        print('  ' + n + ':\n    ' + '\n    '.join(cells))
    json.dump(out, open(sys.argv[3], 'w'), indent=1)


if __name__ == '__main__':
    main()
