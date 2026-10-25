package com.pokermanager.app;

import android.app.ActivityManager;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final long EXIT_CONFIRMATION_MILLIS = 2000;
    private static final long IMMERSIVE_RESTORE_DELAY_MILLIS = 300;
    private long lastBackPressedAt;
    private final Runnable restoreImmersiveMode = this::enterImmersiveMode;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HistoryFilesPlugin.class);
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setOnSystemUiVisibilityChangeListener(
            visibility -> {
                boolean statusBarVisible = (visibility & View.SYSTEM_UI_FLAG_FULLSCREEN) == 0;
                boolean navigationBarVisible = (visibility & View.SYSTEM_UI_FLAG_HIDE_NAVIGATION) == 0;
                if (statusBarVisible || navigationBarVisible) {
                    View decorView = getWindow().getDecorView();
                    decorView.removeCallbacks(restoreImmersiveMode);
                    decorView.postDelayed(restoreImmersiveMode, IMMERSIVE_RESTORE_DELAY_MILLIS);
                }
            }
        );
        enterImmersiveMode();
    }

    @Override
    public void onResume() {
        super.onResume();
        enterDedicatedDeviceMode();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enterImmersiveMode();
        }
    }

    @SuppressWarnings("deprecation")
    private void enterImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        );
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        WebView webView = bridge != null ? bridge.getWebView() : null;
        if (webView == null) {
            confirmExit();
            return;
        }

        webView.evaluateJavascript(
            "Boolean(window.__pokerManagerHandleBack && window.__pokerManagerHandleBack())",
            result -> {
                if (!"true".equals(result)) {
                    confirmExit();
                }
            }
        );
    }

    private void confirmExit() {
        long now = System.currentTimeMillis();
        if (now - lastBackPressedAt <= EXIT_CONFIRMATION_MILLIS) {
            leaveDedicatedDeviceMode();
            finish();
            return;
        }

        lastBackPressedAt = now;
        Toast.makeText(this, "Press back again to exit", Toast.LENGTH_SHORT).show();
    }

    private void enterDedicatedDeviceMode() {
        DevicePolicyManager policyManager =
            (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        if (policyManager == null || !policyManager.isDeviceOwnerApp(getPackageName())) {
            return;
        }

        ComponentName admin = new ComponentName(this, PokerDeviceAdminReceiver.class);
        ComponentName homeActivity = new ComponentName(this, HomeActivity.class);
        policyManager.setLockTaskPackages(admin, new String[] { getPackageName() });

        IntentFilter homeFilter = new IntentFilter(Intent.ACTION_MAIN);
        homeFilter.addCategory(Intent.CATEGORY_DEFAULT);
        homeFilter.addCategory(Intent.CATEGORY_HOME);
        policyManager.clearPackagePersistentPreferredActivities(admin, getPackageName());
        policyManager.addPersistentPreferredActivity(admin, homeFilter, homeActivity);

        ActivityManager activityManager =
            (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        if (activityManager != null
            && activityManager.getLockTaskModeState() == ActivityManager.LOCK_TASK_MODE_NONE) {
            startLockTask();
        }
    }

    private void leaveDedicatedDeviceMode() {
        DevicePolicyManager policyManager =
            (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        if (policyManager != null && policyManager.isDeviceOwnerApp(getPackageName())) {
            ComponentName admin = new ComponentName(this, PokerDeviceAdminReceiver.class);
            policyManager.clearPackagePersistentPreferredActivities(admin, getPackageName());
        }

        ActivityManager activityManager =
            (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        if (activityManager != null
            && activityManager.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE) {
            stopLockTask();
        }
    }
}
