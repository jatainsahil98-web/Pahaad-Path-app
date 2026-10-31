/* Libraries the app code expects as globals (it was written for plain <script> tags). Imported before the app so they
   exist when it runs: ES modules run in import order. */
import L from 'leaflet';
import qrcode from 'qrcode-generator';
window.L = L;
window.qrcode = qrcode;
