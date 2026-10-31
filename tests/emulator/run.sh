#!/bin/bash
# Runs inside the emulator job: installs the published signed APK and drives it. Output in emu-out/.
set -x
OUT=emu-out; mkdir -p $OUT
curl -sSL -o PahaadPath.apk https://github.com/jatainsahil98-web/Pahaad-Path-app/releases/download/android-latest/PahaadPath.apk
ls -l PahaadPath.apk; sha256sum PahaadPath.apk | tee $OUT/apk_sha256.txt
BT=$(ls -d $ANDROID_HOME/build-tools/* | sort -V | tail -1)
$BT/aapt dump badging PahaadPath.apk | head -5 > $OUT/apk_badging.txt
$BT/apksigner verify --print-certs PahaadPath.apk > $OUT/apk_cert.txt 2>&1
unzip -p PahaadPath.apk assets/index.html > $OUT/apk_index.html
cmp $OUT/apk_index.html index.html && echo "APK page same as main index.html" > $OUT/apk_vs_main.txt || echo "APK page DIFFERS from main index.html" > $OUT/apk_vs_main.txt
rm -f $OUT/apk_index.html
adb install -r PahaadPath.apk | tee $OUT/install.txt
adb logcat -c
node tests/emulator/drive.js $OUT 2>&1 | tee $OUT/drive_log.txt
adb logcat -d -v time '*:W' | grep -iE "pahaadpath|chromium|AndroidRuntime|FATAL|WebView" | tail -400 > $OUT/logcat.txt
true
