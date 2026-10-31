"""Print GitHub annotations with the size of each archive and of the basemap per zoom (to choose the zoom budget)."""
import os
import sys

from pmtiles.reader import MmapSource, Reader, all_tiles

for p in sys.argv[1:]:
    by = {}
    with open(p, 'rb') as f:
        r = Reader(MmapSource(f))
        for (z, x, y), d in all_tiles(r.get_bytes):
            n, s = by.get(z, (0, 0))
            by[z] = (n + 1, s + len(d))
    name = os.path.basename(p)
    print('::notice title=%s::%d bytes in all' % (name, os.path.getsize(p)))
    print('::notice title=%s by zoom::%s' % (name, '; '.join('z%d %d tiles %.1f MB' % (z, n, s / 1e6) for z, (n, s) in sorted(by.items()))))
