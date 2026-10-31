"""Scratch experiment, not part of the repo: does a stronger ML model beat PahaadPath's logistic regression?

Same data, same year-by-year hold-out and same metrics as python/pahaadpath/model.py (v5 training):
11 monsoons 2007 to 2017, every hill stretch-day 1 Jun to 30 Sep, ERA5 daily rain, DEM slope, NASA catalog history;
a day is positive when a NASA-catalogued landslide hit near that road. Each year is predicted by models trained on the
other years only (history counts also exclude the held-out year). Only the model differs between rows of the table.
"""
import json
import random
import sys

import numpy as np
from sklearn.metrics import roc_auc_score
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier

sys.path.insert(0, sys.argv[1])  # repo/python
from pahaadpath.dataset import X, hist_counts, training_rows  # noqa: E402
from pahaadpath.model import auc, fit, logit, v4_score  # noqa: E402
from pahaadpath.network import Network  # noqa: E402

RATES = (0.025, 0.10)  # Avoid and Caution alarm burdens used in the app (share of ordinary days flagged)


def models():
    return {
        'Formula (Caine 1980, old engine)': None,
        'Logistic regression (current method)': 'lr',
        'Gradient boosting, shallow (depth 2)': lambda: HistGradientBoostingClassifier(
            max_depth=2, learning_rate=0.05, max_iter=200, min_samples_leaf=100, l2_regularization=1.0, random_state=0),
        'Gradient boosting, default': lambda: HistGradientBoostingClassifier(random_state=0),
        'Random forest': lambda: RandomForestClassifier(
            n_estimators=300, min_samples_leaf=50, n_jobs=-1, random_state=0),
    }


def main():
    repo = sys.argv[2]
    net = Network()
    rain = json.load(open(repo + '/data/train/era5_daily_2007_2017.json'))
    rows = training_rows(net, rain)
    ys = np.array([r['y'] for r in rows])
    years = sorted(set(r['year'] for r in rows))
    print('stretch-days %d, landslide days %d, years %s' % (len(rows), ys.sum(), years[0:1] + years[-1:]))
    M = models()
    per = {name: [] for name in M}  # per held-out year: (scores, labels)
    for y in years:
        print('training without', y, flush=True)
        te = [i for i, r in enumerate(rows) if r['year'] == y]
        if not ys[te].any():
            continue
        tr = [i for i, r in enumerate(rows) if r['year'] != y]
        hist = hist_counts(net, set(years) - {y})
        Xtr, Xte = np.array(X([rows[i] for i in tr], hist)), np.array(X([rows[i] for i in te], hist))
        ytr, yte = ys[tr], ys[te]
        for name, mk in M.items():
            if mk is None:
                s = np.array([v4_score(rows[i]['r1'], rows[i]['r3'], rows[i]['susc'], hist[rows[i]['link']]) for i in te], float)
            elif mk == 'lr':
                m = fit(Xtr.tolist(), ytr.tolist())
                s = np.array([logit(m, x) for x in Xte.tolist()])
            else:
                clf = mk().fit(Xtr, ytr)
                s = clf.predict_proba(Xte)[:, 1]
            per[name].append((y, s, yte))

    def fold_stats(s, yy):
        neg = np.sort(s[yy == 0])
        cuts = [neg[min(len(neg) - 1, int((1 - r) * (len(neg) - 1)))] for r in RATES]
        return roc_auc_score(yy, s), [int((s[yy == 1] > c).sum()) for c in cuts], int(yy.sum())

    stats = {n: [fold_stats(s, yy) for _, s, yy in f] for n, f in per.items()}

    def summ(st, idx=None):
        st = st if idx is None else [st[i] for i in idx]
        tot = sum(t for _, _, t in st)
        return (float(np.mean([a for a, _, _ in st])),) + tuple(sum(h[k] for _, h, _ in st) / tot for k in range(len(RATES)))

    base = 'Logistic regression (current method)'
    held = [y for y, _, _ in per[base]]
    print('held-out years with landslides: %d (%s)' % (len(held), ', '.join(map(str, held))))
    out = {}
    for n in per:
        a, av, ca = summ(stats[n])
        out[n] = {'auc': a, 'avoid': av, 'caution': ca}
        print('%-40s AUC %.3f | caught at Avoid burden %4.1f%% | at Caution burden %4.1f%%' % (n, a, 100 * av, 100 * ca))
    rnd = random.Random(1)
    B = [[rnd.randrange(len(held)) for _ in held] for _ in range(5000)]
    print('\n95% interval of the difference vs logistic regression (resampling years):')
    for n in per:
        if n == base:
            continue
        d = np.array([np.subtract(summ(stats[n], k), summ(stats[base], k)) for k in B])
        lo, hi = np.percentile(d, [2.5, 97.5], axis=0)
        diff = np.subtract(summ(stats[n]), summ(stats[base]))
        out[n]['diff'] = diff.tolist(); out[n]['ci_lo'] = lo.tolist(); out[n]['ci_hi'] = hi.tolist()
        print('%-40s AUC %+.3f [%+.3f, %+.3f] | Avoid catch %+5.1f pts [%+5.1f, %+5.1f] | Caution catch %+5.1f pts [%+5.1f, %+5.1f]' % (
            n, diff[0], lo[0], hi[0], 100 * diff[1], 100 * lo[1], 100 * hi[1], 100 * diff[2], 100 * lo[2], 100 * hi[2]))
    print('\nAUC by held-out year:')
    print('year  ' + '  '.join('%8s' % n.split(' ')[0][:8] for n in per) + '  landslide days')
    for j, y in enumerate(held):
        print('%d  ' % y + '  '.join('%8.3f' % stats[n][j][0] for n in per) + '  %d' % stats[base][j][2])
    json.dump(out, open(sys.argv[3], 'w'), indent=1)


if __name__ == '__main__':
    main()
