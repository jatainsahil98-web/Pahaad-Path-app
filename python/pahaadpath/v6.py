"""Risk model v6: logistic regression on PWD road closures with more than rain (roadmap 2.3).

Rows are hill stretch-days of the closure inventory's season, labelled as in backtest.py (a closure starting that day
is positive; days a stretch was already closed are left out). Inputs, in groups that are kept or dropped together:

  rain      log rain in the 24 h and 72 h to the end of the day, days 3 to 9 before, days 10 to 30 before
  static    slope (DEM) and NASA catalog landslides near the stretch, as in v5
  peak      heaviest 1 h and 3 h of rain in the day: a cloudburst and a drizzle with the same total behave differently
  soil      ERA5 soil moisture at 0-7, 7-28 and 28-100 cm at the start of the day: the same rain closes roads on
            soaked ground and not on dry ground
  season    log rain in the 92 days before the day: late monsoon slopes give way at less rain
  history   log PWD closures on the stretch, counted only on days outside the fold being scored
  cold      0 C crossings in the last 72 h (freeze-thaw loosens rock on high stretches)
  quake     earthquakes of magnitude 3.5 or more in the last 7 days, weighted by size and distance (USGS)
  gsi       GSI landslide susceptibility along the road (mean class, share with High within 100 m) and GSI-mapped
            landslides within 1 km (data/gsi_uttarakhand.json)

Groups are added one at a time (forward selection) and kept only when the score on held-out folds (one season, or one
month when there is one season) improves by MIN_GAIN. The Caution and Avoid cut-offs are set on the training folds so
the model flags the same share of ordinary stretch-days as the current engine (Caine), so a better score cannot come
from simply warning less: it shows as more closures warned at the same alarm burden, or fewer false alarms.

v6 is `adopted` (used by the data pack and the phone alerts) only when its held-out TSS at Caution beats the upper end
of the current engine's 95 per cent interval. Standard library only."""
import datetime as dt
import json
import math
import os
import urllib.parse
import urllib.request

from . import path
from .backtest import CUT, closed_days, folds, interval, labels, metrics, score_rows
from .model import fit, logit

GROUPS = {
    'rain': ['log_p24', 'log_p72', 'log_a7', 'log_a30'],
    'static': ['slope', 'log_hist'],
    'peak': ['log_i1', 'log_i3'],
    'soil': ['sm0', 'sm1', 'sm2'],
    'season': ['log_r92'],
    'history': ['log_closures'],
    'cold': ['freeze_thaw'],
    'quake': ['quake'],
    'gsi': ['gsi_mean', 'gsi_high100', 'log_gsi_ls1k'],
}
BASE = ('rain', 'static')
MIN_GAIN = 0.01
LEAD_DAYS = 92          # hours of history each row needs before its day
QUAKE_BOX = (27.5, 32.5, 76.5, 82.0)
USGS = 'https://earthquake.usgs.gov/fdsnws/event/1/query'


def hav(la1, lo1, la2, lo2):
    r = math.pi / 180
    a = math.sin((la2 - la1) * r / 2) ** 2 + math.cos(la1 * r) * math.cos(la2 * r) * math.sin((lo2 - lo1) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


def fetch_quakes(start, end, log=print):
    """[(UTC epoch s, lat, lon, magnitude)] from the USGS catalogue, cached; None when it cannot be read"""
    cf = path('data', 'cache', 'usgs', 'q_%s_%s.json' % (start, end))
    if os.path.exists(cf):
        with open(cf, encoding='utf-8') as f:
            return json.load(f)
    q = urllib.parse.urlencode({'format': 'geojson', 'starttime': start, 'endtime': end, 'minmagnitude': 3.5,
                                'minlatitude': QUAKE_BOX[0], 'maxlatitude': QUAKE_BOX[1],
                                'minlongitude': QUAKE_BOX[2], 'maxlongitude': QUAKE_BOX[3]})
    try:
        with urllib.request.urlopen(urllib.request.Request(USGS + '?' + q, headers={'User-Agent': 'pahaadpath-pipeline'}), timeout=60) as r:
            js = json.loads(r.read().decode())
    except Exception as e:  # noqa: BLE001 - the model is trained without the group rather than failing
        log('USGS earthquakes not read (%s); the quake group is left out' % e)
        return None
    out = [(f['properties']['time'] / 1000, f['geometry']['coordinates'][1], f['geometry']['coordinates'][0], f['properties']['mag'])
           for f in js['features'] if f['properties'].get('mag') is not None]
    os.makedirs(os.path.dirname(cf), exist_ok=True)
    with open(cf, 'w', encoding='utf-8') as f:
        json.dump(out, f)
    return out


def _sum(s, a, b):
    return sum((s[j] or 0) for j in range(max(0, a), min(len(s), b)))


def quake_load(quakes, lat, lon, t_end, days=7):
    """sum of 10^(M-4)/2 * exp(-km/30) over quakes in the `days` before t_end (UTC epoch s), log1p"""
    if not quakes:
        return 0.0
    tot = 0.0
    for t, la, lo, m in quakes:
        if t_end - days * 86400 <= t < t_end:
            tot += 10 ** ((m - 4) / 2) * math.exp(-hav(lat, lon, la, lo) / 30)
    return math.log1p(tot)


def day_features(link, vars_, i0, n_closures, quakes=None, t0_utc=None):
    """every input for one stretch and the day whose first hour is index i0 of the hourly series"""
    k = link['key']
    p = vars_['precipitation'][k]
    e = i0 + 24
    day = p[i0:e]
    i3 = max((_sum(p, j - 2, j + 1) for j in range(i0, e)), default=0)

    def at(v):
        s = vars_.get(v, {}).get(k)
        x = s[i0] if s and 0 <= i0 < len(s) else None
        return x if x is not None else 0.0
    t = vars_.get('temperature_2m', {}).get(k) or []
    tt = [x for x in t[max(0, e - 72):e] if x is not None]
    ft = sum(1 for a, b in zip(tt, tt[1:]) if (a > 0) != (b > 0))
    lat, lon = (float(x) for x in k.split(','))
    g = link.get('gsi')
    return {
        'log_p24': math.log1p(_sum(p, e - 24, e)), 'log_p72': math.log1p(_sum(p, e - 72, e)),
        'log_a7': math.log1p(_sum(p, e - 240, e - 72)), 'log_a30': math.log1p(_sum(p, e - 720, e - 240)),
        'slope': ((link['slope'] if link.get('slope') is not None else 34.0) - 34.0) / 5.0,
        'log_hist': math.log1p(len(link.get('events') or [])),
        'log_i1': math.log1p(max((x or 0) for x in day) if day else 0), 'log_i3': math.log1p(i3),
        'sm0': at('soil_moisture_0_to_7cm'), 'sm1': at('soil_moisture_7_to_28cm'), 'sm2': at('soil_moisture_28_to_100cm'),
        'log_r92': math.log1p(_sum(p, i0 - LEAD_DAYS * 24, i0)),
        'log_closures': math.log1p(n_closures),
        'freeze_thaw': float(ft),
        'quake': quake_load(quakes, lat, lon, t0_utc + e * 3600) if t0_utc is not None else 0.0,
        'gsi_mean': (g.get('mean') or 1.5) if g else 1.5, 'gsi_high100': g.get('high100', 0) if g else 0.0,
        'log_gsi_ls1k': math.log1p(g.get('ls1k', 0)) if g else 0.0,
    }


def build_rows(net, vars_, start, days, quakes=None):
    """[(stretch id, day, features without history)] for every hill stretch and day"""
    t0 = dt.datetime.fromisoformat(start + 'T00:00') - dt.timedelta(hours=5, minutes=30)
    t0_utc = t0.replace(tzinfo=dt.timezone.utc).timestamp()
    rows = []
    for day in days:
        i0 = (dt.date.fromisoformat(day) - dt.date.fromisoformat(start)).days * 24
        for l in net.hill():
            if l['key'] not in vars_['precipitation']:
                continue
            rows.append((l['id'], day, day_features(l, vars_, i0, 0, quakes, t0_utc)))
    return rows


def closure_counts(lab, days):
    out = {}
    for (lid, day) in lab:
        if day in days:
            out[lid] = out.get(lid, 0) + 1
    return out


def _x(f, names):
    return [f[n] for n in names]


def cut_at_rate(z_neg, rate):
    """logit cut-off that flags `rate` of the negatives"""
    s = sorted(z_neg)
    if not s:
        return float('inf')
    k = min(len(s) - 1, max(0, int(round((1 - rate) * len(s)))))
    return s[k]


def to_score(z, cuts):
    """0 to 100 with Caution at 35 and Avoid at 65, like the app's bands"""
    zc, za, z0, zs = cuts['zc'], cuts['za'], cuts['z0'], cuts['zspan']
    if z < zc:
        s = 34 * min(1, max(0, (z - z0) / ((zc - z0) or 1)))
    elif z < za:
        s = 35 + 29 * (z - zc) / ((za - zc) or 1)
    else:
        s = 65 + 35 * min(1, (z - za) / (zs or 1))
    return int(math.floor(s + .5))


def fit_bands(m, X, y, rates):
    zs = [logit(m, x) for x in X]
    neg = [z for z, t in zip(zs, y) if not t]
    pos = [z for z, t in zip(zs, y) if t]
    zc, za = cut_at_rate(neg, rates['caution']), cut_at_rate(neg, rates['avoid'])
    if za <= zc:
        za = zc + 1e-6
    neg.sort()
    return {'zc': zc, 'za': za, 'z0': neg[len(neg) // 2] if neg else zc - 1, 'zspan': max(.5, (max(pos) if pos else za + 1) - za)}


def alarm_rates(rows_caine, lab, skip, days):
    """share of ordinary stretch-days the current engine flags at each band, on the given days"""
    neg = [s for lid, day, s, h in rows_caine if day in days and (lid, day) not in lab and (lid, day) not in skip]
    return {k: (sum(1 for s in neg if s >= c) / len(neg) if neg else 0.0) for k, c in CUT.items()}


def held_out(rows, lab, skip, caine_rows, names, all_days):
    """scored rows like score_rows (stretch, day, score, 0) with every fold fitted without its own days"""
    out = []
    for fold in folds(all_days):
        fs = set(fold)
        train_days = set(all_days) - fs
        counts = closure_counts(lab, train_days)
        tr = [(lid, day, f) for lid, day, f in rows if day in train_days and (lid, day) not in skip]
        if not any((lid, day) in lab for lid, day, f in tr):
            continue
        X = [_x(dict(f, log_closures=math.log1p(counts.get(lid, 0))), names) for lid, day, f in tr]
        y = [1 if (lid, day) in lab else 0 for lid, day, f in tr]
        m = fit(X, y)
        cuts = fit_bands(m, X, y, alarm_rates(caine_rows, lab, skip, train_days))
        for lid, day, f in rows:
            if day in fs:
                z = logit(m, _x(dict(f, log_closures=math.log1p(counts.get(lid, 0))), names))
                out.append((lid, day, to_score(z, cuts), 0))
    return out


def precision(m):
    return {k: (1 - m[k]['far']) if m[k]['far'] is not None else None for k in CUT}


def run(inv, net, vars_, start, mode='relaxed', quakes=None, log=print):
    first, last = min(r['date'] for r in inv['reports']), max(r['date'] for r in inv['reports'])
    days = []
    d = max(dt.date.fromisoformat(first), dt.date.fromisoformat(start) + dt.timedelta(days=LEAD_DAYS))
    covered = {r['date'] for r in inv['reports']}  # only days PWD reported on
    while d.isoformat() <= last:
        if d.isoformat() in covered:
            days.append(d.isoformat())
        d += dt.timedelta(days=1)
    lab = {k: v for k, v in labels(inv, net, mode).items() if k[1] in set(days)}
    skip = closed_days(inv, net, mode)
    caine_rows = score_rows(net, vars_['precipitation'], start, days)
    out = {'mode': mode, 'days': len(days), 'season': [days[0], days[-1]] if days else None, 'closures': len(lab),
           'groups': {g: GROUPS[g] for g in GROUPS}, 'quakes': None if quakes is None else len(quakes)}
    out['caine'] = metrics(caine_rows, lab, skip)
    out['caine']['ci_tss_caution'] = interval(caine_rows, lab, skip, ('caution', 'tss'))
    out['caine']['precision'] = precision(out['caine'])
    if len(lab) < 30 or len(folds(days)) < 2:
        out.update(adopted=False, model=None, note='only %d closures over %d folds; at least 30 over 2 folds are needed' % (len(lab), len(folds(days))))
        return out
    log('v6: %d days, %d closures, %d folds' % (len(days), len(lab), len(folds(days))))
    rows = build_rows(net, vars_, start, days, quakes)
    groups = list(GROUPS) if quakes is not None else [g for g in GROUPS if g != 'quake']

    def score_of(gs):
        names = [n for g in gs for n in GROUPS[g]]
        sr = held_out(rows, lab, skip, caine_rows, names, days)
        m = metrics(sr, lab, skip)
        return m, sr
    chosen = list(BASE)
    best_m, best_rows = score_of(chosen)
    steps = [{'groups': list(chosen), 'tss_caution': best_m['caution']['tss'], 'precision_caution': precision(best_m)['caution'], 'kept': True}]
    log('v6 %s: TSS %.3f' % ('+'.join(chosen), best_m['caution']['tss'] or 0))
    left = [g for g in groups if g not in chosen]
    while left:
        trials = []
        for g in left:
            m, sr = score_of(chosen + [g])
            trials.append((m['caution']['tss'] or -1, g, m, sr))
            log('v6 %s + %s: TSS %.3f' % ('+'.join(chosen), g, m['caution']['tss'] or 0))
        tss, g, m, sr = max(trials, key=lambda x: x[0])
        kept = tss >= (best_m['caution']['tss'] or -1) + MIN_GAIN
        steps.append({'groups': chosen + [g], 'tss_caution': tss, 'precision_caution': precision(m)['caution'], 'kept': kept})
        if not kept:
            break
        chosen.append(g)
        left.remove(g)
        best_m, best_rows = m, sr
    for g in left:  # report what each remaining group alone adds, for the record
        if all(set(s['groups']) != set(chosen + [g]) for s in steps):
            m, sr = score_of(chosen + [g])
            steps.append({'groups': chosen + [g], 'tss_caution': m['caution']['tss'], 'precision_caution': precision(m)['caution'], 'kept': False})
    best_m['ci_tss_caution'] = interval(best_rows, lab, skip, ('caution', 'tss'))
    best_m['precision'] = precision(best_m)
    out['v6'] = best_m
    out['steps'] = steps
    out['chosen'] = chosen
    ci = out['caine']['ci_tss_caution']
    out['adopted'] = bool(ci and best_m['caution']['tss'] is not None and best_m['caution']['tss'] > ci[1])

    # final model on every day
    names = [n for g in chosen for n in GROUPS[g]]
    counts = closure_counts(lab, set(days))
    tr = [(lid, day, f) for lid, day, f in rows if (lid, day) not in skip]
    X = [_x(dict(f, log_closures=math.log1p(counts.get(lid, 0))), names) for lid, day, f in tr]
    y = [1 if (lid, day) in lab else 0 for lid, day, f in tr]
    m = fit(X, y)
    m['bands'] = fit_bands(m, X, y, alarm_rates(caine_rows, lab, skip, set(days)))
    m.update({'version': 6, 'features': names, 'groups': chosen, 'closures': counts, 'trained_on': [days[0], days[-1]],
              'checks': [{'in': [round(v, 4) for v in x], 'score': to_score(logit(m, x), m['bands'])} for x in X[::max(1, len(X) // 12)][:12]]})
    out['model'] = m
    return out


def score_now(m, net, vars_, start, i0, quakes=None):
    """{stretch id: [score, band, 0]} for the day starting at hour i0 of a forecast_vars block (data pack, phone alerts)"""
    t0 = dt.datetime.fromisoformat(start + 'T00:00') - dt.timedelta(hours=5, minutes=30)
    t0_utc = t0.replace(tzinfo=dt.timezone.utc).timestamp()
    out = {}
    for l in net.hill():
        if l['key'] not in vars_['precipitation']:
            continue
        f = day_features(l, vars_, i0, m['closures'].get(l['id'], 0), quakes, t0_utc)
        s = to_score(logit(m, _x(f, m['features'])), m['bands'])
        out[l['id']] = [s, 0 if s < 35 else 1 if s < 65 else 2, 0]
    return out


def report_md(r):
    p = lambda v: '-' if v is None else '%d%%' % round(v * 100)
    f = lambda v: '-' if v is None else '%.2f' % v
    L = ['# Model v6: more than rain', '',
         'Stretch-days %s to %s, %d PWD closures (%s match). Cut-offs flag the same share of ordinary days as the current engine.'
         % (r['season'][0] if r.get('season') else '?', r['season'][1] if r.get('season') else '?', r['closures'], r['mode']), '']
    if not r.get('model'):
        return '\n'.join(L + ['Not trained: %s.' % r.get('note', '')]) + '\n'
    L += ['| | Closures warned (Caution) | Precision (Caution) | TSS (Caution) | Closures warned (Avoid) | Precision (Avoid) |',
          '|---|---|---|---|---|---|']
    for name, m in (('Current engine (Caine)', r['caine']), ('v6: ' + ' + '.join(r['chosen']), r['v6'])):
        L.append('| %s | %s | %s | %s | %s | %s |' % (name, p(m['caution']['pod']), p(m['precision']['caution']), f(m['caution']['tss']),
                                                     p(m['avoid']['pod']), p(m['precision']['avoid'])))
    L += ['', 'Parameter groups, added one at a time on held-out folds (kept when TSS rises by %.2f or more):' % MIN_GAIN, '',
          '| Groups | TSS (Caution) | Precision (Caution) | Kept |', '|---|---|---|---|']
    for s in r['steps']:
        L.append('| %s | %s | %s | %s |' % (' + '.join(s['groups']), f(s['tss_caution']), p(s['precision_caution']), 'yes' if s['kept'] else 'no'))
    ci = r['caine']['ci_tss_caution']
    L += ['', 'v6 is %s: its TSS %s %s the top of the current engine\'s 95%% range (%s).' % (
        'in use for the data pack and phone alerts' if r['adopted'] else 'not used',
        f(r['v6']['caution']['tss']), 'is above' if r['adopted'] else 'is not above', ci and '%s to %s' % (f(ci[0]), f(ci[1])))]
    if r.get('quakes') is None:
        L.append('Earthquakes were not read this run, so that group was not tried.')
    return '\n'.join(L) + '\n'


def summary(r):
    keep = lambda m: {k: {x: m[k][x] for x in ('pod', 'far', 'tss')} for k in CUT}
    out = {'adopted': bool(r.get('adopted')), 'chosen': r.get('chosen'), 'note': r.get('note')}
    if r.get('v6'):
        out['v6'] = keep(r['v6']) | {'ci_tss_caution': r['v6'].get('ci_tss_caution')}
        out['steps'] = [{'groups': s['groups'], 'tss': s['tss_caution'], 'kept': s['kept']} for s in r['steps']]
    return out
