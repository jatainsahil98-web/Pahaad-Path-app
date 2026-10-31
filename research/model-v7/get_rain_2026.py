"""PahaadPath: download 2026 monsoon daily rain for the 44 hill stretches (for the v7 blend test).

Run on any computer with internet and Python 3 (no extra packages):
    python get_rain_2026.py
It writes pahaadpath_rain_2026.json next to this script (about 40 KB). Takes under a minute.
Source: ERA5 reanalysis via Open-Meteo archive API (CC BY 4.0), the same source PahaadPath's own pipeline uses.
"""
import json
import os
import time
import urllib.parse
import urllib.request

KEYS = ["29.31,79.55", "29.33,79.49", "29.33,79.52", "29.37,79.51", "29.39,79.49", "29.41,79.52", "29.52,79.28",
        "29.52,79.59", "29.59,79.94", "29.62,79.55", "29.72,79.63", "29.79,78.60", "29.83,80.23", "29.84,79.69",
        "29.95,78.65", "29.95,79.61", "30.12,78.43", "30.16,79.42", "30.18,78.69", "30.19,78.78", "30.22,78.33",
        "30.24,77.95", "30.25,78.88", "30.27,79.10", "30.33,79.27", "30.36,78.41", "30.38,78.32", "30.39,78.05",
        "30.40,79.03", "30.44,78.16", "30.48,79.44", "30.54,78.41", "30.54,79.57", "30.57,79.08", "30.59,77.82",
        "30.59,79.56", "30.60,78.06", "30.64,79.07", "30.68,79.53", "30.77,78.52", "30.84,78.15", "30.90,78.32",
        "30.92,78.67", "31.02,78.84"]
START, END = "2026-05-01", "2026-09-30"
URL = "https://archive-api.open-meteo.com/v1/archive"


def get(keys):
    q = urllib.parse.urlencode({
        "latitude": ",".join(k.split(",")[0] for k in keys),
        "longitude": ",".join(k.split(",")[1] for k in keys),
        "start_date": START, "end_date": END, "daily": "precipitation_sum", "timezone": "Asia/Kolkata"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(URL + "?" + q, timeout=90) as r:
                js = json.loads(r.read().decode("utf-8"))
            return js if isinstance(js, list) else [js]
        except Exception as e:  # rate limit or a dropped connection: wait and try again
            print("  retrying after error:", e)
            time.sleep(10 * (attempt + 1))
    raise SystemExit("Could not reach Open-Meteo. Check the internet connection and run again.")


def main():
    out = {}
    for i in range(0, len(KEYS), 10):
        ks = KEYS[i:i + 10]
        print("stretches %d to %d of %d" % (i + 1, i + len(ks), len(KEYS)))
        for k, j in zip(ks, get(ks)):
            d = j["daily"]
            if d["time"][0] != START or d["time"][-1] != END:
                raise SystemExit("Unexpected dates in the reply for %s" % k)
            out[k] = [None if v is None else round(v, 1) for v in d["precipitation_sum"]]
        time.sleep(2)
    dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pahaadpath_rain_2026.json")
    with open(dest, "w") as f:
        json.dump({"source": "ERA5 reanalysis via archive-api.open-meteo.com (CC BY 4.0), daily precipitation_sum, IST days",
                   "start": START, "end": END, "by": out}, f)
    missing = sum(1 for v in out.values() for x in v if x is None)
    print("Saved %s (%d stretches, %d missing days)." % (dest, len(out), missing))


if __name__ == "__main__":
    main()
