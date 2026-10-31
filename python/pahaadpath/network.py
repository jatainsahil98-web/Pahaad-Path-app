"""Road network parsed from src/app/core.js, with open data (OSRM shape, DEM slope) and NASA catalog incident history."""
import math
from decimal import ROUND_HALF_UP, Decimal
import re

from . import path, read_json

SL_CUT = (31, 37)  # same cut-offs as src/features.js
HIST_KM = 3
ACC_KM = {'exact': 0, '1km': 1, '5km': 5, '10km': 10}


def slope_class(p75):
    return 1 if p75 < SL_CUT[0] else 2 if p75 < SL_CUT[1] else 3


def hist_class(n):
    return 0 if n == 0 else 1 if n == 1 else 2 if n <= 3 else 3 if n <= 6 else 4 if n <= 10 else 5


def hav(la1, lo1, la2, lo2):
    r = math.pi / 180
    dl, dn = (la2 - la1) * r, (lo2 - lo1) * r
    a = math.sin(dl / 2) ** 2 + math.cos(la1 * r) * math.cos(la2 * r) * math.sin(dn / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


def dist_to_line(lat, lon, g):
    """Shortest distance in km from a point to a polyline [[lat, lon], ...]; same flat-earth method as the app."""
    kx, ky = 111.32 * math.cos(lat * math.pi / 180), 110.57
    best = 1e9
    for i in range(1, len(g)):
        ax, ay = (g[i - 1][1] - lon) * kx, (g[i - 1][0] - lat) * ky
        bx, by = (g[i][1] - lon) * kx, (g[i][0] - lat) * ky
        dx, dy = bx - ax, by - ay
        l2 = dx * dx + dy * dy
        u = max(0.0, min(1.0, -(ax * dx + ay * dy) / l2)) if l2 else 0.0
        best = min(best, math.hypot(ax + u * dx, ay + u * dy))
    return best


def js_round(x):
    """Math.round: halves go up, unlike Python's round."""
    return math.floor(x + 0.5)


def to_fixed2(x):
    """JavaScript's x.toFixed(2): exact binary value, halves rounded up (Python's '%.2f' rounds some of them down)."""
    return str(Decimal(x).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


def loc_key(lat, lon):
    """Same key as locKey() in the app: the midpoint to 2 decimals, which is also the weather grid point."""
    return to_fixed2(lat) + ',' + to_fixed2(lon)


class Network:
    def __init__(self, app_html=None, open_data=None, catalog=None):
        with open(app_html or path('src', 'app', 'core.js'), encoding='utf-8') as f:
            src = f.read()
        self.places = {}
        block = src[src.index('const PLACES={'):src.index('};', src.index('const PLACES={'))]
        for m in re.finditer(r"^\s*(\w+):\['([^']*)','([^']*)',([\d.]+),([\d.]+),'(\w)'(?:,(\d))?\]", block, re.M):
            pid, en, hi, lat, lon, kind, stay = m.groups()
            self.places[pid] = {'id': pid, 'en': en, 'hi': hi, 'lat': float(lat), 'lon': float(lon), 'kind': kind}
        self.links = {}
        for m in re.finditer(r"\b(Pl|Hl)\('(\w+)','(\w+)',([\d.]+),([\d.]+),([\d.]+)", src):
            fn, a, b, km, x1, x2 = m.groups()
            if a not in self.places:  # skip the helper definitions themselves
                continue
            A, B = self.places[a], self.places[b]
            plain = fn == 'Pl'
            lid = a + '-' + b
            self.links[lid] = {
                'id': lid, 'a': a, 'b': b, 'km': float(km), 'plain': plain,
                'susc0': 0 if plain else int(x1), 'hist0': 0 if plain else int(x2),
                'lat': (A['lat'] + B['lat']) / 2, 'lon': (A['lon'] + B['lon']) / 2,
            }
        for l in self.links.values():
            l['key'] = loc_key(l['lat'], l['lon'])
        od = open_data if open_data is not None else read_json('data', 'open_data.json')
        self.od = od
        cat = catalog if catalog is not None else load_catalog()
        self.catalog = cat
        for l in self.links.values():
            k = od.get('km', {}).get(l['id'])
            l['geom'] = od['geom'][l['id']] if k and k.get('ok') and l['id'] in od.get('geom', {}) else \
                [[self.places[l['a']]['lat'], self.places[l['a']]['lon']], [self.places[l['b']]['lat'], self.places[l['b']]['lon']]]
            if l['plain']:
                l.update(susc=0, hist=0, slope=None, events=[])
                continue
            sl = od.get('slope', {}).get(l['id'])
            l['slope'] = sl['p75'] if sl else None
            l['susc'] = slope_class(sl['p75']) if sl else l['susc0']
            l['events'] = [e for e in cat if dist_to_line(e['lat'], e['lon'], l['geom']) <= max(HIST_KM, e['acc'])]
            l['hist'] = hist_class(len(l['events'])) if cat else l['hist0']

    def hill(self):
        return [l for l in self.links.values() if not l['plain']]

    def keys(self, hill_only=False):
        out = []
        for l in (self.hill() if hill_only else self.links.values()):
            if l['key'] not in out:
                out.append(l['key'])
        return out


def load_catalog(p=None):
    """NASA Global Landslide Catalog events in India located to 10 km or better (as baked into the app)."""
    rows = read_json(p) if p else read_json('data', 'nasa_glc_uttarakhand_bbox.json')
    out = []
    for e in rows:
        if e['acc'] in ACC_KM and e['cc'] == 'IN':
            out.append({'id': e['id'], 'date': e['d'] or None, 'lat': e['la'], 'lon': e['lo'], 'acc': ACC_KM[e['acc']],
                        'trigger': e.get('trg'), 'deaths': int(e['f']) if (e.get('f') or '').isdigit() else 0})
    return out
