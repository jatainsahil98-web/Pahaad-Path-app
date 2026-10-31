"""Road report sync server (optional). Standard library only: http.server and sqlite3.

Phones keep reports in a queue while they have no signal and send the whole queue in one POST /sync when a connection
comes back; the reply carries every report and confirmation from the last 48 hours, so one round trip brings a phone up
to date. Messages use the same format as the ntfy.sh channel the app uses when no server is set:
  {"v":1,"k":"report","rid":"...","dev":"...","rt":<ms>,"seg":"rishikesh-devprayag","spot":0,"type":"landslide"}
  {"v":1,"k":"confirm","rid":"...","dev":"...","rt":<ms>}
Run: python -m pahaadpath serve --port 8787 --db reports.sqlite3   (put it behind HTTPS before real use)."""
import json
import sqlite3
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .network import Network

KEEP_MS = 48 * 3600 * 1000  # the longest a report keeps weight in the app (a bridge out, TYPEH)
TYPES = {'landslide', 'debris', 'washed', 'bridge', 'clear'}
MAX_BATCH = 200
PER_DEVICE_HOUR = 60


class Store:
    def __init__(self, db, links):
        self.db = sqlite3.connect(db, check_same_thread=False)
        self.lock = threading.Lock()
        self.links = links
        self.db.execute('create table if not exists msg (rid text, dev text, k text, rt integer, got integer, body text, primary key (rid, dev, k))')
        self.db.commit()

    def valid(self, m, now):
        if not isinstance(m, dict) or m.get('v') != 1 or m.get('k') not in ('report', 'confirm'):
            return False
        rid, dev, rt = m.get('rid'), m.get('dev'), m.get('rt')
        if not isinstance(rid, str) or not 0 < len(rid) <= 40 or not isinstance(dev, str) or not 0 < len(dev) <= 20:
            return False
        if not isinstance(rt, (int, float)) or rt < now - KEEP_MS or rt > now + 300000:
            return False
        if m['k'] == 'report':
            if m.get('seg') not in self.links or m.get('type') not in TYPES or not isinstance(m.get('spot', -1), int):
                return False
        return True

    def add(self, msgs, now):
        took = 0
        with self.lock:
            for m in msgs[:MAX_BATCH]:
                if not self.valid(m, now):
                    continue
                n = self.db.execute('select count(*) from msg where dev=? and got>?', (m['dev'], now - 3600000)).fetchone()[0]
                if n >= PER_DEVICE_HOUR:
                    continue
                keep = {k: m[k] for k in ('v', 'k', 'rid', 'dev', 'rt', 'seg', 'spot', 'type') if k in m}
                cur = self.db.execute('insert or ignore into msg values (?,?,?,?,?,?)',
                                      (m['rid'], m['dev'], m['k'], int(m['rt']), now, json.dumps(keep, separators=(',', ':'))))
                took += cur.rowcount
            self.db.execute('delete from msg where rt<?', (now - KEEP_MS,))
            self.db.commit()
        return took

    def recent(self, now, since=0):
        with self.lock:
            rows = self.db.execute('select body from msg where rt>=? and got>=? order by rt', (now - KEEP_MS, since)).fetchall()
        return [json.loads(r[0]) for r in rows]


def handler_for(store):
    class H(BaseHTTPRequestHandler):
        server_version = 'pahaadpath-sync'

        def _send(self, code, obj):
            body = json.dumps(obj, separators=(',', ':')).encode()
            self.send_response(code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self):
            self._send(204, {})

        def do_GET(self):
            now = int(time.time() * 1000)
            if self.path.startswith('/health'):
                return self._send(200, {'ok': True, 'now': now})
            if self.path.startswith('/reports'):
                return self._send(200, {'now': now, 'msgs': store.recent(now)})
            self._send(404, {'error': 'not found'})

        def do_POST(self):
            now = int(time.time() * 1000)
            if not self.path.startswith('/sync'):
                return self._send(404, {'error': 'not found'})
            n = int(self.headers.get('Content-Length') or 0)
            if n > 200000:
                return self._send(413, {'error': 'too large'})
            try:
                js = json.loads(self.rfile.read(n).decode() or '{}')
            except ValueError:
                return self._send(400, {'error': 'bad json'})
            msgs = js.get('msgs', []) if isinstance(js, dict) else []
            took = store.add(msgs if isinstance(msgs, list) else [], now)
            self._send(200, {'now': now, 'took': took, 'msgs': store.recent(now)})

        def log_message(self, fmt, *a):
            pass
    return H


def make_server(host, port, db):
    links = {l['id'] for l in Network().links.values()}
    return ThreadingHTTPServer((host, port), handler_for(Store(db, links)))


def serve(host, port, db):
    srv = make_server(host, port, db)
    print('PahaadPath sync server on http://%s:%d (database %s)' % (host, port, db))
    srv.serve_forever()
