"""Check on other years: the engine and model v6 scored against dated landslides from catalogues they were never fitted on.

The PWD closure reports online cover one season (2026), so the season backtest can only hold out months. Here every
monsoon (1 June to 30 September) with dated landslides near PahaadPath's hill roads is scored instead:
  NASA Global Landslide Catalog (2007 to 2017, already in data/)           events located to 5 km or better
  NASA COOLR, Cooperative Open Online Landslide Repository (2018 onwards)  read from NASA's public map service
A stretch-day is positive when an event lies within max(2 km, its location accuracy) of the road on that day. The day
before and after are left out (news dates are often a day off). Both catalogues hold only landslides that reached the
news or a volunteer, so a day with no event is "nothing reported", not "nothing fell": the honest figure is the share of
reported landslides that were warned (POD) at the alarm rate each method runs at, not the false alarm ratio.

Model v6 here is the one trained on 2026 PWD closures; its "past PWD closures" input is a fixed property of each road
(how often it closes), used the same way for every year. Rain and soil moisture are ERA5 for each day."""
import datetime as dt
import json
import math
import os
import urllib.parse
import urllib.request

from . import path
from .backtest import CUT, metrics, score_rows
from .network import dist_to_line

COOLR = 'https://gis.earthdata.nasa.gov/gis05/rest/services/Landslides/COOLR_Events_Points/FeatureServer/0/query'
BBOX = (77.5, 28.7, 81.1, 31.5)
NEAR_KM = 2.0
MIN_EVENTS = 3       # seasons with fewer events near hill roads are not scored
MAX_SEASONS = 10


def fetch_coolr(log=print):
    """dated COOLR events in the Uttarakhand box as [{date, lat, lon, cat, trig, title}], cached; None if unreadable"""
    cf = path('data', 'coolr_uttarakhand.json')
    out, off = [], 0
    try:
        while True:
            q = urllib.parse.urlencode({'where': '1=1', 'geometry': ','.join(map(str, BBOX)), 'geometryType': 'esriGeometryEnvelope',
                                        'inSR': 4326, 'spatialRel': 'esriSpatialRelIntersects', 'outSR': 4326, 'f': 'json',
                                        'outFields': 'event_date,event_title,landslide_category,landslide_trigger,latitude,longitude,source_name',
                                        'resultOffset': off, 'resultRecordCount': 1000, 'orderByFields': 'objectid'})
            with urllib.request.urlopen(urllib.request.Request(COOLR + '?' + q, headers={'User-Agent': 'pahaadpath-pipeline'}), timeout=90) as r:
                js = json.loads(r.read().decode())
            feats = js.get('features') or []
            for f in feats:
                a = f['attributes']
                if not a.get('event_date'):
                    continue
                d = dt.datetime.fromtimestamp(a['event_date'] / 1000, dt.timezone(dt.timedelta(hours=5, minutes=30))).date().isoformat()
                out.append({'date': d, 'lat': a.get('latitude') or f['geometry']['y'], 'lon': a.get('longitude') or f['geometry']['x'],
                            'cat': a.get('landslide_category'), 'trig': a.get('landslide_trigger'), 'title': (a.get('event_title') or '')[:120],
                            'src': a.get('source_name')})
            if len(feats) < 1000 or not js.get('exceededTransferLimit', len(feats) == 1000):
                break
            off += 1000
    except Exception as e:  # noqa: BLE001 - keep the last saved copy
        log('COOLR not read (%s); using the saved copy' % e)
        if os.path.exists(cf):
            with open(cf, encoding='utf-8') as f:
                return json.load(f)['events']
        return None
    out.sort(key=lambda e: e['date'])
    with open(cf, 'w', encoding='utf-8') as f:
        json.dump({'source': 'NASA COOLR (Cooperative Open Online Landslide Repository), ' + COOLR.rsplit('/query', 1)[0],
                   'box': BBOX, 'events': out}, f, ensure_ascii=False, indent=0)
    log('COOLR: %d dated events in the box' % len(out))
    return out


def catalog_events(net, coolr):
    """[(date, lat, lon, accuracy km, source)] from both catalogues"""
    ev = [(e['date'], e['lat'], e['lon'], e['acc'], 'GLC') for e in net.catalog if e['date'] and e['acc'] <= 5]
    ev += [(e['date'], e['lat'], e['lon'], 0, 'COOLR') for e in (coolr or []) if e.get('lat') is not None]
    return sorted(set(ev))


def season_labels(net, events):
    """{year: {(stretch, day)}} for events in June to September near a hill road"""
    out = {}
    for d, la, lo, acc, src in events:
        if not ('06-01' <= d[5:] <= '09-30'):
            continue
        for l in net.hill():
            if dist_to_line(la, lo, l['geom']) <= max(NEAR_KM, acc):
                out.setdefault(int(d[:4]), set()).add((l['id'], d))
    return out


def days_of(year):
    d, out = dt.date(year, 6, 1), []
    while d <= dt.date(year, 9, 30):
        out.append(d.isoformat())
        d += dt.timedelta(days=1)
    return out


def at_rate(rows, lab, skip, rate):
    """share of positives above the cut-off that flags `rate` of the other stretch-days"""
    neg = sorted(s for lid, day, s, h in rows if (lid, day) not in lab and (lid, day) not in skip)
    pos = [s for lid, day, s, h in rows if (lid, day) in lab]
    if not neg or not pos:
        return None
    cut = neg[min(len(neg) - 1, int(round((1 - rate) * len(neg))))]
    return sum(1 for s in pos if s > cut) / len(pos)


def run(net_engine, net_v6, m6, fetch_vars, coolr, log=print):
    """fetch_vars(keys, start, end) -> hourly variables (openmeteo.archive_hourly_vars)"""
    from . import v6
    events = catalog_events(net_v6, coolr)
    labs = season_labels(net_v6, events)
    years = sorted((y for y, s in labs.items() if len(s) >= MIN_EVENTS), key=lambda y: -len(labs[y]))[:MAX_SEASONS]
    years.sort()
    log('independent check: seasons %s' % ', '.join('%d (%d)' % (y, len(labs[y])) for y in years))
    rows_c, rows_6, lab_all, skip_all, per = [], [], set(), set(), []
    for y in years:
        lab = labs[y]
        skip = {(lid, (dt.date.fromisoformat(d) + dt.timedelta(days=k)).isoformat()) for lid, d in lab for k in (-1, 1)} - lab
        start = (dt.date(y, 6, 1) - dt.timedelta(days=v6.LEAD_DAYS + 1)).isoformat()
        vars_ = fetch_vars(net_v6.keys(), start, '%d-09-30' % y)
        days = days_of(y)
        rc = score_rows(net_engine, vars_['precipitation'], start, days)
        r6 = []
        if m6:
            for d in days:
                i0 = (dt.date.fromisoformat(d) - dt.date.fromisoformat(start)).days * 24
                for lid, (s, b, h) in v6.score_now(m6, net_v6, vars_, start, i0).items():
                    r6.append((lid, d, s, 0))
        lab_d = {k: None for k in lab}
        mc, m6m = metrics(rc, lab_d, skip), metrics(r6, lab_d, skip) if r6 else None
        per.append({'year': y, 'events': len(lab), 'engine_pod_caution': mc['caution']['pod'],
                    'v6_pod_caution': m6m['caution']['pod'] if m6m else None})
        log('  %d: %d stretch-days with a reported landslide; caught at Caution: engine %s, v6 %s' % (
            y, len(lab), mc['caution']['pod'], m6m and m6m['caution']['pod']))
        rows_c += rc
        rows_6 += r6
        lab_all |= lab
        skip_all |= skip
    lab_d = {k: None for k in lab_all}
    out = {'seasons': years, 'events': len(lab_all), 'per_season': per,
           'sources': {'GLC': sum(1 for e in events if e[4] == 'GLC'), 'COOLR': sum(1 for e in events if e[4] == 'COOLR')}}
    for name, rows in (('engine', rows_c), ('v6', rows_6)):
        if not rows:
            continue
        m = metrics(rows, lab_d, skip_all)
        out[name] = {k: {'pod': m[k]['pod'], 'alarm_rate': m[k]['pofd']} for k in CUT}
        # catch rate when both flag the same share of other days: the fair comparison on news catalogues
        out[name]['pod_at_10pct'] = at_rate(rows, lab_d, skip_all, .10)
        out[name]['pod_at_25pct'] = at_rate(rows, lab_d, skip_all, .25)
    return out


def report_md(r):
    p = lambda v: '-' if v is None else '%d%%' % round(v * 100)
    L = ['# Check on other years', '',
         'Dated landslides near PahaadPath hill roads from NASA catalogues (GLC 2007 to 2017, COOLR 2018 onwards), June to September, '
         'scored with rain and soil moisture of each day. Neither method was fitted on these years.', '',
         'Seasons: %s. Stretch-days with a reported landslide: %d.' % (', '.join(map(str, r.get('seasons') or [])), r.get('events', 0)), '',
         '| Method | Caught at Caution | Days flagged Caution | Caught at Avoid | Days flagged Avoid | Caught when 10% of days are flagged | Caught when 25% are flagged |',
         '|---|---|---|---|---|---|---|']
    for k, name in (('engine', 'Rain threshold engine (Caine, GSI)'), ('v6', 'Model v6 (trained on 2026 PWD closures)')):
        m = r.get(k)
        if m:
            L.append('| %s | %s | %s | %s | %s | %s | %s |' % (name, p(m['caution']['pod']), p(m['caution']['alarm_rate']), p(m['avoid']['pod']),
                                                             p(m['avoid']['alarm_rate']), p(m['pod_at_10pct']), p(m['pod_at_25pct'])))
    L += ['', 'News catalogues miss most landslides, so days without one are not known to be safe: compare the catch rates, '
          'especially at the same share of days flagged.']
    return '\n'.join(L) + '\n'


def summary(r):
    keep = ('seasons', 'events', 'per_season', 'sources', 'engine', 'v6')
    return {k: r.get(k) for k in keep}
