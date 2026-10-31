"""Terrain tiles for PahaadPath 2.0: Copernicus GLO-90 DEM over the app's area, as Terrarium-encoded 256 px PNG
tiles, zoom 0 to 12, written to an MBTiles file (then converted to terrain.pmtiles with go-pmtiles).

Terrarium: height h metres -> v = h + 32768; R = floor(v / 256), G = floor(v) mod 256, B = floor((v - floor(v)) * 256).
Source: Copernicus DEM GLO-90, public AWS bucket copernicus-dem-90m (ESA/DLR; free use with attribution).

usage: python terrain.py <work dir> <out.mbtiles> [west south east north] [maxzoom]"""
import io
import math
import os
import sqlite3
import sys
import urllib.request

import mercantile
import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT
from rasterio.warp import reproject
from rasterio.transform import from_bounds

URL = 'https://copernicus-dem-90m.s3.amazonaws.com/Copernicus_DSM_COG_30_{ns}{lat:02d}_00_{ew}{lon:03d}_00_DEM/Copernicus_DSM_COG_30_{ns}{lat:02d}_00_{ew}{lon:03d}_00_DEM.tif'


def fetch(work, west, south, east, north):
    """1x1 degree DEM tiles covering the box; missing tiles (sea, no data) are skipped"""
    paths = []
    for lat in range(math.floor(south), math.ceil(north)):
        for lon in range(math.floor(west), math.ceil(east)):
            u = URL.format(ns='N' if lat >= 0 else 'S', lat=abs(lat), ew='E' if lon >= 0 else 'W', lon=abs(lon))
            p = os.path.join(work, os.path.basename(u))
            if not os.path.exists(p):
                try:
                    urllib.request.urlretrieve(u, p + '.part')
                    os.replace(p + '.part', p)
                except Exception as e:  # noqa: BLE001
                    print('no DEM tile', os.path.basename(u), e)
                    continue
            paths.append(p)
    print('DEM tiles:', len(paths))
    return paths


def mosaic(paths, work):
    vrt = os.path.join(work, 'dem.vrt')
    os.system('gdalbuildvrt -q %s %s' % (vrt, ' '.join(paths))) if os.system('which gdalbuildvrt >/dev/null') == 0 else None
    if os.path.exists(vrt):
        return vrt
    # no GDAL tools: merge with rasterio
    from rasterio.merge import merge
    srcs = [rasterio.open(p) for p in paths]
    arr, tr = merge(srcs)
    out = os.path.join(work, 'dem.tif')
    prof = srcs[0].profile.copy()
    prof.update(height=arr.shape[1], width=arr.shape[2], transform=tr, driver='GTiff', compress='deflate', tiled=True)
    with rasterio.open(out, 'w', **prof) as d:
        d.write(arr)
    return out


def terrarium(h):
    # whole metres: GLO-90 is not more precise than that, and sub-metre noise in the blue channel makes the PNGs
    # three times larger (361 MB against about 120 MB for the area)
    h = np.round(np.nan_to_num(h, nan=0.0))
    v = h + 32768.0
    r = np.floor(v / 256.0)
    g = np.floor(v) % 256
    b = np.floor((v - np.floor(v)) * 256.0)
    return np.dstack([r, g, b]).clip(0, 255).astype(np.uint8)


def build(dem, out, west, south, east, north, maxzoom=12):
    if os.path.exists(out):
        os.remove(out)
    db = sqlite3.connect(out)
    db.executescript('''CREATE TABLE metadata (name text, value text);
        CREATE TABLE tiles (zoom_level integer, tile_column integer, tile_row integer, tile_data blob);
        CREATE UNIQUE INDEX tile_index on tiles (zoom_level, tile_column, tile_row);''')
    meta = {'name': 'PahaadPath terrain', 'format': 'png', 'type': 'baselayer', 'minzoom': '0', 'maxzoom': str(maxzoom),
            'bounds': '%s,%s,%s,%s' % (west, south, east, north), 'encoding': 'terrarium',
            'attribution': 'Copernicus DEM GLO-90 © ESA/DLR'}
    db.executemany('INSERT INTO metadata VALUES (?, ?)', meta.items())
    n = 0
    with rasterio.open(dem) as src:
        with WarpedVRT(src, crs='EPSG:3857', resampling=Resampling.bilinear) as vrt:
            for z in range(0, maxzoom + 1):
                for t in mercantile.tiles(west, south, east, north, [z]):
                    b = mercantile.xy_bounds(t)
                    dst = np.full((256, 256), np.nan, dtype='float32')
                    reproject(source=rasterio.band(vrt, 1), destination=dst,
                              dst_transform=from_bounds(b.left, b.bottom, b.right, b.top, 256, 256), dst_crs='EPSG:3857',
                              resampling=Resampling.bilinear if z >= 9 else Resampling.average, dst_nodata=np.nan)
                    if np.isnan(dst).all():
                        continue
                    buf = io.BytesIO()
                    Image.fromarray(terrarium(dst), 'RGB').save(buf, 'PNG', optimize=True)
                    db.execute('INSERT INTO tiles VALUES (?, ?, ?, ?)', (z, t.x, (1 << z) - 1 - t.y, buf.getvalue()))
                    n += 1
                db.commit()
                print('terrain zoom', z, 'tiles so far', n)
    db.close()
    return n


if __name__ == '__main__':
    work, out = sys.argv[1], sys.argv[2]
    box = [float(x) for x in sys.argv[3:7]] if len(sys.argv) >= 7 else [76.6, 28.3, 81.2, 31.5]
    mz = int(sys.argv[7]) if len(sys.argv) >= 8 else 12
    os.makedirs(work, exist_ok=True)
    dem = mosaic(fetch(work, *box), work)
    print('tiles written:', build(dem, out, *box, maxzoom=mz))
