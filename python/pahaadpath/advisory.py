"""Command-line advisory for a control room: the worst band on each hill stretch over the next hours, from the data
pack (or a saved copy of it, so it also runs with no signal) and the v5 model."""
import datetime as dt
import json
import urllib.request

from . import read_json
from .dataset import features
from .engine import PAST, sum_rain
from .model import band, logit, mem_days, score, with_memory

PACK_URL = 'https://raw.githubusercontent.com/jatainsahil98-web/Pahaad-Path-app/datapack/pack.json'
NAMES = ('Go', 'Caution', 'Avoid')


def load_pack(src=None):
    if src and not src.startswith('http'):
        with open(src, encoding='utf-8') as f:
            return json.load(f)
    with urllib.request.urlopen(src or PACK_URL, timeout=30) as r:
        return json.loads(r.read().decode())


def advisory(net, pack, model=None, hours=72):
    m = model or read_json('data', 'model', 'model_v5.json')
    h0 = dt.datetime.fromisoformat(pack['hour0'])
    day0 = dt.date.fromisoformat(pack['day0'])
    out = []
    for l in net.hill():
        hr = [v / 10 for v in pack['hourly'][l['key']]]
        dy = [v / 10 for v in pack['daily'][l['key']]]
        n = m['hist'].get(l['id'], 0)
        worst = None
        for a in range(hours):
            i = ((h0 + dt.timedelta(hours=a)).date() - day0).days
            a7 = sum(dy[max(0, i - 9):max(0, i - 2)])
            a30 = sum(dy[max(0, i - 30):max(0, i - 9)])
            s = score(m, logit(m, features(sum_rain(hr, a - 24, a), sum_rain(hr, a - 72, a), a7, a30, l['slope'], n)))
            s = with_memory(s, mem_days(m, dy, i, l['slope'], n, m.get('memory_days', 0)))
            if worst is None or s > worst[0]:
                worst = (s, a)
        out.append({'id': l['id'], 'score': worst[0], 'band': NAMES[band(worst[0])],
                    'at': (h0 + dt.timedelta(hours=worst[1])).strftime('%a %d %b %H:00 IST')})
    out.sort(key=lambda r: -r['score'])
    return out


assert PAST == 72  # the pack's hourly rows start 72 h before hour0, like the app's series
