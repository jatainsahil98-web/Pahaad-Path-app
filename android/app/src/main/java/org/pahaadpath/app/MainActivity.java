package org.pahaadpath.app;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Locale;

/** The whole app is assets/index.html (the same single file as the website), served from a fixed https origin so that
 *  saved forecasts and reports in localStorage survive app restarts. It needs no network to start.
 *  The page reaches the phone through window.PPAndroid (Bridge below) for what a WebView cannot do on its own:
 *  sharing, copying, saving files, speech in and out, and checking whether location is switched on. */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final int REQ_GEO = 1, REQ_MIC = 2, REQ_FILE = 3, REQ_NOTE = 4;
    private static final Charset UTF8 = Charset.forName("UTF-8");

    private WebView web;
    private GeolocationPermissions.Callback geoCb;
    private String geoOrigin;
    private ValueCallback<Uri[]> fileCb;
    private PermissionRequest micReq;
    private String pendingListen;
    private SpeechRecognizer recognizer;
    private TextToSpeech tts;
    private boolean ttsReady;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);
        web.addJavascriptInterface(new Bridge(), "PPAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
                return loader.shouldInterceptRequest(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false;
                openExternal(u);
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback cb) {
                // approximate location is enough: the page falls back to a coarse fix when GPS gives none
                if (Build.VERSION.SDK_INT < 23 || has(Manifest.permission.ACCESS_FINE_LOCATION) || has(Manifest.permission.ACCESS_COARSE_LOCATION)) {
                    cb.invoke(origin, true, false);
                } else {
                    geoCb = cb;
                    geoOrigin = origin;
                    ask(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_GEO);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE);
                } catch (Exception e) {
                    fileCb = null;
                    return false;
                }
                return true;
            }

            @Override
            public void onPermissionRequest(final PermissionRequest r) {
                runOnUiThread(new Runnable() {
                    public void run() {
                        boolean mic = false;
                        for (String x : r.getResources()) if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(x)) mic = true;
                        if (!mic) { r.deny(); return; }
                        if (Build.VERSION.SDK_INT < 23 || has(Manifest.permission.RECORD_AUDIO)) {
                            r.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                        } else {
                            micReq = r;
                            ask(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
                        }
                    }
                });
            }
        });
        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            public void onInit(int status) { ttsReady = status == TextToSpeech.SUCCESS; }
        });
        setContentView(web);
        if (state != null) web.restoreState(state);
        else web.loadUrl("https://" + HOST + "/assets/index.html");
    }

    private boolean has(String perm) {
        return Build.VERSION.SDK_INT < 23 || checkSelfPermission(perm) == PackageManager.PERMISSION_GRANTED;
    }

    private void ask(String[] perms, int code) {
        if (Build.VERSION.SDK_INT >= 23) requestPermissions(perms, code);
    }

    private void js(final String code) {
        runOnUiThread(new Runnable() {
            public void run() { web.evaluateJavascript(code, null); }
        });
    }

    /** WhatsApp, phone calls, SMS, Google Maps, Mappls and other web links open in their own apps. */
    private void openExternal(Uri u) {
        Intent i = new Intent(Intent.ACTION_VIEW, u);
        String host = u.getHost() == null ? "" : u.getHost();
        boolean gmaps = (host.endsWith("google.com") && u.getPath() != null && u.getPath().startsWith("/maps")) || host.equals("maps.google.com");
        if (gmaps) {
            Intent g = new Intent(Intent.ACTION_VIEW, u).setPackage("com.google.android.apps.maps");
            try { startActivity(g); return; } catch (Exception e) { /* no Google Maps app: open it in the browser */ }
        }
        try {
            startActivity(i);
        } catch (Exception e) {
            js("window.ppNoApp&&ppNoApp()");
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        boolean any = false;
        for (int r : res) if (r == PackageManager.PERMISSION_GRANTED) any = true;
        if (code == REQ_GEO && geoCb != null) {
            geoCb.invoke(geoOrigin, any, false);
            geoCb = null;
        } else if (code == REQ_MIC) {
            if (micReq != null) {
                if (any) micReq.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                else micReq.deny();
                micReq = null;
            }
            if (pendingListen != null) {
                String lang = pendingListen;
                pendingListen = null;
                if (any) startListening(lang);
                else js("PP.onSpeech(null,'denied')");
            }
        }
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        if (code == REQ_FILE && fileCb != null) {
            fileCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            fileCb = null;
            return;
        }
        super.onActivityResult(code, result, data);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    /** Back closes an open window, then returns to the trip screen (PP.back in the page); only then leaves the app. */
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.PP&&PP.back)?PP.back():false", new ValueCallback<String>() {
            public void onReceiveValue(String handled) {
                if ("true".equals(handled)) return;
                if (web.canGoBack()) web.goBack();
                else finish();
            }
        });
    }

    @Override
    protected void onDestroy() {
        if (recognizer != null) recognizer.destroy();
        if (tts != null) tts.shutdown();
        super.onDestroy();
    }

    private void startListening(String lang) {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            js("PP.onSpeech(null,'unavailable')");
            return;
        }
        if (recognizer == null) {
            recognizer = SpeechRecognizer.createSpeechRecognizer(this);
            recognizer.setRecognitionListener(new RecognitionListener() {
                public void onResults(Bundle b) {
                    ArrayList<String> r = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    js("PP.onSpeech(" + new JSONArray(r == null ? new ArrayList<String>() : r) + ",null)");
                }
                public void onError(int e) { js("PP.onSpeech(null," + e + ")"); }
                public void onReadyForSpeech(Bundle b) {}
                public void onBeginningOfSpeech() {}
                public void onRmsChanged(float v) {}
                public void onBufferReceived(byte[] b) {}
                public void onEndOfSpeech() {}
                /** words so far, while the person is still speaking; the final result still comes through PP.onSpeech */
                public void onPartialResults(Bundle b) {
                    ArrayList<String> r = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (r == null || r.isEmpty() || r.get(0) == null || r.get(0).isEmpty()) return;
                    js("window.PP&&PP.onSpeechPartial&&PP.onSpeechPartial(" + JSONObject.quote(r.get(0)) + ")");
                }
                public void onEvent(int t, Bundle b) {}
            });
        }
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
        i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        i.putExtra("android.speech.extra.PREFER_OFFLINE", true); // the phone's offline model when installed
        recognizer.startListening(i);
    }

    private Locale locale(String tag) {
        String[] p = tag.split("-");
        return p.length > 1 ? new Locale(p[0], p[1]) : new Locale(p[0]);
    }

    /** Methods the page calls as window.PPAndroid.*; they run on a background thread, so UI work goes through runOnUiThread. */
    class Bridge {
        /** "Share the app" hands on this APK itself, so it spreads by Bluetooth or WhatsApp with no signal. */
        @JavascriptInterface
        public void shareApp() {
            runOnUiThread(new Runnable() {
                public void run() {
                    try {
                        File dir = new File(getCacheDir(), "share");
                        dir.mkdirs();
                        File out = new File(dir, "PahaadPath.apk");
                        InputStream in = new FileInputStream(getApplicationInfo().sourceDir);
                        OutputStream os = new FileOutputStream(out);
                        byte[] buf = new byte[65536];
                        int n;
                        while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
                        in.close();
                        os.close();
                        Uri uri = FileProvider.getUriForFile(MainActivity.this, "org.pahaadpath.app.files", out);
                        Intent send = new Intent(Intent.ACTION_SEND);
                        send.setType("application/vnd.android.package-archive");
                        send.putExtra(Intent.EXTRA_STREAM, uri);
                        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(Intent.createChooser(send, "PahaadPath"));
                    } catch (Exception e) {
                        web.evaluateJavascript("console.warn('share failed')", null);
                    }
                }
            });
        }

        /** The phone's share sheet with plain text (WhatsApp, SMS, Telegram, email...). */
        @JavascriptInterface
        public void shareText(final String text) {
            runOnUiThread(new Runnable() {
                public void run() {
                    Intent send = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text);
                    try { startActivity(Intent.createChooser(send, "PahaadPath")); } catch (Exception e) { js("window.ppNoApp&&ppNoApp()"); }
                }
            });
        }

        /** WhatsApp directly with the text filled in; false when neither WhatsApp nor WhatsApp Business is installed. */
        @JavascriptInterface
        public boolean openWhatsApp(String text) {
            for (String pkg : new String[]{"com.whatsapp", "com.whatsapp.w4b"}) {
                Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain").setPackage(pkg).putExtra(Intent.EXTRA_TEXT, text);
                try {
                    startActivity(i);
                    return true;
                } catch (Exception e) { /* try the next one */ }
            }
            return false;
        }

        @JavascriptInterface
        public void copy(final String text) {
            runOnUiThread(new Runnable() {
                public void run() {
                    ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("PahaadPath", text));
                }
            });
        }

        /** Saves a text file the page made (results, open data) to Downloads/PahaadPath; returns where it went, or "" on failure. */
        @JavascriptInterface
        public String saveFile(String name, String mime, String text) {
            String safe = name.replaceAll("[^A-Za-z0-9._-]", "_");
            try {
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentResolver cr = getContentResolver();
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.MediaColumns.DISPLAY_NAME, safe);
                    v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                    v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/PahaadPath");
                    Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    if (uri == null) return "";
                    OutputStream os = cr.openOutputStream(uri);
                    os.write(text.getBytes(UTF8));
                    os.close();
                    return "Download/PahaadPath/" + safe;
                }
                File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) return "";
                dir.mkdirs();
                File f = new File(dir, safe);
                OutputStream os = new FileOutputStream(f);
                os.write(text.getBytes(UTF8));
                os.close();
                return f.getAbsolutePath();
            } catch (Exception e) {
                return "";
            }
        }

        /** False when location is switched off in the phone settings, so the page can say so instead of waiting for a fix. */
        @JavascriptInterface
        public boolean locationEnabled() {
            LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            if (lm == null) return true;
            if (Build.VERSION.SDK_INT >= 28) return lm.isLocationEnabled();
            try {
                return lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
            } catch (Exception e) {
                return true;
            }
        }

        @JavascriptInterface
        public boolean canListen() {
            return SpeechRecognizer.isRecognitionAvailable(MainActivity.this);
        }

        /** Speech to text with the phone's recogniser; alternatives come back through PP.onSpeech(list, error). */
        @JavascriptInterface
        public void listen(final String lang) {
            runOnUiThread(new Runnable() {
                public void run() {
                    if (has(Manifest.permission.RECORD_AUDIO)) startListening(lang);
                    else {
                        pendingListen = lang;
                        ask(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
                    }
                }
            });
        }

        /** Reads text aloud with the phone's voice for the language; false when that voice is missing, so the page can fall back. */
        @JavascriptInterface
        public boolean speak(String text, String lang) {
            if (!ttsReady) return false;
            int r = tts.setLanguage(locale(lang));
            if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) return false;
            tts.setSpeechRate(0.95f);
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "pp");
            return true;
        }

        @JavascriptInterface
        public void stopSpeaking() {
            if (tts != null) tts.stop();
        }

        /** App version, so the page and bug reports can say which build is running. */
        /** trips to check in the background for rising rain risk (WatchWorker); asks for notification permission first */
        @JavascriptInterface
        public void setWatch(String json, String lang) {
            getSharedPreferences(WatchWorker.PREFS, MODE_PRIVATE).edit().putString("lang", lang).apply();
            WatchWorker.setWatch(MainActivity.this, json);
            if (Build.VERSION.SDK_INT >= 33 && !json.equals("[]") && !has(Manifest.permission.POST_NOTIFICATIONS))
                ask(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTE);
        }

        @JavascriptInterface
        public String getWatch() {
            return getSharedPreferences(WatchWorker.PREFS, MODE_PRIVATE).getString("watch", "[]");
        }

        @JavascriptInterface
        public boolean notesAllowed() {
            return Build.VERSION.SDK_INT < 33 || has(Manifest.permission.POST_NOTIFICATIONS);
        }

        /** the data pack the background check last downloaded, "" if none */
        @JavascriptInterface
        public String cachedPack() {
            return WatchWorker.cachedPack(MainActivity.this);
        }

        @JavascriptInterface
        public String info() {
            try {
                JSONObject o = new JSONObject();
                o.put("version", getPackageManager().getPackageInfo(getPackageName(), 0).versionName);
                o.put("sdk", Build.VERSION.SDK_INT);
                return o.toString();
            } catch (Exception e) {
                return "{}";
            }
        }
    }
}
