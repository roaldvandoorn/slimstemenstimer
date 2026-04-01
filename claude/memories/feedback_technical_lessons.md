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

## Use AssemblyInformationalVersion for free-form version strings

`AssemblyVersion` must be numeric (`1.2.3.4`). When embedding a git tag like `v0.0.6` in the assembly, use `AssemblyInformationalVersionAttribute` instead — it accepts any string. Set it at CI publish time via `-p:InformationalVersion="${{ github.ref_name }}"`. In code, read it with `Assembly.GetExecutingAssembly().GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion`.

**Why:** Needed for Phase 4 `#18` — embedding the release tag as the runtime server version.

## Pillow ICO multi-size saving — use `sizes=` on the source image

`append_images` does not work for ICO format in Pillow. The correct API is to call `save()` on the **source image** with `sizes=[(16,16),(32,32),(48,48),(256,256)]` — Pillow downsamples from the source automatically:

```python
img.save('output.ico', format='ICO', sizes=[(16,16),(32,32),(48,48),(256,256)])
```

Verify with the raw ICO header (struct unpack), not `Image.seek()` — Pillow's seek on ICO always reports only the first frame even when all sizes are present.

**Why:** Hit during installer icon generation. `append_images` silently produced single-frame ICOs.

## Inno Setup — stop Windows service before install with PrepareToInstall

Use `PrepareToInstall` (not `CurStepChanged(ssInstall)`) to stop a service before files are extracted. This ensures the exe is not locked when the installer overwrites it. `sc stop` returns non-zero on first install (service not yet registered) — ignore the exit code:

```pascal
function PrepareToInstall(var NeedsRestart: Boolean): String;
var ResultCode: Integer;
begin
  Exec(ExpandConstant('{sys}\sc.exe'), 'stop MyServiceName', '',
       SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(2000);
  Result := '';
end;
```

`PrepareToInstall` runs before file extraction; `CurStepChanged(ssInstall)` runs after — too late to unlock the exe.

## sessionStorage vs localStorage for multi-tab player identity

Use `sessionStorage` (not `localStorage`) to store the player's identity (`playerId`, `playerName`) in the browser. `localStorage` is shared across all tabs from the same origin — if two people open the player page in different tabs on the same computer, they both read/write the same identity and the second player "takes over" the first.

`sessionStorage` is isolated per tab, so each browser tab gets its own independent identity.

**Why:** Play-test bug — multiple players on the same computer all became the same active player after page refresh. Switching `localStorage` to `sessionStorage` in `player.js` fixed it.

**How to apply:** Any browser-side identity that must be per-tab should use `sessionStorage`. Identity that should survive intentional page navigation (back button, typed URL) should use `localStorage`.

## TurnAdvanced must carry questionIndex to prevent role-flash

When `TurnAdvanced` fires at the end of the last Round369 question, the client updates roles based on the new CandidateId/QuizmasterId. If `QuestionAdvanced` hasn't fired yet, `questionIndex` still shows 15 (not 16), so `deriveRole` computes "quizmaster" and briefly re-enables the quizmaster buttons for one event cycle.

Fix: add `questionIndex` as a 3rd arg to `TurnAdvanced` and apply it before calling `deriveRole`/`highlightRoles`. This makes both events carry a complete atomic snapshot.

**Why:** End-of-round timing bug — buttons briefly lit up after Round369 completed. Seen in play-testing.

**How to apply:** When a SignalR event might race with another that changes a derived value, carry the full relevant state as args rather than letting the client reconstruct it from separate events.

## dotnet publish --no-restore fails after adding new packages

`dotnet publish -c Release --no-restore` will fail with a missing method/type error if a new NuGet package was added but not yet restored. Always run `dotnet restore` first, or omit `--no-restore`. This was hit when adding `Microsoft.Extensions.Hosting.WindowsServices`.

**Why:** Phase 4 build failure that was initially confusing because the error message pointed at `UseWindowsService()`, not at a missing package.
