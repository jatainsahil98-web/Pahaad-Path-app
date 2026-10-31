"""Storage for the report API: SQLite for development and tests, PostgreSQL in production (same SQL through SQLAlchemy Core).
The audit table is append-only and each row carries the hash of the row before it, so a deleted or edited row shows."""
import hashlib
import json

import sqlalchemy as sa

meta = sa.MetaData()
devices = sa.Table('devices', meta,
                   sa.Column('id', sa.String(43), primary_key=True),
                   sa.Column('jwk', sa.Text, nullable=False),
                   sa.Column('platform', sa.String(16)),
                   sa.Column('app', sa.String(32)),
                   sa.Column('created', sa.BigInteger, nullable=False),
                   sa.Column('revoked', sa.Boolean, nullable=False, default=False))
msgs = sa.Table('msgs', meta,
                sa.Column('seq', sa.Integer, primary_key=True, autoincrement=True),
                sa.Column('rid', sa.String(40), nullable=False),
                sa.Column('dev', sa.String(64), nullable=False),
                sa.Column('k', sa.String(8), nullable=False),
                sa.Column('rt', sa.BigInteger, nullable=False),
                sa.Column('got', sa.BigInteger, nullable=False),
                sa.Column('body', sa.Text, nullable=False),
                sa.UniqueConstraint('rid', 'dev', 'k', name='one_per_device'),
                sa.Index('msgs_rt', 'rt'), sa.Index('msgs_dev_got', 'dev', 'got'))
officers = sa.Table('officers', meta,
                    sa.Column('token_sha256', sa.String(64), primary_key=True),
                    sa.Column('name', sa.String(64), nullable=False),
                    sa.Column('role', sa.String(24), nullable=False),     # district_officer | state_admin
                    sa.Column('district', sa.String(32)))
audit = sa.Table('audit', meta,
                 sa.Column('seq', sa.Integer, primary_key=True, autoincrement=True),
                 sa.Column('at', sa.BigInteger, nullable=False),
                 sa.Column('who', sa.String(64), nullable=False),
                 sa.Column('what', sa.String(16), nullable=False),
                 sa.Column('ref', sa.String(64), nullable=False),
                 sa.Column('prev', sa.String(64), nullable=False),
                 sa.Column('hash', sa.String(64), nullable=False))


class Store:
    def __init__(self, url):
        args = {'check_same_thread': False} if url.startswith('sqlite') else {}
        self.e = sa.create_engine(url, connect_args=args, future=True)
        meta.create_all(self.e)

    def add_device(self, did, jwk, platform, app, now):
        with self.e.begin() as c:
            if c.execute(sa.select(devices.c.id).where(devices.c.id == did)).first():
                return False
            c.execute(devices.insert().values(id=did, jwk=json.dumps(jwk), platform=platform, app=app, created=now, revoked=False))
            return True

    def device(self, did):
        with self.e.connect() as c:
            r = c.execute(sa.select(devices).where(devices.c.id == did)).mappings().first()
        return dict(r, jwk=json.loads(r['jwk'])) if r else None

    def revoke(self, did):
        with self.e.begin() as c:
            return c.execute(devices.update().where(devices.c.id == did).values(revoked=True)).rowcount > 0

    def count(self, dev, kind, since):
        with self.e.connect() as c:
            return c.execute(sa.select(sa.func.count()).select_from(msgs)
                             .where(msgs.c.dev == dev, msgs.c.k == kind, msgs.c.got >= since)).scalar()

    def add_msg(self, m, now):
        body = json.dumps(m, separators=(',', ':'), ensure_ascii=False)
        with self.e.begin() as c:
            same = (msgs.c.rid == m['rid'], msgs.c.dev == m['dev'], msgs.c.k == m['k'])
            if m['k'] == 'verify':  # an official's latest decision on a report replaces their earlier one
                c.execute(msgs.delete().where(*same))
            elif c.execute(sa.select(msgs.c.seq).where(*same)).first():
                return 0  # the same message again (an outbox resend): already stored
            c.execute(msgs.insert().values(rid=m['rid'], dev=m['dev'], k=m['k'], rt=m['rt'], got=now, body=body))
            return 1

    def has_report(self, rid):
        with self.e.connect() as c:
            return c.execute(sa.select(msgs.c.seq).where(msgs.c.rid == rid, msgs.c.k == 'report')).first() is not None

    def recent(self, since_rt, since_seq=0):
        with self.e.connect() as c:
            rows = c.execute(sa.select(msgs.c.body).where(msgs.c.rt >= since_rt, msgs.c.seq > since_seq).order_by(msgs.c.rt)).all()
        return [json.loads(r[0]) for r in rows]

    def cursor(self):
        with self.e.connect() as c:
            return c.execute(sa.select(sa.func.coalesce(sa.func.max(msgs.c.seq), 0))).scalar()

    def purge(self, before):
        with self.e.begin() as c:
            c.execute(msgs.delete().where(msgs.c.rt < before))

    def add_officer(self, token, name, role, district=None):
        with self.e.begin() as c:
            c.execute(officers.insert().values(token_sha256=hashlib.sha256(token.encode()).hexdigest(), name=name, role=role, district=district))

    def officer(self, token_sha256):
        with self.e.connect() as c:
            r = c.execute(sa.select(officers).where(officers.c.token_sha256 == token_sha256)).mappings().first()
        return dict(r) if r else None

    def audit(self, who, what, ref, now):
        with self.e.begin() as c:
            last = c.execute(sa.select(audit.c.hash).order_by(audit.c.seq.desc()).limit(1)).scalar() or '0' * 64
            h = hashlib.sha256(('%s|%d|%s|%s|%s' % (last, now, who, what, ref)).encode()).hexdigest()
            c.execute(audit.insert().values(at=now, who=who, what=what, ref=ref, prev=last, hash=h))

    def audit_ok(self):
        """True when every audit row still chains to the one before it."""
        with self.e.connect() as c:
            rows = c.execute(sa.select(audit).order_by(audit.c.seq)).mappings().all()
        last = '0' * 64
        for r in rows:
            h = hashlib.sha256(('%s|%d|%s|%s|%s' % (last, r['at'], r['who'], r['what'], r['ref'])).encode()).hexdigest()
            if r['prev'] != last or r['hash'] != h:
                return False
            last = h
        return True
