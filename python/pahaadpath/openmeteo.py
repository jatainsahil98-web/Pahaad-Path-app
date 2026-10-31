"""Open-Meteo client: historical rain (ERA5 archive), forecasts and past daily totals.

The free tier counts calls by weight: one location for up to 14 days and 10 variables is one call, longer spans count
more. Limits are 600 a minute, 5,000 an hour and 10,000 a day, so long downloads are paced here and every reply is cached
on disk. A run that is stopped picks up where it left off."""
import hashlib
import json
import math
import os
import time
import urllib.error
import urllib.parse
import urllib.request

from . import path

ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive'
FORECAST = 'https://api.open-meteo.com/v1/forecast'
TZ = 'Asia/Kolkata'
CACHE = path('data', 'cache', 'openmeteo')
PER_MIN, PER_HOUR = 500, 4500  # a little under the published limits


class Pacer:
    def __init__(self, log=print):
        self.spent = []  # (time, weight)
        self.log = log

    def wait(self, w):
        while True:
            now = time.time()
            self.spent = [(t, x) for t, x in self.spent if now - t < 3600]
            last_min = sum(x for t, x in self.spent if now - t < 60)
            last_hour = sum(x for t, x in self.spent)
            if last_min + w <= PER_MIN and last_hour + w <= PER_HOUR:
                self.spent.append((now, w))
                return
            pause = 61 if last_hour + w <= PER_HOUR else 300
            self.log('  pacing: %.0f in the last minute, %.0f in the last hour; waiting %d s' % (last_min, last_hour, pause))
            time.sleep(pause)


PACER = Pacer()


def weight(n_locations, days, n_vars):
    return n_locations * max(1.0, days / 14) * max(1.0, n_vars / 10)


def get_json(url, w=1.0, tries=6, log=print):
    os.makedirs(CACHE, exist_ok=True)
    cf = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest() + '.json')
    if os.path.exists(cf):
        with open(cf, encoding='utf-8') as f:
            return json.load(f)
    for k in range(tries):
        PACER.wait(w)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'pahaadpath-pipeline'}), timeout=90) as r:
                js = json.loads(r.read().decode())
            with open(cf, 'w', encoding='utf-8') as f:
                json.dump(js, f)
            return js
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors='replace')[:200]
            if e.code == 429 or e.code >= 500:
                pause = 65 if 'inute' in body or e.code >= 500 else 600
                log('  Open-Meteo %d (%s); waiting %d s' % (e.code, body.strip(), pause))
                time.sleep(pause)
                continue
            raise RuntimeError('Open-Meteo %d: %s' % (e.code, body))
        except (urllib.error.URLError, TimeoutError) as e:
            log('  network error %s; retrying' % e)
            time.sleep(10 * (k + 1))
    raise RuntimeError('Open-Meteo did not answer after %d tries' % tries)


def _latlon(keys):
    return ','.join(k.split(',')[0] for k in keys), ','.join(k.split(',')[1] for k in keys)


def _as_list(js):
    return js if isinstance(js, list) else [js]


def archive_daily(keys, start, end, batch=10, log=print):
    """Daily rain totals (mm, IST days) from the ERA5 reanalysis for each 'lat,lon' key, start and end inclusive."""
    days = (_d(end) - _d(start)).days + 1
    out = {}
    for i in range(0, len(keys), batch):
        ks = keys[i:i + batch]
        la, lo = _latlon(ks)
        q = urllib.parse.urlencode({'latitude': la, 'longitude': lo, 'start_date': start, 'end_date': end,
                                    'daily': 'precipitation_sum', 'timezone': TZ})
        js = _as_list(get_json(ARCHIVE + '?' + q, weight(len(ks), days, 1), log=log))
        if len(js) != len(ks):
            raise RuntimeError('reply has %d locations, asked for %d' % (len(js), len(ks)))
        for k, j in zip(ks, js):
            d = j['daily']
            if d['time'][0] != start or len(d['time']) != days:
                raise RuntimeError('unexpected days in reply for %s' % k)
            out[k] = [None if v is None else round(v, 1) for v in d['precipitation_sum']]
    return out


def archive_hourly(keys, start, end, batch=10, log=print):
    """Hourly rain (mm) from the ERA5 reanalysis for each 'lat,lon' key, from 00:00 IST on start to 23:00 IST on end.
    Same source the training and replay use, so thresholds fitted on it apply to the app's own numbers."""
    days = (_d(end) - _d(start)).days + 1
    out = {}
    for i in range(0, len(keys), batch):
        ks = keys[i:i + batch]
        la, lo = _latlon(ks)
        q = urllib.parse.urlencode({'latitude': la, 'longitude': lo, 'start_date': start, 'end_date': end,
                                    'hourly': 'precipitation', 'timezone': TZ})
        js = _as_list(get_json(ARCHIVE + '?' + q, weight(len(ks), days, 1), log=log))
        if len(js) != len(ks):
            raise RuntimeError('reply has %d locations, asked for %d' % (len(js), len(ks)))
        for k, j in zip(ks, js):
            h = j['hourly']
            if not h['time'][0].startswith(start) or len(h['time']) != days * 24:
                raise RuntimeError('unexpected hours in reply for %s' % k)
            out[k] = [None if v is None else round(v, 1) for v in h['precipitation']]
    return out


def forecast(keys, past_hours=72, forecast_days=16, past_days_daily=31, batch=25, log=print):
    """Hourly rain from the current hour back `past_hours` and ahead `forecast_days`, plus daily totals for the past
    `past_days_daily` days and the forecast days. Returns (hour0 ISO string in IST, {key: hourly}, day0, {key: daily})."""
    hourly, daily, hour0, day0 = {}, {}, None, None
    for i in range(0, len(keys), batch):
        ks = keys[i:i + batch]
        la, lo = _latlon(ks)
        qh = urllib.parse.urlencode({'latitude': la, 'longitude': lo, 'hourly': 'precipitation', 'past_days': 3,
                                     'forecast_days': forecast_days, 'timezone': TZ})
        qd = urllib.parse.urlencode({'latitude': la, 'longitude': lo, 'daily': 'precipitation_sum',
                                     'past_days': past_days_daily, 'forecast_days': forecast_days, 'timezone': TZ})
        jh = _as_list(_fresh(FORECAST + '?' + qh, weight(len(ks), forecast_days + 3, 1), log))
        jd = _as_list(_fresh(FORECAST + '?' + qd, weight(len(ks), forecast_days + past_days_daily, 1), log))
        for k, h, d in zip(ks, jh, jd):
            t = h['hourly']['time']
            if hour0 is None:
                hour0 = time.strftime('%Y-%m-%dT%H:00', time.gmtime(time.time() + 5.5 * 3600))
                day0 = d['daily']['time'][0]
            j = t.index(hour0)
            vals = h['hourly']['precipitation']
            hourly[k] = [0 if (j + x < 0 or j + x >= len(vals) or vals[j + x] is None) else round(vals[j + x], 1)
                         for x in range(-past_hours, 384)]
            daily[k] = [0 if v is None else round(v, 1) for v in d['daily']['precipitation_sum']]
    return hour0, hourly, day0, daily


def _fresh(url, w, log):
    """Forecasts are never cached."""
    for k in range(6):
        PACER.wait(w)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'pahaadpath-pipeline'}), timeout=90) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                log('  Open-Meteo %d; waiting 65 s' % e.code)
                time.sleep(65)
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            log('  network error %s; retrying' % e)
            time.sleep(10 * (k + 1))
    raise RuntimeError('Open-Meteo forecast did not answer')


def _d(s):
    import datetime as dt
    return dt.date.fromisoformat(s)


def ceil_weight(keys, start, end):
    return math.ceil(weight(len(keys), (_d(end) - _d(start)).days + 1, 1))
