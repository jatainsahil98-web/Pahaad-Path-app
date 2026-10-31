# PahaadPath report API

Signed road reports from phones, verified or cleared by officials. It replaces the public ntfy.sh channel once it is hosted.

## How it works

- **Device key.** On first use each phone makes an ECDSA P-256 key pair (WebCrypto). The private key cannot be exported and stays on the phone. The device id is the RFC 7638 thumbprint of the public key. No name or phone number is collected.
- **Signed messages.** Each report or confirmation is signed when it is made, so a report written with no signal and sent hours later still verifies. The server takes reports up to 48 hours old.
- **Rules.** 6 reports an hour and 30 a day per device; 30 confirmations an hour. A stretch counts as blocked when two different devices agree within 6 hours, or one official verifies it. A report whose position is more than 5 km from its stretch needs a confirmation before phones use it.
- **Privacy.** Positions are rounded to about 100 m. Raw reports are deleted after 30 days.
- **Officials.** Officers get a token from an admin (`add-officer` below); only its SHA-256 is stored. They can verify or clear a report, and a state admin can revoke a device. Every such action goes into a hash-chained audit table. OIDC with MFA replaces tokens in Phase 3.

| Method | Path | Who |
|---|---|---|
| GET | `/health` | anyone |
| POST | `/v1/devices` | a phone, once (public key) |
| POST | `/v1/sync` | a phone: its whole outbox; the reply brings it up to date |
| GET | `/v1/reports?since=<cursor>` | anyone |
| POST | `/v1/reports/{rid}/verify?ok=true\|false` | officer token |
| POST | `/v1/devices/{id}/revoke` | state admin token |

## Run locally

```
pip install -r server/requirements-dev.txt
PYTHONPATH=python:server python -m pytest server/tests -q
PYTHONPATH=python:server uvicorn pahaadpath_api.main:app --port 8787
```

Open the app with `?api=http://127.0.0.1:8787` to use it (the phone remembers the setting).

## Deploy

Host in an Indian region (the state data centre or NIC cloud for the pilot; a MeitY-empanelled cloud before that), behind HTTPS.

```
docker build -f server/Dockerfile -t pahaadpath-api .
docker run -p 8080:8080 \
  -e PP_DATABASE_URL=postgresql+psycopg://USER:PASS@HOST/pahaadpath \
  -e PP_ALLOW_ORIGINS=https://jatainsahil98-web.github.io,https://appassets.androidplatform.net,null \
  pahaadpath-api
PYTHONPATH=python:server python -m pahaadpath_api add-officer --name "SDRF Rudraprayag" --role district_officer --db "$PP_DATABASE_URL"
```

Without `PP_DATABASE_URL` the container uses SQLite in `/data` (mount a volume there); use PostgreSQL for anything real.

Then set `API_DEFAULT` in `src/features2.js` to the HTTPS address and rebuild the app. Every phone moves to the signed server and the public channel is no longer used.
