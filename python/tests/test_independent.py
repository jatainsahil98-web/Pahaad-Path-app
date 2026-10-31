import unittest

from pahaadpath import independent
from pahaadpath.engine import SERIES_LEN  # noqa: F401
from pahaadpath.network import Network


class IndependentTest(unittest.TestCase):
    def test_scores_a_season_with_reported_landslides(self):
        net = Network()
        hill = net.hill()
        l = hill[0]
        la, lo = l['geom'][len(l['geom']) // 2]
        coolr = [{'date': '2021-07-%02d' % d, 'lat': la, 'lon': lo} for d in (5, 12, 20)]
        wet = {'2021-07-05', '2021-07-12', '2021-07-20'}

        def fetch(keys, start, end):
            import datetime as dt
            n = ((dt.date.fromisoformat(end) - dt.date.fromisoformat(start)).days + 1) * 24
            out = {v: {k: [0.0] * n for k in keys} for v in ('precipitation', 'soil_moisture_0_to_7cm', 'soil_moisture_7_to_28cm',
                                                                 'soil_moisture_28_to_100cm', 'temperature_2m')}
            for d in wet:  # 40 h of heavy rain before each event day ends
                e = ((dt.date.fromisoformat(d) - dt.date.fromisoformat(start)).days + 1) * 24
                for h in range(e - 40, e):
                    out['precipitation'][l['key']][h] = 6.0
            return out
        net_old = Network()
        net_old.catalog = []  # GLC left out: only the synthetic COOLR season
        r = independent.run(net_old, net_old, None, fetch, coolr, log=lambda *a: None)
        self.assertEqual(r['seasons'], [2021])
        self.assertEqual(r['events'], 3 * sum(1 for h in hill if h['key'] == l['key'] and h['id'] == l['id']) or 3)
        self.assertEqual(r['engine']['caution']['pod'], 1.0)
        self.assertLess(r['engine']['caution']['alarm_rate'], .05)
        self.assertIn('Check on other years', independent.report_md(r))

    def test_labels_need_the_road_nearby(self):
        net = Network()
        net.catalog = []
        far = [('2021-07-05', 25.0, 75.0, 0, 'COOLR')]
        self.assertEqual(independent.season_labels(net, far), {})


if __name__ == '__main__':
    unittest.main()
