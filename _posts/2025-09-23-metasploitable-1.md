---
layout: post
title: "Metasploitable 1: Mapping a Deliberately Broken Attack Surface"
date: 2025-09-23
platform: "VulnHub"
difficulty: "Easy"
category: "VulnHub"
featured: true
description: "A service-by-service walkthrough of Metasploitable 1, from discovery to multiple independent footholds and root paths."
reading_time: "12 min"
tags: [linux, ftp, ssh, telnet, smtp, http, samba, mysql, postgresql, tomcat]
techniques: [credential reuse, file upload, reverse shell, service exploitation]
tools: [Nmap, Hydra, Gobuster, Metasploit, Netcat]
disclaimer: "Performed against Metasploitable 1, an intentionally vulnerable VulnHub training machine. All credentials, flags, and IP addresses shown are lab-only data."
toc_items:
  - {id: "surface", label: "The attack surface"}
  - {id: "credential-paths", label: "Credentials and remote access"}
  - {id: "web-path", label: "Web application path"}
  - {id: "service-paths", label: "SMB and database paths"}
  - {id: "takeaways", label: "Takeaways"}
---

<div class="info-box">
<table>
<tr><td>Target</td><td>Metasploitable 1</td></tr>
<tr><td>OS</td><td>Ubuntu Linux</td></tr>
<tr><td>Lab IP</td><td><code>10.0.2.8</code></td></tr>
<tr><td>Objective</td><td>Document the exposed services and viable root paths</td></tr>
</table>
</div>

## The attack surface {#surface}

Metasploitable 1 is intentionally crowded with outdated services. That makes it useful as a methodology exercise: the right first move is to inventory the whole host before committing to one exploit.

```bash
sudo arp-scan -l
sudo netdiscover -i eth0 -r 10.0.2.0/24
sudo nmap -T4 -A 10.0.2.8
```

<figure class="evidence"><img src="{{ '/assets/writeups/metasploitable-1/arp-scan.webp' | relative_url }}" alt="Local discovery output showing the Metasploitable lab host" loading="lazy"><figcaption>Discovery placed the target at 10.0.2.8 inside the private lab network.</figcaption></figure>

| Port | Service | Version observed |
| --- | --- | --- |
| 21 | FTP | ProFTPD 1.3.1 |
| 22 | SSH | OpenSSH 4.7p1, Debian 8ubuntu1 |
| 23 | Telnet | Linux telnetd |
| 25 | SMTP | Postfix smtpd |
| 53 | DNS | domain service |
| 80 | HTTP | Apache 2.2.8, PHP 5.2.4 |
| 139/445 | SMB | Samba 3.0.20-Debian |
| 3306 | MySQL | MySQL 5.0.51a |
| 5432 | PostgreSQL | PostgreSQL 8.3.0–8.3.7 |
| 8180 | HTTP | Apache Tomcat 5.5 |

<figure class="evidence"><img src="{{ '/assets/writeups/metasploitable-1/nmap-services.webp' | relative_url }}" alt="Nmap service and version detection for Metasploitable 1" loading="lazy"><figcaption>The inventory exposed several independent authentication and code-execution opportunities.</figcaption></figure>

<div class="callout finding"><span class="callout-label">finding</span><p>The host was not a single-exploit challenge. FTP, SSH, Telnet, the TikiWiki application, Samba, PostgreSQL, and Tomcat each created a separate branch in the attack graph.</p></div>

## Credentials and remote access {#credential-paths}

### FTP and SSH

The source notes began by testing FTP with Hydra. That enumeration revealed the accounts `msfadmin` and `service`, which became useful for remote login testing.

<figure class="evidence"><img src="{{ '/assets/writeups/metasploitable-1/ftp-enumeration.webp' | relative_url }}" alt="FTP enumeration against the Metasploitable lab" loading="lazy"><figcaption>FTP testing surfaced usernames worth validating against other exposed services.</figcaption></figure>

The SSH login module accepted the intentionally weak lab credential `msfadmin:msfadmin`:

```text
use scanner/ssh/ssh_login
set RHOSTS 10.0.2.8
set USERNAME msfadmin
set PASSWORD msfadmin
run
```

<figure class="evidence"><img src="{{ '/assets/writeups/metasploitable-1/ssh-access.webp' | relative_url }}" alt="SSH access to the Metasploitable lab" loading="lazy"><figcaption>Credential reuse converted initial service enumeration into remote access.</figcaption></figure>

The source writeup also records access to `/etc/shadow` and cracking results for the lab accounts. Those values are retained here only as training evidence; they are not credentials for a real system.

### Telnet

The same credential worked through the Telnet login scanner:

```text
use auxiliary/scanner/telnet/telnet_login
set RHOSTS 10.0.2.8
set USERPASS_FILE credentials.txt
run
```

<figure class="evidence"><img src="{{ '/assets/writeups/metasploitable-1/telnet-access.webp' | relative_url }}" alt="Telnet login scanner output" loading="lazy"><figcaption>Telnet provided another remote-access path using the lab account.</figcaption></figure>

## Web application path {#web-path}

Gobuster identified directories on the Apache site:

```bash
gobuster dir -u http://10.0.2.8/ \
  -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
  -x php,txt,html
```

The web service hosted a TikiWiki application. The source material records the default `admin:admin` credential, followed by access to a backup area with an upload form that did not validate file content.

<figure class="evidence"><img src="{{ '/assets/writeups/metasploitable-1/web-enumeration.webp' | relative_url }}" alt="Web enumeration of the TikiWiki application" loading="lazy"><figcaption>Directory discovery led to the vulnerable application surface.</figcaption></figure>

The workflow was:

1. Authenticate with the lab's default administrative credential.
2. Reach the backup functionality.
3. Upload a PHP reverse-shell payload.
4. Listen with Netcat and request the uploaded file.

```bash
nc -lvnp 9001
```

<figure class="evidence"><img src="{{ '/assets/writeups/metasploitable-1/tikiwiki-upload.webp' | relative_url }}" alt="TikiWiki backup upload evidence" loading="lazy"><figcaption>An unrestricted backup upload gave the web process a path to code execution.</figcaption></figure>

The resulting shell was useful as a foothold, but the source notes mark this branch as a privilege-escalation dead end. That is still a valuable result: not every shell is the best route to root.

## SMB and database paths {#service-paths}

### Samba

The SMB banner identified Samba 3.0.20-Debian. The `usermap_script` module matched the version and returned root in the source run:

<figure class="evidence"><img src="{{ '/assets/writeups/metasploitable-1/samba-root.webp' | relative_url }}" alt="Samba usermap script returning root" loading="lazy"><figcaption>A version-specific Samba exploit provided a direct root path.</figcaption></figure>

### MySQL

MySQL was reachable on port 3306. Enumeration showed that the database service accepted the lab credentials, allowing direct inspection from the training network:

```text
mysql -h 10.0.2.8 -u root -p
```

<figure class="evidence"><img src="{{ '/assets/writeups/metasploitable-1/mysql-enumeration.webp' | relative_url }}" alt="MySQL enumeration on Metasploitable 1" loading="lazy"><figcaption>Database exposure broadened the credential and data-discovery surface.</figcaption></figure>

### PostgreSQL

PostgreSQL was also exposed. The source notes use Metasploit's PostgreSQL login and command-execution modules after checking the version range:

<figure class="evidence"><img src="{{ '/assets/writeups/metasploitable-1/postgresql-module.webp' | relative_url }}" alt="Metasploit PostgreSQL module selection" loading="lazy"><figcaption>The PostgreSQL branch was evaluated independently from the web and SMB paths.</figcaption></figure>

### Tomcat manager deployment

Finally, Tomcat 5.5 was available on port 8180. The `exploit/multi/http/tomcat_mgr_deploy` module was the matching path in the source material and completed the exercise:

<figure class="evidence"><img src="{{ '/assets/writeups/metasploitable-1/tomcat-root.webp' | relative_url }}" alt="Tomcat manager deployment exploit result" loading="lazy"><figcaption>Tomcat's manager surface created another independent deployment path.</figcaption></figure>

## Takeaways {#takeaways}

- The value of Metasploitable is breadth: one host can teach discovery, credential reuse, file upload, reverse shells, SMB exploitation, database exposure, and Java application deployment.
- Test known default credentials only inside the intended lab boundary, then document where reuse changes the attack path.
- A failed privilege-escalation attempt is still useful evidence. Record it, pivot, and keep the attack graph honest.
- Network-facing database and administration services should be restricted, authenticated, and patched in production environments.
