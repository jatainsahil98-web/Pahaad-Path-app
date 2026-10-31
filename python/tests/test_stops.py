import unittest

from pahaadpath.network import Network
from pahaadpath.stops import assign, query


class StopsTest(unittest.TestCase):
    def test_assign_to_nearest_town_within_3_km(self):
        net = Network()
        p = net.places['rudraprayag']
        els = [
            {'type': 'node', 'lat': p['lat'] + 0.005, 'lon': p['lon'], 'tags': {'amenity': 'fuel', 'name': 'Indian Oil'}},
            {'type': 'way', 'center': {'lat': p['lat'], 'lon': p['lon'] + 0.01}, 'tags': {'amenity': 'hospital', 'name': 'District Hospital'}},
            {'type': 'node', 'lat': p['lat'], 'lon': p['lon'], 'tags': {'shop': 'car_repair'}},
            {'type': 'node', 'lat': p['lat'] + 0.5, 'lon': p['lon'], 'tags': {'amenity': 'fuel'}},  # far from every town
            {'type': 'node', 'lat': p['lat'], 'lon': p['lon'], 'tags': {'amenity': 'bench'}},
            {'type': 'node', 'lat': p['lat'], 'lon': p['lon'], 'tags': {'amenity': 'hospital', 'name': 'Government Veterinary Hospital'}},
        ]
        t = assign(net, els)['rudraprayag']
        self.assertEqual(t['fuel'], [1, ['Indian Oil']])
        self.assertEqual(t['hosp'], [1, ['District Hospital']])
        self.assertEqual(t['mech'], [1, []])
        self.assertNotIn('atm', t)

    def test_query_names_every_kind(self):
        q = query()
        for k in ('fuel', 'hospital', 'clinic', 'atm', 'car_repair'):
            self.assertIn(k, q)


if __name__ == '__main__':
    unittest.main()
