"""Roads reported closed by Uttarakhand PWD: the SRMD road closure report, published twice a day in the monsoon.

PWD's State Road Monitoring (SRMD) desk posts a morning and an evening PDF at
https://pwd.uk.gov.in/document-category/srmd-daily-reports-2026/ with every road still closed: PWD state roads and
national highway divisions, BRO and NHIDCL roads, and PMGSY village roads. Each row has the road name and its PWD id,
district, road type, when it closed and when it is expected to open. This is the only official road by road closure
list for the state we found that a machine can read. It is a public government record; the pack carries the facts and
links to the PDF.

The report says which roads are closed, not where on them, so PahaadPath does not mark its own stretches as closed.
The pack carries the closed roads of the latest report (only if it is less than KEEP_H hours old) with their district
and the PahaadPath towns their names mention, and the app shows them on trips through those districts.

Reading the PDF needs pdftotext (poppler-utils), which the data pack workflow installs. Without it, or with no
report, the pack carries no closures."""
import datetime as dt
import html
import re
import shutil
import subprocess
import tempfile
import urllib.request

LIST = 'https://pwd.uk.gov.in/document-category/srmd-daily-reports-%d/'
KEEP_H = 36
MAX_ROADS = 150
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
SLOT_H = {'morning': 10, 'evening': 17}  # about when each report is posted (IST), used only for its age

# district of every Uttarakhand town in the network (towns outside the state have none)
DISTRICT = {
    'roorkee': 'Haridwar', 'haridwar': 'Haridwar', 'rishikesh': 'Dehradun', 'dehradun': 'Dehradun', 'vikasnagar': 'Dehradun',
    'mussoorie': 'Dehradun', 'chakrata': 'Dehradun', 'kotdwar': 'Pauri', 'lansdowne': 'Pauri', 'srinagar': 'Pauri', 'pauri': 'Pauri',
    'kashipur': 'Udham Singh Nagar', 'rudrapur': 'Udham Singh Nagar', 'ramnagar': 'Nainital', 'haldwani': 'Nainital',
    'kathgodam': 'Nainital', 'bhimtal': 'Nainital', 'nainital': 'Nainital', 'bhowali': 'Nainital', 'kainchi': 'Nainital',
    'dhanaulti': 'Tehri', 'chamba': 'Tehri', 'tehri': 'Tehri', 'devprayag': 'Tehri',
    'rudraprayag': 'Rudraprayag', 'guptkashi': 'Rudraprayag', 'sonprayag': 'Rudraprayag', 'gaurikund': 'Rudraprayag', 'kedarnath': 'Rudraprayag',
    'karnaprayag': 'Chamoli', 'chamoli': 'Chamoli', 'joshimath': 'Chamoli', 'auli': 'Chamoli', 'govindghat': 'Chamoli',
    'ghangaria': 'Chamoli', 'badrinath': 'Chamoli', 'gwaldam': 'Chamoli',
    'uttarkashi': 'Uttarkashi', 'bhatwari': 'Uttarkashi', 'harsil': 'Uttarkashi', 'gangotri': 'Uttarkashi', 'purola': 'Uttarkashi',
    'barkot': 'Uttarkashi', 'janki': 'Uttarkashi', 'yamunotri': 'Uttarkashi',
    'almora': 'Almora', 'ranikhet': 'Almora', 'kausani': 'Bageshwar', 'bageshwar': 'Bageshwar',
    'pithoragarh': 'Pithoragarh', 'munsiyari': 'Pithoragarh',
}
# how the report spells districts
DIST_RE = r'(?P<dist>Pauri|Pithoragarh|Almora|Nanital|Nainital|Chamoli|Tehri|Dehradun|Rudraprayag|Uttarkashi|Haridwar|Champawat|Bageshwar|Udham ?Singh ?Nagar|U\.? ?S\.? ?Nagar)'
DIST_FIX = {'Nanital': 'Nainital'}
# other names a town goes by in road names
ALIAS = {'joshimath': ['jyotirmath'], 'chamoli': ['gopeshwar'], 'tehri': ['new tehri'], 'janki': ['janki chatti'],
         'kainchi': ['kainchi'], 'ghangaria': ['govindghat ghangaria'], 'srinagar': ['srinagar garhwal']}

ROW = re.compile(
    r' \d{1,3} (?P<name>[^\[\]]{3,200}?) \[(?P<id>\d+)\](?P<mid>[^\[\]]*?) (?P<st>Closed|Opened|Open) -?[\d.]+ -?[\d.]+ '
    r'(?P<div>BRO|PMGSY|NHIDCL(?:/ ?NHAI)?|NHAI|(?:[A-Z]{1,3} )?(?:Div )?[A-Z][A-Za-z.]+)? ?(?:' + DIST_RE + r' )?(?P<ty>NH|SH|MDR|ODR|LVR|VR|OR)(?= |$)')
TITLE = re.compile(r'SRMD\s+(\d\d)/(\d\d)/(\d{4})\s+(Morning|Evening)\s+Report', re.I)


def skel(s):
    """spelling-proof key: lower case letters with vowels dropped after the first (Devpryag and Devprayag match);
    short names keep their vowels (Pauri, Auli) so they do not match everything"""
    s = re.sub(r'[^a-z]', '', s.lower())
    k = s[:1] + re.sub(r'[aeiouy]', '', s[1:])
    return k if len(k) >= 4 else '=' + s


def town_keys(places):
    """skeleton of every Uttarakhand town name (and alias) -> town id"""
    out = {}
    for pid, p in places.items():
        if pid not in DISTRICT:
            continue
        names = [re.sub(r'\s*\(.*\)', '', p['en'])] + ALIAS.get(pid, [])
        for n in names:
            out[skel(n)] = pid
    return out


def towns_in(name, keys):
    words = re.findall(r'[A-Za-z]+', name)
    found = []
    for n in (1, 2):
        for i in range(len(words) - n + 1):
            pid = keys.get(skel(''.join(words[i:i + n])))
            if pid and pid not in found:
                found.append(pid)
    return found


def agency(div):
    return 'BRO' if div.startswith('BRO') else 'NHIDCL' if 'NHIDCL' in div or 'NHAI' in div else 'PMGSY' if div.startswith('PMGSY') else 'PWD'


def stamp(days, times, i):
    """closed at (i 0) or expected open (i 1), local time; the time is left out when the PDF lost it"""
    if len(days) <= i:
        return None
    return days[i] + ('T' + times[i] if len(times) == len(days) else '')


def parse(text, places):
    """rows of a report as pdftotext -raw prints it"""
    keys = town_keys(places)
    head = re.search(r'State PWD SRMD Report (\d\d)-(\d\d)-(\d{4}) \((Morning|Evening)\)', text)
    roads, seen = [], set()
    at = text.find('S. No. Name of Road')
    flat = ' ' + re.sub(r'\s+', ' ', text[at:] if at >= 0 else text)
    for m in ROW.finditer(flat):
        if m.group('st') != 'Closed' or m.group('id') in seen:
            continue
        seen.add(m.group('id'))
        name = re.sub(r'[\s:.]+$', '', m.group('name').strip())
        dist = m.group('dist')
        if dist:
            dist = 'Udham Singh Nagar' if 'Nagar' in dist else DIST_FIX.get(dist, dist)
        div = (m.group('div') or '').strip()
        mid = m.group('mid')
        days, times = re.findall(r'\d{4}-\d\d-\d\d', mid), re.findall(r'\b\d\d:\d\d\b', mid)
        roads.append({
            'n': name[:120], 'id': int(m.group('id')), 'ag': agency(div), 'ty': m.group('ty'), 'd': dist, 'div': div[:40],
            'km': ','.join(re.findall(r'\d+(?:\.\d+)?', mid.split(days[0])[0] if days else ''))[:30],
            'c': stamp(days, times, 0),
            'e': stamp(days, times, 1),
            'near': towns_in(name, keys),
        })
    out = {'roads': roads}
    if head:
        dd, mm, yy, slot = head.groups()
        out.update(date='%s-%s-%s' % (yy, mm, dd), slot=slot.lower())
    return out


def listing(listing_html):
    """every report on the listing page as (date, slot, pdf url), oldest first"""
    out = {}
    for row in re.split(r'<tr\b', listing_html):
        t, u = TITLE.search(html.unescape(re.sub(r'<[^>]+>', ' ', row))), re.search(r'https://[^"\']+\.pdf', row)
        if not (t and u):
            continue
        dd, mm, yy, slot = t.groups()
        out[('%s-%s-%s' % (yy, mm, dd), slot.lower())] = u.group(0)
    return [(d, s, u) for (d, s), u in sorted(out.items(), key=lambda kv: (kv[0][0], kv[0][1] == 'evening'))]


def latest(listing_html):
    """(date, slot, pdf url) of the newest report on the listing page"""
    rows = listing(listing_html)
    return rows[-1] if rows else None


def read_report(url, places):
    """download one report PDF and parse it (needs pdftotext)"""
    with tempfile.NamedTemporaryFile(suffix='.pdf') as f:
        f.write(get(url, timeout=75))
        f.flush()
        text = subprocess.run(['pdftotext', '-raw', f.name, '-'], capture_output=True, check=True, timeout=120).stdout.decode('utf-8', 'replace')
    return parse(text, places)


def age_h(date, slot, now):
    at = dt.datetime.fromisoformat(date).replace(hour=SLOT_H.get(slot, 12), tzinfo=IST)
    return (now - at).total_seconds() / 3600


def pack_closures(rep):
    """the closures part of the data pack: the report, its closed roads and the district of each town"""
    keep = ('n', 'id', 'ag', 'ty', 'd', 'km', 'c', 'e', 'near')
    return {'date': rep['date'], 'slot': rep['slot'], 'url': rep['url'], 'total': rep['total'], 'per': rep.get('per', {}),
            'roads': [{k: r[k] for k in keep if r.get(k)} for r in rep['roads']], 'dist': DISTRICT}


def get(url, timeout=90):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 pahaadpath-pipeline'}), timeout=timeout) as r:
        return r.read()


def fetch_closures(places, now=None, log=print):
    """never stops the pack: with no fresh report the pack just carries no closures"""
    now = now or dt.datetime.now(dt.timezone.utc)
    try:
        if not shutil.which('pdftotext'):
            log('closures: pdftotext not installed')
            return None
        lt = latest(get(LIST % now.astimezone(IST).year).decode('utf-8', 'replace'))
        if not lt:
            log('closures: no report listed')
            return None
        date, slot, url = lt
        a = age_h(date, slot, now)
        if a > KEEP_H:
            log('closures: latest PWD report is %s %s, %.0f h old, not carried' % (date, slot, a))
            return None
        rep = read_report(url, places)
        rep.setdefault('date', date)
        rep.setdefault('slot', slot)
        rep['url'] = url
        rep['total'] = len(rep['roads'])
        rep['per'] = {}  # closed roads per district, counted before the list is cut to MAX_ROADS
        for r in rep['roads']:
            if r['d']:
                rep['per'][r['d']] = rep['per'].get(r['d'], 0) + 1
        # village roads far from any town on the network matter least; keep the ones that name a town first
        rep['roads'].sort(key=lambda r: (not r['near'], r['ag'] == 'PMGSY', r['ty'] == 'VR'))
        rep['roads'] = rep['roads'][:MAX_ROADS]
        log('closures: PWD report %s %s, %d roads closed, %d name a town' % (rep['date'], rep['slot'], rep['total'], sum(1 for r in rep['roads'] if r['near'])))
        return rep
    except Exception as e:
        log('closures: PWD report not read: %s' % e)
        return None
