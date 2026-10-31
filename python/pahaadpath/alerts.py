"""Official alerts for Uttarakhand from NDMA's Sachet public feed (Common Alerting Protocol, published as RSS).

The data pack carries the alerts of the last 48 hours, so a phone that fetched the pack shows them with no signal,
beside PahaadPath's own advisory. The feed is public domain. Each item has the alert text (Hindi or English), the
issuing agency (IMD Dehradun, the state authority) and the time."""
import datetime as dt
import email.utils
import re
import urllib.request
import xml.etree.ElementTree as ET

FEED = 'https://sachet.ndma.gov.in/cap_public_website/rss/rss_uttarakhand.xml'
KEEP_H = 48
MAX = 12


def parse(xml_text, now=None, keep_h=KEEP_H):
    now = now or dt.datetime.now(dt.timezone.utc)
    out = []
    for it in ET.fromstring(xml_text).iter('item'):
        title = (it.findtext('title') or '').strip()
        try:
            at = email.utils.parsedate_to_datetime(it.findtext('pubDate') or '')
        except (TypeError, ValueError):
            continue
        if not title or at is None or now - at > dt.timedelta(hours=keep_h) or at - now > dt.timedelta(hours=1):
            continue
        m = re.search(r'\(([^)]+)\)\s*$', it.findtext('author') or '')
        out.append({'t': re.sub(r'\s+', ' ', title)[:400], 'by': m.group(1).strip()[:60] if m else '',
                    'cat': (it.findtext('category') or '').strip()[:20], 'at': at.astimezone(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                    'link': (it.findtext('link') or '').strip()[:200]})
    out.sort(key=lambda a: a['at'], reverse=True)
    return out[:MAX]


def fetch_alerts(log=print):
    """never stops the pack: with no feed the pack just carries no alerts"""
    try:
        with urllib.request.urlopen(urllib.request.Request(FEED, headers={'User-Agent': 'pahaadpath-pipeline'}), timeout=60) as r:
            al = parse(r.read().decode('utf-8', 'replace'))
        log('sachet: %d alerts in the last %d h' % (len(al), KEEP_H))
        return al
    except Exception as e:
        log('sachet feed not read: %s' % e)
        return None
