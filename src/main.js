/* Entry point. Styles in cascade order, then the libraries, then the app (core + feature files, one shared scope). */
import './fonts/fonts.css'; // bundled faces: no request to a font server
import 'leaflet/dist/leaflet.css';
import './app.css';
import './ui/tokens.css'; // 2.0 design tokens and Hindi type rules
import './features.css';
import './shell.css';
import './globals.js';
import './map/global.js'; // 2.0: MapLibre map adapter (WebGL) as window.PPMap; Leaflet stays as the fallback
import 'virtual:pp-app';
