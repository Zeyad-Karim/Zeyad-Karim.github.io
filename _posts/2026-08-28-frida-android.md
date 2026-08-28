---
layout: post
title: "Frida 0x1: Finding the Input That Unlocks the Flag"
date: 2026-08-28
platform: "Android Security Lab"
difficulty: "Easy"
category: "Reverse Engineering"
description: "Static analysis found the input relationship and a Caesar-encoded flag; Frida then provided an alternate runtime path."
reading_time: "5 min"
tags: [android, frida, jadx, reverse-engineering, caesar-cipher]
techniques: [control-flow tracing, string decoding, method hooking]
tools: [JADX, Frida, MuMu Player]
disclaimer: "Performed against the Frida 0x1 Android challenge in an authorized training environment. The flag and APK behavior are challenge data."
toc_items:
  - id: "static-triage"
    label: "Static triage"
  - id: "caesar-decoding"
    label: "Caesar decoding"
  - id: "dynamic-path"
    label: "Dynamic hook"
  - id: "takeaways"
    label: "Takeaways"
---

<div class="info-box"><table><tr><td>Goal</td><td>Submit a valid number and recover the flag</td></tr><tr><td>Runtime</td><td>MuMu Player / Android x86_64</td></tr><tr><td>Analysis</td><td>JADX plus Frida server</td></tr></table></div>

## Static triage {#static-triage}

The app first presents a number field. Any arbitrary input produced “Try again”, so I used that message as a search string in JADX to locate the validation branch.

<figure class="evidence"><img src="{{ '/assets/writeups/frida-android/initial-challenge.webp' | relative_url }}" alt="Frida 0x1 Android challenge input screen" loading="lazy"><figcaption>The initial behavior gave us a stable string to trace into the APK.</figcaption></figure>

The relevant method compares the supplied value with a derived value:

```java
if (i2 == (i * 2) + 4) {
    // decode the hidden string and display it
} else {
    t1.setText("Try again");
}
```

The important observation is that the correct input is not random. It is a function of the runtime value `i`:

```text
valid_input = (i * 2) + 4
```

## Caesar decoding {#caesar-decoding}

The success branch contained the ciphertext `AMDYV{WVWT_CJJF_0s1}`. The character loop subtracts 21 from alphabetic characters and wraps around, which is equivalent to shifting forward by 5 positions in a 26-character alphabet.

<figure class="evidence"><img src="{{ '/assets/writeups/frida-android/source-logic.webp' | relative_url }}" alt="JADX source showing the Frida challenge validation and cipher" loading="lazy"><figcaption>Control flow and the string transformation were both visible in the decompiled code.</figcaption></figure>

Applying the inverse shift produces:

```text
AMDYV{WVWT_CJJF_0s1}
FRIDA{BABY_HOOK_0x1}
```

The flag is therefore:

<div class="callout root"><span class="callout-label">flag</span><p><code>FRIDA{BABY_HOOK_0x1}</code></p></div>

## Dynamic hook {#dynamic-path}

The source notes also document an alternate solution using Frida. Rather than calculating the random value, the hook overwrote the method that returned it so the app always used `1`:

```javascript
Java.perform(function () {
  var Activity = Java.use("com.cdroid.frida1.MainActivity");
  Activity.get_random.implementation = function () {
    return 1;
  };
});
```

With `i = 1`, the validation equation becomes:

```text
(1 * 2) + 4 = 6
```

Entering `6` triggered the success branch in the challenge application.

<figure class="evidence"><img src="{{ '/assets/writeups/frida-android/frida-hook.webp' | relative_url }}" alt="Frida hook used to override the challenge value" loading="lazy"><figcaption>Runtime instrumentation forced the application down the known-good branch.</figcaption></figure>

<figure class="evidence"><img src="{{ '/assets/writeups/frida-android/decoded-flag.webp' | relative_url }}" alt="Frida challenge showing the decoded flag" loading="lazy"><figcaption>The alternate path reached the same flag through a controlled hook.</figcaption></figure>

## Takeaways {#takeaways}

- A user-facing error string can be a practical entry point into a decompiled app.
- Trace the data flow before trying to brute-force an input. The check exposed a simple relationship.
- Static decoding and dynamic instrumentation are complementary: one explains the logic, the other changes runtime state.
- Client-side validation is observable and mutable by design; it is not a security boundary.
