---
layout: post
title: "Kioptrix Level 1"
date: 2025-09-22
platform: "VulnHub"
difficulty: "Easy"
categories: [vulnhub, writeup]
tags: [linux, apache, samba, privesc, openfuck]
---

<div class="info-box">
  <table>
    <tr><td>Platform</td><td>VulnHub</td></tr>
    <tr><td>Difficulty</td><td>Easy</td></tr>
    <tr><td>OS</td><td>Linux (Red Hat)</td></tr>
    <tr><td>IP</td><td>10.0.2.5</td></tr>
    <tr><td>Goal</td><td>Root access</td></tr>
  </table>
</div>

## Overview

Kioptrix Level 1 is a classic beginner-level VulnHub machine running a very old version of Red Hat Linux. The attack surface is wide: an outdated Apache with a vulnerable mod\_ssl, and a Samba service with a known remote exploit. This walkthrough covers two different paths to root.

---

## Enumeration

### Network Discovery

We start by scanning the local network to identify the target. Either of the following tools will do:

```bash
sudo arp-scan -l
```

<img width="1374" height="436" alt="arp-scan output" src="https://github.com/user-attachments/assets/c3c72070-27e2-46b5-b495-84e56403ec6a" />

```bash
sudo netdiscover -i eth0 -r 10.0.2.0/24
```

<img width="1181" height="316" alt="netdiscover output" src="https://github.com/user-attachments/assets/dfb316f9-05d0-49d0-a786-a89de26c3fe1" />

The first 3 IPs belong to my personal VM, so the victim's IP is **`10.0.2.5`**.

### Port Scanning

```bash
sudo nmap -T4 -A 10.0.2.5
```

<img width="1069" height="962" alt="Nmap scan results" src="https://github.com/user-attachments/assets/fd160d33-9fe8-4790-8f42-f8deef82b17e" />

**Open services discovered:**

| Port | Service | Version |
|------|---------|---------|
| 22 | SSH | OpenSSH 2.9p2 (protocol 1.99) |
| 80 | HTTP | Apache httpd 1.3.20 (Red-Hat/Linux) mod_ssl/2.8.4 OpenSSL/0.9.6b |
| 111 | rpcbind | RPC #100000 |
| 139 | netbios-ssn | Samba smbd |
| 443 | ssl/https | Apache 1.3.20 |

---

## Exploitation

### Service Analysis

Before jumping in, let's check each service for known vulnerabilities.

**1) SSH — OpenSSH 2.9p2 (protocol 1.99)**

References: [Exploit-DB](https://www.exploit-db.com/exploits/21402) | [Rapid7](https://www.rapid7.com/db/modules/exploit/multi/ssh/sshexec/)

This requires valid credentials to exploit, so let's park it and move on to easier targets.

---

### Method 1: Apache mod_ssl / OpenFuck (Port 80/443)

**Service:** `Apache httpd 1.3.20 — mod_ssl/2.8.4 OpenSSL/0.9.6b`

Search for known exploits:

```bash
searchsploit apache 1.3.20
```

<img width="2536" height="736" alt="searchsploit results for apache 1.3.20" src="https://github.com/user-attachments/assets/c37ca505-8837-431c-8b82-770834b45805" />

The scan confirms this version is vulnerable to **OpenFuckV2**. We copy the exploit code, compile it, and run it against the target.

The kernel version is visible from the nmap scan: `Linux 2.4.X` on Red Hat.

#### Running the Exploit

```bash
./z
```

<img width="452" height="247" alt="OpenFuck exploit usage" src="https://github.com/user-attachments/assets/754a7419-f28c-4827-bc94-44076c8b2299" />

```bash
./z 0x6b 10.0.2.5 -c 10
```

**We're In!**

<img width="1057" height="857" alt="Initial shell as apache" src="https://github.com/user-attachments/assets/c81df113-d22e-4970-a2e1-edb8009b7de1" />

<img width="227" height="158" alt="Shell confirmation" src="https://github.com/user-attachments/assets/f8237c3b-a243-4bcc-a2b6-62181f4dbddc" />

We have a shell, but notice we're running as `apache` (non-root). The exploit partially fails because the machine can't reach the internet to download a required file: `ptrace-kmod.c`.

<img width="1053" height="274" alt="Download error for ptrace-kmod.c" src="https://github.com/user-attachments/assets/88c3ae72-3e30-44de-9a87-73de6f53d546" />

#### Fix: Serve the File Locally

The exploit needs `ptrace-kmod.c` — which is a local kernel exploit. Since the target can't reach the internet, I:

1. Downloaded `ptrace-kmod.c` to my Kali machine
2. Started a local Apache server
3. Modified the exploit source to point to my local machine instead of the original URL
4. Recompiled and re-ran the exploit

```bash
./z 0x6b 10.0.2.5 -c 10
```

<img width="1167" height="1065" alt="Root shell via OpenFuck" src="https://github.com/user-attachments/assets/a8aff65f-6c58-43e9-a5c6-e5918b0a49b9" />

**ROOT! 🥳**

---

### Method 2: Samba trans2open (Port 139)

**Service:** `netbios-ssn — Samba smbd`

First, detect the exact Samba version using Metasploit's auxiliary scanner:

<img width="1543" height="585" alt="Samba version detection via Metasploit" src="https://github.com/user-attachments/assets/cf10263c-9636-43c4-bb69-347d05c4ddfd" />

**Version identified: Samba 2.2.1a**

References: [Exploit-DB](https://www.exploit-db.com/exploits/10) | [Rapid7](https://www.rapid7.com/db/modules/exploit/linux/samba/trans2open/)

Using the Metasploit `trans2open` module:

<img width="1287" height="1031" alt="Samba trans2open root shell" src="https://github.com/user-attachments/assets/9a33de23-b7e6-4b8d-a4a4-0291f72a3892" />

**And We're In as root!**

---

## Lessons Learned

- **Always enumerate all services** — running multiple outdated services creates multiple attack paths.
- **mod_ssl/OpenSSL version matters** — even a minor version difference can mean the difference between vulnerable and not.
- **Network isolation is key for exploit payloads** — when an exploit downloads a dependency, serve it locally when the target is isolated.
- **Samba is a classic vector** on old Linux boxes — `trans2open` is a well-known, reliable exploit for Samba 2.x.
