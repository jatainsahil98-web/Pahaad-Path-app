import math
import random
import unittest

from pahaadpath import backtest, calibrate
from pahaadpath.engine import caine, ed_threshold
from pahaadpath.network import Network


class CalibrateTest(unittest.TestCase):
    def test_events_split_at_dry_gaps(self):
        s = [0] * 10 + [2, 3, 0, 1] + [0] * 60 + [5, 5]
        self.assertEqual(calibrate.events(s), [(10, 13), (74, 75)])
        self.assertEqual(calibrate.event_at(s, 13), (6, 4))
        self.assertEqual(calibrate.event_at(s, 30), (6, 4))   # ended within a day
        self.assertIsNone(calibrate.event_at(s, 60))         # more than a day dry

    def test_fit_recovers_a_known_curve(self):
        rnd = random.Random(3)
        alpha, gamma = 12.0, 0.45
        pts = []
        for _ in range(400):
            d = 10 ** rnd.uniform(0, 2.2)
            pts.append((alpha * d ** gamma * 10 ** rnd.gauss(0.25, 0.12), d))
        f = calibrate.fit_ed(pts)
        self.assertAlmostEqual(f['gamma'], gamma, delta=0.03)
        # 5% of points below the 5% curve
        a5 = f['alpha']['5']
        below = sum(1 for e, d in pts if e < a5 * d ** f['gamma']) / len(pts)
        self.assertAlmostEqual(below, 0.05, delta=0.025)
        self.assertLess(f['alpha']['1'], f['alpha']['5'])
        self.assertLess(f['alpha']['5'], f['alpha']['20'])
        sp = calibrate.bootstrap(pts, 5, reps=100)
        self.assertLess(sp['gamma_sd'], 0.05)

    def test_zones_need_enough_closures(self):
        pts = [('3', 50 + i, 10 + i % 7) for i in range(40)] + [('2', 40, 12)] * 5
        f = calibrate.fit_zones(pts)
        self.assertEqual(sorted(f['zones']), ['3'])
        self.assertIsNone(calibrate.fit_zones(pts[:10]))
        th = calibrate.at_level(f, 5)
        net = Network()
        lk = next(l for l in net.links.values() if not l['plain'] and l['susc'] == 2)
        fn = ed_threshold(th, lk)  # zone 2 has no curve of its own: pooled
        self.assertAlmostEqual(fn(24), th['pooled']['alpha'] * 24 ** th['pooled']['gamma'])
        self.assertIs(ed_threshold(None, lk), caine)


class BacktestTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.net = Network()
        hill = cls.net.hill()
        cls.a, cls.b = hill[0], hill[1]

    def inv(self):
        a, b = self.a, self.b
        ep = lambda i, l, c, opened: {'id': i, 'n': 'road', 'd': None, 'ty': 'NH', 'ag': 'PWD', 'near': [l['a'], l['b']], 'links': [l['id']],
                                      'c': c, 'first': c[:10] + ' morning', 'last': c[:10] + ' evening', 'opened': opened}
        return {'reports': [{'date': '2026-08-%02d' % d} for d in range(1, 21)],
                'done': [ep(1, a, '2026-08-10T06:00', '2026-08-12 morning'), ep(2, b, '2026-08-15T06:00', '2026-08-16 morning')], 'open': {}}

    def rain(self, wet_link, wet_day_index):
        """dry everywhere except a soaking 30 h before 06:00 on the given day at one stretch"""
        hours = 24 * 25
        out = {k: [0.0] * hours for k in self.net.keys()}
        i = wet_day_index * 24 + 6
        for h in range(i - 30, i):
            out[wet_link['key']][h] = 9.0
        return out

    def test_labels_and_closed_days(self):
        lab = backtest.labels(self.inv(), self.net, 'strict')
        self.assertEqual(lab, {(self.a['id'], '2026-08-10'): '2026-08-10T06:00', (self.b['id'], '2026-08-15'): '2026-08-15T06:00'})
        skip = backtest.closed_days(self.inv(), self.net, 'strict')
        self.assertIn((self.a['id'], '2026-08-11'), skip)
        self.assertIn((self.a['id'], '2026-08-12'), skip)
        self.assertNotIn((self.a['id'], '2026-08-10'), skip)
        relaxed = backtest.labels(self.inv(), self.net, 'relaxed')
        self.assertGreaterEqual(len(relaxed), len(lab))

    def test_hit_and_miss(self):
        # rain before the first closure only: one hit, one miss, no false alarms on dry days
        rain = self.rain(self.a, 9)  # start 2026-08-01, day index 9 = 2026-08-10
        r = backtest.run(self.inv(), self.net, rain, '2026-08-01', mode='strict', log=lambda *x: None)
        t = r['caine']['caution']
        self.assertEqual((t['tp'], t['fn']), (1, 1))
        self.assertEqual(t['pod'], 0.5)
        self.assertLessEqual(t['fp'], 2)  # the wet stretch may stay high the day before
        self.assertEqual(r['caine']['lead_median_h'] is not None, True)
        self.assertIsNone(r['fit'])  # two closures are far too few to fit
        self.assertIn('needed before thresholds are fitted', r['fit_note'])
        md = backtest.report_md(r)
        self.assertIn('| Caine 1980 (in use) | Caution | 50% |', md)
        s = backtest.summary(r)
        self.assertEqual(s['caine']['caution']['pod'], 0.5)
        self.assertFalse(s['adopted'])

    def test_metrics_table(self):
        t = backtest.table(8, 2, 2, 88)
        self.assertAlmostEqual(t['pod'], .8)
        self.assertAlmostEqual(t['far'], .2)
        self.assertAlmostEqual(t['tss'], .8 - 2 / 90)
        self.assertEqual(backtest.folds(['2025-08-01', '2026-08-01', '2026-08-02']), [['2025-08-01'], ['2026-08-01', '2026-08-02']])
        self.assertEqual(len(backtest.folds(['2026-07-31', '2026-08-01'])), 2)


class Risk24Test(unittest.TestCase):
    def test_peak_over_next_day(self):
        from pahaadpath.engine import PAST, SERIES_LEN
        from pahaadpath.pack import risk24
        net = Network()
        hourly = {k: [0.0] * SERIES_LEN for k in net.keys()}
        lk = net.hill()[0]
        for h in range(PAST + 2, PAST + 20):
            hourly[lk['key']][h] = 12.0
        r = risk24(net, hourly)
        self.assertEqual(set(r), {l['id'] for l in net.hill()})
        self.assertGreater(r[lk['id']][0], 35)
        self.assertTrue(3 <= r[lk['id']][2] <= 23)  # first hour at the peak, once rain has fallen
        dry = next(l for l in net.hill() if l['key'] != lk['key'])
        self.assertLess(r[dry['id']][0], 35)


if __name__ == '__main__':
    unittest.main()


class MergeTest(unittest.TestCase):
    def test_past_season_open_closures_end_at_its_last_report(self):
        from pahaadpath.inventory import merge
        a = {'reports': [{'date': '2025-07-01', 'slot': 'morning', 'url': 'a', 'closed': 1}], 'open': {'1': {'id': 1}}, 'done': []}
        b = {'reports': [{'date': '2026-07-01', 'slot': 'evening', 'url': 'b', 'closed': 1}], 'open': {'2': {'id': 2}}, 'done': [{'id': 3}]}
        m = merge([b, a])
        self.assertEqual([r['date'] for r in m['reports']], ['2025-07-01', '2026-07-01'])
        self.assertEqual(list(m['open']), ['2'])
        self.assertIn({'id': 1, 'opened': '2025-07-01 morning'}, m['done'])
