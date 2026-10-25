package com.pokermanager.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * Dedicated-device Home entry point. Keeping this separate from MainActivity prevents
 * Android 7 from treating the Capacitor activity as a launcher and ignoring its
 * landscape orientation request during boot.
 */
public class HomeActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        finish();
    }
}
