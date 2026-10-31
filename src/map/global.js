import * as PPMap from './ppmap.js';
import { load as loadTiles } from './tiles.js';
window.PPMap = Object.assign({ loadTiles }, PPMap);
