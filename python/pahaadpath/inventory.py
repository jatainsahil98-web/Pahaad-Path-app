"""Closure inventory: every road the PWD SRMD reports listed as closed, from the first report that lists it to the first
report that no longer does. This is the ground truth the threshold calibration and the backtest are built on (roadmap 1.1, 4.1).

State lives in one JSON file (on the `truth` branch, written by .github/workflows/inventory.yml), so each run only reads
the reports it has not seen:
  {"reports": [{"date", "slot", "url", "closed"}...],   every report read, oldest first
   "open":    {road id: episode},                       roads closed in the latest report read
   "done":    [episode, ...]}                           closures that have ended
An episode: {"id", "n" (road name), "d" (district), "ty", "ag", "near" (PahaadPath towns its name mentions),
             "links" (PahaadPath stretches between two of those towns), "c" (closed at, as the report states it),
             "first" and "last" (first and last report listing it, "YYYY-MM-DD morning"), "opened" (first report without it)}
A report missing from PWD's listing (a holiday, a late upload) does not end a closure: only a report that is read does."""
import datetime as dt

from .closures import IST, LIST, get, listing, read_report

KEEP = ('n', 'd', 'ty', 'ag', 'near')


def tag(date, slot):
    return '%s %s' % (date, slot)


def stretches(near, links):
    """PahaadPath hill stretches whose two ends are both towns the road name mentions"""
    s = set(near)
    return sorted(l['id'] for l in links.values() if not l['plain'] and l['a'] in s and l['b'] in s)


def empty():
    return {'reports': [], 'open': {}, 'done': []}


def add_report(state, rep, url, links):
    """fold one parsed report into the state; reports must come oldest first"""
    t = tag(rep['date'], rep['slot'])
    now = {str(r['id']): r for r in rep['roads']}
    for rid in list(state['open']):
        if rid not in now:  # listed before, not in this report: it opened
            ep = state['open'].pop(rid)
            ep['opened'] = t
            state['done'].append(ep)
    for rid, r in now.items():
        ep = state['open'].get(rid)
        if ep:
            ep['last'] = t
            continue
        ep = {k: r.get(k) for k in KEEP}
        ep.update(id=int(rid), links=stretches(r.get('near') or [], links), c=r.get('c'), first=t, last=t, opened=None)
        state['open'][rid] = ep
    state['reports'].append({'date': rep['date'], 'slot': rep['slot'], 'url': url, 'closed': len(now)})
    return state


def pending(state, entries):
    """listing entries not read yet and newer than the last report read (the episode logic needs time order)"""
    seen = {r['url'] for r in state['reports']}
    last = (state['reports'][-1]['date'], state['reports'][-1]['slot'] == 'evening') if state['reports'] else ('', False)
    return [e for e in entries if e[2] not in seen and (e[0], e[1] == 'evening') > last]


def year_entries(year, fetch=get, max_pages=60, log=print):
    """every report listed for a year: PWD's listing shows the newest few per page, older ones on /page/2/, /page/3/..."""
    out, seen = [], set()
    for n in range(1, max_pages + 1):
        url = LIST % year + ('' if n == 1 else 'page/%d/' % n)
        try:
            rows = listing(fetch(url).decode('utf-8', 'replace'))
        except Exception as e:  # past the last page (404), or no page for that year yet
            if n == 1:
                log('inventory: listing %d not read: %s' % (year, e))
            break
        new = [r for r in rows if r[2] not in seen]
        if not new:
            break
        seen.update(r[2] for r in new)
        out += new
    return out


def update(state, places, links, years=None, max_reports=60, log=print, save=None, budget_s=None, read=None):
    """read the reports not yet in the state, oldest first, up to max_reports per run.
    save(state) runs after every report, so a run cut short keeps what it read; budget_s stops reading in good time
    (a slow PWD server once held a run until GitHub's limit and nothing was kept)."""
    import time
    t0 = time.monotonic()
    read = read or read_report
    years = years or [dt.datetime.now(IST).year]
    entries = []
    for y in years:
        entries += year_entries(y, log=log)
    todo = pending(state, sorted(entries, key=lambda e: (e[0], e[1] == 'evening')))
    log('inventory: %d reports listed, %d new, reading up to %d' % (len(entries), len(todo), max_reports))
    for date, slot, url in todo[:max_reports]:
        if budget_s and time.monotonic() - t0 > budget_s:
            log('inventory: time budget used, stopping; the next run carries on')
            break
        rep = None
        for attempt in (1, 2):
            try:
                rep = read(url, places)
                break
            except Exception as e:
                log('inventory: %s %s not read, attempt %d (%s)' % (date, slot, attempt, e))
        if rep is None:
            log('inventory: stopping so the order stays right; the next run tries again')
            break
        rep['date'], rep['slot'] = rep.get('date') or date, rep.get('slot') or slot
        add_report(state, rep, url, links)
        if save:
            save(state)
        log('inventory: %s %s, %d closed, %d open episodes, %d ended' % (date, slot, len(rep['roads']), len(state['open']), len(state['done'])))
    return state


def to_csv(state):
    """one row per closure (ended or still open), for the calibration and for reading in a spreadsheet"""
    import csv
    import io
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(['road_id', 'name', 'district', 'type', 'agency', 'closed_at', 'first_report', 'last_report', 'opened_report', 'towns', 'stretches'])
    for ep in sorted(state['done'] + list(state['open'].values()), key=lambda e: (e['first'], e['id'])):
        w.writerow([ep['id'], ep['n'], ep['d'] or '', ep['ty'], ep['ag'], ep['c'] or '', ep['first'], ep['last'], ep['opened'] or '',
                    ' '.join(ep['near'] or []), ' '.join(ep['links'])])
    return out.getvalue()
