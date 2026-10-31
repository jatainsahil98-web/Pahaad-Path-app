package org.pahaadpath.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.TimeUnit;

/**
 * Background check for the trips the user asked to watch. Every few hours, when there is any network, it downloads the
 * data pack (the same file the app uses offline), reads risk24 (worst rain score on each hill stretch over the next
 * 24 h, computed in CI by the same engine) for the stretches of each watched trip, and posts a local notification when
 * a trip's band rises to Caution or Avoid. No server, no account, nothing sent from the phone.
 */
public class WatchWorker extends Worker {
    static final String PACK_URL = "https://raw.githubusercontent.com/jatainsahil98-web/Pahaad-Path-app/datapack/pack.json";
    static final String PREFS = "pp_watch", CHANNEL = "road_risk", WORK = "pp-watch";

    public WatchWorker(@NonNull Context c, @NonNull WorkerParameters p) {
        super(c, p);
    }

    /** watch = JSON array of {id, title, hi, links:[link ids], until: epoch ms}; empty or "[]" stops the checks */
    static void setWatch(Context c, String watch) {
        SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        sp.edit().putString("watch", watch).apply();
        WorkManager wm = WorkManager.getInstance(c);
        int n = 0;
        try {
            n = new JSONArray(watch).length();
        } catch (Exception ignored) {
        }
        if (n == 0) {
            wm.cancelUniqueWork(WORK);
            return;
        }
        Constraints k = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest r = new PeriodicWorkRequest.Builder(WatchWorker.class, 3, TimeUnit.HOURS, 1, TimeUnit.HOURS)
                .setConstraints(k).build();
        wm.enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.KEEP, r);
    }

    static String cachedPack(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("pack", "");
    }

    static String fetch(String u) throws Exception {
        HttpURLConnection h = (HttpURLConnection) new URL(u).openConnection();
        h.setConnectTimeout(20000);
        h.setReadTimeout(30000);
        h.setUseCaches(false);
        if (h.getResponseCode() != 200) throw new Exception("pack " + h.getResponseCode());
        InputStream in = h.getInputStream();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] b = new byte[16384];
        for (int n; (n = in.read(b)) > 0; ) out.write(b, 0, n);
        in.close();
        return out.toString("UTF-8");
    }

    @NonNull
    @Override
    public Result doWork() {
        Context c = getApplicationContext();
        SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try {
            JSONArray watch = new JSONArray(sp.getString("watch", "[]"));
            if (watch.length() == 0) return Result.success();
            String txt = fetch(PACK_URL);
            JSONObject pack = new JSONObject(txt);
            sp.edit().putString("pack", txt).apply();
            JSONObject risk = pack.optJSONObject("risk24");
            if (risk == null) return Result.success();
            long now = System.currentTimeMillis();
            JSONArray keep = new JSONArray();
            JSONObject last = new JSONObject(sp.getString("last", "{}"));
            boolean hi = "hi".equals(sp.getString("lang", "en"));
            for (int i = 0; i < watch.length(); i++) {
                JSONObject w = watch.getJSONObject(i);
                if (w.optLong("until", Long.MAX_VALUE) < now) continue; // trip is over
                keep.put(w);
                JSONArray links = w.optJSONArray("links");
                int worst = 0, score = 0;
                for (int j = 0; links != null && j < links.length(); j++) {
                    JSONArray r = risk.optJSONArray(links.getString(j));
                    if (r != null && r.optInt(1) >= worst && r.optInt(0) >= score) {
                        worst = r.optInt(1);
                        score = r.optInt(0);
                    }
                }
                String id = w.optString("id");
                int before = last.optInt(id, 0);
                if (worst > before) notify(c, id.hashCode(), w.optString(hi ? "hi" : "title"), worst, score, hi);
                last.put(id, worst);
            }
            sp.edit().putString("watch", keep.toString()).putString("last", last.toString()).apply();
            if (keep.length() == 0) WorkManager.getInstance(c).cancelUniqueWork(WORK);
            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }

    static void notify(Context c, int id, String trip, int band, int score, boolean hi) {
        if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, hi ? "सड़क जोखिम" : "Road risk", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription(hi ? "देखी जा रही यात्राओं पर बारिश से जोखिम बढ़ने पर" : "When rain raises the risk on a trip you are watching");
            nm.createNotificationChannel(ch);
        }
        String title = band >= 2 ? (hi ? "बचें: भारी बारिश का जोखिम" : "Avoid: heavy rain risk") : (hi ? "सावधानी: बारिश का जोखिम" : "Caution: rain risk");
        String body = (hi ? trip + " · अगले 24 घंटे में जोखिम " : trip + " · risk " ) + score + "/100" + (hi ? "। ऐप खोलकर नया समय देखें।" : " in the next 24 h. Open the app for a safer time.");
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, id, open, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.icon).setContentTitle(title).setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH).setAutoCancel(true).setContentIntent(pi);
        try {
            NotificationManagerCompat.from(c).notify(id, b.build());
        } catch (SecurityException ignored) {
        }
    }
}
