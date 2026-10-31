"""python -m pahaadpath <command>

  fetch-train   download ERA5 daily rain for training (2007 to 2017) and for the news closure days (needs internet)
  train         fit the v5 model, validate it year by year and on the closure days, write data/model/
  pack          download today's forecast and write the small data pack phones fetch when they get signal
  advisory      worst band on every hill stretch over the next 72 hours (from the pack, or --pack a saved copy offline)
  serve         run the road report sync server (see pahaadpath/server.py)
  stops         fuel, hospitals, ATMs and mechanics near each town from OpenStreetMap (needs internet)
  closures      roads closed in the latest PWD road closure report, as the data pack carries them (needs internet, pdftotext)
  inventory     add every PWD report not yet read to the closure inventory (needs internet, pdftotext)
"""
import argparse
import json
import sys

from . import read_json, write_json


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
