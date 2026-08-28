---
layout: post
title: "PortSwigger Web Security Academy: Access Control Bypasses"
date: 2026-08-28
platform: "PortSwigger Web Security Academy"
difficulty: "Medium"
category: "Web Security"
description: "Four authorization labs showing why URL, method, workflow-step, and referrer checks cannot replace server-side permission enforcement."
reading_time: "7 min"
tags: [web, access-control, authorization, burp-suite, http]
techniques: [header tampering, method override, workflow analysis, session swapping]
tools: [Burp Suite, Repeater]
disclaimer: "Performed against PortSwigger Web Security Academy access-control labs. All accounts, sessions, and endpoints are limited to the authorized training environments."
toc_items:
  - id: "url-control"
    label: "URL-based control"
  - id: "method-control"
    label: "Method-based control"
  - id: "workflow-control"
    label: "Workflow-step control"
  - id: "referrer-control"
    label: "Referrer-based control"
---

<div class="info-box"><table><tr><td>Lab account</td><td><code>wiener:peter</code></td></tr><tr><td>Admin account</td><td><code>administrator:admin</code> (training reference)</td></tr><tr><td>Goal</td><td>Reach admin actions or promote the lab user</td></tr><tr><td>Core lesson</td><td>Authorization belongs on the server</td></tr></table></div>

## URL-based control {#url-control}

The first lab exposed an unauthenticated admin panel at `/admin`, but a front-end layer blocked that path for external requests. The back end supported the `X-Original-URL` header, which allowed the intended path to be supplied separately:

```http
GET / HTTP/1.1
Host: <lab-host>
X-Original-URL: /admin
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-access-control/original-url.webp' | relative_url }}" alt="X-Original-URL access-control bypass in Burp" loading="lazy"><figcaption>A proxy-layer restriction did not remove the back end's administrative route.</figcaption></figure>

The lesson is architectural: if the application can interpret an alternate path header, that header must be treated as part of the authorization surface.

## Method-based control {#method-control}

The second exercise used the HTTP method as one input to an access-control decision. I first observed a legitimate admin request, then replayed it with the low-privilege `wiener` session and changed the method.

```http
POST /admin-roles HTTP/1.1
Cookie: session=<wiener-session>

username=wiener&action=upgrade
```

Changing the request method exposed a branch that did not apply the same role check:

```http
GET /admin-roles?username=wiener&action=upgrade HTTP/1.1
Cookie: session=<wiener-session>
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-access-control/method-tampering.webp' | relative_url }}" alt="Burp request showing method-based authorization tampering" loading="lazy"><figcaption>Changing the method reached a handler with weaker authorization behavior.</figcaption></figure>

## Workflow-step control {#workflow-control}

The third lab used a multi-step role-change flow. The admin UI issued one request to select a user and a later request to apply the role change. Only the first step enforced authorization.

Replaying the final action directly with the `wiener` session skipped the protected step:

```http
POST /admin-roles HTTP/1.1
Cookie: session=<wiener-session>

username=wiener&action=upgrade
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-access-control/multistep-bypass.webp' | relative_url }}" alt="Multi-step access-control bypass request" loading="lazy"><figcaption>Every state-changing step must perform its own authorization check.</figcaption></figure>

The successful lab state confirmed that skipping UI sequencing is enough when the server trusts the client to follow the intended workflow.

## Referrer-based control {#referrer-control}

The final exercise checked the `Referer` header to decide whether a privileged action came from the admin panel. Replaying the state-changing request with a referrer pointing at the admin path satisfied the weak check:

```http
POST /admin-roles HTTP/1.1
Cookie: session=<wiener-session>
Referer: https://<lab-host>/admin

username=wiener&action=upgrade
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-access-control/admin-result.webp' | relative_url }}" alt="Access-control lab showing successful role promotion" loading="lazy"><figcaption>The training application accepted a forged navigation context as proof of privilege.</figcaption></figure>

## Takeaways

- UI visibility, URL obscurity, HTTP method, workflow order, and `Referer` are not authorization.
- Check the current principal and requested action at every state-changing endpoint.
- Test the same action through alternate methods, direct requests, and skipped steps.
- Treat proxy and framework headers as attacker-controlled unless the deployment normalizes and authenticates them at a trusted boundary.
