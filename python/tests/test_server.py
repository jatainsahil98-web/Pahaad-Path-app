import json
import os
import sys
import tempfile
import threading
import time
import unittest
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pahaadpath.server import make_server  # noqa: E402


class SyncServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        cls.srv = make_server('127.0.0.1', 0, os.path.join(cls.tmp, 'r.sqlite3'))
        cls.url = 'http://127.0.0.1:%d' % cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
        cls.srv.server_close()

    def post(self, msgs):
        req = urllib.request.Request(self.url + '/sync', data=json.dumps({'msgs': msgs}).encode(), headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())

    def test_queue_flush_and_confirm(self):
        now = int(time.time() * 1000)
        a = {'v': 1, 'k': 'report', 'rid': 'r1', 'dev': 'phoneA', 'rt': now - 3600000, 'seg': 'rishikesh-devprayag', 'spot': 0, 'type': 'landslide'}
        bad = dict(a, rid='r2', seg='nowhere')
        late = dict(a, rid='r4', rt=now - 20 * 3600000)  # queued in a valley for 20 h: still taken
        old = dict(a, rid='r3', rt=now - 49 * 3600000)
        js = self.post([a, bad, old, a, late])
        self.assertEqual(js['took'], 2)
        js = self.post([{'v': 1, 'k': 'confirm', 'rid': 'r1', 'dev': 'phoneB', 'rt': now}])
        self.assertEqual(js['took'], 1)
        kinds = sorted((m['k'], m['dev']) for m in js['msgs'] if m['rid'] == 'r1')
        self.assertEqual(kinds, [('confirm', 'phoneB'), ('report', 'phoneA')])
        with urllib.request.urlopen(self.url + '/reports') as r:
            self.assertEqual(len([m for m in json.loads(r.read())['msgs'] if m['rid'] == 'r1']), 2)


if __name__ == '__main__':
    unittest.main()
