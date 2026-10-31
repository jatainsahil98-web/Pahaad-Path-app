"""python -m pahaadpath <command>

  fetch-train   download ERA5 daily rain for training (2007 to 2017) and for the news closure days (needs internet)
  train         fit the v5 model, validate it year by year and on the closure days, write data/model/
  pack          download today's forecast and write the small data pack phones fetch when they get signal
  advisory      worst band on every hill stretch over the next 72 hours (from the pack, or --pack a saved copy offline)
  serve         run the road report sync server (see pahaadpath/server.py)
  stops         fuel, hospitals, ATMs and mechanics near each town from OpenStreetMap (needs internet)
  closures      roads closed in the latest PWD road closure report, as the data pack carries them (needs internet, pdftotext)
  inventory     add every PWD report not yet read to the closure inventory (needs internet, pdftotext)
  backtest      score the engine against the closure inventory, fit thresholds, write data/model/ (needs internet)
  independent   score the engine and model v6 on other years' dated landslides (NASA GLC and COOLR) (needs internet)
"""
import argparse
import json
import os
import sys

from . import path, read_json, write_json


def main(argv=None):
    ap = argparse.ArgumentParser(prog='pahaadpath', description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('fetch-train')
    sub.add_parser('train')
    p = sub.add_parser('pack')
    p.add_argument('--out', default='dist/pack/pack.json')
    v = sub.add_parser('advisory')
    v.add_argument('--pack', help='saved pack.json to use with no signal (default: download the latest)')
    v.add_argument('--hours', type=int, default=72)
    s = sub.add_parser('serve')
    s.add_argument('--host', default='0.0.0.0')
    s.add_argument('--port', type=int, default=8787)
    s.add_argument('--db', default='reports.sqlite3')
    o = sub.add_parser('stops')
    o.add_argument('--out', default='data/osm_stops.json')
    c = sub.add_parser('closures')
    c.add_argument('--at', help='pretend it is this time (ISO, e.g. 2026-09-30T20:00+05:30) to read an older report')
    i = sub.add_parser('inventory')
    i.add_argument('--state', default='data/truth/inventory.json')
    i.add_argument('--csv', default='data/truth/closures.csv')
    i.add_argument('--years', type=int, nargs='*')
    i.add_argument('--max', type=int, default=60, help='reports to read in this run')
    i.add_argument('--budget-min', type=float, default=None, help='stop reading after this many minutes (state is saved after every report)')
    i.add_argument('--rebuild', action='store_true', help='start again from the oldest report listed (after adding listing pages or years)')
    k = sub.add_parser('backtest')
    k.add_argument('--inventory', default='data/truth/inventory.json')
    k.add_argument('--mode', choices=['relaxed', 'strict'], default='relaxed')
    ind = sub.add_parser('independent')
    ind.add_argument('--years', default='2007 2008 2009 2010 2011 2012 2013 2015',
                     help='monsoons to score (already-downloaded 2007 to 2012, plus the two richest later ones)')
    ind.add_argument('--first', type=int, default=2007, help='first monsoon to score')
    ind.add_argument('--until', type=int, default=2018, help='last monsoon to score (NASA has no Uttarakhand events after 2018)')
    a = ap.parse_args(argv)

    from .network import Network
    if a.cmd == 'fetch-train':
        from .dataset import fetch_external, fetch_training
        net = Network()
        write_json(fetch_training(net), 'data', 'train', 'era5_daily_2007_2017.json')
        write_json(fetch_external(net, read_json('replay_source', 'gt.json')), 'data', 'train', 'era5_daily_external.json')
    elif a.cmd == 'train':
        from .model import external, train
        from .report import write_report
        net = Network()
        m = train(net, read_json('data', 'train', 'era5_daily_2007_2017.json'))
        ext = external(m, net, read_json('replay_source', 'gt.json'), read_json('data', 'train', 'era5_daily_external.json'))
        m['external'] = {'events': [{k: v for k, v in e.items() if k != 'rows'} for e in ext['events']], 'season2025': ext['season2025']}
        write_json(m, 'data', 'model', 'model_v5.json', indent=1)
        write_json(ext, 'data', 'model', 'external_scores.json')
        print(write_report(m, ext))
    elif a.cmd == 'pack':
        from .pack import build_pack
        import os
        pk = build_pack(Network())
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        with open(a.out, 'w', encoding='utf-8') as f:
            json.dump(pk, f, separators=(',', ':'))
        print('pack', a.out, pk['hour0'], len(pk['hourly']), 'places')
    elif a.cmd == 'advisory':
        from .advisory import advisory, load_pack
        pk = load_pack(a.pack)
        print('Data pack hour %s IST (made %s). Advisory only, not an official warning.' % (pk['hour0'], pk['made']))
        for r in advisory(Network(), pk, hours=a.hours):
            if r['band'] != 'Go':
                print('%-8s %3d  %-28s worst at %s' % (r['band'], r['score'], r['id'], r['at']))
    elif a.cmd == 'stops':
        from .stops import build_stops
        import os
        st = build_stops(Network())
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        with open(a.out, 'w', encoding='utf-8') as f:
            json.dump(st, f, ensure_ascii=False, separators=(',', ':'))
            f.write('\n')
        print('stops', a.out, len(st['towns']), 'towns')
    elif a.cmd == 'inventory':
        import os
        from .inventory import empty, to_csv, update
        net = Network()
        try:
            with open(a.state, encoding='utf-8') as f:
                state = empty() if a.rebuild else json.load(f)
        except FileNotFoundError:
            state = empty()
        os.makedirs(os.path.dirname(os.path.abspath(a.state)) or '.', exist_ok=True)

        def save(s):
            with open(a.state + '.tmp', 'w', encoding='utf-8') as f:
                json.dump(s, f, ensure_ascii=False, indent=0)
            os.replace(a.state + '.tmp', a.state)
            with open(a.csv, 'w', encoding='utf-8', newline='') as f:
                f.write(to_csv(s))
        update(state, net.places, net.links, years=a.years, max_reports=a.max, save=save,
               budget_s=a.budget_min * 60 if a.budget_min else None)
        save(state)
        print('inventory: %d reports, %d closures ended, %d still open' % (len(state['reports']), len(state['done']), len(state['open'])))
    elif a.cmd == 'backtest':
        import datetime as dt
        from . import v6
        from .backtest import report_md, run, season, summary
        from .openmeteo import archive_hourly_vars
        net = Network()
        with open(a.inventory, encoding='utf-8') as f:
            inv = json.load(f)
        first, last = season(inv)
        last = min(last, (dt.date.today() - dt.timedelta(days=6)).isoformat())  # ERA5 runs about 5 days behind
        start = (dt.date.fromisoformat(first) - dt.timedelta(days=v6.LEAD_DAYS + 1)).isoformat()  # history v6 needs
        vars_ = archive_hourly_vars(net.keys(), start, last)
        rain = vars_['precipitation']
        r = run(inv, net, rain, start, mode=a.mode)
        quakes = v6.fetch_quakes((dt.date.fromisoformat(start) - dt.timedelta(days=8)).isoformat(), last)
        r6 = v6.run(inv, net, vars_, start, mode=a.mode, quakes=quakes)
        # GSI susceptibility class in place of the DEM slope class: kept when the engine does no worse with it
        rg = run(inv, Network(susc='gsi'), rain, start, mode=a.mode, log=lambda *x: None)
        ts, tg = r['caine']['caution']['tss'], rg['caine']['caution']['tss']
        susc = 'gsi' if ts is not None and tg is not None and tg >= ts else 'slope'
        bt = summary(r)
        bt['susc'] = {'used': susc, 'tss_slope': ts, 'tss_gsi': tg, 'pod_gsi': rg['caine']['caution']['pod'], 'far_gsi': rg['caine']['caution']['far']}
        bt['v6'] = v6.summary(r6)
        write_json(bt, 'data', 'model', 'backtest.json', indent=1)
        write_json({'adopted': r['adopted'], 'fit': r['fit']['thresholds'] if r.get('fit') else None, 'susc': susc,
                    'note': 'adopted is what the app and the data pack use; null keeps Caine (1980)'}, 'data', 'model', 'thresholds.json', indent=1)
        if r6.get('model'):
            write_json(dict(r6['model'], adopted=r6['adopted']), 'data', 'model', 'model_v6.json', indent=1)
        md = report_md(r) + '\nSusceptibility class: TSS at Caution %s with the DEM slope class, %s with the GSI NLSM class; the engine uses the %s class.\n\n' % (
            ts, tg, 'GSI' if susc == 'gsi' else 'slope') + v6.report_md(r6)
        with open(path('data', 'model', 'BACKTEST.md'), 'w', encoding='utf-8') as f:
            f.write(md)
        print(md)
    elif a.cmd == 'independent':
        import os.path as osp
        from . import independent
        from .openmeteo import archive_hourly_vars
        th = read_json('data', 'model', 'thresholds.json') if osp.exists(path('data', 'model', 'thresholds.json')) else {}
        m6p = path('data', 'model', 'model_v6.json')
        m6 = None
        if osp.exists(m6p):
            with open(m6p, encoding='utf-8') as f:
                m6 = json.load(f)
        coolr = independent.fetch_coolr()
        r = independent.run(Network(susc=th.get('susc') or 'slope'), Network(), m6, archive_hourly_vars, coolr, first_year=a.first, last_year=a.until,
                            only=[int(y) for y in a.years.split()] if a.years else None)
        write_json(independent.summary(r), 'data', 'model', 'independent.json', indent=1)
        md = independent.report_md(r)
        with open(path('data', 'model', 'INDEPENDENT.md'), 'w', encoding='utf-8') as f:
            f.write(md)
        print(md)
    elif a.cmd == 'closures':
        import datetime as dt
        from .closures import fetch_closures, pack_closures
        rep = fetch_closures(Network().places, now=dt.datetime.fromisoformat(a.at) if a.at else None)
        if rep is None:
            sys.exit(0)
        pk = pack_closures(rep)
        print(json.dumps({k: v for k, v in pk.items() if k not in ('roads', 'dist')}, ensure_ascii=False))
        for r in pk['roads']:
            print(json.dumps(r, ensure_ascii=False))
        print('%d bytes in the pack' % len(json.dumps(pk, ensure_ascii=False, separators=(',', ':')).encode()))
    elif a.cmd == 'serve':
        from .server import serve
        serve(a.host, a.port, a.db)
    return 0


if __name__ == '__main__':
    sys.exit(main())
