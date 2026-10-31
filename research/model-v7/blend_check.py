"""Scratch: is the blend's gain real? Three checks it was not chosen on.
1. Year by year (2007 to 2017 hold-out): in how many held-out years does the blend beat the engine?
2. Blend weight 0.3 / 0.5 / 0.7 toward the model: does the gain hold without tuning?
3. Outside data: final models trained on 2007 to 2017 only; alarm cut-offs set on the 2025 monsoon (label-free: the
   top 10 % and 25 % of all 2025 stretch-days for each method); then which stretches named closed in the news on
   20 Aug 2025 and 9 Jul 2026 each method flags, and how many it flags on two dry control days.
"""
import bisect
import json
import math
import sys
import datetime as dt

import numpy as np
from sklearn.metrics import roc_auc_score

sys.path.insert(0, sys.argv[1])
from pahaadpath.dataset import hist_counts, training_rows, window_sums  # noqa: E402
from pahaadpath.engine import caine  # noqa: E402
from pahaadpath.model import fit, logit, v4_score  # noqa: E402
from pahaadpath.network import Network  # noqa: E402

C24, C72 = caine(24), caine(72)
W = (0.3, 0.5, 0.7)


def wet(ser, i, k):
    return sum((ser[i - j] or 0) * k ** j for j in range(1, 31) if i - j >= 0)


def main():
    repo = sys.argv[2]
    rain = json.load(open(repo + '/data/train/era5_daily_2007_2017.json'))
    ext = json.load(open(repo + '/data/train/era5_daily_external.json'))
    gt = json.load(open(repo + '/replay_source/gt.json'))
    net, net_gsi = Network(), Network(susc='gsi')
    gcls = {l['id']: l['susc'] for l in net_gsi.hill()}

    def gsi(lid):
        g = net.links[lid].get('gsi') or {}
        return [(g.get('mean') or 1.5), g.get('high100', 0) or 0.0, math.log1p(g.get('ls1k', 0) or 0)]

    def phys(r1, r3, w80, w95, slope, h, lid):
        return [math.log1p(r1 / C24 * 10), math.log1p(r3 / C72 * 10), math.log1p(w80), math.log1p(w95),
                ((slope if slope is not None else 34.0) - 34.0) / 5.0, math.log1p(h)] + gsi(lid)

    rows = training_rows(net, rain)
    for r in rows:
        s = rain['by_year'][str(r['year'])][r['key']]
        r['w80'], r['w95'] = wet(s, r['i'], .8), wet(s, r['i'], .95)
    ys = np.array([r['y'] for r in rows])
    years = sorted(set(r['year'] for r in rows))
    px = lambda r, h: phys(r['r1'], r['r3'], r['w80'], r['w95'], r['slope'], h[r['link']], r['link'])

    # ---- 1 and 2: hold-out by year
    per = []  # (year, engine scores, model scores, blends by weight, labels)
    for y in years:
        te = [i for i, r in enumerate(rows) if r['year'] == y]
        if not ys[te].any():
            continue
        print('holding out', y, flush=True)
        tr = [i for i, r in enumerate(rows) if r['year'] != y]
        h = hist_counts(net, set(years) - {y})
        eng = lambda i: v4_score(rows[i]['r1'], rows[i]['r3'], gcls[rows[i]['link']], h[rows[i]['link']])
        Xtr = [px(rows[i], h) for i in tr]
        m = fit(Xtr, ys[tr].tolist())
        etr, mtr = sorted(eng(i) for i in tr), sorted(logit(m, x) for x in Xtr)
        pe = lambda v: bisect.bisect_right(etr, v) / len(etr)
        pm = lambda v: bisect.bisect_right(mtr, v) / len(mtr)
        e = np.array([eng(i) for i in te], float)
        s = np.array([logit(m, px(rows[i], h)) for i in te])
        blends = {w: np.array([(1 - w) * pe(a) + w * pm(b) for a, b in zip(e, s)]) for w in W}
        per.append((y, e, s, blends, ys[te]))

    def caught(scores_by_year, rate):
        hit = tot = 0
        for s, yy in scores_by_year:
            neg = np.sort(s[yy == 0]); cut = neg[min(len(neg) - 1, int((1 - rate) * (len(neg) - 1)))]
            hit += int((s[yy == 1] > cut).sum()); tot += int(yy.sum())
        return hit / tot

    print('\n1. AUC by held-out year (blend weight 0.5)')
    print('year  engine  blend  landslide days  better')
    wins = 0
    for y, e, s, b, yy in per:
        ae, ab = roc_auc_score(yy, e), roc_auc_score(yy, b[.5]); wins += ab > ae
        print('%d   %.3f   %.3f   %3d             %s' % (y, ae, ab, yy.sum(), 'blend' if ab > ae else 'engine'))
    print('blend better in %d of %d held-out years' % (wins, len(per)))

    print('\n2. Blend weight toward the model (0 = engine only, 1 = model only)')
    print('weight  AUC    caught@2.5%  caught@10%  caught@25%')
    for name, get in [('0 (engine)', lambda p: p[1])] + [(str(w), (lambda w: lambda p: p[3][w])(w)) for w in W] + [('1 (model)', lambda p: p[2])]:
        sy = [(get(p), p[4]) for p in per]
        print('%-7s %.3f  %10.1f%%  %9.1f%%  %9.1f%%' % (name, np.mean([roc_auc_score(yy, s) for s, yy in sy]),
              *(100 * caught(sy, r) for r in (.025, .10, .25))))

    # ---- 3: outside data with final models on all 2007 to 2017
    h = hist_counts(net, set(years))
    Xall = [px(r, h) for r in rows]
    m = fit(Xall, ys.tolist())
    etr = sorted(v4_score(r['r1'], r['r3'], gcls[r['link']], h[r['link']]) for r in rows)
    mtr = sorted(logit(m, x) for x in Xall)
    pe = lambda v: bisect.bisect_right(etr, v) / len(etr)
    pm = lambda v: bisect.bisect_right(mtr, v) / len(mtr)

    def score_day(start, by, day):
        i = (dt.date.fromisoformat(day) - dt.date.fromisoformat(start)).days
        out = {}
        for l in net.hill():
            ser = by.get(l['key'])
            if not ser or i >= len(ser) or ser[i] is None:
                continue
            r1, r3, _, _ = window_sums(ser, i)
            e = v4_score(r1, r3, gcls[l['id']], h[l['id']])
            s = logit(m, phys(r1, r3, wet(ser, i, .8), wet(ser, i, .95), l['slope'], h[l['id']], l['id']))
            out[l['id']] = {'engine': pe(e), 'model': pm(s), 'blend': .5 * pe(e) + .5 * pm(s)}
        return out

    s25 = ext['season2025']
    first = (dt.date(2025, 6, 1) - dt.date.fromisoformat(s25['start'])).days
    n = len(next(iter(s25['by'].values())))
    season = {'engine': [], 'model': [], 'blend': []}
    for i in range(first, n):
        day = (dt.date.fromisoformat(s25['start']) + dt.timedelta(days=i)).isoformat()
        for v in score_day(s25['start'], s25['by'], day).values():
            for k in season:
                season[k].append(v[k])
    cuts = {k: {lvl: float(np.quantile(v, 1 - lvl)) for lvl in (.10, .25)} for k, v in season.items()}
    print('\n3. Outside data. Alarm cut-offs set on the 2025 monsoon (%d stretch-days): each method flags the top 10%% and 25%%.' % len(season['engine']))
    tot = {k: {.10: 0, .25: 0} for k in season}
    named_total = 0
    for ev in gt['events']:
        d = ext['days'][ev['date']]
        sc = score_day(d['start'], d['by'], ev['date'])
        closed = sorted(set(c['link'] for c in ev['closures'] if c.get('link') in sc))
        line = []
        for k in season:
            if ev['control']:
                line.append('%s flags %d / %d of all stretches' % (k, sum(1 for v in sc.values() if v[k] > cuts[k][.10]), sum(1 for v in sc.values() if v[k] > cuts[k][.25])))
            else:
                a, b = sum(1 for c in closed if sc[c][k] > cuts[k][.10]), sum(1 for c in closed if sc[c][k] > cuts[k][.25])
                tot[k][.10] += a; tot[k][.25] += b
                line.append('%s %d / %d' % (k, a, b))
        if not ev['control']:
            named_total += len(closed)
        print('  %s %s: %s  (%s; at the 10%% / 25%% level)' % (ev['date'], 'dry control' if ev['control'] else '%d named closed stretches' % len(closed),
              ', '.join(line), 'stretches flagged' if ev['control'] else 'named stretches flagged'))
    print('  closure days together, named stretches flagged out of %d: ' % named_total +
          ', '.join('%s %d at 10%%, %d at 25%%' % (k, tot[k][.10], tot[k][.25]) for k in season))


if __name__ == '__main__':
    main()
