---
layout: post
title: "Allsafe: A Practical Android Application Security Assessment"
date: 2026-08-28
permalink: /writeups/allsafe-android/
platform: "Android Security Lab"
difficulty: "Medium"
category: "Android"
featured: true
description: "A hands-on assessment of the intentionally vulnerable Allsafe APK, moving from static analysis and local data exposure to component abuse, WebView attacks, TLS interception, and runtime instrumentation."
image: "/assets/writeups/allsafe-android/allsafe-logo.jpg"
reading_time: "24 min"
tags: [android, mobile, jadx, adb, frida, firebase, webview, rootbeer]
techniques: [static analysis, dynamic instrumentation, local storage review, IPC testing, traffic interception]
tools: [JADX, ADB, logcat, Frida, Burp Suite]
disclaimer: "This assessment was performed against the intentionally vulnerable Allsafe Android application in an authorized training environment. Credentials, endpoints, and challenge values shown in this article belong to the lab. Backend identifiers and active-looking configuration have been redacted."
toc_items:
  - id: "assessment-overview"
    label: "Assessment overview"
  - id: "findings-at-a-glance"
    label: "Findings at a glance"
  - id: "insecure-logging"
    label: "1. Insecure logging"
  - id: "hardcoded-credentials"
    label: "2. Hardcoded credentials"
  - id: "firebase-exposure"
    label: "3. Firebase exposure"
  - id: "shared-preferences"
    label: "4. SharedPreferences"
  - id: "sql-injection"
    label: "5. SQL injection"
  - id: "pin-bypass"
    label: "6. PIN bypass"
  - id: "root-detection"
    label: "7. Root detection"
  - id: "flag-secure"
    label: "8. FLAG_SECURE"
  - id: "broadcast-receiver"
    label: "9. Broadcast receiver"
  - id: "webview"
    label: "10. WebView attacks"
  - id: "certificate-pinning"
    label: "11. Certificate pinning"
  - id: "weak-cryptography"
    label: "12. Runtime crypto"
  - id: "conclusion"
    label: "Conclusion"
---

<figure class="evidence">
  <img src="{{ '/assets/writeups/allsafe-android/allsafe-logo.jpg' | relative_url }}" alt="Allsafe intentionally vulnerable Android application logo" width="1024" height="1024">
  <figcaption>Allsafe project logo. Source: <a href="https://github.com/t0thkr1s/allsafe-android">t0thkr1s/allsafe-android</a>.</figcaption>
</figure>

<div class="info-box"><table><tr><td>Application</td><td><code>infosecadventures.allsafe</code></td></tr><tr><td>Objective</td><td>Assess common Android security failures from discovery through validation</td></tr><tr><td>Approach</td><td>JADX review, ADB, logcat, Frida, and intercepted traffic</td></tr><tr><td>Assessment type</td><td>Hands-on Android penetration testing lab</td></tr></table></div>

## Assessment overview {#assessment-overview}

Allsafe is an intentionally vulnerable Android application built to make insecure design decisions visible. That makes it useful for more than collecting flags: each challenge can be treated like a small mobile assessment, with a hypothesis, a test, an observable result, and a remediation.

I worked through the application in roughly the same order I would use during a real review. I began with what the running app exposed without decompilation, moved into JADX and on-device storage, followed trust boundaries across Android components, and finished with Frida-assisted runtime testing. The goal was not just to make the challenge say “Done,” but to understand why the control failed.

### Methodology

My workflow combined four perspectives:

1. **Runtime observation:** watch logs, application responses, notifications, and network behavior while exercising a feature.
2. **Static analysis:** search UI strings in JADX, trace them to handlers, inspect resources, and identify client-side decisions.
3. **Platform testing:** use ADB to inspect app-private lab data and invoke an exported component directly.
4. **Dynamic instrumentation:** hook selected Java methods with Frida to test whether client-side controls survive runtime modification.

During the lab, I focused on the techniques I actually used. Where the application suggested an alternative approach, such as brute-forcing the PIN or patching the APK, I identified it separately instead of presenting it as a path I performed.

<div class="callout finding"><span class="callout-label">TL;DR</span><p>The recurring weakness was misplaced trust in the client. Values embedded in the APK were recoverable, local controls were mutable, an exported receiver accepted untrusted input, and a WebView processed content with dangerous capabilities. Server-side authorization, strict component boundaries, safe query construction, and minimal client-side secrets would remove most of the practical risk.</p></div>

## Findings at a glance {#findings-at-a-glance}

| # | Finding | Validated result | Primary fix |
| --- | --- | --- | --- |
| 1 | Insecure logging | A submitted secret appeared in process-scoped logcat output | Never log secrets; strip or sanitize production logs |
| 2 | Hardcoded credentials | Static analysis recovered credentials and a development credential path | Keep authentication secrets server-side and rotate exposed values |
| 3 | Exposed Firebase database | The lab database returned data to an unauthenticated REST request | Enforce Firebase Authentication and least-privilege Security Rules |
| 4 | Insecure SharedPreferences | Credentials were stored as readable strings in `user.xml` | Avoid persisting passwords; protect only necessary tokens |
| 5 | SQL injection | A tautology bypassed the login and returned lab records | Use parameterized queries and server-side authorization |
| 6 | PIN bypass | A Base64 constant in `checkPin` disclosed the four-digit PIN | Do not enforce meaningful authorization with a client-only secret |
| 7 | Root detection bypass | Hooking `RootBeer.isRooted()` changed the security decision | Treat root detection as telemetry, not an authorization boundary |
| 8 | `FLAG_SECURE` bypass | Runtime instrumentation removed screenshot protection | Minimize sensitive display data and layer UI hardening with real access control |
| 9 | Exported receiver | An external broadcast controlled the server, note, and notification text | Make the receiver private or protect and validate every input |
| 10 | WebView XSS and file access | JavaScript executed and `file:///etc/hosts` loaded | Disable unnecessary JavaScript/file access and allowlist content |
| 11 | Certificate pinning bypass | A public Frida hook allowed the request to appear in the proxy | Use pinning as defense in depth and keep server controls authoritative |
| 12 | Runtime crypto exposure | A Frida hook observed key material and `AES/CBC/PKCS5Padding` metadata | Use Android Keystore and authenticated encryption; avoid client-held secrets |

## 1. Insecure logging {#insecure-logging}

I started with the challenge that required no decompilation. After opening the logging screen, I identified the Allsafe process and filtered logcat to that PID:

```bash
pidof -s infosecadventures.allsafe
logcat --pid <PID>
```

I then entered a test secret in the application. The value appeared in a line tagged `ALLSAFE`, confirming that user-controlled sensitive input was written directly to the Android logging buffer.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/logging-logcat-result.webp' | relative_url }}" alt="Process-scoped logcat output showing the Allsafe test secret" loading="lazy"><figcaption>The submitted lab value was printed in clear text to logcat.</figcaption></figure>

The important point is not that every ordinary application can read every other application's logs on a modern Android device. Access varies by Android version, device privileges, debugging state, preinstalled software, and collection tooling. The defect is that the secret reached a diagnostic channel at all. Logs may be captured during support sessions, forwarded to crash tooling, or exposed on a rooted or otherwise compromised device.

**Impact.** Credentials, tokens, personal information, or one-time values can outlive the UI interaction that produced them and become available to people or systems that were never intended to receive them.

**Remediation.** Remove secrets from log messages entirely, use different logging policies for debug and release builds, and automatically strip verbose calls where possible. Android's guidance on [log information disclosure](https://developer.android.com/privacy-and-security/risks/log-info-disclosure) recommends sanitizing non-debug logs and avoiding sensitive values rather than relying on masking a password after it has already entered the logging path.

## 2. Hardcoded credentials {#hardcoded-credentials}

The next challenge presented an **Initiate Login Request** button and returned the message `Under development!`. A visible string is a reliable starting point in JADX, so I searched for that message and followed the result into the click handler.

The surrounding data exposed a lab username/password pair:

```text
username: superadmin
password: supersecurepassword
```

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/hardcoded-soap-credentials.webp' | relative_url }}" alt="JADX data showing the embedded Allsafe lab username and password" loading="lazy"><figcaption>The first credential pair was recoverable directly from application data.</figcaption></figure>

The same handler also loaded a resource named `dev_env`. Following that reference into `resources.arsc/res/values/strings.xml` revealed a second development credential embedded in a URL. I have redacted the full development value and host because publishing an active-looking endpoint adds no technical value; the relevant point is that the credential and request configuration were packaged in the client.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/hardcoded-dev-resource-flow.webp' | relative_url }}" alt="JADX code loading the dev_env string resource for an HTTP request" loading="lazy"><figcaption>The request builder retrieved its development endpoint from a packaged string resource.</figcaption></figure>

Obfuscation would make the search slower, not solve the design problem. APK resources, DEX bytecode, native libraries, and runtime memory all live on a device the tester controls.

**Impact.** A reusable credential can grant every APK recipient the same authority. If development and production environments share secrets, the compromise can cross environment boundaries.

**Remediation.** Remove reusable authentication credentials from the client, rotate any exposed value, separate environments, and perform privileged authentication on a controlled backend. Device-bound cryptographic keys can be held in Android Keystore when the app genuinely needs a local key, but a global server password should not ship in the APK.

## 3. Exposed Firebase Realtime Database {#firebase-exposure}

I stayed in the resources because Firebase configuration is commonly packaged with the client. Searching `strings.xml` identified the Realtime Database URL. The project identifier and related configuration remain redacted in the public screenshot.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/firebase-config-redacted.webp' | relative_url }}" alt="Redacted Allsafe Firebase configuration in JADX resources" loading="lazy"><figcaption>The database reference was discoverable in the APK; project-specific values are opaque-redacted.</figcaption></figure>

For the lab, appending `/.json` and requesting the endpoint without an authenticated session returned the challenge data:

```text
https://<redacted-lab-project>.firebaseio.com/.json
```

Finding a Firebase URL in an APK is not itself a vulnerability. Mobile clients need configuration to reach their backend. The security failure was the unauthenticated read permitted by the database rules. Firebase's [Realtime Database REST documentation](https://firebase.google.com/docs/reference/rest/database) notes that an unauthenticated request succeeds only when the deployed rules allow it.

**Impact.** Permissive rules can expose an entire database tree and, where writes are also open, allow tampering or destructive changes.

**Remediation.** Require Firebase Authentication where appropriate, authorize reads and writes per user and path, validate the shape of incoming data, and test rules in the Local Emulator Suite before deployment. Firebase's [Security Rules documentation](https://firebase.google.com/docs/database/security) makes the trust model clear: access decisions belong in server-enforced rules, not in hidden client configuration.

## 4. Insecure SharedPreferences {#shared-preferences}

I entered the lab username and password twice and used the application's **Store Credentials** action. On the rooted emulator used for the exercise, I navigated into the application sandbox and inspected its preference files:

```bash
cd /data/data/infosecadventures.allsafe/
cd shared_prefs/
ls
cat user.xml
```

The `user.xml` file contained both values as clear-text strings.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/shared-preferences-user-xml.webp' | relative_url }}" alt="Allsafe user.xml SharedPreferences file containing lab username and password values" loading="lazy"><figcaption>The lab credentials were persisted as readable XML values in the app's private data directory.</figcaption></figure>

The application sandbox still provides meaningful protection against ordinary apps on a stock device. The weakness is storing a password that the app did not need to retain, then assuming the sandbox makes the value permanently secret. Backups, debugging, malware with elevated access, device compromise, or a second flaw in the same app can expose it.

**Impact.** Recovering a reusable password may compromise more than the local session, especially where users reuse credentials.

**Remediation.** Do not persist a user's password. Store a narrowly scoped, revocable session token only when the product requires it; bind sensitive keys to Android Keystore and apply appropriate user-authentication requirements. `SharedPreferences` is a key-value store, not a password vault. Android now recommends [DataStore instead of SharedPreferences](https://developer.android.com/training/data-storage/shared-preferences) for new settings data, but changing the API alone does not make a retained password safe.

## 5. SQL injection {#sql-injection}

The login form accepted a username and password. Rather than reverse engineer first, I tested whether the username was concatenated into a SQL statement. I supplied a tautology followed by a comment marker and used an arbitrary password:

```text
Username: a' or 1=1 --
Password: asd
```

The quote closed the original string, `OR 1=1` made the predicate true, and `--` commented out the rest of the intended comparison. The application returned multiple lab records, confirming that the payload changed query structure rather than being treated as data.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/sql-injection-returned-records.webp' | relative_url }}" alt="Allsafe SQL injection result displaying returned lab user records" loading="lazy"><figcaption>The tautology bypass returned the challenge's test records.</figcaption></figure>

**Impact.** In this challenge the immediate result was an authentication bypass and disclosure of lab records. In a real application, the consequence depends on database permissions and reachable queries, but can include unauthorized reads, writes, or deletion.

**Remediation.** Bind untrusted values as parameters rather than concatenating them into SQL, minimize the database privileges available to the query, and enforce authorization independently of a successful lookup. Android's [SQL injection guidance](https://developer.android.com/privacy-and-security/risks/sql-injection) demonstrates replaceable `?` parameters and separate selection arguments so input cannot become SQL syntax.

## 6. Client-side PIN bypass {#pin-bypass}

The PIN screen rejected a random value with `Incorrect PIN, try harder!`. I searched that exact failure string in JADX and followed it to `checkPin`. The method decoded a Base64 constant and compared the result directly with the entered value:

```java
private final boolean checkPin(String pin) {
    byte[] decoded = Base64.decode("NDg2Mw==", 0);
    return Intrinsics.areEqual(pin, new String(decoded, Charsets.UTF_8));
}
```

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/pin-check-base64-comparison.webp' | relative_url }}" alt="Decompiled Allsafe checkPin method comparing input with a Base64-decoded constant" loading="lazy"><figcaption>The authorization decision and its secret were both present in the client.</figcaption></figure>

Decoding `NDg2Mw==` gives `4863`. Entering `4863` satisfied the PIN check and triggered the success message.

```bash
printf 'NDg2Mw==' | base64 --decode
# 4863
```

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/pin-bypass-success.webp' | relative_url }}" alt="Allsafe message confirming access after recovering the client-side PIN" loading="lazy"><figcaption>Static recovery of the encoded constant was enough to satisfy the PIN gate.</figcaption></figure>

The challenge also suggested brute force or overriding the method with Frida. I did not need either path: static inspection recovered the value directly, so I am not presenting those alternatives as tested results.

**Impact.** Any user who can obtain the APK can recover or modify a client-only PIN check. Base64 changes representation; it provides no secrecy.

**Remediation.** Do not let a local PIN grant server-side privilege by itself. Verify sensitive actions on the backend against an authenticated session, rate-limit attempts where a server verifies a PIN, and store only non-reversible verifiers when an offline local check is truly required.

## 7. RootBeer detection bypass {#root-detection}

The root-detection challenge blocked progress on the rooted test device. Searching the failure message led to a call to `com.scottyab.rootbeer.RootBeer.isRooted()`. The library combined checks for root-management apps, dangerous binaries and properties, writable paths, test keys, `su`, native indicators, and Magisk.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/rootbeer-gate-decompiled.webp' | relative_url }}" alt="Decompiled Allsafe root-detection branch calling RootBeer isRooted" loading="lazy"><figcaption>The challenge reduced many environmental checks to one client-side Boolean decision.</figcaption></figure>

Because the caller trusted that single return value, I hooked it with Frida:

```javascript
Java.perform(function () {
  var RootBeer = Java.use("com.scottyab.rootbeer.RootBeer");

  RootBeer.isRooted.implementation = function () {
    return false;
  };
});
```

I launched the app with the local script attached:

```bash
frida -U -l hook.js -f infosecadventures.allsafe
```

The next check reached the non-rooted success path.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/rootbeer-bypass-success.webp' | relative_url }}" alt="Allsafe root-detection challenge showing root was not detected after the Frida hook" loading="lazy"><figcaption>Replacing the runtime method implementation changed the application's security decision.</figcaption></figure>

**Impact.** Root detection can raise the cost of analysis and inform risk decisions, but a tester who controls the process can patch call sites, hook library methods, or alter the environment. Treating the result as proof that the device is trustworthy creates a bypassable authorization gate.

**Remediation.** Keep root signals as one input to a proportionate risk model. Enforce high-value authorization and fraud controls server-side, bind requests to short-lived sessions, and use integrity signals with replay resistance where the threat model justifies them. Obfuscation and multiple checks can add friction, but cannot turn the client into a trusted authority.

## 8. `FLAG_SECURE` bypass {#flag-secure}

Android's `FLAG_SECURE` asks the platform to keep a window out of screenshots and non-secure displays. The Allsafe screen deliberately invited me to bypass that behavior as a Frida exercise and explicitly stated that the exercise was not a standalone vulnerability.

I used the public **screenshot-protection** CodeShare project by [`@eiliyakeshtkar0`](https://codeshare.frida.re/@eiliyakeshtkar0/screenshot-protection/) as the source for the hook. It intercepted `Window.setFlags`, cleared bit `0x2000` from both arguments, and passed the modified values back to `setFlags`:

```javascript
Java.perform(function () {
  var Window = Java.use("android.view.Window");

  Window.setFlags.implementation = function (flags, mask) {
    var FLAG_SECURE = 0x2000;
    flags = flags & ~FLAG_SECURE;
    mask = mask & ~FLAG_SECURE;
    console.log("Bypassed FLAG_SECURE");
    return this.setFlags(flags, mask);
  };
});
```

The terminal output confirmed that the hook intercepted the calls after the application started.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/flag-secure-frida-output.webp' | relative_url }}" alt="Frida output reporting that FLAG_SECURE was bypassed in Allsafe" loading="lazy"><figcaption>The runtime hook observed and modified calls that applied screenshot protection.</figcaption></figure>

The resulting screenshot captured the protected challenge screen.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/flag-secure-captured-screen.webp' | relative_url }}" alt="Allsafe secure-window challenge visible in a screenshot after instrumentation" loading="lazy"><figcaption>The protected lab screen became capturable after the flag was removed.</figcaption></figure>

**Impact.** The platform flag is useful privacy hardening against casual screenshots and screen sharing, but it does not protect data from a user who controls a rooted or instrumented process.

**Remediation.** Continue using `FLAG_SECURE` for screens where accidental capture matters; Android documents its intended behavior in [`WindowManager.LayoutParams`](https://developer.android.com/reference/android/view/WindowManager.LayoutParams). Also minimize secrets displayed on-screen, expire sensitive views, and keep authorization independent of display controls.

## 9. Exported broadcast receiver {#broadcast-receiver}

The note challenge crossed an Android component boundary, so I began with `AndroidManifest.xml`. `NoteReceiver` was explicitly exported and registered for `infosecadventures.allsafe.action.PROCESS_NOTE`.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/exported-receiver-manifest.webp' | relative_url }}" alt="Android manifest declaring the Allsafe NoteReceiver as exported" loading="lazy"><figcaption>The manifest allowed applications outside Allsafe to invoke the receiver.</figcaption></figure>

The receiver read three string extras: `server`, `note`, and `notification_message`. It used the first two to build an HTTP URL and placed the third into a notification. No caller authorization or strict destination allowlist was visible in that flow.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/exported-receiver-data-flow.webp' | relative_url }}" alt="Decompiled NoteReceiver using intent extras in an HTTP URL and notification" loading="lazy"><figcaption>Externally supplied extras reached both a network destination and a user-visible notification.</figcaption></figure>

I invoked the component directly with ADB:

```bash
adb shell am broadcast \
  -a "infosecadventures.allsafe.action.PROCESS_NOTE" \
  --es server '192.168.1.10' \
  --es note 'Hello,World' \
  --es notification_message 'Compromised' \
  -n infosecadventures.allsafe/.challenges.NoteReceiver
```

The application displayed a notification containing my supplied text, demonstrating that the external broadcast controlled the receiver's inputs.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/exported-receiver-notification.webp' | relative_url }}" alt="Allsafe notification displaying attacker-supplied Compromised text" loading="lazy"><figcaption>The explicit broadcast produced a notification with caller-controlled content.</figcaption></figure>

The network path also deserves attention: allowing an external caller to choose `server` can turn the application into a confused deputy that makes requests using its own network permissions and execution context. My test confirmed control over the three extras and the resulting notification; it did not establish access to an otherwise unreachable production service.

**Impact.** Depending on the receiver's privileges and reachable network, abuse could create misleading notifications, disclose note content to an attacker-selected host, or trigger unintended application behavior.

**Remediation.** Set `android:exported="false"` when the receiver is internal. If external access is intentional, require a signature-level permission, verify caller expectations where possible, constrain destinations to an allowlist, validate every extra, and use HTTPS. Android's [insecure broadcast receiver guidance](https://developer.android.com/privacy-and-security/risks/insecure-broadcast-receiver) recommends making internal receivers private and adding access control to deliberately exported ones.

## 10. WebView XSS and local file access {#webview}

The WebView challenge had two objectives: execute JavaScript and load a local file. I treated them separately because they expose different capabilities, even though their combination is what makes an unsafe WebView especially dangerous.

### JavaScript execution

I entered a simple script payload:

```html
<script>alert("You Have Been Hacked")</script>
```

The WebView rendered the string as active content and displayed the JavaScript alert.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/webview-xss-alert.webp' | relative_url }}" alt="Allsafe WebView displaying a JavaScript alert from the injected payload" loading="lazy"><figcaption>Untrusted input reached an execution-capable WebView context.</figcaption></figure>

### `file://` access

For the second task, I entered a local file URL:

```text
file:///etc/hosts
```

The contents of the device's hosts file appeared inside the WebView.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/webview-file-access-hosts.webp' | relative_url }}" alt="Allsafe WebView rendering the device hosts file through a file URL" loading="lazy"><figcaption>The WebView accepted the file scheme and rendered local file content.</figcaption></figure>

**Impact.** Script execution can alter rendered content, steal data available to the page, or interact with exposed native bridges. Broad file access can disclose files readable by the app. The actual reach depends on WebView settings, Android version, content origin, and any JavaScript interfaces.

**Remediation.** Do not place untrusted strings into `loadData`/`loadDataWithBaseURL` as executable HTML. Disable JavaScript unless the feature requires it, reject non-allowlisted schemes and origins, set file/content access to false when unused, and prefer `WebViewAssetLoader` for packaged content. Android's [unsafe WebView file inclusion guidance](https://developer.android.com/privacy-and-security/risks/webview-unsafe-file-inclusion) specifically recommends disabling file access APIs and preventing untrusted JavaScript execution.

## 11. Certificate pinning bypass {#certificate-pinning}

The pinning challenge required the HTTPS request to become visible to an intercepting proxy. I used the public **Universal Android SSL Pinning Bypass with Frida** project by [`@pcipolloni`](https://codeshare.frida.re/@pcipolloni/universal-android-ssl-pinning-bypass-with-frida/).

A CodeShare invocation for this package is:

```bash
frida -U \
  --codeshare pcipolloni/universal-android-ssl-pinning-bypass-with-frida \
  -f infosecadventures.allsafe
```

After attaching the hook and sending the challenge request, the proxy captured an HTTPS request to the lab's `httpbin.org` target.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/certificate-pinning-proxy-intercept.webp' | relative_url }}" alt="Intercepting proxy showing the Allsafe HTTPS request after the pinning bypass" loading="lazy"><figcaption>The proxy captured the request after I applied the runtime pinning bypass.</figcaption></figure>

This result does not mean certificate pinning is useless. Pinning can protect against a compromised or mistakenly trusted CA and can raise the cost of interception. It does mean that pinning code inside an attacker-controlled client is bypassable through hooking or patching. OWASP's [pinning guidance](https://mas.owasp.org/MASTG/knowledge/android/MASVS-NETWORK/MASTG-KNOW-0015/) likewise treats it as hardening rather than an unbreakable boundary.

**Impact.** On a controlled device, bypassing pin validation lets a tester observe and potentially modify requests that the app expected to protect from interception. The server must still reject unauthorized or tampered operations on their own merits.

**Remediation.** Maintain normal TLS validation correctly, use Android Network Security Configuration or a well-maintained library when pinning fits the threat model, plan safe pin rotation, and keep authentication, authorization, integrity validation, and replay defenses on the server. Never send a secret merely because the client uses pinning.

## 12. Weak cryptography and runtime instrumentation {#weak-cryptography}

The final challenge asked me to observe cryptographic operations rather than only reading decompiled code. I used the public **Intercept Android APK Crypto Operations** CodeShare project by [`@fadeevab`](https://codeshare.frida.re/@fadeevab/intercept-android-apk-crypto-operations/), which hooks Java cryptography APIs and prints operation details.

The corresponding CodeShare invocation is:

```bash
frida -U \
  --codeshare fadeevab/intercept-android-apk-crypto-operations \
  -f infosecadventures.allsafe
```

The Frida output exposed the key material and the `AES/CBC/PKCS5Padding` transformation while the application was running.

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/crypto-frida-key-cipher.webp' | relative_url }}" alt="Frida crypto hook output showing Allsafe key material and AES CBC PKCS5Padding metadata" loading="lazy"><figcaption>Runtime instrumentation observed the application's key material and cipher configuration.</figcaption></figure>

This evidence shows runtime exposure; it does not prove that AES itself was broken. Cryptography must eventually process plaintext and key handles somewhere. The security question is whether a reusable raw key is hardcoded or exportable, whether IVs are generated safely, whether integrity is authenticated, and whether compromise of one device exposes other users or environments.

The observed CBC transformation also needs an independent integrity mechanism to detect modification. Where protocol compatibility permits, an authenticated-encryption mode such as AES-GCM is easier to use safely.

**Impact.** An analyst controlling the application process can inspect parameters and data around cryptographic API calls. If the same raw key is embedded across installations, recovering it from one client may compromise every ciphertext protected by that key.

**Remediation.** Generate per-installation keys with a cryptographically secure generator, keep non-exportable key material in [Android Keystore](https://developer.android.com/privacy-and-security/keystore), prefer authenticated encryption, use unique nonces/IVs as required by the selected mode, and keep server-wide secrets off the client. Android's [cryptography guidance](https://developer.android.com/privacy-and-security/cryptography) provides current algorithm and key-storage recommendations.

## Conclusion {#conclusion}

The strongest pattern across Allsafe was not one API or one payload. It was the repeated assumption that code executing on the user's device could keep a secret or make an unchangeable trust decision.

Static analysis recovered values from code and resources. Local inspection exposed retained credentials. A SQL payload changed query logic. Frida replaced root and window-flag decisions at runtime. An exported receiver accepted instructions from outside the app. A WebView turned input into script and local-file access. Pinning and cryptography both became observable once the process was instrumented.

The defensive lesson is equally consistent:

- Keep authoritative authentication and authorization on systems the attacker does not control.
- Store less sensitive data, for less time, and never persist reusable passwords without a compelling design requirement.
- Treat Android components and WebViews as trust boundaries with explicit allowlists and least privilege.
- Use platform cryptography and key storage correctly, while assuming the client process can still be inspected.
- Use root detection, pinning, obfuscation, and screenshot restrictions as layered hardening—not as replacements for server-side security.

### Future testing {#future-testing}

If I extend this assessment, I would enumerate the remaining exported components, trace the WebView configuration and SQL construction more deeply, test Firebase read and write rules without altering real data, and compare additional static findings with their runtime behavior. I would also identify the precise pinning and cryptographic call sites before applying generic hooks so each bypass targets the application's actual implementation.
