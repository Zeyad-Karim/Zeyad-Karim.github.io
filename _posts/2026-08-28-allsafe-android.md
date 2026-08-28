---
layout: post
title: "Allsafe Android Lab: 11 Mobile Security Findings"
date: 2026-08-28
platform: "Android Security Lab"
difficulty: "Medium"
category: "Android"
featured: true
description: "A structured review of the Allsafe training APK, covering data exposure, client-side trust, exported components, WebView behavior, and TLS controls."
reading_time: "11 min"
tags: [android, mobile, jadx, frida, firebase, webview, client-side]
techniques: [static analysis, dynamic instrumentation, data exposure, component testing]
tools: [JADX, ADB, Frida, logcat]
disclaimer: "Performed against the Allsafe intentionally vulnerable Android application in a mobile penetration-testing lab. Credentials and challenge values are lab data; live backend identifiers are redacted."
toc_items:
  - id: "triage"
    label: "Triage and findings"
  - id: "data-exposure"
    label: "Data exposure"
  - id: "runtime-controls"
    label: "Runtime controls"
  - id: "components-webview"
    label: "Components and WebView"
  - id: "takeaways"
    label: "Takeaways"
---

<div class="info-box"><table><tr><td>Application</td><td>infosecadventures.allsafe</td></tr><tr><td>Scope</td><td>Allsafe mobile security lab</td></tr><tr><td>Method</td><td>JADX review, ADB, logcat, Frida</td></tr><tr><td>Result</td><td>Multiple client-side and component-level weaknesses</td></tr></table></div>

## Triage and findings {#triage}

Allsafe is designed to make common Android mistakes visible from both sides of the assessment. I used JADX to inspect the APK, then validated behaviors on the emulator with ADB, logcat, and Frida. The findings below preserve the order and evidence in the original lab notes.

| Finding | What the lab exposed | Primary evidence |
| --- | --- | --- |
| Insecure logging | Sensitive login data in log output | `logcat` |
| Hardcoded credentials | Credentials and a development value in resources/code | JADX |
| Firebase exposure | Unauthenticated data at the Firebase endpoint | `strings.xml`, HTTP response |
| Shared preferences | Credentials stored in app-readable preferences | preference file |
| SQL injection | Login query accepted a tautology | input validation |
| PIN bypass | PIN compared against a decoded constant | JADX |
| Root detection | RootBeer gate could be overridden at runtime | Frida |
| Secure flag bypass | Screenshot protection could be removed | Frida |
| Exported receiver | User-controlled notification and server values | ADB broadcast |
| Vulnerable WebView | JavaScript and `file://` content accepted | WebView behavior |
| Weak TLS/crypto controls | Pinning and crypto operations could be instrumented | Frida |

## Data exposure {#data-exposure}

### Insecure logging

The first check was the application's log output. After identifying the process ID, I watched the application while pressing the login-request button:

```bash
pidof -s infosecadventures.allsafe
logcat --pid <PID>
```

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/login-logcat.webp' | relative_url }}" alt="Allsafe logcat challenge showing application output" loading="lazy"><figcaption>Application behavior was observable through process-scoped logging.</figcaption></figure>

Sensitive values should not be written to production logs. Logs often outlive the screen that created them and may be readable by tooling, crash collection, or a compromised debugging channel.

### Hardcoded credentials

Searching the login flow in JADX revealed a username and password embedded in the application, plus a second development credential in `res/values/strings.xml`:

```text
username: superadmin
password: supersecurepassword
```

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/jadx-hardcoded-credentials.webp' | relative_url }}" alt="JADX showing hardcoded Allsafe credentials" loading="lazy"><figcaption>Static analysis exposed values that should have been server-side secrets.</figcaption></figure>

### Firebase database exposure

The Firebase reference was also discoverable from the application resources. Appending `/.json` to the lab endpoint returned the database contents without an authenticated session:

```text
https://<redacted-lab-project>.firebaseio.com/.json
```

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/firebase-resources-redacted.jpg' | relative_url }}" alt="Redacted Firebase resource configuration from the Allsafe lab" loading="lazy"><figcaption>Configuration and backend references in the APK led to an exposed lab database. Project identifiers and keys are redacted.</figcaption></figure>

<div class="callout finding"><span class="callout-label">finding</span><p>Client-side discovery is enough to find a backend, but authorization must still be enforced by the backend. Hiding a URL in an APK is not access control.</p></div>

### Insecure shared preferences

After entering the lab credentials, I inspected the app's shared-preferences file and found the values stored locally:

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/shared-preferences.webp' | relative_url }}" alt="Allsafe shared preferences containing exposed values" loading="lazy"><figcaption>Local storage revealed application values in a readable preference file.</figcaption></figure>

### SQL injection

The login challenge accepted a simple tautology in the input field:

```text
a' or 1=1 --
```

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/sql-injection.webp' | relative_url }}" alt="Allsafe SQL injection challenge screen" loading="lazy"><figcaption>The lab confirmed that input reached a SQL query without safe parameterization.</figcaption></figure>

## Runtime controls {#runtime-controls}

### PIN bypass

JADX led to the `checkPIN` method. The comparison used the Base64-decoded value of `NDg2Mw==`, which is `4863`:

```java
// Lab observation: the expected value was derived from a constant.
String expected = new String(Base64.decode("NDg2Mw==", Base64.DEFAULT));
return enteredPin.equals(expected);
```

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/pin-check.webp' | relative_url }}" alt="JADX code for the Allsafe PIN check" loading="lazy"><figcaption>The PIN gate was implemented entirely in the client.</figcaption></figure>

### Root detection

The app used RootBeer. The source method combined checks for management apps, dangerous binaries, system properties, writable paths, test keys, and Magisk:

```java
public boolean isRooted() {
    return detectRootManagementApps()
        || detectPotentiallyDangerousApps()
        || checkForBinary(Const.BINARY_SU)
        || checkForDangerousProps()
        || checkForRWPaths()
        || detectTestKeys()
        || checkSuExists()
        || checkForRootNative()
        || checkForMagiskBinary();
}
```

The lab solution used Frida to return `false` from the method. This is a useful demonstration of why a client-side “rooted/not rooted” boolean cannot be treated as a security boundary.

```javascript
Java.perform(function () {
  var RootBeer = Java.use("com.scottyab.rootbeer.RootBeer");
  RootBeer.isRooted.implementation = function () { return false; };
});
```

### Secure flag bypass

The same runtime approach was used to remove `FLAG_SECURE` from window flags. The evidence shows the Frida script clearing the bit before calling the original method. That bypass allowed screenshots in the training application, but it also illustrates the limitation of relying on UI flags to protect sensitive data.

## Components and WebView {#components-webview}

### Exported broadcast receiver

Reviewing the manifest and receiver code showed that `NoteReceiver` was exported. It accepted `server`, `note`, and `notification_message` extras, then used those values to build a request and notification.

The component could be invoked directly from ADB:

```bash
adb shell am broadcast \
  -a "infosecadventures.allsafe.action.PROCESS_NOTE" \
  --es server '192.168.1.10' \
  --es note 'Hello,World' \
  --es notification_message 'Compromised' \
  -n infosecadventures.allsafe/.challenges.NoteReceiver
```

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/note-receiver.webp' | relative_url }}" alt="Allsafe notification created through the exported receiver" loading="lazy"><figcaption>Explicit component invocation gave control over values shown in the notification.</figcaption></figure>

### Vulnerable WebView

The note-processing flow also accepted HTML/JavaScript content. The lab demonstrated a script payload and access to a local file URL:

```html
<script>alert("You Have Been Hacked")</script>
file:///etc/hosts
```

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/webview-xss.webp' | relative_url }}" alt="Allsafe WebView XSS challenge" loading="lazy"><figcaption>Untrusted note content reached a WebView with dangerous behavior enabled.</figcaption></figure>

### Certificate pinning and weak cryptography

The final exercises focused on controls that are often added after the core feature is built. The lab notes use a Frida SSL-pinning bypass and an interception script for Android crypto operations:

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/ssl-pinning.webp' | relative_url }}" alt="Allsafe certificate pinning bypass challenge" loading="lazy"><figcaption>Pinning was treated as a runtime behavior to inspect, not a substitute for sound trust decisions.</figcaption></figure>

<figure class="evidence"><img src="{{ '/assets/writeups/allsafe-android/crypto-interception.webp' | relative_url }}" alt="Allsafe crypto interception evidence" loading="lazy"><figcaption>Dynamic instrumentation can reveal how an application actually handles cryptographic operations.</figcaption></figure>

## Takeaways {#takeaways}

- Secrets in an APK, resources file, logs, or preferences should be considered recoverable.
- Exported components need explicit authorization and strict input validation.
- A client-side gate can improve UX, but it cannot protect a server-side action by itself.
- WebViews deserve a dedicated threat model: content origin, JavaScript, file access, and bridge exposure all matter.
- Static analysis finds the suspicious code; dynamic instrumentation verifies the runtime behavior.
