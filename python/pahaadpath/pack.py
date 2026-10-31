"""The daily data pack: one small file with rain for every road stretch, made by CI every few hours and published at a
fixed address. A phone that gets a moment of signal downloads this one file (about 30 KB compressed) instead of calling
the weather API, then plans offline from it for days, telling the user how old it is."""
import datetime as dt

from .alerts import fetch_alerts
from .closures import fetch_closures, pack_closures
from .engine import band, seg_score
from .openmeteo import forecast


def adopted_thresholds():
    """the fitted thresholds the backtest adopted (data/model/thresholds.json), else None for Caine, as in the app"""
    import json
    import os
    from . import path
    p = path('data', 'model', 'thresholds.json')
    if not os.path.exists(p):
        return None
    with open(p, encoding='utf-8') as f:
        return json.load(f).get('adopted')


def adopted_v6():
    """model v6 (data/model/model_v6.json) when the backtest adopted it, else None"""
    import json
    import os
    from . import path
    p = path('data', 'model', 'model_v6.json')
    if not os.path.exists(p):
        return None
    with open(p, encoding='utf-8') as f:
        m = json.load(f)
    return m if m.get('adopted') else None


def risk24(net, hourly, th=None, hours=24):
    """worst rain-only score on every hill stretch over the next `hours` from hour0, with the hour it peaks: what the
    phone's background check compares for watched trips without running the engine"""
    out = {}
    for lid, link in net.links.items():
        if link['plain'] or link['key'] not in hourly:
            continue
        s = hourly[link['key']]
        best = max(((seg_score(link, s, a, th=th)['score'], a) for a in range(hours)), key=lambda x: x[0])
        out[lid] = [best[0], band(best[0]), best[1]]
    return out


def tenths(a):
    return [int(round(v * 10)) for v in a]


def build_pack(net, log=print):
    keys = net.keys()
    hour0, hourly, day0, daily = forecast(keys, log=log)
    alerts = fetch_alerts(log=log)
    closures = fetch_closures(net.places, log=log)
    pk = {
        'v': 1,
        'made': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'hour0': hour0,  # IST hour that is index 72 of each hourly row
        'day0': day0,    # IST date of index 0 of each daily row (31 days ago)
        'unit': 'tenths of a mm',
        'source': 'Open-Meteo forecast API (CC BY 4.0): hourly precipitation, past 3 days and next 16; daily totals, past 31 days and next 16',
        'hourly': {k: tenths(hourly[k]) for k in keys},
        'daily': {k: tenths(daily[k]) for k in keys},
    }
    th = adopted_thresholds()
    pk['risk24'] = risk24(net, hourly, th)
    m6 = adopted_v6()
    if m6:  # v6 beat the current engine on held-out closures: its day score (today or tomorrow, worse of the two) leads
        try:
            from . import v6
            from .openmeteo import forecast_vars
            vars_, start = forecast_vars(net.keys(hill_only=True), log=log)
            i0 = 92 * 24
            quakes = v6.fetch_quakes((dt.date.today() - dt.timedelta(days=8)).isoformat(), (dt.date.today() + dt.timedelta(days=1)).isoformat(), log=log)
            s0, s1 = v6.score_now(m6, net, vars_, start, i0, quakes), v6.score_now(m6, net, vars_, start, i0 + 24, quakes)
            for lid in pk['risk24']:
                if lid in s0:
                    best = max((s0[lid], 0), (s1[lid], 24), key=lambda x: x[0][0])
                    pk['risk24'][lid] = [best[0][0], best[0][1], best[1]]
            pk['risk24_model'] = 'v6: ' + ' + '.join(m6['groups'])
        except Exception as e:  # noqa: BLE001 - keep the v4 risk rather than no pack
            log('v6 not scored (%s); risk24 stays on the rain threshold' % e)  # link id -> [score 0-100, band 0-2, hours from hour0 of the peak]
    pk['risk24_source'] = 'PahaadPath engine, rain only (no road reports), next 24 h; thresholds: %s' % (
        'fitted to PWD closures, %d%% level' % th['level'] if th else 'Caine (1980)')
    if alerts is not None:  # absent when the feed could not be read, so the app keeps the alerts it already has
        pk['alerts'] = alerts
        pk['alerts_source'] = 'NDMA Sachet public alert feed for Uttarakhand (public domain), last %d hours' % 48
    if closures is not None:  # absent out of season or when the report could not be read; the app also checks its age
        pk['closures'] = pack_closures(closures)
        pk['closures_source'] = 'Uttarakhand PWD SRMD road closure report (government of Uttarakhand), latest morning or evening report'
    return pk
