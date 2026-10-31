"""The daily data pack: one small file with rain for every road stretch, made by CI every few hours and published at a
fixed address. A phone that gets a moment of signal downloads this one file (about 30 KB compressed) instead of calling
the weather API, then plans offline from it for days, telling the user how old it is."""
import datetime as dt

from .alerts import fetch_alerts
from .closures import fetch_closures, pack_closures
from .openmeteo import forecast


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
    if alerts is not None:  # absent when the feed could not be read, so the app keeps the alerts it already has
        pk['alerts'] = alerts
        pk['alerts_source'] = 'NDMA Sachet public alert feed for Uttarakhand (public domain), last %d hours' % 48
    if closures is not None:  # absent out of season or when the report could not be read; the app also checks its age
        pk['closures'] = pack_closures(closures)
        pk['closures_source'] = 'Uttarakhand PWD SRMD road closure report (government of Uttarakhand), latest morning or evening report'
    return pk
