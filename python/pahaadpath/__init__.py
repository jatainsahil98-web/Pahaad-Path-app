"""PahaadPath data and model pipeline.

Reads the road network straight from the app source (src/app/core.js), so the app and the pipeline never disagree about
which stretches exist. Standard library only, Python 3.9 or newer, so it also runs on a laptop or a phone with Termux."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, 'data')


def path(*p):
    return os.path.join(ROOT, *p)


def read_json(*p):
    import json
    with open(path(*p), encoding='utf-8') as f:
        return json.load(f)


def write_json(obj, *p, indent=None):
    import json
    full = path(*p)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=indent, separators=None if indent else (',', ':'))
        f.write('\n')
    return full
