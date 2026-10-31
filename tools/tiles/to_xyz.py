"""Unpack a PMTiles archive into a z/x/y folder for the Android app (WebViewAssetLoader cannot answer the HTTP range
requests PMTiles needs). Vector tiles are stored uncompressed (.pbf), since assets are served without
Content-Encoding; images keep their own format.

usage: python to_xyz.py <archive.pmtiles> <out dir> <ext: pbf | png>"""
import gzip
import os
import sys

from pmtiles.reader import MmapSource, Reader, all_tiles


def unpack(archive, out, ext):
    n = size = 0
    with open(archive, 'rb') as f:
        r = Reader(MmapSource(f))
        gz = r.header().get('tile_compression') in (2, 'gzip') or str(r.header().get('tile_compression')).lower().endswith('gzip')
        for (z, x, y), data in all_tiles(r.get_bytes):
            if gz or data[:2] == b'\x1f\x8b':
                data = gzip.decompress(data)
            d = os.path.join(out, str(z), str(x))
            os.makedirs(d, exist_ok=True)
            with open(os.path.join(d, '%d.%s' % (y, ext)), 'wb') as t:
                t.write(data)
            n += 1
            size += len(data)
    print('%s: %d tiles, %.1f MB unpacked' % (archive, n, size / 1e6))
    return n


if __name__ == '__main__':
    unpack(sys.argv[1], sys.argv[2], sys.argv[3])
