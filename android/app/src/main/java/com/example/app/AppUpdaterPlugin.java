package com.example.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    @PluginMethod
    public void getVersion(PluginCall call) {
        try {
            long versionCode;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                versionCode = getContext()
                        .getPackageManager()
                        .getPackageInfo(
                                getContext().getPackageName(),
                                0
                        )
                        .getLongVersionCode();
            } else {
                versionCode = getContext()
                        .getPackageManager()
                        .getPackageInfo(
                                getContext().getPackageName(),
                                0
                        )
                        .versionCode;
            }

            String versionName = getContext()
                    .getPackageManager()
                    .getPackageInfo(
                            getContext().getPackageName(),
                            0
                    )
                    .versionName;

            JSObject result = new JSObject();

            result.put("versionCode", versionCode);
            result.put("versionName", versionName);

            call.resolve(result);

        } catch (Exception e) {
            call.reject(
                    "Unable to get app version: " + e.getMessage()
            );
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {

        String downloadUrl = call.getString("url");

        if (downloadUrl == null || downloadUrl.isEmpty()) {
            call.reject("Download URL is missing");
            return;
        }

        new Thread(() -> {

            HttpURLConnection connection = null;

            try {

                URL url = new URL(downloadUrl);

                connection = (HttpURLConnection) url.openConnection();

                connection.setInstanceFollowRedirects(true);
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(60000);

                connection.connect();

                int responseCode = connection.getResponseCode();

                if (responseCode != HttpURLConnection.HTTP_OK) {
                    call.reject(
                            "APK download failed: HTTP " + responseCode
                    );
                    return;
                }

                File apkFile = new File(
                        getContext().getCacheDir(),
                        "SiteManagement-update.apk"
                );

                try (
                        InputStream input =
                                connection.getInputStream();

                        FileOutputStream output =
                                new FileOutputStream(apkFile)
                ) {

                    byte[] buffer = new byte[8192];
                    int length;

                    while ((length = input.read(buffer)) != -1) {
                        output.write(buffer, 0, length);
                    }
                }

                Uri apkUri = FileProvider.getUriForFile(
                        getContext(),
                        getContext().getPackageName()
                                + ".fileprovider",
                        apkFile
                );

                // Android 8+
                if (
                        Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                                &&
                        !getContext()
                                .getPackageManager()
                                .canRequestPackageInstalls()
                ) {

                    Intent settingsIntent = new Intent(
                            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse(
                                    "package:"
                                            + getContext().getPackageName()
                            )
                    );

                    settingsIntent.addFlags(
                            Intent.FLAG_ACTIVITY_NEW_TASK
                    );

                    getContext().startActivity(settingsIntent);

                    call.reject(
                            "Please allow this app to install unknown apps, "
                                    + "then tap Update Now again."
                    );

                    return;
                }

                Intent installIntent = new Intent(
                        Intent.ACTION_VIEW
                );

                installIntent.setDataAndType(
                        apkUri,
                        "application/vnd.android.package-archive"
                );

                installIntent.addFlags(
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                );

                installIntent.addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK
                );

                getContext().startActivity(installIntent);

                call.resolve();

            } catch (Exception e) {

                call.reject(
                        "Update failed: " + e.getMessage()
                );

            } finally {

                if (connection != null) {
                    connection.disconnect();
                }
            }

        }).start();
    }
}