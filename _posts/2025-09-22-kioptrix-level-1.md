---
layout: post
title: "Kioptrix Level 1: Two Paths from Apache to Root"
date: 2025-09-22
platform: "VulnHub"
difficulty: "Easy"
category: "VulnHub"
featured: true
description: "A dual-path compromise of an intentionally vulnerable Red Hat VM through legacy mod_ssl and Samba services."
reading_time: "8 min"
tags: [linux, apache, mod-ssl, samba, privilege-escalation]
techniques: [service enumeration, exploit chaining, local payload hosting]
tools: [Nmap, SearchSploit, Metasploit, arp-scan]
disclaimer: "Performed against Kioptrix Level 1, an intentionally vulnerable VulnHub training machine. The IP addresses and credentials shown are lab data."
toc_items:
  - {id: "scope-and-discovery", label: "Scope and discovery"}
  - {id: "apache-path", label: "Apache / OpenFuck"}
  - {id: "samba-path", label: "Samba trans2open"}
  - {id: "takeaways", label: "Takeaways"}
---

<div class="info-box">
<table>
<tr><td>Target</td><td>Kioptrix Level 1</td></tr>
<tr><td>OS</td><td>Red Hat Linux / 2.4.x kernel</td></tr>
<tr><td>Lab IP</td><td><code>10.0.2.5</code></td></tr>
<tr><td>Objective</td><td>Obtain root through an exposed service</td></tr>
</table>
</div>

## Scope and discovery {#scope-and-discovery}

Kioptrix Level 1 is a deliberately old Linux target. The useful lesson is not simply that a legacy exploit works; it is that a broad, version-aware enumeration pass exposes more than one viable attack path.

I identified the target on the local lab network with either of these discovery methods:

```bash
sudo arp-scan -l
sudo netdiscover -i eth0 -r 10.0.2.0/24
```

<figure class="evidence"><img src="{{ '/assets/writeups/kioptrix-level-1/arp-scan.webp' | relative_url }}" alt="arp-scan discovering the Kioptrix lab host" loading="lazy"><figcaption>Local discovery identified the vulnerable VM at 10.0.2.5.</figcaption></figure>

The service scan established the initial attack surface:

```bash
sudo nmap -T4 -A 10.0.2.5
```

| Port | Service | Version observed |
| --- | --- | --- |
| 22 | SSH | OpenSSH 2.9p2, protocol 1.99 |
| 80 | HTTP | Apache 1.3.20, mod_ssl 2.8.4, OpenSSL 0.9.6b |
| 111 | RPC | rpcbind |
| 139 | NetBIOS/SMB | Samba 2.2.1a |
| 443 | HTTPS | Apache 1.3.20 |

<figure class="evidence"><img src="{{ '/assets/writeups/kioptrix-level-1/nmap-services.webp' | relative_url }}" alt="Nmap output listing Kioptrix services" loading="lazy"><figcaption>Version detection made the obsolete Apache and Samba services the highest-value leads.</figcaption></figure>

<div class="callout finding"><span class="callout-label">finding</span><p>SSH was left aside because the source material did not include valid credentials. The exposed HTTP/TLS and SMB services provided unauthenticated paths instead.</p></div>

## Apache / OpenFuck {#apache-path}

The Apache banner matched a known mod_ssl vulnerability. I searched the local exploit index rather than guessing from the product name:

```bash
searchsploit apache 1.3.20
```

The matching OpenFuckV2 exploit was compiled and launched using the target profile and lab IP:

```bash
./z 0x6b 10.0.2.5 -c 10
```

<figure class="evidence"><img src="{{ '/assets/writeups/kioptrix-level-1/openfuck-usage.webp' | relative_url }}" alt="OpenFuck exploit usage screen" loading="lazy"><figcaption>The exploit accepted the Apache target profile and returned a shell.</figcaption></figure>

The first shell was an **Apache** shell, not root. That distinction matters: the exploit delivered code execution, but the privilege boundary was still intact.

<figure class="evidence"><img src="{{ '/assets/writeups/kioptrix-level-1/apache-shell.webp' | relative_url }}" alt="Initial Apache shell on Kioptrix" loading="lazy"><figcaption>Initial access landed in the web-service account.</figcaption></figure>

The exploit then attempted to fetch `ptrace-kmod.c`. Because the isolated VM could not reach the internet, that dependency was not available:

<figure class="evidence"><img src="{{ '/assets/writeups/kioptrix-level-1/ptrace-download-error.webp' | relative_url }}" alt="OpenFuck failing to download ptrace-kmod.c" loading="lazy"><figcaption>Network isolation interrupted the exploit's dependency download.</figcaption></figure>

To keep the lab isolated, I downloaded the source on the Kali VM, served it locally with Apache, changed the exploit source to use the local URL, recompiled, and ran the same target command again. The second run completed the local kernel-exploit stage and returned a root shell.

<figure class="evidence"><img src="{{ '/assets/writeups/kioptrix-level-1/openfuck-root.webp' | relative_url }}" alt="Root shell after the OpenFuck path" loading="lazy"><figcaption>Root access after supplying the dependency from the local lab network.</figcaption></figure>

<div class="callout root"><span class="callout-label">root</span><p>The Apache path demonstrates a practical exploit-chain detail: remote code execution and privilege escalation may fail for environmental reasons even when the vulnerability is real.</p></div>

## Samba trans2open {#samba-path}

The same scan exposed SMB on port 139. I first confirmed the version with the Metasploit auxiliary scanner, identifying **Samba 2.2.1a**, then searched for a version-specific module.

The Rapid7 `linux/samba/trans2open` module provided a second path to root. In the source run, the module returned a root shell directly:

<figure class="evidence"><img src="{{ '/assets/writeups/kioptrix-level-1/samba-root.webp' | relative_url }}" alt="Samba trans2open returning a root shell" loading="lazy"><figcaption>The trans2open path reached root without relying on the Apache foothold.</figcaption></figure>

## Takeaways {#takeaways}

- Version enumeration is only useful when it changes the next decision. Here, it narrowed both Apache and Samba to known exploit families.
- The Apache path separated initial access from privilege escalation and exposed a dependency failure caused by network isolation.
- Keeping payloads and dependencies on the local lab network preserved the test boundary while making the exploit reproducible.
- A second exposed service can be the cleaner path. SMB was independently exploitable, so the first foothold was not required.
