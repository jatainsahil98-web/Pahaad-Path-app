/* 2.0 Phase 4: the offline map files. tiles/tiles.json (written by tools/tiles/manifest.py) is the contract:
     {basemap: {url, kind, minzoom, maxzoom, bounds, attribution}, terrain: {url, kind, encoding, ...}, built}
   kind "pmtiles": one archive read with Range requests (the web site); kind "xyz": a z/x/y folder (inside the APK).
   load(root) reads it and returns the MapLibre sources for src/map/ppmap.js, or null when there is no manifest (a
   copy opened from a file, or a site built before the tiles). It never throws. */
function source(e, root, kind) {
  if (!e || !e.url) return null;
  const abs = root + String(e.url).replace(/^\.?\//, ''); // plain joins keep the {z}/{x}/{y} braces as they are
  const out = { attribution: e.attribution || '' };
  if (e.kind === 'pmtiles') out.url = 'pmtiles://' + abs;
  else {
    out.tiles = [abs];
    ['minzoom', 'maxzoom', 'bounds'].forEach(k => { if (e[k] != null) out[k] = e[k]; });
    if (kind === 'dem') out.tileSize = 256;
  }
  if (kind === 'dem' && e.encoding) out.encoding = e.encoding;
  return out;
}

export async function load(root) {
  if (!root) return null;
  try {
    const r = await Promise.race([fetch(root + 'tiles/tiles.json', { cache: 'no-cache' }), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 8000))]);
    if (!r.ok) return null;
    const m = await r.json(), base = source(m.basemap, root, 'base'), dem = source(m.terrain, root, 'dem');
    if (!base && !dem) return null;
    // the whole files a browser can keep for offline use (only PMTiles archives; the APK already carries its folders)
    const files = [m.basemap, m.terrain].filter(e => e && e.kind === 'pmtiles' && e.url).map(e => root + String(e.url).replace(/^\.?\//, ''));
    return { base, dem, files, manifest: root + 'tiles/tiles.json', built: m.built || '' };
  } catch (e) { return null; }
}
