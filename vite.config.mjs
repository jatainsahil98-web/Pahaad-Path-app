/* Builds PahaadPath from src/ into the same two outputs as before:
     dist/PahaadPath.html  one self-contained file (shared offline, packed into the Android app)
     dist/site/            the installable web app for GitHub Pages: that file as index.html, manifest, icon, service worker
   npm run build       bakes in the real data run from data/ (open data, replay results)
   npm run build:demo  leaves those out (PP_DEMO=1)
   PP_OPEN_DATA=file.json PP_REPLAY=file.json npm run build  bakes in a newer run saved from the app's Proof tab
   The app code is the core (src/app/core.js) with the feature files spliced in, so they share one scope as before;
   baked data comes from the virtual module 'virtual:pp-data', computed here from data/ (what the old tools/build.py injected). */
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const R = path.dirname(new URL(import.meta.url).pathname);
const rd = p => fs.readFileSync(path.join(R, p), 'utf8');
const json = p => JSON.parse(fs.readFileSync(path.resolve(R, p), 'utf8'));
const has = p => fs.existsSync(path.join(R, p));
const FEATURES = ['features.js', 'features2.js', 'features3.js', 'features4.js', 'features5.js', 'features6.js'];

/* the data the app has baked in; null where a build leaves it out */
function bakedData(demo) {
  const out = {};
  out.BASEMAP = json('tools/basemap.json');
  out.GT = json('replay_source/gt.json');
  // PP_OPEN_DATA / PP_REPLAY: bake in a newer run saved from the Proof tab in a browser instead of the one in data/
  out.OPEN_DATA = demo ? null : json(process.env.PP_OPEN_DATA || 'data/open_data.json');
  // NASA Global Landslide Catalog: Indian events located to 10 km or better, as [lat, lon, accuracy km, year, fatalities]
  const ACC = { exact: 0, '1km': 1, '5km': 5, '10km': 10 };
  out.GLC = json('data/nasa_glc_uttarakhand_bbox.json').filter(e => e.acc in ACC && e.cc === 'IN')
    .map(e => [e.la, e.lo, ACC[e.acc], e.d ? parseInt(e.d.slice(0, 4), 10) : null, /^\d+$/.test(e.f || '') ? parseInt(e.f, 10) : 0]);
  const rp = demo ? null : json(process.env.PP_REPLAY || 'data/replay_results.json');
  out.REPLAY_BAKED = rp ? { results: rp.results, series: Object.fromEntries(Object.entries(rp.series || {}).filter(([k]) => k.endsWith('/archive'))) } : null;
  let model = has('data/model/model_v5.json') ? json('data/model/model_v5.json') : null;
  if (model) model = Object.fromEntries(['version', 'features', 'intercept', 'coef', 'bands', 'hist', 'memory_days', 'data', 'trained', 'checks'].map(k => [k, model[k]]));
  out.MODEL = model;
  const ext = model && has('data/train/era5_daily_external.json') ? json('data/train/era5_daily_external.json') : null;
  out.RP_DAILY = ext ? Object.fromEntries(Object.entries(ext.days).map(([d, v]) => [d, { start: v.start, by: v.by }])) : null;
  out.STOPS = has('data/osm_stops.json') ? json('data/osm_stops.json') : null;
  return out;
}

/* placeholder in the feature files -> name of the baked value (the text after the marker is the old default, removed) */
const SLOTS = [
  ['/*__BASEMAP__*/{rivers:[],roads:[],borders:[],lakes:[]}', 'BASEMAP'],
  ['/*__GT__*/{events:[]}', 'GT'],
  ['/*__OPEN_DATA__*/null', 'OPEN_DATA'],
  ['/*__GLC__*/null', 'GLC'],
  ['/*__REPLAY_BAKED__*/null', 'REPLAY_BAKED'],
  ['/*__MODEL__*/null', 'MODEL'],
  ['/*__RP_DAILY__*/null', 'RP_DAILY'],
  ['/*__STOPS__*/null', 'STOPS'],
];

function ppApp(demo) {
  const APP = 'virtual:pp-app', DATA = 'virtual:pp-data';
  return {
    name: 'pp-app',
    resolveId(id) { return id === APP || id === DATA ? '\0' + id : null; },
    load(id) {
      if (id === '\0' + DATA) {
        return Object.entries(bakedData(demo)).map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`).join('\n');
      }
      if (id !== '\0' + APP) return null;
      let feat = FEATURES.map(f => rd('src/' + f)).join('\n');
      for (const [tag, name] of SLOTS) {
        if (feat.split(tag).length !== 2) throw new Error('placeholder ' + tag + ' must occur once');
        feat = feat.replace(tag, () => '__D.' + name);
      }
      const core = rd('src/app/core.js');
      if (core.split('/*__FEATURES_JS__*/').length !== 2) throw new Error('core needs one /*__FEATURES_JS__*/');
      return `import * as __D from '${DATA}';\n` + core.replace('/*__FEATURES_JS__*/', () => feat);
    },
  };
}

/* after the single file is written: name it PahaadPath.html and lay out the site folder beside it */
function ppSite() {
  return {
    name: 'pp-site',
    closeBundle() {
      const dist = path.join(R, 'dist'), site = path.join(dist, 'site');
      const app = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
      fs.rmSync(path.join(dist, 'index.html'));
      fs.mkdirSync(site, { recursive: true });
      fs.writeFileSync(path.join(dist, 'PahaadPath.html'), app);
      fs.writeFileSync(path.join(site, 'index.html'), app);
      fs.copyFileSync(path.join(R, 'src/icon.svg'), path.join(site, 'icon.svg'));
      const ver = crypto.createHash('sha1').update(app).digest('hex').slice(0, 10);
      fs.writeFileSync(path.join(site, 'manifest.webmanifest'), JSON.stringify({ name: 'PahaadPath', short_name: 'PahaadPath',
        description: 'Hill-road landslide, traffic and entry-rule advisory for Uttarakhand', start_url: './', display: 'standalone',
        background_color: '#EDEFE8', theme_color: '#1D3F31', icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }] }, null, 1));
      fs.writeFileSync(path.join(site, 'sw.js'), rd('src/sw.js').replace('__VERSION__', ver));
      fs.writeFileSync(path.join(site, '.nojekyll'), '');
      console.log('built ' + Buffer.byteLength(app) + ' bytes; dist/PahaadPath.html and dist/site/ (sw ' + ver + ')');
    },
  };
}

export default defineConfig(({ mode }) => {
  const demo = mode === 'demo' || process.env.PP_DEMO === '1';
  return {
    root: path.join(R, 'src'),
    base: './',
    publicDir: false,
    logLevel: 'warn',
    plugins: [ppApp(demo), viteSingleFile({ removeViteModuleLoader: true }), ppSite()],
    build: { outDir: path.join(R, 'dist'), emptyOutDir: true, target: 'es2020', minify: true, reportCompressedSize: false },
  };
});
