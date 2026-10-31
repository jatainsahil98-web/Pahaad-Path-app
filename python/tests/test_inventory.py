import os
import unittest

from pahaadpath.closures import listing, parse
from pahaadpath.inventory import add_report, empty, pending, to_csv, update, year_entries
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

    def test_listing_pages_until_no_new_reports(self):
        page = lambda d, u: ('<tr><td>SRMD %s Morning Report</td><td><a href="https://x.invalid/%s.pdf">View</a></td></tr>' % (d, u)).encode()
        pages = {'': page('30/09/2026', 'c') + page('29/09/2026', 'b'), 'page/2/': page('28/09/2026', 'a'), 'page/3/': page('28/09/2026', 'a')}
        def fetch(url):
            key = url.split('srmd-daily-reports-2026/')[1]
            if key not in pages:
                raise OSError('404')
            return pages[key]
        got = year_entries(2026, fetch=fetch, log=lambda *a: None)
        self.assertEqual(sorted(u for d, s, u in got), ['https://x.invalid/a.pdf', 'https://x.invalid/b.pdf', 'https://x.invalid/c.pdf'])

    def test_saves_after_each_report_and_stops_on_failure(self):
        import pahaadpath.inventory as inv
        reports = {'https://x.invalid/a.pdf': {'date': '2026-09-28', 'slot': 'morning', 'roads': [road(1, 'r')]},
                   'https://x.invalid/b.pdf': {'date': '2026-09-29', 'slot': 'morning', 'roads': []}}
        def read(url, places):
            if url not in reports:
                raise OSError('timed out')
            return dict(reports[url])
        saved = []
        real = inv.year_entries
        inv.year_entries = lambda y, log=None: [('2026-09-28', 'morning', 'https://x.invalid/a.pdf'), ('2026-09-29', 'morning', 'https://x.invalid/b.pdf'),
                                                ('2026-09-30', 'morning', 'https://x.invalid/c.pdf'), ('2026-10-01', 'morning', 'https://x.invalid/a.pdf')]
        try:
            st = update(empty(), self.places, self.links, years=[2026], read=read, save=lambda s: saved.append(len(s['reports'])), log=lambda *a: None)
        finally:
            inv.year_entries = real
        self.assertEqual(saved, [1, 2])           # saved after each report read
        self.assertEqual(len(st['reports']), 2)  # stopped at the one that failed, so the order stays right
        self.assertEqual(st['done'][0]['opened'], '2026-09-29 morning')

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
