"""Landslide risk model v5: logistic regression on rain memory, slope and incident history, checked year by year
against the v4 rain-threshold engine. Standard library only (Newton's method on 6 features is quick)."""
import datetime as dt
import math

from .dataset import FEATURES, X, d, features, hist_counts, training_rows, window_sums
from .engine import caine
from .network import hist_class

CAUTION_RATE, AVOID_RATE = 0.10, 0.025  # share of ordinary monsoon stretch-days (no reported landslide) above each band
RIDGE = 1.0
MEMORY_CHOICES = (0, 3, 5, 7)  # days a heavy-rain day keeps a stretch at Caution or worse; picked by the year-by-year check


def sigmoid(z):
    return 1 / (1 + math.exp(-z)) if z > -30 else 0.0


def solve(A, b):
    n = len(b)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        for r in range(n):
            if r != c and M[r][c]:
                f = M[r][c] / M[c][c]
                for k in range(c, n + 1):
                    M[r][k] -= f * M[c][k]
    return [M[i][n] / M[i][i] for i in range(n)]


def fit(Xs, ys, ridge=RIDGE, iters=25):
    """L2-penalised logistic regression (intercept not penalised) on standardised features."""
    m = len(Xs[0])
    mu = [sum(x[j] for x in Xs) / len(Xs) for j in range(m)]
    sd = [math.sqrt(sum((x[j] - mu[j]) ** 2 for x in Xs) / len(Xs)) or 1.0 for j in range(m)]
    Z = [[1.0] + [(x[j] - mu[j]) / sd[j] for j in range(m)] for x in Xs]
    w = [0.0] * (m + 1)
    for _ in range(iters):
        H = [[0.0] * (m + 1) for _ in range(m + 1)]
        g = [0.0] * (m + 1)
        for z, y in zip(Z, ys):
            p = sigmoid(sum(a * b for a, b in zip(w, z)))
            r = p * (1 - p)
            for i in range(m + 1):
                g[i] += (y - p) * z[i]
                zi = r * z[i]
                for k in range(i, m + 1):
                    H[i][k] += zi * z[k]
        for i in range(m + 1):
            for k in range(i):
                H[i][k] = H[k][i]
        for i in range(1, m + 1):
            g[i] -= ridge * w[i]
            H[i][i] += ridge
        step = solve(H, g)
        w = [a + b for a, b in zip(w, step)]
        if max(abs(s) for s in step) < 1e-8:
            break
    # back to raw feature units so the app needs no scaler
    coef = [w[j + 1] / sd[j] for j in range(m)]
    icpt = w[0] - sum(coef[j] * mu[j] for j in range(m))
    return {'intercept': icpt, 'coef': coef}


def logit(model, x):
    return model['intercept'] + sum(c * v for c, v in zip(model['coef'], x))


def quantile(vals, q):
    s = sorted(vals)
    if not s:
        return 0.0
    i = q * (len(s) - 1)
    lo = int(math.floor(i))
    return s[lo] + (s[min(lo + 1, len(s) - 1)] - s[lo]) * (i - lo)


def bands(model, Xs, ys):
    """Band cut-offs on the logit from the share of ordinary days the app may flag, and the 0 to 100 score scale."""
    neg = [logit(model, x) for x, y in zip(Xs, ys) if not y]
    pos = [logit(model, x) for x, y in zip(Xs, ys) if y]
    zc, za = quantile(neg, 1 - CAUTION_RATE), quantile(neg, 1 - AVOID_RATE)
    return {'z0': quantile(neg, 0.5), 'zc': zc, 'za': za, 'zspan': max(0.5, (max(pos) if pos else za + 1) - za)}


def score(model, z):
    """0 to 100 so the app's bands stay at 35 (Caution) and 65 (Avoid). Must match modelScore() in src/model.js."""
    b = model['bands']
    if z < b['zc']:
        s = 34 * min(1, max(0, (z - b['z0']) / (b['zc'] - b['z0'])))
    elif z < b['za']:
        s = 35 + 29 * (z - b['zc']) / (b['za'] - b['zc'])
    else:
        s = 65 + 35 * min(1, (z - b['za']) / b['zspan'])
    return int(math.floor(s + 0.5))


def v4_score(r1, r3, susc, n_hist):
    """The v4 engine on daily totals (no 6 hour window, no road reports)."""
    ratio = max(r1 / caine(24), r3 / caine(72))
    trig = min(ratio, 1.5) / 1.5
    pred = .6 * [0, .15, .55, 1][susc] + .4 * min(hist_class(n_hist) / 5, 1)
    return int(math.floor(100 * min(1, trig * (.35 + .65 * pred) + .08 * pred) + 0.5))


def mem_days(m, ser, i, slope, n_hist, days):
    """Latest of the last `days` days whose own rain put the stretch at Avoid (0 if none). Matches memDays() in the app."""
    for k in range(1, days + 1):
        j = i - k
        if j < 0 or j >= len(ser):
            continue
        r1, r3, a7, a30 = window_sums(ser, j)
        if score(m, logit(m, features(r1, r3, a7, a30, slope, n_hist))) >= 65:
            return k
    return 0


def with_memory(s, mem):
    return max(s, 35) if mem else s


def band(s):
    return 0 if s < 35 else 1 if s < 65 else 2


def auc(scores, ys):
    """Area under the ROC curve (ties count half)."""
    pairs = sorted(zip(scores, ys))
    npos = sum(ys)
    nneg = len(ys) - npos
    if not npos or not nneg:
        return None
    rank, i, rsum = 1, 0, 0.0
    while i < len(pairs):
        j = i
        while j < len(pairs) and pairs[j][0] == pairs[i][0]:
            j += 1
        avg = (rank + rank + (j - i) - 1) / 2
        rsum += avg * sum(1 for k in range(i, j) if pairs[k][1])
        rank += j - i
        i = j
    return (rsum - npos * (npos + 1) / 2) / (npos * nneg)


def hit_at_rate(scores, ys, rate):
    """Share of reported-landslide days caught when the cut-off flags `rate` of the ordinary days."""
    neg = [s for s, y in zip(scores, ys) if not y]
    cut = quantile(neg, 1 - rate)
    pos = [s for s, y in zip(scores, ys) if y]
    return sum(1 for s in pos if s > cut) / len(pos) if pos else None


def train(net, rain):
    rows = training_rows(net, rain)
    years = sorted(set(r['year'] for r in rows))
    ys = [r['y'] for r in rows]
    # leave one year out
    oof5, oof4, oof_band5, oof_band4, per_year = [0.0] * len(rows), [0] * len(rows), [0] * len(rows), [0] * len(rows), []
    oof_mem = {M: [0] * len(rows) for M in MEMORY_CHOICES}
    for y in years:
        tr = [i for i, r in enumerate(rows) if r['year'] != y]
        te = [i for i, r in enumerate(rows) if r['year'] == y]
        if not any(rows[i]['y'] for i in te):
            continue
        hist = hist_counts(net, set(years) - {y})
        Xtr = X([rows[i] for i in tr], hist)
        m = fit(Xtr, [ys[i] for i in tr])
        m['bands'] = bands(m, Xtr, [ys[i] for i in tr])
        Xte = X([rows[i] for i in te], hist)
        for i, x in zip(te, Xte):
            r = rows[i]
            oof5[i] = logit(m, x)
            oof_band5[i] = band(score(m, oof5[i]))
            oof4[i] = v4_score(r['r1'], r['r3'], r['susc'], hist[r['link']])
            oof_band4[i] = band(oof4[i])
            ser = rain['by_year'][str(r['year'])][r['key']]
            mem = mem_days(m, ser, r['i'], r['slope'], hist[r['link']], max(MEMORY_CHOICES))
            for M in MEMORY_CHOICES:
                oof_mem[M][i] = band(with_memory(score(m, oof5[i]), mem and mem <= M))
        per_year.append({'year': y, 'positives': sum(ys[i] for i in te), 'days': len(te),
                         'v5_avoid': sum(1 for i in te if ys[i] and oof_band5[i] == 2),
                         'v5_caution_up': sum(1 for i in te if ys[i] and oof_band5[i] >= 1),
                         'v4_avoid': sum(1 for i in te if ys[i] and oof_band4[i] == 2),
                         'v4_caution_up': sum(1 for i in te if ys[i] and oof_band4[i] >= 1)})
    held = [i for i, r in enumerate(rows) if any(p['year'] == r['year'] for p in per_year)]
    hy = [ys[i] for i in held]
    s5, s4 = [oof5[i] for i in held], [oof4[i] for i in held]
    b5, b4 = [oof_band5[i] for i in held], [oof_band4[i] for i in held]
    npos = sum(hy)
    neg = len(hy) - npos

    def rate(bs, lvl, pos):
        sel = [b for b, y in zip(bs, hy) if bool(y) == pos]
        return sum(1 for b in sel if b >= lvl) / len(sel) if sel else None

    v4_avoid_rate = rate(b4, 2, False)
    memory = []
    for M in MEMORY_CHOICES:
        bm = [oof_mem[M][i] for i in held]
        memory.append({'days': M, 'caution_hit': rate(bm, 1, True), 'caution_false': rate(bm, 1, False)})
    best_mem = max(memory, key=lambda x: (x['caution_hit'] or 0) - (x['caution_false'] or 0))['days']
    cv = {
        'years': [p['year'] for p in per_year], 'positives': npos, 'ordinary_days': neg, 'per_year': per_year,
        'auc': {'v5': auc(s5, hy), 'v4': auc(s4, hy)},
        'v5': {'avoid_hit': rate(b5, 2, True), 'caution_hit': rate(b5, 1, True), 'avoid_false': rate(b5, 2, False), 'caution_false': rate(b5, 1, False)},
        'v4': {'avoid_hit': rate(b4, 2, True), 'caution_hit': rate(b4, 1, True), 'avoid_false': v4_avoid_rate, 'caution_false': rate(b4, 1, False)},
        # v5 cut where it flags as many ordinary days as v4 does at each band, so the two are compared at equal alarm burden
        'memory': memory, 'memory_days': best_mem,
        'same_alarm_rate': [{'band': name, 'rate': r, 'v5_hit': hit_at_rate(s5, hy, r) if r else None, 'v4_hit': rate(b4, lvl, True)}
                            for name, lvl, r in (('Caution', 1, rate(b4, 1, False)), ('Avoid', 2, v4_avoid_rate))],
    }
    # final model on every year
    hist_all = hist_counts(net, set(years))
    Xall = X(rows, hist_all)
    m = fit(Xall, ys)
    m['bands'] = bands(m, Xall, ys)
    m.update({
        'version': 5, 'features': FEATURES, 'trained': dt.date.today().isoformat(),
        'data': {'rain': rain['source'], 'labels': 'NASA Global Landslide Catalog 2007 to 2017, events located to 10 km or better within their accuracy circle (at least 3 km) of a hill road',
                 'years': years, 'stretch_days': len(rows), 'positives': sum(ys), 'season': '1 June to 30 September'},
        'hist': hist_all, 'cv': cv, 'memory_days': cv['memory_days'],
        # raw inputs and the score Python gives them, so the app's test can check its copy of the model gives the same
        'checks': [{'in': [r['r1'], r['r3'], r['a7'], r['a30'], r['slope'], hist_all[r['link']]], 'score': None} for r in
                   ([r for r in rows if r['y']][:6] + rows[::max(1, len(rows) // 14)][:14])],
        'note': 'Scores rank stretch-days by how much they look like days with a reported landslide. The catalog only has landslides that made the news, so this is not a probability.',
    })
    for c in m['checks']:
        c['in'] = [round(v, 1) if isinstance(v, float) else v for v in c['in']]
        c['score'] = score(m, logit(m, features(*c['in'])))
    return m


def score_daily(m, net, start, by, day):
    """v5 and v4 band per hill stretch on `day` from daily rain that starts at `start`."""
    i = (d(day) - d(start)).days
    out = []
    for l in net.hill():
        ser = by[l['key']]
        r1, r3, a7, a30 = window_sums(ser, i)
        z = logit(m, features(r1, r3, a7, a30, l['slope'], m['hist'][l['id']]))
        s5 = score(m, z)
        s4 = v4_score(r1, r3, l['susc'], m['hist'][l['id']])
        mem = mem_days(m, ser, i, l['slope'], m['hist'][l['id']], m.get('memory_days', 0))
        out.append({'id': l['id'], 'v5': with_memory(s5, mem), 'v5_no_memory': s5, 'mem': mem, 'v4': s4, 'r1': round(r1, 1), 'r3': round(r3, 1), 'a7': round(a7, 1), 'a30': round(a30, 1)})
    return out


def external(m, net, gt, ext):
    """News closure days (never seen in training) and dry control days, plus how often each band fires in the 2025 monsoon."""
    res = []
    for ev in gt['events']:
        day = ext['days'][ev['date']]
        rows = score_daily(m, net, day['start'], day['by'], ev['date'])
        closed = sorted(set(c['link'] for c in ev['closures']))
        res.append({'date': ev['date'], 'control': ev['control'], 'closed': closed, 'rows': rows,
                    'v5': _tally(rows, closed, 'v5'), 'v5_no_memory': _tally(rows, closed, 'v5_no_memory'), 'v4': _tally(rows, closed, 'v4')})
    s = ext['season2025']
    first = (d('2025-06-01') - d(s['start'])).days
    n = len(next(iter(s['by'].values())))
    season = {'v5': [0, 0, 0], 'v5_no_memory': [0, 0, 0], 'v4': [0, 0, 0], 'days': 0}
    for i in range(first, n):
        day = (d(s['start']) + dt.timedelta(days=i)).isoformat()
        for r in score_daily(m, net, s['start'], s['by'], day):
            season['v5'][band(r['v5'])] += 1
            season['v5_no_memory'][band(r['v5_no_memory'])] += 1
            season['v4'][band(r['v4'])] += 1
        season['days'] += 1
    return {'events': res, 'season2025': season}


def _tally(rows, closed, k):
    named = [r for r in rows if r['id'] in closed]
    other = [r for r in rows if r['id'] not in closed]
    return {'named': len(named), 'avoid': sum(1 for r in named if band(r[k]) == 2), 'caution_up': sum(1 for r in named if band(r[k]) >= 1),
            'other_avoid': sum(1 for r in other if band(r[k]) == 2)}
