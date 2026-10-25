package com.pokermanager.app;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "HistoryFiles")
public class HistoryFilesPlugin extends Plugin {
    @PluginMethod
    public void read(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        getActivity().runOnUiThread(() -> {
            try {
                android.app.ActivityManager manager = (android.app.ActivityManager) getActivity().getSystemService(android.content.Context.ACTIVITY_SERVICE);
                if (manager != null && manager.getLockTaskModeState() != android.app.ActivityManager.LOCK_TASK_MODE_NONE) getActivity().stopLockTask();
                startActivityForResult(call, intent, "readResult");
            } catch (Exception e) { call.reject("Cannot open document picker", e); }
        });
    }

    @ActivityCallback
    private void readResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { call.reject("Import cancelled"); return; }
        new Thread(() -> {
            try (java.io.InputStream input = getContext().getContentResolver().openInputStream(result.getData().getData());
                 java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream()) {
                if (input == null) throw new java.io.IOException("No input stream");
                byte[] buffer = new byte[8192]; int count;
                while ((count = input.read(buffer)) != -1) {
                    if (output.size() + count > 25 * 1024 * 1024) throw new java.io.IOException("Backup exceeds 25 MB import limit");
                    output.write(buffer, 0, count);
                }
                JSObject response = new JSObject(); response.put("data", output.toString("UTF-8")); call.resolve(response);
            } catch (Exception e) { call.reject("Cannot read backup", e); }
        }).start();
    }
    @PluginMethod
    public void save(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("name", "poker-history.json"));
        getActivity().runOnUiThread(() -> {
            try {
                Activity activity = getActivity();
                android.app.ActivityManager manager = (android.app.ActivityManager) activity.getSystemService(android.content.Context.ACTIVITY_SERVICE);
                if (manager != null && manager.getLockTaskModeState() != android.app.ActivityManager.LOCK_TASK_MODE_NONE) activity.stopLockTask();
                startActivityForResult(call, intent, "saved");
            } catch (Exception e) { call.reject("Cannot open Android document picker", e); }
        });
    }

    @ActivityCallback
    private void saved(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("Export cancelled"); return;
        }
        new Thread(() -> {
            try (OutputStream output = getContext().getContentResolver().openOutputStream(result.getData().getData(), "wt")) {
                if (output == null) throw new java.io.IOException("No output stream");
                output.write(call.getString("data", "").getBytes(StandardCharsets.UTF_8));
                output.flush(); call.resolve();
            } catch (Exception e) { call.reject("Could not write backup", e); }
        }).start();
    }
}
