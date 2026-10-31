import datetime as dt
import random
import unittest

from pahaadpath import v6
from pahaadpath.network import Network


class V6Test(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """synthetic season: rain everywhere, but roads close only where the soil was already soaked"""
        rnd = random.Random(5)
        net = Network()
        start, first, n_days = '2026-05-01', '2026-08-01', 61
        lead = (dt.date.fromisoformat(first) - dt.date.fromisoformat(start)).days
        hours = (lead + n_days) * 24
        keys = net.keys()
        vars_ = {v: {} for v in ('precipitation', 'soil_moisture_0_to_7cm', 'soil_moisture_7_to_28cm', 'soil_moisture_28_to_100cm', 'temperature_2m')}
        wet_day = {}
        for k in keys:
            p, sm = [], []
            for d in range(lead + n_days):
                storm = rnd.random() < .3
                soaked = rnd.random() < .35
                wet_day[(k, d)] = storm and soaked
                p += [rnd.uniform(1.5, 4) if storm and 8 <= h < 20 else 0.0 for h in range(24)]
                sm += [.42 if soaked else .18] * 24
            vars_['precipitation'][k] = p
            vars_['soil_moisture_0_to_7cm'][k] = sm
            vars_['soil_moisture_7_to_28cm'][k] = sm
            vars_['soil_moisture_28_to_100cm'][k] = [.3] * hours
            vars_['temperature_2m'][k] = [15.0] * hours
        done = []
        for l in net.hill():
            for d in range(lead, lead + n_days):
                if wet_day[(l['key'], d)] and rnd.random() < .8:
                    day = (dt.date.fromisoformat(start) + dt.timedelta(days=d)).isoformat()
                    done.append({'id': len(done), 'n': 'road', 'd': None, 'ty': 'NH', 'ag': 'PWD', 'near': [l['a'], l['b']], 'links': [l['id']],
                                 'c': day + 'T21:00', 'first': day + ' evening', 'last': day + ' evening', 'opened': day + ' evening'})
        last = (dt.date.fromisoformat(first) + dt.timedelta(days=n_days - 1)).isoformat()
        cls.inv = {'reports': [{'date': first}, {'date': last}], 'done': done, 'open': {}}
        cls.net, cls.vars, cls.start = net, vars_, start
        cls.r = v6.run(cls.inv, net, vars_, start, mode='strict', quakes=[], log=lambda *a: None)

    def test_soil_moisture_is_kept_and_beats_rain_only(self):
        r = self.r
        self.assertIn('soil', r['chosen'])
        self.assertGreater(r['v6']['caution']['tss'], r['caine']['caution']['tss'])
        self.assertGreater(r['v6']['precision']['caution'], r['caine']['precision']['caution'])
        self.assertTrue(r['adopted'])
        self.assertFalse(any(s['kept'] for s in r['steps'] if s['groups'][-1] in ('cold', 'quake')))
        md = v6.report_md(r)
        self.assertIn('Model v6', md)
        self.assertTrue(v6.summary(r)['adopted'])

    def test_live_score_matches_training_checks(self):
        m = self.r['model']
        for c in m['checks']:
            self.assertEqual(v6.to_score(v6.logit(m, c['in']), m['bands']), c['score'])
        i0 = 100 * 24
        s = v6.score_now(m, self.net, self.vars, self.start, i0, [])
        self.assertEqual(set(s), {l['id'] for l in self.net.hill()})
        self.assertTrue(all(0 <= v[0] <= 100 and v[1] in (0, 1, 2) for v in s.values()))

    def test_quake_weight(self):
        q = [(1000.0, 30.0, 79.0, 5.0)]
        near, far = v6.quake_load(q, 30.0, 79.0, 2000.0), v6.quake_load(q, 31.0, 79.0, 2000.0)
        self.assertGreater(near, far)
        self.assertEqual(v6.quake_load(q, 30.0, 79.0, 1000.0 + 8 * 86400), 0.0)
        self.assertEqual(v6.quake_load(None, 30.0, 79.0, 2000.0), 0.0)

    def test_too_few_closures(self):
        inv = dict(self.inv, done=self.inv['done'][:5])
        r = v6.run(inv, self.net, self.vars, self.start, mode='strict', quakes=None, log=lambda *a: None)
        self.assertFalse(r['adopted'])
        self.assertIsNone(r['model'])
        self.assertIn('Not trained', v6.report_md(r))


if __name__ == '__main__':
    unittest.main()
