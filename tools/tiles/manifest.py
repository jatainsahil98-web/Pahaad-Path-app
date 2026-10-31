"""tiles/tiles.json: the contract between the tile build and the app's map code (src/map/tiles.js).

usage: python manifest.py <out tiles.json> pmtiles|xyz [built ISO date]
  pmtiles: {"url": "tiles/basemap.pmtiles"} (website, served with range requests)
  xyz:     {"url": "tiles/basemap/{z}/{x}/{y}.pbf"} (APK assets)"""
import datetime as dt
import json
import sys

BOUNDS = [76.6, 28.3, 81.2, 31.5]
OSM = '© OpenStreetMap contributors'
DEM = 'Copernicus DEM GLO-90 © ESA/DLR'


def manifest(kind, built=None):
    pm = kind == 'pmtiles'
    return {
        'basemap': {'url': 'tiles/basemap.pmtiles' if pm else 'tiles/basemap/{z}/{x}/{y}.pbf', 'kind': kind,
                    'minzoom': 0, 'maxzoom': 14, 'bounds': BOUNDS, 'attribution': OSM},
        'terrain': {'url': 'tiles/terrain.pmtiles' if pm else 'tiles/terrain/{z}/{x}/{y}.png', 'kind': kind,
                    'encoding': 'terrarium', 'minzoom': 0, 'maxzoom': 12, 'bounds': BOUNDS, 'attribution': DEM},
        'built': built or dt.date.today().isoformat(),
    }


if __name__ == '__main__':
    with open(sys.argv[1], 'w', encoding='utf-8') as f:
        json.dump(manifest(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None), f, ensure_ascii=False, indent=1)
