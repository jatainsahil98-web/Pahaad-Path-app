/* the map adapter as a global, set before the app runs (imports run in order; a statement in main.js would run after) */
import * as PPMap from './ppmap.js';
window.PPMap = PPMap;
