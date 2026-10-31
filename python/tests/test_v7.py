import random
import unittest

from pahaadpath import v7

try:
    import sklearn  # noqa: F401
    HAVE = True
except ImportError:
    HAVE = False


@unittest.skipUnless(HAVE, 'scikit-learn not installed (the v7 workflow installs it)')
class V7Test(unittest.TestCase):
    def test_learns_across_seasons_and_beats_a_rain_only_ranking(self):
        """synthetic: landslides need rain AND high GSI; the 'engine' ranks by rain only"""
        rnd = random.Random(1)
        data = {}
        for s, src in ((2010, 'nasa'), (2011, 'nasa'), (2012, 'nasa'), (2026, 'pwd')):
            X, y, e = [], [], []
            for _ in range(1500):
                rain, gsi = rnd.random(), rnd.random()
                f = [0.0] * len(v7.FEATURES)
                f[v7.FEATURES.index('log_p24')] = rain * 4
                f[v7.FEATURES.index('gsi_mean')] = 1 + 2 * gsi
                for n in ('log_p72', 'log_a7', 'log_a30', 'sm0'):
                    f[v7.FEATURES.index(n)] = rnd.random()
                p = 0.6 if rain > .6 and gsi > .6 else 0.01
                y.append(1 if rnd.random() < p else 0)
                X.append(f)
                e.append(int(rain * 100))
            data[s] = (X, y, e, list(range(len(y))), src)
        o, m = v7.run(data, log=lambda *a: None)
        self.assertTrue(o['adopted'])
        for k in ('logit', 'hgb'):
            self.assertGreater(o['check'][k]['nasa']['10'], o['check']['engine']['nasa']['10'])
        c = o['model']['cuts']
        self.assertLess(c['zc'], c['za'])
        self.assertEqual(v7.to_score(c['zc'], c), 35)
        self.assertIn('Model v7', v7.report_md(o))

    def test_weights_balance_seasons(self):
        w = v7.weights([1, 1, 1, 1, 2, 2], [0, 0, 0, 1, 0, 1])
        self.assertAlmostEqual(sum(w), 6)
        self.assertAlmostEqual(w[3], 3 * w[0])  # one positive weighs as much as the three negatives of its season


if __name__ == '__main__':
    unittest.main()
