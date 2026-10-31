import os
import unittest

from pahaadpath.closures import listing, parse
from pahaadpath.inventory import add_report, empty, pending, to_csv
from pahaadpath.network import Network

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, 'srmd_2026-08-19_morning_excerpt.txt'), encoding='utf-8') as f:
    REPORT = f.read()

LISTING = '''<table><tbody>
<tr><td>SRMD 30/09/2026 Morning Report</td><td><a href="https://x.invalid/c.pdf">View</a></td></tr>
<tr><td>SRMD 29/09/2026 Evening Report</td><td><a href="https://x.invalid/b.pdf">View</a></td></tr>
<tr><td>SRMD 29/09/2026 Morning Report</td><td><a href="https://x.invalid/a.pdf">View</a></td></tr>
<tr><td>SRMD 30/09/2026 Evening Report</td><td><a href="https://x.invalid/d.pdf">View</a></td></tr>
</tbody></table>'''


def road(i, name, near=(), c='2026-09-29T07:00', d='Chamoli'):
    return {'id': i, 'n': name, 'd': d, 'ty': 'SH', 'ag': 'PWD', 'near': list(near), 'c': c}


class InventoryTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        net = Network()
        cls.places, cls.links = net.places, net.links

    def test_listing_in_time_order(self):
        self.assertEqual([(d, s) for d, s, u in listing(LISTING)],
                         [('2026-09-29', 'morning'), ('2026-09-29', 'evening'), ('2026-09-30', 'morning'), ('2026-09-30', 'evening')])

    def test_episodes_open_and_end(self):
        st = empty()
        a = road(1, 'Joshimath Badrinath road', ['joshimath', 'badrinath'])
        b = road(2, 'Some village road')
        add_report(st, {'date': '2026-09-29', 'slot': 'morning', 'roads': [a, b]}, 'u1', self.links)
        add_report(st, {'date': '2026-09-29', 'slot': 'evening', 'roads': [a]}, 'u2', self.links)
        add_report(st, {'date': '2026-09-30', 'slot': 'morning', 'roads': [a]}, 'u3', self.links)
        self.assertEqual([e['id'] for e in st['done']], [2])
        self.assertEqual((st['done'][0]['first'], st['done'][0]['opened']), ('2026-09-29 morning', '2026-09-29 evening'))
        ep = st['open']['1']
        self.assertEqual((ep['first'], ep['last'], ep['opened'], ep['c']), ('2026-09-29 morning', '2026-09-30 morning', None, '2026-09-29T07:00'))
        self.assertEqual([r['closed'] for r in st['reports']], [2, 1, 1])

    def test_stretch_matching_needs_both_towns(self):
        st = empty()
        lk = next(l for l in self.links.values() if not l['plain'])
        two = road(5, 'x', [lk['a'], lk['b']])
        one = road(6, 'y', [lk['a']])
        add_report(st, {'date': '2026-09-29', 'slot': 'morning', 'roads': [two, one]}, 'u1', self.links)
        self.assertIn(lk['id'], st['open']['5']['links'])
        self.assertEqual(st['open']['6']['links'], [])

    def test_only_newer_reports_are_pending(self):
        st = empty()
        add_report(st, {'date': '2026-09-29', 'slot': 'evening', 'roads': []}, 'https://x.invalid/b.pdf', self.links)
        self.assertEqual([u for d, s, u in pending(st, listing(LISTING))], ['https://x.invalid/c.pdf', 'https://x.invalid/d.pdf'])

    def test_real_report_and_csv(self):
        rep = parse(REPORT, self.places)
        st = add_report(empty(), rep, 'u', self.links)
        self.assertEqual(len(st['open']), 8)
        rows = to_csv(st).strip().split('\n')
        self.assertEqual(len(rows), 9)
        self.assertTrue(rows[0].startswith('road_id,name,district'))
        self.assertIn('chakrata', to_csv(st))


if __name__ == '__main__':
    unittest.main()
