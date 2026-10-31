"""Backtest: the risk engine scored against real road closures (roadmap 4.1).

Ground truth is the closure inventory (inventory.py: every PWD SRMD report folded into closures). PWD names roads, not
points on them, so a closure is matched to PahaadPath stretches two ways and both are reported:
  strict   the road name mentions both towns at the ends of the stretch
  relaxed  the road name mentions a town at one end, in the same district, on a national, state or district road
           (village PMGSY roads are left out: they are rarely the road a traveller is on)
A stretch-day is positive on the day its closure starts. Days while it stays closed afterwards are left out rather
than counted either way.

Each hill stretch is scored for each day of the season with the app's own engine (engine.py, the v4 rain threshold)
on ERA5 hourly rain, which is what the Proof tab replays. Reported per threshold set (Caine 1980, and the fitted
curves from calibrate.py when there are enough closures):
  POD, FAR, CSI, POFD and TSS (POD - POFD) at the Caution (35) and Avoid (65) cut-offs
  Brier score of score/100 against the outcome
  lead time: hours from the first Caution or worse in the 72 h before the closure to the closure itself
with 95 per cent intervals from resampling days (2,000 times). Fitted thresholds are only `adopted` (used by the app)
when their TSS at Caution beats Caine's by more than the interval, on folds the fit never saw (one season held out at a
time, or one month when there is only one season)."""
import datetime as dt
import json
import math
import random

from . import calibrate
from .engine import band, seg_score, series_from

CUT = {'caution': 35, 'avoid': 65}
ROAD_TYPES = {'NH', 'SH', 'MDR', 'ODR'}


def _day(t):
    return t.split(' ')[0]


def labels(inv, net, mode='relaxed'):
    """{(stretch id, IST day): closure time or None} for closures that start on that day"""
    from .closures import DISTRICT
    hill = [l for l in net.links.values() if not l['plain']]
    out = {}
    for ep in inv['done'] + list(inv['open'].values()):
        day = (ep.get('c') or '')[:10] or _day(ep['first'])
        if mode == 'strict':
            ids = set(ep.get('links') or [])
        else:
            if ep.get('ag') == 'PMGSY' or ep.get('ty') not in ROAD_TYPES:
                continue
            near = set(ep.get('near') or [])
            ids = {l['id'] for l in hill if (l['a'] in near and DISTRICT.get(l['a']) in (None, ep.get('d')))
                   or (l['b'] in near and DISTRICT.get(l['b']) in (None, ep.get('d')))}
            ids |= set(ep.get('links') or [])
        for lid in ids:
            k = (lid, day)
            if k not in out or (ep.get('c') and (out[k] is None or ep['c'] < out[k])):
                out[k] = ep.get('c')
    return out


def closed_days(inv, net, mode='relaxed'):
    """stretch-days after a closure started and before it opened: left out of the scoring"""
    lab = labels(inv, net, mode)
    skip = set()
    for (lid, day) in lab:
        skip.add((lid, day))
    out = set()
    for ep in inv['done'] + list(inv['open'].values()):
        a = (ep.get('c') or '')[:10] or _day(ep['first'])
        b = _day(ep['opened']) if ep.get('opened') else _day(ep['last'])
        lids = {lid for (lid, day) in lab if day == a}
        d = dt.date.fromisoformat(a) + dt.timedelta(days=1)
        while d.isoformat() <= b:
            for lid in lids:
                out.add((lid, d.isoformat()))
            d += dt.timedelta(days=1)
    return out - skip


def season(inv):
    """first and last day the reports cover"""
    days = sorted(r['date'] for r in inv['reports'])
    return days[0], days[-1]


def score_rows(net, rain, start, days, th=None):
    """[(stretch, day, max score over the day, hour of the max)] for every hill stretch and day"""
    rec = {'start': start, 'by': rain}
    rows = []
    for day in days:
        ser = series_from(rec, day)
        for l in net.hill():
            best = max(((seg_score(l, ser[l['key']], a, th=th)['score'], a) for a in range(24)), key=lambda x: x[0])
            rows.append((l['id'], day, best[0], best[1]))
    return rows


def lead_hours(net, rain, start, lid, at, th=None, cut=35):
    """hours between the first score at or above `cut` in the 72 h before the closure and the closure; 0 if none"""
    t0 = dt.datetime.fromisoformat(start + 'T00:00')
    when = dt.datetime.fromisoformat(at)
    i = int((when - t0).total_seconds() // 3600)
    l = net.links[lid]
    ser = rain[l['key']]
    for back in range(72, -1, -1):
        j = i - back
        if j < 72 or j >= len(ser):
            continue
        rec = {'start': start, 'by': {l['key']: ser}}
        day = (t0 + dt.timedelta(hours=j)).date().isoformat()
        s = series_from(rec, day)[l['key']]
        if seg_score(l, s, j % 24, th=th)['score'] >= cut:
            return back
    return 0


def table(tp, fp, fn, tn):
    pod = tp / (tp + fn) if tp + fn else None
    far = fp / (tp + fp) if tp + fp else None
    pofd = fp / (fp + tn) if fp + tn else None
    csi = tp / (tp + fp + fn) if tp + fp + fn else None
    tss = pod - pofd if pod is not None and pofd is not None else None
    return {'tp': tp, 'fp': fp, 'fn': fn, 'tn': tn, 'pod': pod, 'far': far, 'pofd': pofd, 'csi': csi, 'tss': tss}


def metrics(rows, lab, skip):
    """rows from score_rows; the scored set leaves out days a stretch was already closed"""
    use = [(lid, day, s) for lid, day, s, h in rows if (lid, day) not in skip]
    out = {}
    for name, cut in CUT.items():
        tp = sum(1 for lid, day, s in use if s >= cut and (lid, day) in lab)
        fp = sum(1 for lid, day, s in use if s >= cut and (lid, day) not in lab)
        fn = sum(1 for lid, day, s in use if s < cut and (lid, day) in lab)
        tn = len(use) - tp - fp - fn
        out[name] = table(tp, fp, fn, tn)
    out['brier'] = sum(((s / 100) - (1 if (lid, day) in lab else 0)) ** 2 for lid, day, s in use) / len(use) if use else None
    out['n'] = len(use)
    out['positives'] = sum(1 for lid, day, s in use if (lid, day) in lab)
    return out


def interval(rows, lab, skip, key, reps=2000, seed=11):
    """95 per cent interval of one metric (e.g. ('caution', 'tss')) from resampling days"""
    rnd = random.Random(seed)
    days = sorted({day for lid, day, s, h in rows})
    by = {}
    for r in rows:
        by.setdefault(r[1], []).append(r)
    vals = []
    for _ in range(reps):
        pick = [days[rnd.randrange(len(days))] for _ in days]
        rr = [r for d in pick for r in by[d]]
        v = metrics(rr, lab, skip)[key[0]][key[1]]
        if v is not None:
            vals.append(v)
    if not vals:
        return None
    vals.sort()
    return [vals[int(.025 * len(vals))], vals[min(len(vals) - 1, int(.975 * len(vals)))]]


def folds(days):
    """season (year) blocks, or month blocks when there is one season"""
    years = sorted({d[:4] for d in days})
    key = (lambda d: d[:4]) if len(years) > 1 else (lambda d: d[:7])
    groups = {}
    for d in days:
        groups.setdefault(key(d), []).append(d)
    return [groups[k] for k in sorted(groups)]


def run(inv, net, rain, start, mode='relaxed', log=print):
    """everything the report and the app need"""
    first, last = season(inv)
    days = []
    d = dt.date.fromisoformat(max(first, (dt.date.fromisoformat(start) + dt.timedelta(days=3)).isoformat()))
    covered = {r['date'] for r in inv['reports']}  # only days PWD reported on (seasons have gaps between them)
    while d.isoformat() <= last:
        if d.isoformat() in covered:
            days.append(d.isoformat())
        d += dt.timedelta(days=1)
    lab = {k: v for k, v in labels(inv, net, mode).items() if k[1] in set(days)}
    skip = closed_days(inv, net, mode)
    log('backtest: %d days, %d stretch-days, %d closures matched to stretches (%s)' % (len(days), len(days) * len(net.hill()), len(lab), mode))
    caine_rows = score_rows(net, rain, start, days)
    out = {'mode': mode, 'season': [days[0], days[-1]] if days else None, 'days': len(days), 'closures': len(lab),
           'reports': len(inv['reports'])}
    out['caine'] = metrics(caine_rows, lab, skip)
    out['caine']['ci_tss_caution'] = interval(caine_rows, lab, skip, ('caution', 'tss'))
    leads = [lead_hours(net, rain, start, lid, at) for (lid, day), at in lab.items() if at and 'T' in at]
    out['caine']['lead_median_h'] = sorted(leads)[len(leads) // 2] if leads else None
    out['caine']['lead_n'] = len(leads)

    # fitted thresholds, each fold fitted without its own days
    pts_all = calibrate.closure_points(net, rain, start, lab)
    fits = calibrate.fit_zones(pts_all)
    out['fit'] = None
    out['adopted'] = None
    if not fits:
        out['fit_note'] = 'only %d closures with rain could be placed; %d are needed before thresholds are fitted' % (len(pts_all), calibrate.MIN_EVENTS)
        return out
    best = None
    for level in calibrate.LEVELS:
        rows = []
        for fold in folds(days):
            train = {k: v for k, v in lab.items() if k[1] not in set(fold)}
            f = calibrate.fit_zones(calibrate.closure_points(net, rain, start, train))
            th = calibrate.at_level(f or fits, level)
            rows += score_rows(net, rain, start, fold, th)
        m = metrics(rows, lab, skip)
        m['ci_tss_caution'] = interval(rows, lab, skip, ('caution', 'tss'))
        log('backtest: fitted at %d%%: TSS caution %s, avoid %s' % (level, _f(m['caution']['tss']), _f(m['avoid']['tss'])))
        if best is None or (m['caution']['tss'] or -1) > (best[1]['caution']['tss'] or -1):
            best = (level, m)
    level, m = best
    th = calibrate.at_level(fits, level)
    for z, f in list(th['zones'].items()) + [('pooled', th['pooled'])]:
        pts = [(e, d) for zz, e, d in pts_all if z == 'pooled' or zz == z]
        f['spread'] = calibrate.bootstrap(pts, level)
    out['fit'] = {'level': level, 'thresholds': th, 'metrics': m, 'points': len(pts_all)}
    c, ci = out['caine']['caution']['tss'], out['caine']['ci_tss_caution']
    better = c is not None and m['caution']['tss'] is not None and ci and m['caution']['tss'] > ci[1]
    out['adopted'] = th if better else None
    return out


def _f(v, pct=False):
    return 'n/a' if v is None else ('%.0f%%' % (100 * v) if pct else '%.2f' % v)


def report_md(r):
    """data/model/BACKTEST.md"""
    L = ['# Backtest against PWD road closures', '']
    if not r.get('season'):
        return '\n'.join(L + ['No season of closure reports read yet.'])
    L += ['Season %s to %s: %d days, %d PWD reports, %d closures matched to PahaadPath stretches (%s matching).' % (
        r['season'][0], r['season'][1], r['days'], r['reports'], r['closures'], r['mode']), '']
    L += ['| Thresholds | Cut-off | POD | FAR | CSI | TSS | Brier |', '|---|---|---|---|---|---|---|']
    sets = [('Caine 1980 (in use)' if not r.get('adopted') else 'Caine 1980', r['caine'])]
    if r.get('fit'):
        sets.append(('Fitted, %d%% level%s' % (r['fit']['level'], ' (in use)' if r.get('adopted') else ''), r['fit']['metrics']))
    for name, m in sets:
        for cut in ('caution', 'avoid'):
            t = m[cut]
            L.append('| %s | %s | %s | %s | %s | %s | %s |' % (name, cut.title(), _f(t['pod'], 1), _f(t['far'], 1), _f(t['csi'], 1), _f(t['tss']),
                                                              _f(m['brier']) if cut == 'caution' else ''))
    ci = r['caine'].get('ci_tss_caution')
    L += ['', 'TSS at Caution for Caine: 95%% interval %s to %s.' % (_f(ci[0]), _f(ci[1])) if ci else '']
    if r['caine'].get('lead_n'):
        L.append('Median warning lead time (Caine, Caution or worse before the closure): %d h over %d closures with a time.' % (r['caine']['lead_median_h'], r['caine']['lead_n']))
    if r.get('fit_note'):
        L += ['', 'Thresholds were not fitted: %s.' % r['fit_note']]
    elif r.get('fit'):
        L += ['', 'Fitted thresholds are %s.' % ('in use: they beat Caine on held-out days by more than the interval' if r.get('adopted')
                                               else 'not in use: they did not beat Caine on held-out days by more than the interval')]
    L += ['', 'Ground truth: Uttarakhand PWD SRMD closure reports. PWD names roads, not points, so matches to stretches are approximate. '
          'Rain: ERA5 hourly from Open-Meteo, the same source the Proof tab replays.']
    return '\n'.join(L) + '\n'


def summary(r):
    """the part the app bakes in (Proof tab)"""
    keep = lambda m: {k: {x: m[k][x] for x in ('pod', 'far', 'csi', 'tss')} for k in CUT} | {'brier': m['brier'], 'n': m['n'], 'positives': m['positives']}
    out = {k: r.get(k) for k in ('mode', 'season', 'days', 'closures', 'reports')}
    out['caine'] = keep(r['caine']) | {'ci_tss_caution': r['caine'].get('ci_tss_caution'), 'lead_median_h': r['caine'].get('lead_median_h')}
    out['fit'] = {'level': r['fit']['level'], 'metrics': keep(r['fit']['metrics'])} if r.get('fit') else None
    out['adopted'] = bool(r.get('adopted'))
    out['note'] = r.get('fit_note')
    return out
