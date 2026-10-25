# Poker Manager Tablet

Tablet-focused fork of [darronmoraes/poker-manager](https://github.com/darronmoraes/poker-manager),
maintained at [itsmearmstrong/poker-manager-tablet](https://github.com/itsmearmstrong/poker-manager-tablet).
The original Git history and authorship are retained. This repository contains the shared
React/Vite frontend, Capacitor Android container, tablet UI changes, and local player statistics.

Install the locked dependencies with `npm ci`; the existing web and Android commands are below.
Device sessions, player exports, signing keys, dependencies, caches, and build outputs are not
part of the repository. Changes in this fork should be pushed to `origin`; `upstream` refers
to the original project.

## Original project template notes

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Android (Capacitor)

The Android app packages the same Vite build used by the web app. Its application ID is
`com.pokermanager.app`, and its bundled web assets come from `dist`.

The Android container is tuned for the Lenovo TB-8304F1: landscape-only, immersive
full-screen, screen-awake while open, Android Back closes dialogs first, and two Back
presses are required to exit. The production build also targets its Chromium 63 WebView.

### Run web

```bash
npm run dev
```

### Build web

```bash
npm run build
```

### Sync Android

```bash
npx cap sync android
```

### Open Android Studio

```bash
npx cap open android
```

### After changing React code

```bash
npm run build
npx cap sync android
```

Or run both steps with `npm run mobile:build`.

### Build debug APK

Windows:

```bash
cd android
gradlew.bat assembleDebug
```

macOS/Linux:

```bash
cd android
./gradlew assembleDebug
```

The resulting debug APK is at `android/app/build/outputs/apk/debug/app-debug.apk`.

### Lifetime Player Stats

Open **Player Stats** from setup, Settings, or a player's management dialog. Saved
players now have permanent IDs. Selecting a saved profile reuses it; creating a new
profile never merges by name. The old roster is migrated once and retained. Existing
game participants are not guessed from names: use **Link** in Stats to choose their
profile. Renaming/reseating does not change identity.

Reliable history begins with hands started after this update. Earlier hands (including
an already-running hand at upgrade) lack verified pre-blind balances/adjustments and
are not imported. Results are saved immediately when all pots are awarded, not at End
Game. Only dealt-in players count. Poker profit is `ending chips − pre-blind starting
chips − external additions + external removals`; rebuys and manual corrections are
audited separately. Each hand retains its chip value/currency; currencies never merge.
There is no historical cash-out ledger, so lifetime funding totals are not invented.

The independent, version-1 IndexedDB archive stores records by game ID + hand number.
The existing localStorage game key now holds a backward-compatible version-2 envelope
with state, Undo checkpoints, and a pending archive outbox in one atomic write.
Transactions apply/replace/delete records before acknowledging the outbox. Reopening
replays pending work safely. Undo awards removes the contribution; re-awarding replaces
it; Undo Next Hand retains the completed result. New Game retains the archive.
Saving errors block play with a Retry button; history is never pruned to free space.

Only changed hands are written to IndexedDB; ordinary actions do not load the lifetime
archive. Stats scans records on demand and renders history progressively in groups of
25. Active-session history/Undo still grows with session length. Export/import buffers
JSON on demand; imports are capped at 25 MB for this 1 GB tablet.

**Export/Import Player History** uses Android's document picker (or browser file tools).
Backups contain profiles, sessions, hand records and adjustments. Validated imports merge
identical IDs once and reject conflicts atomically; they cannot inject records into the
active game. Imported profiles are recoverable if the app closes during import.
Keep backups off the tablet: uninstalling, clearing data, or device failure can erase
all local history. Different copies of a modified record require manual reconciliation;
import never silently picks a winner.

On the dedicated Lenovo, keep Android Developer options → **Don't keep activities**
disabled when using the document picker. Its Downloads directory must exist. Export
was verified on API 24; keep the resulting JSON somewhere other than this device.

Isolated regression harness: run `npx vite --port 5199 --strictPort`, then open
`http://localhost:5199/tests/lifetime.html` in a disposable browser profile. It writes
sample data only to that origin; never run it against the tablet's app storage.

### Dedicated tablet mode

The Android container includes a boot receiver and Device Owner support. On the dedicated
tablet, provision the installed app once with USB debugging enabled:

```bash
adb shell dpm set-device-owner com.pokermanager.app/.PokerDeviceAdminReceiver
```

After provisioning, launching Poker Manager makes it the dedicated Home app and starts
Android lock-task mode. Two Back presses stop lock-task mode, clear the dedicated Home
assignment, and exit. Reopening Poker Manager enables dedicated mode again.

The Lenovo TB-8304F1 firmware should also be locked to its landscape display rotation;
otherwise it can briefly retain portrait orientation when starting a Device Owner Home app:

```bash
adb shell settings put system accelerometer_rotation 0
adb shell settings put system user_rotation 1
```

The Lenovo tablet's bundled Google keyboard can be enabled without installing another APK:

```bash
adb shell pm enable --user 0 com.google.android.inputmethod.latin
adb shell ime enable com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME
adb shell ime set com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME
```
