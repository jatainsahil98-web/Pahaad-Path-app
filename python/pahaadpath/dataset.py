"""Training and test tables: one row per hill stretch and day.

Labels. A stretch-day is positive when a NASA Global Landslide Catalog event (2007 to 2017, located to 10 km or better)
lies within its accuracy circle (at least 3 km) of the road on that date. The day before and after an event are left
out, because news dates are often a day off. The catalog only holds landslides that reached the news, so a negative
day means "nothing reported", not "nothing fell". Read every score as a ranking, not a probability.

Rain. Daily ERA5 totals at the stretch midpoint (the same grid point the app uses for forecasts):
  r1  rain on the day, r3 the last 3 days, a7 days 3 to 9 before, a30 days 10 to 30 before.
a7 and a30 are the "memory" the v4 engine did not have: wet slopes and debris left by earlier storms."""
import datetime as dt
import math

from .openmeteo import archive_daily

YEARS = list(range(2007, 2018))
SEASON = ('05-01', '09-30')   # fetched window each year; labels from 1 June so every day has 30 days of history
LABEL_FROM = '06-01'
CONTROLS_AND_CLOSURES = None  # filled from replay_source/gt.json
FEATURES = ['log_r1', 'log_r3', 'log_a7', 'log_a30', 'slope', 'log_hist']


def d(s):
    return dt.date.fromisoformat(s)


def window_sums(series, i):
    """r1, r3, a7, a30 for day index i of a daily series (None counts as 0)."""
    def s(a, b):
        return sum((series[j] or 0) for j in range(max(0, a), b + 1))
    return s(i, i), s(i - 2, i), s(i - 9, i - 3), s(i - 30, i - 10)


def features(r1, r3, a7, a30, slope_p75, n_hist):
    """Must match modelFeatures() in src/model.js."""
    return [math.log1p(r1), math.log1p(r3), math.log1p(a7), math.log1p(a30),
            ((slope_p75 if slope_p75 is not None else 34.0) - 34.0) / 5.0, math.log1p(n_hist)]


def fetch_training(net, log=print):
    keys = net.keys(hill_only=True)
    out = {}
    for y in YEARS:
        log('ERA5 daily rain %d (%d places)' % (y, len(keys)))
        out[str(y)] = archive_daily(keys, '%d-%s' % (y, SEASON[0]), '%d-%s' % (y, SEASON[1]), log=log)
    return {'source': 'ERA5 reanalysis via archive-api.open-meteo.com (CC BY 4.0), daily precipitation_sum, IST days',
            'window': SEASON, 'years': YEARS, 'keys': keys, 'by_year': out}


def fetch_external(net, gt, log=print):
    """Rain for the news closure days and dry control days (31 days up to each day) and the whole 2025 monsoon."""
    keys = net.keys(hill_only=True)
    days = {}
    for ev in gt['events']:
        start = (d(ev['date']) - dt.timedelta(days=30)).isoformat()
        log('ERA5 daily rain for %s' % ev['date'])
        days[ev['date']] = {'start': start, 'by': archive_daily(keys, start, ev['date'], log=log)}
    log('ERA5 daily rain for the 2025 monsoon')
    season = {'start': '2025-05-01', 'by': archive_daily(keys, '2025-05-01', '2025-09-30', log=log)}
    return {'source': 'ERA5 reanalysis via archive-api.open-meteo.com (CC BY 4.0)', 'days': days, 'season2025': season}


def event_links(net, years=None):
    """{(link id, date): [event ids]} for catalog events near hill stretches."""
    out = {}
    for l in net.hill():
        for e in l['events']:
            if not e['date'] or (years is not None and int(e['date'][:4]) not in years):
                continue
            out.setdefault((l['id'], e['date']), []).append(e['id'])
    return out


def hist_counts(net, years):
    """Catalog events near each stretch, counting only the given years (so a held-out year never sees its own events)."""
    return {l['id']: sum(1 for e in l['events'] if e['date'] and int(e['date'][:4]) in years) for l in net.hill()}


def training_rows(net, rain):
    """Every hill stretch and day from 1 June to 30 September of each year with rain data."""
    pos = event_links(net)
    near = set()
    for (lid, day) in pos:
        for k in (-1, 1):
            near.add((lid, (d(day) + dt.timedelta(days=k)).isoformat()))
    rows = []
    for y in rain['years']:
        by = rain['by_year'][str(y)]
        start = d('%d-%s' % (y, SEASON[0]))
        first = (d('%d-%s' % (y, LABEL_FROM)) - start).days
        for l in net.hill():
            ser = by.get(l['key'])
            if not ser:
                continue
            for i in range(first, len(ser)):
                day = (start + dt.timedelta(days=i)).isoformat()
                y1 = 1 if (l['id'], day) in pos else 0
                if not y1 and (l['id'], day) in near:
                    continue
                if ser[i] is None:
                    continue
                r1, r3, a7, a30 = window_sums(ser, i)
                rows.append({'link': l['id'], 'key': l['key'], 'i': i, 'date': day, 'year': y, 'y': y1, 'r1': r1, 'r3': r3, 'a7': a7, 'a30': a30,
                             'slope': l['slope'], 'susc': l['susc']})
    return rows


def X(rows, hist):
    return [features(r['r1'], r['r3'], r['a7'], r['a30'], r['slope'], hist[r['link']]) for r in rows]
