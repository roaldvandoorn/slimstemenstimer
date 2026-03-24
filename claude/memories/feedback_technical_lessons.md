---
name: Technical lessons and non-obvious implementation facts
description: Bugs found and fixed, platform quirks, and implementation details not obvious from reading the code
type: feedback
---

These are facts learned during implementation that are not obvious from reading the source files.

## Delphi / Android threading

`TThread.Synchronize(nil, ...)` from a `TTask.Run` pool thread is silently unreliable on Android — the callback may never fire because `nil` does not resolve to a real thread object. Always use `TThread.CreateAnonymousThread` + `T.FreeOnTerminate := True; T.Start`, and call `TThread.Synchronize(TThread.CurrentThread, ...)` from inside the anonymous thread.

**Why:** D5 bug — join dialog appeared to succeed but UI never updated. Switching from TTask to TThread.CreateAnonymousThread fixed it.

## ZXing camera lifecycle

Do NOT call `TCameraComponent.Active := False` inside `DoFormClose`. Deactivating the camera inside the close handler hangs the ZXing camera component, freezing the app. Setting `caFree` in `Action` is sufficient; the camera shuts down automatically on destruction.

**Why:** D4 bug — ZXing form hung on close.

## ScannerFrm.fmx stub is mandatory

`{$R *.fmx}` in `ScannerFrm.pas` causes `EResNotFound` at runtime if no `.fmx` file exists alongside it, even if the form is built entirely in code. A minimal stub file is required.

**Why:** D4 bug — runtime crash. The stub `src/ScannerFrm.fmx` is intentionally minimal (empty form).

## ZXing callback type — use named type, not TProc<string>

Declare the scan result callback as a named `reference to procedure` type (`TOnResultProc = reference to procedure(const AUrl: string)`) rather than `TProc<string>`. Using `TProc<string>` directly in a method parameter triggers Delphi compiler overload resolution issues.

**Why:** D4 compiler error that was difficult to diagnose.

## Android HTTP blocked by default

Android 9+ blocks plain HTTP cleartext traffic. The LAN server runs on HTTP (not HTTPS). Fix: add `res/network_security_config.xml` with `<base-config cleartextTrafficPermitted="true">` and reference it via `android:networkSecurityConfig="@xml/network_security_config"` in `<application>` element of `AndroidManifest.template.xml`.

Permissions (`INTERNET`, `ACCESS_NETWORK_STATE`) must be added via Delphi project options, not hardcoded in the manifest, because the manifest uses `<%uses-permission%>` placeholder injection.

## VPN interferes with LAN IP selection

If the server machine has an active VPN, `IpAddressHelper` may select the VPN interface (10.x.x.x) instead of the LAN interface (192.168.x.x). The QR code then encodes an unreachable address. Fix already applied: `IpAddressHelper` now prefers `192.168.x.x > 172.16.x.x > 10.x.x.x`. The VPN issue will not recur in code, but if QR codes are still unreachable, check that no new VPN adapters have been added to the server machine.

## SignalR GameEnded — don't rely on event alone

The scoreboard's "End Spel" button calls `DELETE /api/sessions/{id}` directly and then calls `showGameEnded()` on the successful HTTP response. Do not rely solely on the `GameEnded` SignalR event for the originating tab — events can be dropped or delayed. Other tabs receive the event via SignalR as normal.

**Why:** F2 bug — button did nothing because it relied entirely on receiving its own broadcast.

## Server binds to 0.0.0.0:5000

`appsettings.json` has `"urls": "http://0.0.0.0:5000"`. The server listens on all interfaces; the LAN IP is resolved by `IpAddressHelper` at startup for logging and QR generation only.
