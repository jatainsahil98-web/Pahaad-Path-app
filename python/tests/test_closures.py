import datetime as dt
import os
import unittest

from pahaadpath.closures import KEEP_H, age_h, latest, pack_closures, parse, towns_in, town_keys
from pahaadpath.network import Network

HERE = os.path.dirname(os.path.abspath(__file__))
# real text: three parts of the PWD SRMD report of 19 Aug 2026 (morning) as pdftotext -raw prints it
with open(os.path.join(HERE, 'srmd_2026-08-19_morning_excerpt.txt'), encoding='utf-8') as f:
    REPORT = f.read()

LISTING = '''<table><tbody>
<tr><td>SRMD 29/09/2026 Evening Report</td><td>29/09/2026</td><td><a href="https://cdnbbsr.s3waas.gov.in/x/uploads/2026/09/b.pdf">View</a></td></tr>
<tr><td>SRMD 30/09/2026 Morning Report</td><td>30/09/2026</td><td><a href="https://cdnbbsr.s3waas.gov.in/x/uploads/2026/09/c.pdf">View</a></td></tr>
<tr><td>SRMD 30/09/2026 EVENING REPORT</td><td>30/09/2026</td><td><a href="https://cdnbbsr.s3waas.gov.in/x/uploads/2026/09/d.pdf">View</a></td></tr>
<tr><td>SRMD 28/09/2026 Evening Report</td><td>29/09/2026</td><td><a href="https://cdnbbsr.s3waas.gov.in/x/uploads/2026/09/a.pdf">View</a></td></tr>
</tbody></table>'''


class ClosuresTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.places = Network().places

    def test_rows_of_a_real_report(self):
        rep = parse(REPORT, self.places)
        self.assertEqual((rep['date'], rep['slot']), ('2026-08-19', 'morning'))
        rows = {r['id']: r for r in rep['roads']}
        self.assertEqual(sorted(rows), [4130, 5719, 5956, 8760, 9217, 10070, 10072, 10249])
        nh = rows[5719]
        self.assertEqual((nh['ty'], nh['d'], nh['ag'], nh['km'], nh['c'], nh['e']), ('NH', 'Pauri', 'PWD', '137,179', '2026-08-19T08:06', '2026-08-19T09:06'))
        self.assertTrue(nh['n'].startswith('starting from its junction with NH -74 near kashipur'))
        self.assertEqual(rows[10249]['ag'], 'BRO')
        self.assertEqual(rows[5956]['d'], 'Chamoli')
        self.assertEqual(rows[5956]['c'], '2026-08-15T08:27')
        self.assertEqual(rows[9217]['ag'], 'PMGSY')
        self.assertIsNone(rows[8760]['d'])  # the report leaves the district out on this row
        self.assertEqual(rows[4130]['near'], ['chakrata'])

    def test_town_names_spelled_the_report_way(self):
        keys = town_keys(self.places)
        self.assertEqual(towns_in('Pauri Devpryag Gaja Jajal state highway', keys), ['pauri', 'devprayag'])
        self.assertEqual(towns_in('Runikhet-Gadhigram via Majwe Dungargaon motor road.', keys), ['ranikhet'])
        self.assertEqual(towns_in('Jyotirmath Malari road', keys), ['joshimath'])
        self.assertEqual(towns_in('Sungarkhal Sikukhal Jwalpadevi motor road', keys), [])
        self.assertEqual(towns_in('Delhi Meerut road', keys), [])  # towns outside the state are not matched

    def test_newest_report_on_the_listing(self):
        self.assertEqual(latest(LISTING), ('2026-09-30', 'evening', 'https://cdnbbsr.s3waas.gov.in/x/uploads/2026/09/d.pdf'))

    def test_age(self):
        now = dt.datetime(2026, 10, 1, 5, 0, tzinfo=dt.timezone.utc)
        self.assertLess(age_h('2026-09-30', 'evening', now), KEEP_H)
        self.assertGreater(age_h('2026-09-28', 'evening', now), KEEP_H)

    def test_pack_part_is_small(self):
        rep = parse(REPORT, self.places)
        rep.update(url='https://example.invalid/r.pdf', total=len(rep['roads']))
        pk = pack_closures(rep)
        self.assertEqual(pk['dist']['badrinath'], 'Chamoli')
        self.assertNotIn('near', [k for r in pk['roads'] if not r.get('near') for k in r])
        self.assertTrue(all(set(r) <= {'n', 'id', 'ag', 'ty', 'd', 'km', 'c', 'e', 'near'} for r in pk['roads']))


if __name__ == '__main__':
    unittest.main()
