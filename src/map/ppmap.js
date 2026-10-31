/* PahaadPath 2.0 map adapter: MapLibre GL JS (WebGL) behind a small API that takes plain GeoJSON and colours.
   It never reads app state; the app (src/shell.js) builds the data and calls window.PPMap. Layers are added once when the
   style loads; later updates only call setData, so a redraw never rebuilds the map (Leaflet rebuilt it every time).
   When WebGL is missing, supported() is false and the app keeps its Leaflet map. */
import * as maplibregl from 'maplibre-gl';
import workerSrc from 'maplibre-gl/dist/maplibre-gl-worker.mjs?raw';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { layers as pmLayers, namedFlavor } from '@protomaps/basemaps';

/* 2.0 Phase 4: offline map files. The tile build (tools/tiles, release tiles-latest) puts them next to the app with a
   tiles/tiles.json manifest: PMTiles archives read with Range requests on the web site, plain z/x/y folders inside the
   APK. src/map/tiles.js turns the manifest into the two MapLibre sources used here (T.base: OpenStreetMap vector tiles,
   Protomaps schema; T.dem: Terrarium terrain). Without them the built-in simple base map stays. */
let protoOn = false;
function protocol() {
  if (protoOn) return;
  protoOn = true;
  maplibregl.addProtocol('pmtiles', new Protocol({ metadata: true }).tile);
}
const usesPm = T => [T.base, T.dem].some(x => x && /^pmtiles:/.test(x.url || ''));

/* The worker ships as its own module file; the single shared file has nowhere to load it from, so it starts from a Blob.
   A module worker from a Blob fails on a page opened from a file (file:// has no origin to match), a classic one works,
   so the worker runs as a classic script everywhere: its one export is dropped and the module workers MapLibre asks for
   (directly, or through an import wrapper on file://) are started as classic workers from that Blob. */
let workerSet = false;
function setWorker() {
  if (workerSet) return;
  workerSet = true;
  try {
    const url = URL.createObjectURL(new Blob([workerSrc.replace(/export\s*\{[^}]*\}\s*;?\s*(\/\/# sourceMappingURL=\S*)?\s*$/, '')], { type: 'text/javascript' }));
    const Native = window.Worker;
    window.Worker = function PPWorker(u, o) {
      if (o && o.type === 'module' && /^blob:/.test(String(u))) return new Native(url);
      return o ? new Native(u, o) : new Native(u);
    };
    window.Worker.prototype = Native.prototype;
    maplibregl.setWorkerUrl(url);
  } catch (e) { /* the default stays */ }
}

let glOk = null;
export function supported() {
  if (glOk != null) return glOk;
  try {
    if (/[?&]gl=0\b/.test(location.search)) return (glOk = false); // a link can force the simple map
    const c = document.createElement('canvas');
    glOk = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { glOk = false; }
  return glOk;
}

const EMPTY = { type: 'FeatureCollection', features: [] };
const fc = features => ({ type: 'FeatureCollection', features: features || [] });
const calm = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* small map icons drawn on a canvas (synchronous, no image loading): hazard triangle, road report, night halt */
function icon(kind, C) {
  const s = 2, w = 22 * s, h = 22 * s, cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.lineJoin = 'round';
  if (kind === 'tri') {
    g.beginPath(); g.moveTo(w / 2, 3 * s); g.lineTo(w - 2 * s, h - 4 * s); g.lineTo(2 * s, h - 4 * s); g.closePath();
    g.fillStyle = '#F2B705'; g.fill(); g.lineWidth = 1.6 * s; g.strokeStyle = '#14221C'; g.stroke();
    g.fillStyle = '#14221C'; g.fillRect(w / 2 - 1 * s, 9 * s, 2 * s, 5 * s); g.fillRect(w / 2 - 1 * s, 15.5 * s, 2 * s, 2 * s);
  } else if (kind === 'rep') {
    g.beginPath(); g.arc(w / 2, h / 2, 8 * s, 0, Math.PI * 2); g.fillStyle = C.avd; g.fill(); g.lineWidth = 2 * s; g.strokeStyle = '#FFFFFF'; g.stroke();
    g.fillStyle = '#FFFFFF'; g.fillRect(w / 2 - 1.1 * s, 6.5 * s, 2.2 * s, 6 * s); g.fillRect(w / 2 - 1.1 * s, 14 * s, 2.2 * s, 2.2 * s);
  } else if (kind === 'x') { // a road the authorities closed that day (the proof replay)
    g.beginPath(); g.arc(w / 2, h / 2, 9 * s, 0, Math.PI * 2); g.fillStyle = C.ink; g.fill(); g.lineWidth = 2 * s; g.strokeStyle = C.surface; g.stroke();
    g.strokeStyle = C.surface; g.lineWidth = 2.4 * s; g.lineCap = 'round';
    g.beginPath(); g.moveTo(w / 2 - 4 * s, h / 2 - 4 * s); g.lineTo(w / 2 + 4 * s, h / 2 + 4 * s); g.moveTo(w / 2 + 4 * s, h / 2 - 4 * s); g.lineTo(w / 2 - 4 * s, h / 2 + 4 * s); g.stroke();
  } else if (kind === 'halt') {
    g.beginPath(); g.arc(w / 2, h / 2, 9 * s, 0, Math.PI * 2); g.fillStyle = C.ink; g.fill(); g.lineWidth = 2 * s; g.strokeStyle = C.surface; g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, 5 * s, 0, Math.PI * 2); g.fillStyle = '#F2B705'; g.fill();
    g.beginPath(); g.arc(w / 2 + 2.6 * s, h / 2 - 2 * s, 4.6 * s, 0, Math.PI * 2); g.fillStyle = C.ink; g.fill();
  }
  return { width: w, height: h, data: g.getImageData(0, 0, w, h).data };
}

/* the simple basemap baked into the app (rivers, roads, borders, lakes as [lon, lat] lines) */
function baseSources(B) {
  const lines = a => fc((a || []).map(l => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: l } })));
  return {
    'b-lakes': fc((B.lakes || []).map(l => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [l] } }))),
    'b-rivers': lines(B.rivers), 'b-roads': lines(B.roads), 'b-borders': lines(B.borders),
  };
}

const W = (a, b) => ['interpolate', ['linear'], ['zoom'], 6, a, 12, b]; // line width that grows with zoom

/* OpenStreetMap layers from the Protomaps basemap, recoloured to the app's land colour. Labels (symbol layers) are left
   out: they need glyph files from a font server, and MapLibre cannot shape Devanagari; the app draws its own place
   names as HTML. Country lines are left out too: the app draws its own borders. */
function osmLayers(C) {
  const f = Object.assign({}, namedFlavor(C.dark ? 'dark' : 'light'), { background: C.land, earth: C.land });
  return pmLayers('pm', f, { lang: 'en' }).filter(l => l.type !== 'symbol' && l.type !== 'background' && !/^boundaries/.test(l.id));
}

function style(C, B, T) {
  T = T || {};
  const src = {};
  Object.entries(baseSources(B)).forEach(([k, v]) => { src[k] = { type: 'geojson', data: v }; });
  ['net', 'alts', 'route', 'gsi', 'spots', 'reports', 'halts', 'towns', 'events', 'cross'].forEach(k => { src[k] = { type: 'geojson', data: EMPTY }; });
  src['route-trf'] = { type: 'geojson', data: EMPTY, lineMetrics: true };
  const lvlColor = (a, b, c, plain) => ['case', ['get', 'plain'], plain, ['match', ['get', 'lvl'], 2, c, 1, b, a]];
  const osm = !!T.base, base = [];
  if (osm) { src.pm = Object.assign({ type: 'vector' }, T.base); base.push(...osmLayers(C)); }
  if (T.dem) {
    src.dem = Object.assign({ type: 'raster-dem', encoding: 'terrarium', tileSize: 256 }, T.dem);
    src.hs = Object.assign({}, src.dem); delete src.hs.attribution; // its own copy: hillshade and 3D terrain on one source draw badly
    base.splice(osm ? 2 : 0, 0, { id: 'hillshade', type: 'hillshade', source: 'hs', paint: {
      'hillshade-shadow-color': C.dark ? '#000000' : '#47584f', 'hillshade-highlight-color': C.dark ? '#5d6b63' : '#ffffff',
      'hillshade-accent-color': C.dark ? '#0b1410' : '#5f6f66', 'hillshade-exaggeration': C.dark ? .45 : .38 } });
  }
  const hide = osm ? { visibility: 'none' } : {}; // the simple lakes, rivers and roads under the OSM ones would double up
  return {
    version: 8, sources: src,
    layers: [
      { id: 'land', type: 'background', paint: { 'background-color': C.land } },
      ...base,
      { id: 'b-lakes', type: 'fill', source: 'b-lakes', layout: hide, paint: { 'fill-color': C.water, 'fill-opacity': .35 } },
      { id: 'b-rivers', type: 'line', source: 'b-rivers', layout: hide, paint: { 'line-color': C.water, 'line-width': W(1, 2), 'line-opacity': .8 } },
      { id: 'b-roads', type: 'line', source: 'b-roads', layout: hide, paint: { 'line-color': C.muted, 'line-width': W(.6, 1.4), 'line-opacity': .35 } },
      { id: 'b-borders', type: 'line', source: 'b-borders', paint: { 'line-color': C.muted, 'line-width': 1, 'line-opacity': .6, 'line-dasharray': [5, 4] } },
      { id: 'net', type: 'line', source: 'net', layout: { 'line-cap': 'round' }, paint: { 'line-color': C.muted, 'line-width': W(1.2, 2.4), 'line-opacity': .28 } },
      { id: 'events', type: 'circle', source: 'events', paint: { 'circle-radius': 2, 'circle-color': '#6B4C9A', 'circle-opacity': .55 } },
      { id: 'alts', type: 'line', source: 'alts', layout: { 'line-cap': 'round' }, paint: { 'line-color': C.ink, 'line-width': W(2.4, 4), 'line-opacity': .35, 'line-dasharray': [2, 2.4] } },
      // the chosen route: an edge in a darker hue of each level (yellow alone is 1.6:1 on the light map), then the colour
      { id: 'route-edge', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': lvlColor(C.goEdge, C.cauEdge, C.avdEdge, C.surface), 'line-width': W(6, 12) } },
      { id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': lvlColor(C.go, C.cau, C.avd, C.muted), 'line-width': W(3.4, 8) } },
      { id: 'route-blocked', type: 'line', source: 'route', filter: ['==', ['get', 'blocked'], true], layout: { 'line-cap': 'butt' },
        paint: { 'line-color': C.surface, 'line-width': W(2, 4), 'line-dasharray': [1.2, 1.6] } },
      // traffic view: one continuous gradient along the whole route
      { id: 'route-trf-edge', type: 'line', source: 'route-trf', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.ink, 'line-width': W(6, 12), 'line-opacity': .55 } },
      { id: 'route-trf', type: 'line', source: 'route-trf', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.go, 'line-width': W(3.4, 8) } },
      { id: 'gsi', type: 'circle', source: 'gsi', minzoom: 10,
        paint: { 'circle-radius': 3.4, 'circle-color': ['case', ['get', 'active'], '#7a3b0c', '#b07a45'], 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 1 } },
      { id: 'towns', type: 'circle', source: 'towns', paint: { 'circle-radius': W(2.6, 5), 'circle-color': C.surface, 'circle-stroke-color': C.ink, 'circle-stroke-width': 1.2 } },
      { id: 'halts', type: 'symbol', source: 'halts', layout: { 'icon-image': 'pp-halt', 'icon-size': 1, 'icon-allow-overlap': true } },
      { id: 'spots', type: 'symbol', source: 'spots', layout: { 'icon-image': 'pp-tri', 'icon-size': .85, 'icon-allow-overlap': false, 'icon-padding': 1 } },
      { id: 'reports', type: 'symbol', source: 'reports', layout: { 'icon-image': 'pp-rep', 'icon-size': .85, 'icon-allow-overlap': true } },
      { id: 'cross', type: 'symbol', source: 'cross', layout: { 'icon-image': 'pp-x', 'icon-size': .9, 'icon-allow-overlap': true } },
    ],
  };
}

/* line-gradient along the route: stops = [[fraction 0 to 1, colour], ...] in order, one per stretch; colours blend
   over a short distance at each boundary instead of a hard join */
function gradient(stops) {
  if (!stops || !stops.length) return null;
  const out = ['interpolate', ['linear'], ['line-progress']];
  let last = -1;
  const put = (f, c) => { f = Math.max(0, Math.min(1, f)); if (f <= last) f = last + 1e-6; if (f > 1) return; out.push(f, c); last = f; };
  stops.forEach(([a, b, c]) => { const d = Math.min(.01, (b - a) / 4); put(a + d, c); put(b - d, c); });
  return out.length >= 7 ? out : ['interpolate', ['linear'], ['line-progress'], 0, stops[0][2], 1, stops[0][2]];
}

export function create(el, opts) {
  setWorker();
  const o = opts || {};
  let C = o.colors, B = o.basemap || {}, T = o.tiles || {};
  if (usesPm(T)) protocol();
  const map = new maplibregl.Map({
    container: el, style: style(C, B, T), bounds: o.bounds || [[77.5, 28.6], [81.1, 31.3]], fitBoundsOptions: { padding: 24 },
    attributionControl: false, pixelRatio: Math.min(window.devicePixelRatio || 1, 2), fadeDuration: calm() ? 0 : 200,
    dragRotate: false, pitchWithRotate: false, maxPitch: 0, maxZoom: 16, renderWorldCopies: false, cancelPendingTileRequestsWhileZooming: true,
  });
  map.touchZoomRotate.disableRotation();
  if (o.scrollZoom === false) map.scrollZoom.disable(); // a map inside a scrolling page: the wheel scrolls the page
  if (o.zoomControl) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: o.attribution || '' }), 'bottom-left');
  const state = { data: {}, markers: {}, loaded: false, anim: 0, trf: null };
  /* the credits start folded to the (i) button: opened, the longer OSM and terrain lines run across the route */
  const shut = () => { const a = el.querySelector('.maplibregl-ctrl-attrib'); if (a) { a.classList.remove('maplibregl-compact-show'); a.removeAttribute('open'); } };
  map.once('idle', shut);
  const addIcons = () => { ['tri', 'rep', 'halt', 'x'].forEach(k => { const id = 'pp-' + k; if (map.hasImage(id)) map.removeImage(id); map.addImage(id, icon(k, C), { pixelRatio: 2 }); }); };
  const flush = () => {
    Object.entries(state.data).forEach(([k, v]) => { const s = map.getSource(k); if (s) s.setData(v); });
    applyTrf();
  };
  const applyTrf = () => {
    if (!state.loaded) return;
    const g = gradient(state.trf);
    if (g) map.setPaintProperty('route-trf', 'line-gradient', g);
  };
  map.on('load', () => { state.loaded = true; addIcons(); flush(); if (o.onload) o.onload(); });
  const restyle = () => {
    state.loaded = false;
    map.setStyle(style(C, B, T), { diff: false });
    map.once('style.load', () => { state.loaded = true; addIcons(); flush(); if (state.mode) api.mode(state.mode); if (state.d3) api.view3d(true); });
    map.once('idle', shut);
  };
  map.on('styleimagemissing', e => { if (/^pp-/.test(e.id)) addIcons(); });

  /* popups: tapping a route stretch or a pin opens its HTML (built by the app, so it is in the right language) */
  const pop = new maplibregl.Popup({ closeButton: true, maxWidth: '300px', focusAfterOpen: false });
  const tapLayers = ['route-line', 'spots', 'reports', 'halts', 'cross', 'towns'];
  map.on('click', e => {
    const f = map.queryRenderedFeatures(e.point, { layers: tapLayers.filter(l => map.getLayer(l)) })[0];
    if (!f || !f.properties.pop) return;
    pop.setLngLat(e.lngLat).setHTML(f.properties.pop).addTo(map);
    if (o.onpopup) o.onpopup();
  });
  tapLayers.forEach(l => {
    map.on('mouseenter', l, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', l, () => { map.getCanvas().style.cursor = ''; });
  });

  const api = {
    map,
    /* set one source; before the style loads the data waits and goes in on load */
    set(name, features) {
      const d = fc(features);
      state.data[name] = d;
      if (state.loaded) { const s = map.getSource(name); if (s) s.setData(d); }
    },
    /* traffic gradient: stops [[from, to, colour]] as fractions of the route length */
    setTraffic(stops) { state.trf = stops; applyTrf(); },
    /* the route draws itself from start to end: setData with growing lines, about 900 ms, nothing under reduced motion */
    drawOn(name, features) {
      const full = fc(features);
      state.data[name] = full;
      cancelAnimationFrame(state.anim);
      if (!state.loaded || calm()) { this.set(name, features); return; }
      const lens = full.features.map(f => f.properties.len || 1), total = lens.reduce((a, b) => a + b, 0) || 1, t0 = performance.now(), D = 900;
      const step = now => {
        const k = Math.min(1, (now - t0) / D);
        let left = k * total;
        const part = full.features.map((f, i) => {
          if (left <= 0) return null;
          const c = f.geometry.coordinates, take = Math.min(1, left / lens[i]); left -= lens[i];
          if (take >= 1) return f;
          const n = Math.max(2, Math.ceil(c.length * take));
          return { type: 'Feature', properties: f.properties, geometry: { type: 'LineString', coordinates: c.slice(0, n) } };
        }).filter(Boolean);
        const s = map.getSource(name); if (s) s.setData(fc(part));
        if (k < 1) state.anim = requestAnimationFrame(step);
      };
      state.anim = requestAnimationFrame(step);
    },
    /* layer visibility: 'risk' or 'traffic' */
    mode(m) {
      const vis = (ids, on) => ids.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); });
      const go = () => { vis(['route-edge', 'route-line', 'route-blocked', 'gsi', 'spots', 'reports'], m !== 'traffic'); vis(['route-trf-edge', 'route-trf'], m === 'traffic'); };
      if (state.loaded) go(); else map.once('load', go);
    },
    /* HTML markers (kilometre stones): group -> [{lngLat, html, className, title, z}] */
    markers(group, list) {
      (state.markers[group] || []).forEach(m => m.remove());
      state.markers[group] = (list || []).map(x => {
        const el = document.createElement('div');
        el.className = x.className || ''; el.innerHTML = x.html; if (x.title) el.title = x.title;
        if (x.z) el.style.zIndex = x.z;
        return new maplibregl.Marker({ element: el, anchor: x.anchor || 'bottom' }).setLngLat(x.lngLat).addTo(map);
      });
    },
    /* fit [[west, south], [east, north]] with padding {top, bottom, left, right} */
    fit(bounds, padding, animate) {
      if (!bounds) return;
      map.resize();
      const el = map.getContainer(), cw = el.clientWidth, ch = el.clientHeight;
      if (cw < 40 || ch < 40) return false; // hidden: the app fits again when it is shown
      const p = Object.assign({ top: 0, bottom: 0, left: 0, right: 0 }, padding);
      const sx = Math.min(1, (cw - 40) / Math.max(1, p.left + p.right)), sy = Math.min(1, (ch - 40) / Math.max(1, p.top + p.bottom)); // never more padding than map
      ['left', 'right'].forEach(k => { p[k] = Math.round(p[k] * sx); }); ['top', 'bottom'].forEach(k => { p[k] = Math.round(p[k] * sy); });
      map.fitBounds(bounds, { padding: p, maxZoom: o.maxZoom || 11, duration: animate && !calm() ? 900 : 0 });
      return true;
    },
    resize() { map.resize(); },
    closePopup() { pop.remove(); },
    /* open a popup from the app (a tap on a row in the control room grid) */
    popup(lngLat, html) { pop.setLngLat(lngLat).setHTML(html).addTo(map); },
    /* new theme colours (light or dark): rebuild the style once, the data goes back in on load */
    theme(colors) { C = colors; restyle(); },
    /* the offline map files turned up (or went): rebuild the style with them */
    tiles(t) {
      t = t || {};
      if (JSON.stringify([t.base, t.dem]) === JSON.stringify([T.base, T.dem])) return;
      T = t; if (usesPm(T)) protocol();
      if (!T.dem && state.d3) api.view3d(false);
      restyle();
    },
    has(k) { return !!T[k]; },
    /* 3D: tilt the map and raise the hills from the terrain file (only with dem.pmtiles); false lays it flat again */
    view3d(on) {
      on = !!on && !!T.dem;
      state.d3 = on;
      const go = () => {
        map.setMaxPitch(on ? 72 : 0);
        if (on) { map.dragRotate.enable(); map.touchZoomRotate.enableRotation(); map.touchPitch.enable(); }
        else { map.dragRotate.disable(); map.touchZoomRotate.disableRotation(); }
        map.setTerrain(on ? { source: 'dem', exaggeration: 1.5 } : null);
        if (map.setSky) map.setSky(on ? { 'sky-color': C.dark ? '#0d1a2b' : '#9cc6ec', 'horizon-color': C.dark ? '#1d2c3c' : '#e6eef2', 'fog-color': C.land, 'sky-horizon-blend': .6, 'horizon-fog-blend': .5, 'fog-ground-blend': .7 } : {});
        map.easeTo({ pitch: on ? 55 : 0, bearing: on ? map.getBearing() : 0, duration: calm() ? 0 : 900 });
      };
      if (state.loaded) go(); else map.once('load', go);
      return on;
    },
    is3d() { return !!state.d3; },
    /* how many stretches the map draws (the tests count them) */
    count(name) { const d = state.data[name || 'route']; return d ? d.features.length : 0; },
    remove() { cancelAnimationFrame(state.anim); Object.values(state.markers).flat().forEach(m => m.remove()); map.remove(); },
  };
  const modeBase = api.mode;
  api.mode = m => { state.mode = m; modeBase(m); };
  return api;
}
