"""PahaadPath road report API (v2): signed reports from anonymous devices, verified status from officials.

Every report or confirmation is signed on the phone when it is made (ECDSA P-256, the private key never leaves the phone),
so a report written deep in a valley and sent hours later is still provably from the same device. The server:
  - accepts only messages signed by a registered, unrevoked device key;
  - limits each device (6 reports an hour, 30 a day; 30 confirmations an hour);
  - marks a stretch blocked only on two distinct devices within 6 hours, or one verified official;
  - down-weights a report whose position is more than 5 km from the stretch it names;
  - keeps reports 48 hours for phones and 30 days in total, with positions rounded to about 100 m.

Run locally:  PYTHONPATH=python:server uvicorn pahaadpath_api.main:app --port 8787
Settings (environment): PP_DATABASE_URL (default sqlite:///reports.sqlite3; postgresql+psycopg://... in production),
PP_ALLOW_ORIGINS (comma list; default the public site, the Android app and file://)."""
import base64
import hashlib
import json
import os
import time

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import store as db

KEEP_MS = 48 * 3600 * 1000          # longest a report weighs in the app (a bridge out)
PURGE_MS = 30 * 24 * 3600 * 1000    # raw reports deleted after this
SKEW_MS = 5 * 60 * 1000             # a phone clock may run this far ahead
CONFIRM_WINDOW_MS = 6 * 3600 * 1000
FAR_KM = 5.0
LIMITS = {('report', 3600e3): 6, ('report', 86400e3): 30, ('confirm', 3600e3): 30}
TYPES = {'landslide', 'debris', 'washed', 'bridge', 'clear'}
MAX_BATCH = 200


def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


def b64u_dec(s):
    return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))


def thumbprint(jwk):
    """RFC 7638 JWK thumbprint: the device id. The app computes the same value, so it can sign before registering."""
    canon = json.dumps({'crv': jwk['crv'], 'kty': jwk['kty'], 'x': jwk['x'], 'y': jwk['y']}, separators=(',', ':'), sort_keys=True)
    return b64u(hashlib.sha256(canon.encode()).digest())


def canonical(msg):
    """Bytes that are signed: the message without its signature, keys sorted, no spaces. Only strings and integers occur."""
    body = {k: v for k, v in msg.items() if k != 'sig'}
    return json.dumps(body, separators=(',', ':'), sort_keys=True, ensure_ascii=False).encode()


def public_key(jwk):
    x, y = int.from_bytes(b64u_dec(jwk['x']), 'big'), int.from_bytes(b64u_dec(jwk['y']), 'big')
    return ec.EllipticCurvePublicNumbers(x, y, ec.SECP256R1()).public_key()


def verify_sig(jwk, msg):
    raw = b64u_dec(msg['sig'])  # WebCrypto gives r || s, 32 bytes each
    if len(raw) != 64:
        return False
    der = encode_dss_signature(int.from_bytes(raw[:32], 'big'), int.from_bytes(raw[32:], 'big'))
    try:
        public_key(jwk).verify(der, canonical(msg), ec.ECDSA(hashes.SHA256()))
        return True
    except (InvalidSignature, ValueError):
        return False


class DeviceIn(BaseModel):
    jwk: dict
    platform: str = Field('web', max_length=16)
    app: str = Field('', max_length=32)


class SyncIn(BaseModel):
    msgs: list = Field(default_factory=list)


def now_ms():
    return int(time.time() * 1000)


def create_app(database_url=None, network=None, allow_origins=None):
    st = db.Store(database_url or os.environ.get('PP_DATABASE_URL', 'sqlite:///reports.sqlite3'))
    if network is None:
        from pahaadpath.network import Network
        network = Network()
    links = {l['id']: l for l in network.links.values() if not l.get('plain')}
    from pahaadpath.network import dist_to_line

    origins = allow_origins or os.environ.get(
        'PP_ALLOW_ORIGINS', 'https://jatainsahil98-web.github.io,https://appassets.androidplatform.net,null').split(',')
    app = FastAPI(title='PahaadPath report API', version='2.0')
    app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in origins if o.strip()],
                       allow_methods=['GET', 'POST'], allow_headers=['Content-Type', 'Authorization'])
    app.state.store = st

    def official(authorization: str = Header('')):
        """Officers (Traffic Police, SDRF, district control rooms) use a token issued by an admin. OIDC replaces this in Phase 3."""
        tok = authorization[7:] if authorization.lower().startswith('bearer ') else ''
        o = st.officer(hashlib.sha256(tok.encode()).hexdigest()) if tok else None
        if not o:
            raise HTTPException(401, 'officer token required')
        return o

    def check(m, now):
        """Returns (reason, None) to reject, or (None, row) to store."""
        if not isinstance(m, dict) or m.get('v') != 2 or m.get('k') not in ('report', 'confirm'):
            return 'format', None
        rid, dev, rt, sig = m.get('rid'), m.get('dev'), m.get('rt'), m.get('sig')
        if not (isinstance(rid, str) and 0 < len(rid) <= 40 and isinstance(dev, str) and len(dev) == 43 and isinstance(sig, str)):
            return 'format', None
        if not isinstance(rt, int) or rt < now - KEEP_MS or rt > now + SKEW_MS:
            return 'time', None
        allowed = {'v', 'k', 'rid', 'dev', 'rt', 'sig'} | ({'seg', 'spot', 'type', 'loc'} if m['k'] == 'report' else set())
        if set(m) - allowed:
            return 'format', None
        w = 1.0
        if m['k'] == 'report':
            seg, spot, typ, loc = m.get('seg'), m.get('spot', -1), m.get('type'), m.get('loc')
            if seg not in links or typ not in TYPES or not isinstance(spot, int):
                return 'format', None
            if loc is not None:
                if not (isinstance(loc, list) and len(loc) == 3 and all(isinstance(v, int) for v in loc)):
                    return 'format', None
                if dist_to_line(loc[0] / 1e5, loc[1] / 1e5, links[seg]['geom']) > FAR_KM:
                    w = 0.2
        d = st.device(dev)
        if not d:
            return 'unknown device', None
        if d['revoked']:
            return 'revoked', None
        if not verify_sig(d['jwk'], m):
            return 'signature', None
        for (kind, win), cap in LIMITS.items():
            if m['k'] == kind and st.count(dev, kind, now - int(win)) >= cap:
                return 'rate', None
        out = {k: m[k] for k in ('v', 'k', 'rid', 'dev', 'rt', 'seg', 'spot', 'type') if k in m}
        if m['k'] == 'report' and m.get('loc') is not None:  # about 100 m is enough to place a report; less is kept nowhere
            out['loc'] = [round(m['loc'][0], -2), round(m['loc'][1], -2)]
        if w < 1:
            out['w'] = w
        return None, out

    def status(msgs, now):
        """Server view of each stretch: blocked when two distinct devices agree within 6 h, or an official verified it."""
        out = {}
        reps = {m['rid']: m for m in msgs if m['k'] == 'report'}
        official = {}  # latest official decision per report: True verified, False cleared
        for m in sorted((m for m in msgs if m['k'] == 'verify'), key=lambda m: m['rt']):
            official[m['rid']] = bool(m.get('ok'))
        for rid, r in reps.items():
            if r['type'] == 'clear':
                continue
            devs = {r['dev']} | {m['dev'] for m in msgs if m['k'] == 'confirm' and m['rid'] == rid and m['rt'] - r['rt'] <= CONFIRM_WINDOW_MS}
            s = out.setdefault(r['seg'], {'reports': 0, 'blocked': False, 'verified': False, 'cleared': False})
            s['reports'] += 1
            if official.get(rid) is False:
                s['cleared'] = True
                continue
            if official.get(rid) or (len(devs) >= 2 and now - r['rt'] <= CONFIRM_WINDOW_MS):
                s['blocked'] = True
            s['verified'] = s['verified'] or bool(official.get(rid))
        return out

    def view(now, since=0):
        msgs = st.recent(now - KEEP_MS, since)
        return {'now': now, 'cursor': st.cursor(), 'msgs': msgs, 'status': status(msgs, now)}

    @app.get('/health')
    def health():
        return {'ok': True, 'now': now_ms(), 'version': app.version}

    @app.post('/v1/devices')
    def register(d: DeviceIn):
        j = d.jwk
        if j.get('kty') != 'EC' or j.get('crv') != 'P-256' or not isinstance(j.get('x'), str) or not isinstance(j.get('y'), str):
            raise HTTPException(400, 'P-256 public JWK required')
        try:
            public_key(j)
        except (ValueError, KeyError):
            raise HTTPException(400, 'not a point on P-256')
        did = thumbprint(j)
        st.add_device(did, {'kty': 'EC', 'crv': 'P-256', 'x': j['x'], 'y': j['y']}, d.platform, d.app, now_ms())
        return {'device': did}

    @app.post('/v1/sync')
    def sync(body: SyncIn, request: Request):
        """The phone's whole outbox in one request; the reply brings it up to date (same shape as GET /v1/reports)."""
        now = now_ms()
        took, rejected = 0, {}
        for m in body.msgs[:MAX_BATCH]:
            why, row = check(m, now)
            if why:
                rejected[m.get('rid', '?') if isinstance(m, dict) else '?'] = why
                continue
            took += st.add_msg(row, now)
        st.purge(now - PURGE_MS)
        out = view(now)
        out.update(took=took, rejected=rejected)
        return out

    @app.get('/v1/reports')
    def reports(since: int = 0):
        return view(now_ms(), since)

    @app.post('/v1/reports/{rid}/verify')
    def verify(rid: str, ok: bool = True, o=Depends(official)):
        now = now_ms()
        if not st.has_report(rid):
            raise HTTPException(404, 'no such report')
        st.add_msg({'v': 2, 'k': 'verify', 'rid': rid, 'dev': 'off:' + o['name'], 'rt': now, 'ok': bool(ok), 'role': o['role']}, now)
        st.audit(o['name'], 'verify' if ok else 'clear', rid, now)
        return view(now)

    @app.post('/v1/devices/{did}/revoke')
    def revoke(did: str, o=Depends(official)):
        if o['role'] != 'state_admin':
            raise HTTPException(403, 'state admin only')
        if not st.revoke(did):
            raise HTTPException(404, 'no such device')
        st.audit(o['name'], 'revoke', did, now_ms())
        return {'revoked': did}

    return app


app = create_app() if os.environ.get('PP_NO_APP') != '1' else None
