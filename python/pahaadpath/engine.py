"""Port of the app's v4 rain-threshold engine (segScore in src/app/core.js), used to check the trained model against it.
Road reports are left out: the pipeline scores weather, the app adds reports on the phone."""
import datetime as dt

from .network import js_round

PAST, FUT = 72, 384
SERIES_LEN = PAST + FUT


def caine(d):
    """Caine (1980) intensity-duration threshold as accumulated depth in mm over d hours."""
    return 14.82 * d ** 0.61


def sum_rain(arr, a, b):
    tot = 0.0
    lo, hi = max(a, -PAST), min(b, SERIES_LEN - PAST)
    j = int(lo // 1)
    while j < hi:
        b0, b1 = max(lo, j), min(hi, j + 1)
        if b1 > b0:
            v = arr[j + PAST] if 0 <= j + PAST < len(arr) else 0
            tot += (v or 0) * (b1 - b0)
        j += 1
    return tot


def ed_threshold(th, link):
    """rain depth (mm) over d hours that triggers on this stretch: a fitted ED curve E = alpha * D^gamma for its zone
    (calibrate.py), or Caine (1980) when none is adopted"""
    if not th:
        return caine
    z = th['zones'].get(str(link.get('susc'))) or th['pooled']
    a, g = z['alpha'], z['gamma']
    return lambda d: a * d ** g


def seg_score(link, series, a, thr=1.0, th=None):
    if link['plain']:
        return {'score': 0, 'ratio': 0, 'P6': 0, 'P24': 0, 'P72': 0}
    p6, p24, p72 = sum_rain(series, a - 6, a), sum_rain(series, a - 24, a), sum_rain(series, a - 72, a)
    f = ed_threshold(th, link)
    ratio = max(p6 / f(6), p24 / f(24), p72 / f(72)) / thr
    trig = min(ratio, 1.5) / 1.5
    pred = .6 * [0, .15, .55, 1][link['susc']] + .4 * min(link['hist'] / 5, 1)
    base = trig * (.35 + .65 * pred) + .08 * pred
    return {'score': js_round(100 * min(1, base)), 'ratio': ratio, 'P6': p6, 'P24': p24, 'P72': p72}


def band(score):
    return 0 if score < 35 else 1 if score < 65 else 2


def series_from(rec, day):
    """Engine layout (index j+PAST is hour j from 00:00 IST on `day`) cut from a stored block starting at 00:00 IST on rec['start']."""
    off = (dt.date.fromisoformat(day) - dt.date.fromisoformat(rec['start'])).days * 24 - PAST
    out = {}
    for k, src in rec['by'].items():
        a = [0.0] * SERIES_LEN
        for i in range(SERIES_LEN):
            if 0 <= i + off < len(src) and src[i + off] is not None:
                a[i] = src[i + off]
        out[k] = a
    return out


def score_day(net, day, rec, th=None):
    """Highest score of each hill stretch over the 24 hours of `day`, as the Proof tab computes it."""
    ser = series_from(rec, day)
    rows = []
    for l in net.hill():
        best = None
        for a in range(24):
            r = seg_score(l, ser[l['key']], a, th=th)
            if best is None or r['score'] > best['score']:
                best = dict(r, hour=a)
        rows.append({'id': l['id'], 'score': best['score'], 'band': band(best['score']), 'hour': best['hour'],
                     'P6': round(best['P6'], 1), 'P24': round(best['P24'], 1), 'P72': round(best['P72'], 1)})
    return rows
