---
layout: post
title: "Metasploitable 1 — Full Walkthrough"
date: 2025-09-23
platform: "VulnHub"
difficulty: "Easy"
categories: [vulnhub, writeup]
tags: [linux, ftp, ssh, telnet, smtp, http, samba, mysql, postgresql, tomcat, metasploit, brute-force, file-upload, reverse-shell]
---

<div class="info-box">
  <table>
    <tr><td>Platform</td><td>VulnHub</td></tr>
    <tr><td>Difficulty</td><td>Easy</td></tr>
    <tr><td>OS</td><td>Linux (Ubuntu)</td></tr>
    <tr><td>IP</td><td>10.0.2.8</td></tr>
    <tr><td>Goal</td><td>Root access via multiple vectors</td></tr>
  </table>
</div>

## Overview

Metasploitable 1 is an intentionally vulnerable Linux machine packed with services running outdated software with known exploits. This walkthrough covers **9 different attack vectors** — from FTP brute-force to Tomcat deployment — making it an excellent target for practicing a wide range of exploitation techniques.

**Services Discovered:**

| Port | Service | Version |
|------|---------|---------|
| 21 | FTP | ProFTPD 1.3.1 |
| 22 | SSH | OpenSSH 4.7p1 Debian 8ubuntu1 |
| 23 | Telnet | Linux telnetd |
| 25 | SMTP | Postfix smtpd |
| 53 | DNS | domain |
| 80 | HTTP | Apache httpd 2.2.8 (PHP/5.2.4) |
| 139/445 | SMB | Samba smbd 3.0.20-Debian |
| 3306 | MySQL | MySQL 5.0.51a |
| 5432 | PostgreSQL | PostgreSQL 8.3.0 – 8.3.7 |
| 8180 | HTTP (Tomcat) | Apache Tomcat/Coyote JSP 1.1 |

---

## Enumeration

### Network Discovery

```bash
sudo arp-scan -l
```

<img width="1372" height="404" alt="arp-scan output" src="https://github.com/user-attachments/assets/e27d7f73-110e-4d79-82cd-6283a3268263" />

```bash
sudo netdiscover -i eth0 -r 10.0.2.0/24
```

<img width="1180" height="313" alt="netdiscover output" src="https://github.com/user-attachments/assets/bc7f3e6d-ea1b-4f72-b4bc-970898c2a6aa" />

The first 3 IPs belong to my personal VM. The victim's IP is **`10.0.2.8`**.

### Port Scanning

```bash
sudo nmap -T4 -A 10.0.2.8
```

<img width="1166" height="1166" alt="Full nmap scan results" src="https://github.com/user-attachments/assets/f00f808c-8b55-4d75-9464-2f70bab17ad3" />

---

## Exploitation

### 1. FTP — ProFTPD 1.3.1 (Brute Force)

Let's try to gain access via brute-force with Hydra:

```bash
hydra -L /usr/share/wordlists/metasploit/unix_users.txt -P /usr/share/wordlists/metasploit/unix_passwords.txt ftp://10.0.2.8
```

<img width="2534" height="437" alt="Hydra brute-force FTP" src="https://github.com/user-attachments/assets/75873b68-246d-4b57-a761-40280e69c104" />

<img width="491" height="445" alt="FTP login result" src="https://github.com/user-attachments/assets/915a6fc9-ca8f-468e-8ae5-6807e08d8414" />

We discover two valid usernames on the machine: **`msfadmin`** and **`service`** — note these for later.

---

### 2. SSH — OpenSSH 4.7p1 (Default Credentials)

Using Metasploit's SSH login scanner with the credentials we found:

```
use scanner/ssh/ssh_login
```

Set `RHOSTS` to `10.0.2.8`, and try `msfadmin:msfadmin` as credentials.

<img width="2036" height="928" alt="SSH login via Metasploit — root access" src="https://github.com/user-attachments/assets/258004d0-ab5b-4389-9cc4-42981a2bee84" />

**We're in as ROOT!**

With root access, I grabbed `/etc/shadow` and cracked the password hashes:

```
root:$1$/avpfBJ1$x0z8w5UF9Iv./DR9E9Lid.

sys:$1$fUX6BPOt$Miyc3UpOzQJqz4s5wFD9l0     =  batman

klog:$1$f2ZVMS4K$R9XkI.CmLdHhdUE3X9jqP0    =  123456789

msfadmin:$1$XN10Zj2c$Rt/zzCW3mLtUWA.ihZjA5/ =  msfadmin

postgres:$1$Rw35ik.x$MgQgZUuO5pAoUvfJhfcYe/ =  postgres

user:$1$HESu9xrH$k.o3G93DGoXIiQKkPmUgZ0    =  user

service:$1$kR3ue7JZ$7GxELDupr5Ohp6cjZ3Bu//  =  service
```

---

### 3. Telnet — Linux telnetd (Default Credentials)

```
use auxiliary/scanner/telnet/telnet_login
```

Using the same credentials: `msfadmin:msfadmin`

<img width="1204" height="994" alt="Telnet root access via Metasploit" src="https://github.com/user-attachments/assets/9bf87528-930a-468b-a0e2-96bba5504af8" />

**ROOT AGAIN!**

---

### 4. SMTP — Postfix smtpd (User Enumeration)

SMTP doesn't give us a shell directly, but we can enumerate valid users:

```
use auxiliary/scanner/smtp/smtp_enum
```

<img width="2541" height="313" alt="SMTP user enumeration" src="https://github.com/user-attachments/assets/d376a44f-e43d-45e0-be73-2f34da0f2c7c" />

Good intel — useful for credential attacks against other services.

---

### 5. HTTP — Apache 2.2.8 / TikiWiki (File Upload RCE)

**Service:** `Apache httpd 2.2.8 (Ubuntu) PHP/5.2.4 with Suhosin-Patch`

#### Directory Enumeration

```bash
gobuster dir -u http://10.0.2.8/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -x php,txt,html
```

<img width="1766" height="751" alt="Gobuster directory scan" src="https://github.com/user-attachments/assets/36075ee5-1a8f-49a2-a1dd-3ad54ed2292e" />

Several interesting directories found.

#### TikiWiki Default Credentials

The web application is **TikiWiki**. Logging in with default credentials:

**`admin:admin`**

<img width="975" height="345" alt="TikiWiki default credentials" src="https://github.com/user-attachments/assets/db7753e3-f9df-4f0f-a470-4679b61a3ec9" />

After changing the password and logging back in, significantly more functionality becomes accessible:

<img width="2559" height="1159" alt="TikiWiki authenticated dashboard" src="https://github.com/user-attachments/assets/4bb9853b-6925-4857-a69a-828336e7be82" />

#### File Upload Reverse Shell

Navigate to the **Backup** section — it has a file upload form with no input validation.

Start a listener:

```bash
nc -vlnp 9001
```

<img width="714" height="136" alt="Netcat listener" src="https://github.com/user-attachments/assets/fa98f687-3dd5-423a-9d97-0c887edd7a6a" />

Upload the [PHP reverse shell payload](https://github.com/pentestmonkey/php-reverse-shell/blob/master/php-reverse-shell.php):

<img width="2046" height="496" alt="Uploading PHP reverse shell" src="https://github.com/user-attachments/assets/75290d83-a066-4a76-8977-7d7dfa6afb64" />

Trigger the shell by navigating to the uploaded file's URL:

<img width="1271" height="97" alt="Accessing the uploaded shell" src="https://github.com/user-attachments/assets/924ce0db-72f4-4e87-b0f9-1d5ae9c4a114" />

**Voila!**

<img width="683" height="240" alt="Reverse shell connection received" src="https://github.com/user-attachments/assets/9002d7d9-5afb-4b2d-ac9f-e02220f1d900" />

> **Note:** Unable to escalate privileges from this shell — the web service user has limited permissions. Dead end for priv esc from this vector.

---

### 6. SMB — Samba 3.0.20 (username map script)

**Service:** `Samba smbd 3.0.20-Debian`

Search in Metasploit:

<img width="1615" height="856" alt="Searching Metasploit for Samba exploits" src="https://github.com/user-attachments/assets/c90ada6d-c2ff-45bf-9b42-a07721585c1a" />

Run the `exploit/multi/samba/usermap_script` module:

<img width="997" height="777" alt="Samba usermap_script root shell" src="https://github.com/user-attachments/assets/71ef3a95-56c7-4a1a-a4a5-57fa6acd25da" />

**ROOT again!**

---

### 7. MySQL — MySQL 5.0.51a (No Auth)

Try connecting directly with no password:

<img width="833" height="267" alt="MySQL auth check" src="https://github.com/user-attachments/assets/6ccf068d-506e-47af-a348-f34932abd492" />

```bash
mysql -h 10.0.2.8 -u root
```

<img width="2239" height="668" alt="MySQL root access" src="https://github.com/user-attachments/assets/8be94c96-e3c0-43f6-8e30-15833566bace" />

**Done!** Full database access with no credentials required.

---

### 8. PostgreSQL — 8.3.0 – 8.3.7 (Metasploit)

Search in Metasploit for PostgreSQL exploits:

<img width="1767" height="352" alt="Metasploit PostgreSQL modules" src="https://github.com/user-attachments/assets/dceb4202-6fbe-4d68-9432-4b57434ed31b" />

Run the appropriate module:

<img width="1522" height="661" alt="PostgreSQL exploitation result" src="https://github.com/user-attachments/assets/e898e896-05bb-48b5-b486-c7481771491a" />

---

### 9. Apache Tomcat 5.5 (Manager Deploy)

**Service running on port 8180:**

```
8180/tcp open  http  Apache Tomcat/Coyote JSP engine 1.1
```

Search Metasploit for Tomcat 5.5 exploits:

<img width="2491" height="796" alt="Metasploit Tomcat modules" src="https://github.com/user-attachments/assets/5c0d2266-22ac-4eed-bd48-f5990a5705e9" />

The `exploit/multi/http/tomcat_mgr_deploy` module looks promising:

<img width="1442" height="542" alt="Tomcat manager deploy exploit result" src="https://github.com/user-attachments/assets/a6d81ec7-1087-4302-9126-8c6be4942334" />

**DONE AND THANK YOU!**

---

## Lessons Learned

- **Default credentials are everywhere** — always try them first. `msfadmin:msfadmin`, `admin:admin`, `postgres:postgres` all worked here.
- **Never expose database ports externally** — MySQL and PostgreSQL should never be reachable from the network without authentication.
- **File upload without validation = RCE** — the TikiWiki backup upload is a textbook example of insecure file upload.
- **Old Samba = easy root** — `usermap_script` is a classic exploit. Patch your SMB services.
- **Metasploitable exists for a reason** — it's a great lab for learning how these exploits work in practice before trying them on real-world engagements.
