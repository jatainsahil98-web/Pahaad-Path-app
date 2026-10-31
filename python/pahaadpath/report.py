"""Plain-language validation report for the v5 model (data/model/REPORT.md)."""
from . import path


def pct(x):
    return 'n/a' if x is None else '%d%%' % round(100 * x)


def write_report(m, ext):
    cv = m['cv']
    L = ['# PahaadPath risk model v5: validation', '',
         'Trained %s on %d hill stretch-days (1 June to 30 September, %d to %d) with %d stretch-days that had a landslide in the NASA catalog.'
         % (m['trained'], m['data']['stretch_days'], m['data']['years'][0], m['data']['years'][-1], m['data']['positives']), '',
         m['note'], '',
         '## Year by year (each year scored by a model that never saw it)', '',
         'Area under the ROC curve: v5 %.2f, v4 %.2f (0.5 is a coin toss).' % (cv['auc']['v5'] or 0, cv['auc']['v4'] or 0), '',
         '| | v5 model | v4 rain threshold |', '|---|---|---|',
         '| Landslide days at Avoid | %s | %s |' % (pct(cv['v5']['avoid_hit']), pct(cv['v4']['avoid_hit'])),
         '| Landslide days at Caution or worse | %s | %s |' % (pct(cv['v5']['caution_hit']), pct(cv['v4']['caution_hit'])),
         '| Ordinary days at Avoid | %s | %s |' % (pct(cv['v5']['avoid_false']), pct(cv['v4']['avoid_false'])),
         '| Ordinary days at Caution or worse | %s | %s |' % (pct(cv['v5']['caution_false']), pct(cv['v4']['caution_false'])), '']
    for sr in cv['same_alarm_rate']:
        if sr['rate']:
            L += ['Set to flag as many ordinary days as v4 does at %s (%s), v5 would catch %s of landslide days and v4 catches %s.'
                  % (sr['band'], pct(sr['rate']), pct(sr['v5_hit']), pct(sr['v4_hit'])), '']
    beats = all(sr['v5_hit'] is not None and sr['v4_hit'] is not None and sr['v5_hit'] > sr['v4_hit'] for sr in cv['same_alarm_rate'] if sr['rate'])
    L += ['**Verdict: %s**' % ('v5 catches more landslide days than v4 at the same alarm rate, so the app can use it by default.' if beats else
          'v5 does not catch more landslide days than v4 at the same alarm rate, so the app keeps v4 as its default and offers v5 only as an experiment.'), '']
    L += ['Rain memory: a day whose own rain reaches Avoid keeps the stretch at Caution or worse for the next days (debris, wet slopes). '
          'Chosen by this check: %d days.' % cv['memory_days'], '', '| Memory days | Landslide days at Caution or worse | Ordinary days at Caution or worse |', '|---|---|---|']
    L += ['| %d | %s | %s |' % (x['days'], pct(x['caution_hit']), pct(x['caution_false'])) for x in cv['memory']]
    L += ['', '| Year | Landslide days | v5 Avoid | v5 Caution or worse | v4 Avoid | v4 Caution or worse |', '|---|---|---|---|---|---|']
    for p in cv['per_year']:
        L.append('| %d | %d | %d | %d | %d | %d |' % (p['year'], p['positives'], p['v5_avoid'], p['v5_caution_up'], p['v4_avoid'], p['v4_caution_up']))
    L += ['', '## Closure days from the news (2025 and 2026, never used in training)', '',
          '| Day | Closed stretches | v5 Avoid | v5 Caution or worse | v5 other Avoid | v4 Avoid | v4 Caution or worse | v4 other Avoid |',
          '|---|---|---|---|---|---|---|---|']
    for e in ext['events']:
        a, b = e['v5'], e['v4']
        c = e['v5_no_memory']
        if c != a:
            L.append('| %s without memory | %d | %d | %d | %d | | | |' % (e['date'], c['named'], c['avoid'], c['caution_up'], c['other_avoid']))
        L.append('| %s%s | %d | %d | %d | %d | %d | %d | %d |' % (e['date'], ' (dry control)' if e['control'] else '', a['named'], a['avoid'], a['caution_up'],
                                                              a['other_avoid'], b['avoid'], b['caution_up'], b['other_avoid']))
    s = ext['season2025']
    tot = s['days'] * 44
    L += ['', 'Daily rain here is ERA5 reanalysis, which smooths out short cloudbursts, so these rows can differ from the hourly replay in the app.', '',
          '## How often it would warn (2025 monsoon, %d days by 44 stretches)' % s['days'], '',
          '| | Go | Caution | Avoid |', '|---|---|---|---|',
          '| v5 | %s | %s | %s |' % tuple(pct(x / tot) for x in s['v5']),
          '| v5 without memory | %s | %s | %s |' % tuple(pct(x / tot) for x in s['v5_no_memory']),
          '| v4 | %s | %s | %s |' % tuple(pct(x / tot) for x in s['v4']), '',
          '## Weights (raw feature units)', '',
          '| Feature | Weight |', '|---|---|']
    for f, c in zip(m['features'], m['coef']):
        L.append('| %s | %.3f |' % (f, c))
    L += ['| intercept | %.3f |' % m['intercept'], '',
          'Features: log of 1 + rain on the day, the last 3 days, days 3 to 9 before and days 10 to 30 before (mm); slope is (75th percentile side slope in degrees minus 34) / 5; log of 1 + catalog landslides near the road.', '',
          'Limits: the catalog ends in 2017 and only lists landslides that made the news; ERA5 rain is on a 9 to 25 km grid; '
          'closure records from the State Emergency Operations Centre or BRO would make a much better label set.', '']
    txt = '\n'.join(L)
    with open(path('data', 'model', 'REPORT.md'), 'w', encoding='utf-8') as f:
        f.write(txt)
    return txt
