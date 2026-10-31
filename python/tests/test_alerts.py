import datetime as dt
import unittest

from pahaadpath.alerts import parse

FEED = '''<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<rss version="2.0"><channel><title>Uttarakhand: CAP Disaster Alert Feeds</title>
<item><title>Thunderstorm with Lightning is likely over Chamoli, Rudraprayag in next 3 hours.</title><description/>
<category>Met</category><link>https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=1</link>
<author>controlroom@ndma.gov.in (IMD Dehradun)</author><pubDate>Tue, 27 Oct 2026 09:00:00 GMT</pubDate></item>
<item><title>अगले ३ घंटों के दौरान वर्षा की संभावना है |</title><description/><category>Met</category>
<link>https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=2</link>
<author>controlroom@ndma.gov.in (IMD Dehradun)</author><pubDate>Mon, 26 Oct 2026 20:00:00 GMT</pubDate></item>
<item><title>Old alert</title><pubDate>Fri, 16 Oct 2026 10:33:16 GMT</pubDate></item>
<item><title>Bad date</title><pubDate>yesterday</pubDate></item>
</channel></rss>'''


class AlertsTest(unittest.TestCase):
    def test_recent_items_newest_first(self):
        now = dt.datetime(2026, 10, 27, 11, 0, tzinfo=dt.timezone.utc)
        al = parse(FEED, now=now)
        self.assertEqual([a['at'] for a in al], ['2026-10-27T09:00:00Z', '2026-10-26T20:00:00Z'])
        self.assertEqual(al[0]['by'], 'IMD Dehradun')
        self.assertIn('Chamoli', al[0]['t'])
        self.assertTrue(al[1]['t'].startswith('अगले'))


if __name__ == '__main__':
    unittest.main()
