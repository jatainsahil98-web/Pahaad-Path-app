"""Report API: device keys, signatures, rate limits, the two-device rule, officials, revocation, audit chain.
Run: PYTHONPATH=python:server python -m pytest server/tests -q"""
import base64
import json
import os
import time

import pytest
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from fastapi.testclient import TestClient

os.environ['PP_NO_APP'] = '1'
from pahaadpath_api.main import canonical, create_app, thumbprint  # noqa: E402

SEG = 'rishikesh-devprayag'


def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


class Phone:
    """A phone as the app behaves: a P-256 key, messages signed as raw r||s like WebCrypto."""
    def __init__(self, client):
        self.key = ec.generate_private_key(ec.SECP256R1())
        n = self.key.public_key().public_numbers()
        self.jwk = {'kty': 'EC', 'crv': 'P-256', 'x': b64u(n.x.to_bytes(32, 'big')), 'y': b64u(n.y.to_bytes(32, 'big'))}
        self.id = thumbprint(self.jwk)
        self.c = client

    def register(self):
        r = self.c.post('/v1/devices', json={'jwk': self.jwk, 'platform': 'test'})
        assert r.status_code == 200 and r.json()['device'] == self.id
        return self

    def sign(self, m):
        m = dict(m, v=2, dev=self.id)
        r, s = decode_dss_signature(self.key.sign(canonical(m), ec.ECDSA(hashes.SHA256())))
        m['sig'] = b64u(r.to_bytes(32, 'big') + s.to_bytes(32, 'big'))
        return m

    def report(self, rid, seg=SEG, typ='landslide', rt=None, loc=None):
        m = {'k': 'report', 'rid': rid, 'rt': rt or int(time.time() * 1000), 'seg': seg, 'spot': 0, 'type': typ}
        if loc:
            m['loc'] = loc
        return self.sign(m)

    def confirm(self, rid, rt=None):
        return self.sign({'k': 'confirm', 'rid': rid, 'rt': rt or int(time.time() * 1000)})

    def sync(self, *msgs):
        r = self.c.post('/v1/sync', json={'msgs': list(msgs)})
        assert r.status_code == 200, r.text
        return r.json()


@pytest.fixture
def client(tmp_path):
    app = create_app('sqlite:///' + str(tmp_path / 'r.sqlite3'))
    c = TestClient(app)
    c.store = app.state.store
    return c


def test_signed_report_is_accepted_and_served(client):
    a = Phone(client).register()
    out = a.sync(a.report('r1'))
    assert out['took'] == 1 and out['rejected'] == {}
    assert [m['rid'] for m in client.get('/v1/reports').json()['msgs']] == ['r1']
    assert 'sig' not in out['msgs'][0]  # phones get the facts, not the signatures


def test_tampered_unknown_and_unregistered_are_rejected(client):
    a = Phone(client).register()
    m = a.report('r1')
    m['type'] = 'bridge'  # changed after signing
    b = Phone(client)  # never registered
    out = a.sync(m, b.report('r2'), {'v': 1, 'k': 'report', 'rid': 'old'})
    assert out['took'] == 0
    assert out['rejected'] == {'r1': 'signature', 'r2': 'unknown device', 'old': 'format'}


def test_resend_is_idempotent_and_old_or_future_is_rejected(client):
    a = Phone(client).register()
    m = a.report('r1')
    assert a.sync(m)['took'] == 1 and a.sync(m)['took'] == 0
    now = int(time.time() * 1000)
    out = a.sync(a.report('old', rt=now - 49 * 3600 * 1000), a.report('fut', rt=now + 3600 * 1000))
    assert out['rejected'] == {'old': 'time', 'fut': 'time'}


def test_offline_report_signed_hours_ago_still_counts(client):
    a = Phone(client).register()
    out = a.sync(a.report('valley', rt=int(time.time() * 1000) - 20 * 3600 * 1000))
    assert out['took'] == 1


def test_rate_limit_per_device(client):
    a = Phone(client).register()
    out = a.sync(*[a.report('r%d' % i) for i in range(8)])
    assert out['took'] == 6 and list(out['rejected'].values()) == ['rate', 'rate']


def test_two_devices_block_a_stretch_one_does_not(client):
    a, b = Phone(client).register(), Phone(client).register()
    assert a.sync(a.report('r1'))['status'][SEG]['blocked'] is False
    assert a.sync(a.confirm('r1'))['status'][SEG]['blocked'] is False  # confirming your own report adds nothing
    assert b.sync(b.confirm('r1'))['status'][SEG]['blocked'] is True


def test_far_away_report_is_down_weighted_and_position_rounded(client):
    a = Phone(client).register()
    out = a.sync(a.report('near', loc=[3014621, 7859862, 20]), a.report('far', loc=[2861390, 7720900, 20]))
    by = {m['rid']: m for m in out['msgs']}
    assert by['far']['w'] == 0.2 and 'w' not in by['near']
    assert by['near']['loc'] == [3014600, 7859900]


def test_official_verify_and_clear_with_audit(client):
    a = Phone(client).register()
    a.sync(a.report('r1'))
    assert client.post('/v1/reports/r1/verify').status_code == 401
    client.store.add_officer('tok-sdrf', 'SDRF Rudraprayag', 'district_officer', 'Rudraprayag')
    h = {'Authorization': 'Bearer tok-sdrf'}
    st = client.post('/v1/reports/r1/verify', headers=h).json()['status'][SEG]
    assert st['blocked'] and st['verified']
    st = client.post('/v1/reports/r1/verify?ok=false', headers=h).json()['status'][SEG]
    assert st['blocked'] is False
    assert client.post('/v1/reports/nope/verify', headers=h).status_code == 404
    assert client.store.audit_ok()


def test_revoked_device_is_refused(client):
    a = Phone(client).register()
    client.store.add_officer('tok-admin', 'USDMA admin', 'state_admin')
    client.store.add_officer('tok-dist', 'District officer', 'district_officer')
    assert client.post('/v1/devices/%s/revoke' % a.id, headers={'Authorization': 'Bearer tok-dist'}).status_code == 403
    assert client.post('/v1/devices/%s/revoke' % a.id, headers={'Authorization': 'Bearer tok-admin'}).status_code == 200
    assert a.sync(a.report('r1'))['rejected'] == {'r1': 'revoked'}
    assert client.store.audit_ok()


def test_audit_chain_detects_an_edit(client):
    client.store.audit('x', 'verify', 'r1', 1)
    client.store.audit('y', 'clear', 'r1', 2)
    import sqlalchemy as sa
    from pahaadpath_api.store import audit
    with client.store.e.begin() as c:
        c.execute(audit.update().where(audit.c.seq == 1).values(who='z'))
    assert not client.store.audit_ok()


def test_bad_keys_and_unknown_stretch(client):
    assert client.post('/v1/devices', json={'jwk': {'kty': 'RSA'}}).status_code == 400
    bad = {'kty': 'EC', 'crv': 'P-256', 'x': b64u(b'\1' * 32), 'y': b64u(b'\2' * 32)}
    assert client.post('/v1/devices', json={'jwk': bad}).status_code == 400
    a = Phone(client).register()
    assert a.sync(a.report('r1', seg='delhi-gurugram'))['rejected'] == {'r1': 'format'}  # plains road: no landslide reports
    assert json.loads(canonical({'b': 1, 'a': 'x', 'sig': 'z'})) == {'a': 'x', 'b': 1}
