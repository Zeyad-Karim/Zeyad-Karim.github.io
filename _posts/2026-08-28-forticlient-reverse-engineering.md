---
layout: post
title: "FortiClient Android Lab: Recovering Credential Material from AES-CBC"
date: 2026-08-28
platform: "Android Security Lab"
difficulty: "Medium"
category: "Reverse Engineering"
description: "An authorized reverse-engineering exercise tracing a stored value from the APK's profile data into a hardcoded AES-CBC implementation."
reading_time: "6 min"
tags: [android, reverse-engineering, jadx, aes, aes-cbc, credential-storage]
techniques: [APK inspection, static tracing, cryptographic analysis]
tools: [JADX, IDA Pro, ADB, Python]
disclaimer: "This is an authorized FortiClient training/research exercise performed on an emulator. The recovered username and password are lab credentials created for the exercise, not production Fortinet credentials."
toc_items:
  - id: "lab-setup"
    label: "Lab setup"
  - id: "stored-material"
    label: "Stored material"
  - id: "crypto-trace"
    label: "Crypto trace"
  - id: "takeaways"
    label: "Takeaways"
---

<div class="info-box"><table><tr><td>Application</td><td>FortiClient Android APK</td></tr><tr><td>Objective</td><td>View the lab credentials as plaintext</td></tr><tr><td>Runtime</td><td>MuMu Player / test VPN profile</td></tr><tr><td>Scope</td><td>Authorized training environment only</td></tr></table></div>

## Lab setup {#lab-setup}

The exercise began by creating a test VPN profile in FortiClient and observing the login dialog. The APK was then loaded into JADX for Java-level inspection, with SSH access from Kali available for supporting tools. IDA Pro was noted as an option if native code became relevant.

<figure class="evidence"><img src="{{ '/assets/writeups/forticlient-reverse-engineering/vpn-setup.webp' | relative_url }}" alt="FortiClient test VPN profile in the Android emulator" loading="lazy"><figcaption>The research target was a locally configured VPN profile inside the emulator.</figcaption></figure>

The assessment question was narrow: where does the application keep the credential material, and what transformation is applied before it is stored?

## Stored material {#stored-material}

Searching the application's files revealed a profile XML containing the username and a value named `ssl.resu`. I changed the test password and compared the file again. The value changed with it, establishing that the field was derived from the password rather than being unrelated profile metadata.

<figure class="evidence"><img src="{{ '/assets/writeups/forticlient-reverse-engineering/shared-preferences.webp' | relative_url }}" alt="FortiClient profile XML with stored credential material" loading="lazy"><figcaption>The profile file held a username and a changing password-derived value.</figcaption></figure>

Static references to `ssl.resu` in JADX narrowed the path to a call resembling `cu.n(str)`. That made `cu.n` the next function to inspect.

## Crypto trace {#crypto-trace}

The decompiled function showed AES in CBC mode. The source notes identified the following lab values:

```python
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import binascii

hex_cipher = "5DA6E529DCAFCE0AF985035AC5FF8015D255D4A5523A1AE64886C44AAB998B94"
key = b"FoRtInEt!AnDrOiD"
iv = bytes([
    117, 122, 39, 67, 114, 124, 115, 44,
    113, 116, 124, 123, 58, 89, 118, 94
])

cipher = AES.new(key, AES.MODE_CBC, iv)
plain = unpad(cipher.decrypt(binascii.unhexlify(hex_cipher)), AES.block_size)
print(plain.decode("utf-8"))
```

<figure class="evidence"><img src="{{ '/assets/writeups/forticlient-reverse-engineering/aes-implementation.webp' | relative_url }}" alt="AES-CBC implementation observed in the FortiClient lab" loading="lazy"><figcaption>The key and initialization vector were both recoverable from the application logic.</figcaption></figure>

The decryption output was:

```text
WE_INNOVATE_USERNAME
WE_INNOVATE_PASSWORD
```

<div class="callout finding"><span class="callout-label">finding</span><p>The lesson is about key management, not the vendor brand: if the key, IV, ciphertext, and algorithm all ship in the client, an analyst can reproduce the transformation offline.</p></div>

## Takeaways {#takeaways}

- Start with the simplest artifact: profile files often reveal more than an early native-code detour.
- Change one input at a time and compare the resulting files. That small experiment tied `ssl.resu` to the password flow.
- Reconstruct crypto from the implementation, not from the field name. Mode, padding, key, IV, and encoding all matter.
- Credentials for a real product must never be recoverable from client-side constants in this way. This exercise used only lab-created values.
