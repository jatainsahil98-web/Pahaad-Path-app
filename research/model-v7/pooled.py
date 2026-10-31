"""Scratch: one physics-guided model trained on BOTH kinds of ground truth, with a per-source offset.

Sources: NASA news-reported landslides 2007 to 2017 (daily ERA5 rain from the repo) and PWD closure starts in the 2026
monsoon (daily ERA5 rain downloaded on Chandni's PC). Folds: each NASA year, and each 2026 month (Jun 26 to Jul 31,
Aug, Sep). Each fold is predicted by a model trained on every other fold of BOTH sources. A per-source intercept takes
the different base rates; it is the same for every row of a fold, so it never changes the ranking inside a fold.
Sources are weighted equally (each source's rows sum to the same total weight).
Inputs: rain as multiples of the Caine trigger (24 h, 72 h), antecedent wetness (decay .8 and .95), slope, NASA history,
GSI. Rain and wetness weights may not be negative. Ridge-penalised logistic regression by Newton steps (numpy).
Reported per source against the engine (Caine + GSI) with a 95 % interval from resampling folds (NASA) or weeks (2026).
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
from pahaadpath.model import v4_score  # noqa: E402
from pahaadpath.network import Network  # noqa: E402

C24, C72 = caine(24), caine(72)
RATES = (0.025, 0.10, 0.25)
SIGNED = 4
RIDGE = 1.0


def wet(ser, i, k):
    return sum((ser[i - j] or 0) * k ** j for j in range(1, 31) if i - j >= 0)


def fit_lr(X, y, w, src):
    """weighted ridge logistic regression, one intercept per source, sign constraints on the first SIGNED columns"""
    mu, sd = X.mean(0), X.std(0) + 1e-9
    keep = list(range(X.shape[1]))
    nsrc = int(src.max()) + 1
    while True:
        Z = np.hstack([np.eye(nsrc)[src], (X[:, keep] - mu[keep]) / sd[keep]])
        b = np.zeros(Z.shape[1])
        pen = np.r_[np.zeros(nsrc), np.full(len(keep), RIDGE)]
        for _ in range(30):
            p = 1 / (1 + np.exp(-np.clip(Z @ b, -30, 30)))
            g = Z.T @ (w * (p - y)) + pen * b
            H = (Z * (w * p * (1 - p))[:, None]).T @ Z + np.diag(pen + 1e-9)
            step = np.linalg.solve(H, g)
            b -= step
            if np.abs(step).max() < 1e-7:
                break
        coef = b[nsrc:]
        bad = [keep[k] for k, c in enumerate(coef) if keep[k] < SIGNED and c < 0]
        if not bad:
            break
        keep = [j for j in keep if j not in bad]
    full = np.zeros(X.shape[1]); full[keep] = coef / sd[keep]
    return {'coef': full, 'mu': mu, 'keep': keep, 'icpt': b[:nsrc] - (full * mu).sum()}


def score(m, X, s):
    return X @ m['coef'] + m['icpt'][s]


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

    # ---- rows of both sources: (fold, source, link, r1, r3, w80, w95, slope, label, week)
    R = []
    for r in training_rows(net, train):
        s = train['by_year'][str(r['year'])][r['key']]
        R.append(dict(fold='y%d' % r['year'], year=r['year'], src=0, link=r['link'], r1=r['r1'], r3=r['r3'],
                      w80=wet(s, r['i'], .8), w95=wet(s, r['i'], .95), slope=r['slope'], y=r['y'], wk=None))
    lab = backtest.labels(inv, net, 'relaxed')
    skip = backtest.closed_days(inv, net, 'relaxed')
    start = dt.date.fromisoformat(r26['start'])
    d0, day = dt.date(2026, 6, 26), dt.date(2026, 6, 26)
    while day <= dt.date(2026, 9, 30):
        i, ds = (day - start).days, day.isoformat()
        for l in net.hill():
            if (l['id'], ds) in skip and (l['id'], ds) not in lab:
                continue
            ser = r26['by'].get(l['key'])
            if not ser or ser[i] is None:
                continue
            r1, r3, _, _ = window_sums(ser, i)
            R.append(dict(fold='m%d' % max(7, day.month), year=2026, src=1, link=l['id'], r1=r1, r3=r3,
                          w80=wet(ser, i, .8), w95=wet(ser, i, .95), slope=l['slope'], y=1 if (l['id'], ds) in lab else 0,
                          wk=(day - d0).days // 7))
        day += dt.timedelta(days=1)
    Y = np.array([r['y'] for r in R]); S = np.array([r['src'] for r in R]); F = np.array([r['fold'] for r in R])
    for k, n in ((0, 'NASA 2007 to 2017'), (1, 'PWD 2026')):
        print('%s: %d stretch-days, %d events' % (n, (S == k).sum(), Y[S == k].sum()), flush=True)
    nasa_years = sorted(set(r['year'] for r in R if r['src'] == 0))
    folds = sorted(set(F.tolist()))

    def feats(h):
        return np.array([[math.log1p(r['r1'] / C24 * 10), math.log1p(r['r3'] / C72 * 10), math.log1p(r['w80']), math.log1p(r['w95']),
                          ((r['slope'] if r['slope'] is not None else 34.0) - 34.0) / 5.0, math.log1p(h[r['link']])] + gsi(r['link']) for r in R])

    out = {k: np.zeros(len(R)) for k in ('engine', 'pooled', 'blend', 'nasa_only', 'blend_nasa_only')}
    for f in folds:
        te = np.where(F == f)[0]
        if Y[te].sum() == 0:
            continue
        print('holding out', f, flush=True)
        held_year = int(f[1:]) if f.startswith('y') else None
        h = hist_counts(net, set(nasa_years) - ({held_year} if held_year else set()))
        X = feats(h)
        E = np.array([v4_score(r['r1'], r['r3'], gcls[r['link']], h[r['link']]) for r in R], float)
        tr = np.where(F != f)[0]
        w = np.where(S[tr] == 0, 1.0 / (S[tr] == 0).sum(), 1.0 / max(1, (S[tr] == 1).sum())) * len(tr) / 2
        m = fit_lr(X[tr], Y[tr], w, S[tr])
        trn = tr[S[tr] == 0]  # the same model trained on NASA only, for comparison
        m0 = fit_lr(X[trn], Y[trn], np.ones(len(trn)), np.zeros(len(trn), int))
        src_te = S[te]
        for key, mm, ss, trs in (('pooled', m, src_te, tr), ('nasa_only', m0, np.zeros(len(te), int), trn)):
            st = np.sort(score(mm, X[trs], S[trs] if key == 'pooled' else np.zeros(len(trs), int)))
            et = np.sort(E[trs])
            sc = score(mm, X[te], ss)
            out[key][te] = sc
            pe = np.searchsorted(et, E[te], side='right') / len(et)
            pm = np.searchsorted(st, sc, side='right') / len(st)
            out['blend' if key == 'pooled' else 'blend_nasa_only'][te] = .5 * pe + .5 * pm
        out['engine'][te] = E[te]

    def unit_stats(idx_groups, s):
        """AUC averaged over units, catches pooled over units with per-unit cut-offs"""
        aucs, hits, tot = [], np.zeros(len(RATES)), 0
        for idx in idx_groups:
            y = Y[idx]; v = s[idx]
            if y.sum() == 0 or y.sum() == len(y):
                continue
            aucs.append(roc_auc_score(y, v))
            neg = np.sort(v[y == 0])
            for k, r in enumerate(RATES):
                hits[k] += (v[y == 1] > neg[min(len(neg) - 1, int((1 - r) * (len(neg) - 1)))]).sum()
            tot += y.sum()
        return np.r_[np.mean(aucs), hits / tot]

    names = [('engine', 'Old engine (Caine + GSI)'), ('nasa_only', 'Physics LR, NASA only'), ('blend_nasa_only', 'Blend, NASA only (v7)'),
             ('pooled', 'Pooled physics LR (both sources)'), ('blend', 'Pooled blend (both sources)')]
    nasa_units = [np.where(F == 'y%d' % y)[0] for y in nasa_years]
    nasa_units = [u for u in nasa_units if Y[u].sum()]
    i26 = np.where(S == 1)[0]
    wk = np.array([r['wk'] if r['wk'] is not None else -1 for r in R])
    # 2026: one ranking over the whole season (same as the owner's backtest), resampled by week
    for title, units, resample in (('OTHER YEARS: NASA landslides 2009 to 2016 (AUC averaged over years)', nasa_units, 'years'),
                                   ('2026 PWD CLOSURES (one ranking over the season)', [i26], 'weeks')):
        print('\n' + title)
        print('%-36s  AUC  | caught at 2.5%% | at 10%% | at 25%%' % '')
        res = {}
        for k, n in names:
            res[k] = unit_stats(units, out[k])
            print('%-36s %.3f | %12.1f%% | %5.1f%% | %5.1f%%' % (n, res[k][0], *(100 * res[k][1:])))
        rnd = random.Random(5)
        if resample == 'years':
            draws = [[units[rnd.randrange(len(units))] for _ in units] for _ in range(3000)]
        else:
            weeks = sorted(set(wk[i26].tolist())); byw = {w_: i26[wk[i26] == w_] for w_ in weeks}
            draws = [[np.concatenate([byw[rnd.choice(weeks)] for _ in weeks])] for _ in range(1500)]
        print('  gate vs old engine (95% interval):')
        for k, n in names[1:]:
            d = np.array([unit_stats(dr, out[k]) - unit_stats(dr, out['engine']) for dr in draws])
            lo, hi = np.percentile(d, [2.5, 97.5], axis=0); diff = res[k] - res['engine']
            cells = []
            for j, lbl in enumerate(['AUC', '2.5%', '10%', '25%']):
                sc = 1 if j == 0 else 100
                cells.append('%s %+.3g [%+.3g, %+.3g] %s' % (lbl, sc * diff[j], sc * lo[j], sc * hi[j], 'WIN' if lo[j] > 0 else 'LOSS' if hi[j] < 0 else 'tie'))
            print('    %-34s ' % n + ' | '.join(cells))


if __name__ == '__main__':
    main()
