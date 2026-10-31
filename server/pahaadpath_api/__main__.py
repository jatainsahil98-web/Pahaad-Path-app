"""Admin commands.  PYTHONPATH=python:server python -m pahaadpath_api add-officer --name "SDRF Rudraprayag" --role district_officer
Prints a new officer token once; only its SHA-256 is stored."""
import argparse
import os
import secrets

from .store import Store


def main():
    p = argparse.ArgumentParser(prog='pahaadpath_api')
    sub = p.add_subparsers(dest='cmd', required=True)
    a = sub.add_parser('add-officer')
    a.add_argument('--name', required=True)
    a.add_argument('--role', choices=['district_officer', 'state_admin'], required=True)
    a.add_argument('--district')
    a.add_argument('--db', default=os.environ.get('PP_DATABASE_URL', 'sqlite:///reports.sqlite3'))
    x = p.parse_args()
    tok = secrets.token_urlsafe(32)
    Store(x.db).add_officer(tok, x.name, x.role, x.district)
    print(tok)


if __name__ == '__main__':
    main()
