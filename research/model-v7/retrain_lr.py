"""Scratch experiment, not part of the repo: retrain the logistic regression without 2026-only inputs and test it
against the old engine on years it never saw, using the owner's gate (win only if the difference's 95 % interval
is above zero).

Data: repo's 2007 to 2017 set (ERA5 daily rain at every hill stretch, DEM slope, NASA catalog history and labels).
Inputs available here: v6 'rain' (24 h, 72 h, days 3 to 9, days 10 to 30), 'static' (slope, past landslides) and
'gsi' groups. 'history' (past PWD closures, 2026 only) is the input being removed. 'soil' needs Open-Meteo (blocked).
Each year is predicted by a model trained on the other years; landslide history excludes the held-out year.
"""
import json
import math
import random
import sys

import numpy as np
from sklearn.metrics import roc_auc_score

sys.path.insert(0, sys.argv[1])  # repo/python
from pahaadpath.dataset import hist_counts, training_rows  # noqa: E402
from pahaadpath.model import fit, logit, v4_score  # noqa: E402
from pahaadpath.network import Network  # noqa: E402

RATES = {'Avoid (2.5%)': 0.025, 'Caution (10%)': 0.10, '25% of days': 0.25}


def feats(r, link, n_hist, groups):
    x = []
    if 'rain' in groups:
        x += [math.log1p(r['r1']), math.log1p(r['r3']), math.log1p(r['a7']), math.log1p(r['a30'])]
    if 'static' in groups:
        x += [((r['slope'] if r['slope'] is not None else 34.0) - 34.0) / 5.0, math.log1p(n_hist)]
    if 'gsi' in groups:
        g = link.get('gsi')
        x += [(g.get('mean') or 1.5) if g else 1.5, g.get('high100', 0) if g else 0.0, math.log1p(g.get('ls1k', 0)) if g else 0.0]
    return x


def main():
    repo = sys.argv[2]
    rain = json.load(open(repo + '/data/train/era5_daily_2007_2017.json'))
    net = Network()                  # links with GSI attached
    net_gsi = Network(susc='gsi')    # old engine as the app runs it now: Caine + GSI class
    gsi_cls = {l['id']: l['susc'] for l in net_gsi.hill()}
    slope_cls = {l['id']: l['susc'] for l in net.hill()}
    have = sum(1 for l in net.hill() if l.get('gsi'))
    rows = training_rows(net, rain)
    ys = np.array([r['y'] for r in rows])
    years = sorted(set(r['year'] for r in rows))
    print('stretch-days %d, landslide days %d; GSI data for %d of %d stretches' % (len(rows), ys.sum(), have, len(net.hill())), flush=True)

    variants = {
        'Old engine: Caine + GSI class (app today)': ('formula', gsi_cls),
        'Old engine: Caine + slope class': ('formula', slope_cls),
        'Retrained LR: rain + static': ('lr', ('rain', 'static')),
        'Retrained LR: rain + static + GSI': ('lr', ('rain', 'static', 'gsi')),
    }
    per = {v: [] for v in variants}
    for y in years:
        te = [i for i, r in enumerate(rows) if r['year'] == y]
        if not ys[te].any():
            continue
        print('holding out', y, flush=True)
        tr = [i for i, r in enumerate(rows) if r['year'] != y]
        hist = hist_counts(net, set(years) - {y})
        for v, (kind, arg) in variants.items():
            if kind == 'formula':
                s = np.array([v4_score(rows[i]['r1'], rows[i]['r3'], arg[rows[i]['link']], hist[rows[i]['link']]) for i in te], float)
            else:
                f = lambda i: feats(rows[i], net.links[rows[i]['link']], hist[rows[i]['link']], arg)
                m = fit([f(i) for i in tr], ys[tr].tolist())
                s = np.array([logit(m, f(i)) for i in te])
            per[v].append((y, s, ys[te]))

    def fold(s, yy):
        neg = np.sort(s[yy == 0])
        hits = [int((s[yy == 1] > neg[min(len(neg) - 1, int((1 - r) * (len(neg) - 1)))]).sum()) for r in RATES.values()]
        return roc_auc_score(yy, s), hits, int(yy.sum())

    st = {v: [fold(s, yy) for _, s, yy in f] for v, f in per.items()}

    def summ(x, idx=None):
        x = x if idx is None else [x[i] for i in idx]
        tot = sum(t for *_, t in x)
        return np.array([np.mean([a for a, _, _ in x])] + [sum(h[k] for _, h, _ in x) / tot for k in range(len(RATES))])

    held = [y for y, _, _ in per['Retrained LR: rain + static']]
    print('\nheld-out years with landslides: %s (%d landslide days)\n' % (', '.join(map(str, held)), sum(t for *_, t in st['Retrained LR: rain + static'])))
    hdr = ' | '.join('caught at ' + k for k in RATES)
    print('%-44s AUC   | %s' % ('', hdr))
    out = {}
    for v in variants:
        r = summ(st[v])
        out[v] = {'auc': r[0], **{k: r[i + 1] for i, k in enumerate(RATES)}}
        print('%-44s %.3f | ' % (v, r[0]) + ' | '.join('%14.1f%%' % (100 * r[i + 1]) for i in range(len(RATES))))

    base = 'Old engine: Caine + GSI class (app today)'
    rnd = random.Random(1)
    B = [[rnd.randrange(len(held)) for _ in held] for _ in range(5000)]
    print('\nGate: difference vs %s, 95%% interval from resampling years' % base)
    for v in ('Retrained LR: rain + static', 'Retrained LR: rain + static + GSI', 'Old engine: Caine + slope class'):
        d = np.array([summ(st[v], k) - summ(st[base], k) for k in B])
        lo, hi = np.percentile(d, [2.5, 97.5], axis=0)
        diff = summ(st[v]) - summ(st[base])
        names = ['AUC'] + list(RATES)
        cells = []
        for i, n in enumerate(names):
            sc = 1 if i == 0 else 100
            verdict = 'WIN' if lo[i] > 0 else 'LOSS' if hi[i] < 0 else 'tie'
            cells.append('%s %+.3g [%+.3g, %+.3g] %s' % (n, sc * diff[i], sc * lo[i], sc * hi[i], verdict))
        out[v]['gate'] = cells
        print('  ' + v + ':\n    ' + '\n    '.join(cells))
    print('\nAUC by held-out year:')
    print('year  ' + '  '.join('%10s' % (v.split(':')[1].strip()[:10]) for v in variants) + '  landslide days')
    for j, y in enumerate(held):
        print('%d  ' % y + '  '.join('%10.3f' % st[v][j][0] for v in variants) + '  %d' % st[base][j][2])
    json.dump(out, open(sys.argv[3], 'w'), indent=1, default=float)


if __name__ == '__main__':
    main()
