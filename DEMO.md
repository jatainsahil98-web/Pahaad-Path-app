# PahaadPath demo guide

Live app: https://jatainsahil98-web.github.io/Pahaad-Path-app/
Android: https://github.com/jatainsahil98-web/Pahaad-Path-app/releases/latest/download/PahaadPath.apk

## Before the demo (10 minutes)

1. Open the live app on the demo phone **while online**. It saves a forecast and the app itself for offline use. Check the header says how old the forecast is.
2. Add it to the home screen (or install the APK) and open it from there once.
3. Switch to airplane mode and open it again. The saved trip planner should still work and the header should say the forecast is saved, with its age.
4. On a laptop with internet, open the Proof tab and press "Run every day and source" if you want fresh numbers. Without that, the Proof tab shows the stored results.
5. Charge the phone and keep the laptop copy of `PahaadPath.html` as a fallback: it is one file and opens from disk with no internet.

If there is no signal at the venue and nothing was saved, the app shows no landslide risk and says there is no forecast. That is intended, but it makes a poor demo, so do step 1.

## Direct links (change `from` and `to` as needed)

- Trip planner: `?from=delhi&to=kedarnath`
- Map tab: `?from=delhi&to=kedarnath&tab=map`
- Safety tab: `?from=delhi&to=kedarnath&tab=safety`
- Control room: `?view=ops`
- Proof: `?view=proof`
- Hindi: add `&lang=hi`

## Three-minute script

1. **Problem (20 s).** Hill roads in Uttarakhand close in the monsoon and on long weekends. People plan with no hour-by-hour view and often with no signal on the road.
2. **Plan a trip (60 s).** Delhi to Kedarnath. Show the fastest and lower-risk roads, risk per stretch at the hour you reach it, the night halt and the entry rules.
3. **Offline (30 s).** Airplane mode. Reopen the app. Show "Where am I on this trip?" (GPS only), "Tell family (SMS)" and the share-the-app-file button.
4. **Control room (30 s).** All 44 hill stretches over 72 hours and the advisory draft in English or Hindi.
5. **Proof (40 s).** Say it plainly: on recorded rain the model flagged 1 of 4 closed stretches at Avoid on 9 Jul 2026 and 3 of 4 at Caution or worse, and none of 5 on 20 Aug 2025. On dry control days nothing reached Avoid. It is advisory, built on open data, and checked against real closure days.

## Questions to expect

- **How accurate is it?** Only a few closure days are replayed, so there is no measured accuracy. The Proof tab shows what it caught and missed. The trained v5 model did not beat the simple rain threshold, so the app uses the threshold by default.
- **Is traffic live?** No. Traffic is a calendar-based estimate with demo coefficients. A live-traffic provider can be plugged in with an API key.
- **Is the road network complete?** No. It is hand-built from about 60 places and 75 road links with approximate distances, with OSRM distances where fetched.
- **Is it an official warning?** No. It says so on screen. Follow police, BRO and district administration notices.
