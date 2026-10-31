"""Roadside stops from OpenStreetMap: fuel, hospitals and clinics, ATMs and car mechanics near each town on the road map.

In the hills the next town with fuel or a hospital matters more than anywhere, and none of it needs a live map: one
Overpass query, run now and then by CI, gives counts per town that are baked into the app. OpenStreetMap is incomplete
in small hill towns, so the app says "mapped in OpenStreetMap" and never "none"."""
import datetime as dt
import json
import time
import urllib.parse
import urllib.request

from .network import hav

OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
BBOX = (28.5, 77.0, 31.5, 81.1)  # Uttarakhand and the roads in from Delhi NCR and west UP
NEAR_KM = 3.0                     # a stop counts for a town when it is this close to the town point
KINDS = {'fuel': 'fuel', 'hospital': 'hosp', 'clinic': 'hosp', 'doctors': 'hosp', 'atm': 'atm', 'car_repair': 'mech'}


def query():
    b = '%s,%s,%s,%s' % BBOX
    return ('[out:json][timeout:240];('
            'nwr["amenity"~"^(fuel|hospital|clinic|doctors|atm)$"](%s);'
            'nwr["shop"="car_repair"](%s);nwr["amenity"="car_repair"](%s);'
            ');out center tags;') % (b, b, b)


def fetch(log=print):
    data = urllib.parse.urlencode({'data': query()}).encode()
    last = None
    for url in OVERPASS:
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, data=data, headers={'User-Agent': 'pahaadpath-pipeline'})
                with urllib.request.urlopen(req, timeout=300) as r:
                    js = json.load(r)
                log('overpass %s: %d elements' % (url, len(js.get('elements', []))))
                return js['elements']
            except Exception as e:  # busy servers answer 429 or 504; wait and try the next one
                last = e
                log('overpass %s attempt %d failed: %s' % (url, attempt + 1, e))
                time.sleep(30 * (attempt + 1))
    raise RuntimeError('Overpass not reachable: %s' % last)


def kind_of(tags):
    if tags.get('shop') == 'car_repair':
        return 'mech'
    k = KINDS.get(tags.get('amenity'))
    if k == 'hosp' and (tags.get('healthcare:speciality') == 'veterinary' or 'veterinar' in (tags.get('name') or '').lower()):
        return None  # animal hospitals are tagged amenity=hospital or clinic too
    return k


def assign(net, elements):
    """counts and up to two names per kind for every town, from stops within NEAR_KM of it"""
    out = {}
    for el in elements:
        lat = el.get('lat') or (el.get('center') or {}).get('lat')
        lon = el.get('lon') or (el.get('center') or {}).get('lon')
        k = kind_of(el.get('tags') or {})
        if lat is None or k is None:
            continue
        best, bd = None, NEAR_KM
        for p in net.places.values():
            d = hav(lat, lon, p['lat'], p['lon'])
            if d <= bd:
                best, bd = p['id'], d
        if not best:
            continue
        town = out.setdefault(best, {})
        c = town.setdefault(k, [0, []])
        c[0] += 1
        name = (el.get('tags') or {}).get('name')
        if name and len(c[1]) < 2 and name not in c[1] and k in ('fuel', 'hosp'):
            c[1].append(name[:40])
    return out


def build_stops(net, log=print):
    els = fetch(log=log)
    towns = assign(net, els)
    log('stops for %d of %d towns' % (len(towns), len(net.places)))
    return {
        'made': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%d'),
        'source': 'OpenStreetMap contributors (ODbL), via Overpass API; stops within %g km of each town' % NEAR_KM,
        'towns': {t: {k: v for k, v in sorted(c.items())} for t, c in sorted(towns.items())},
    }
