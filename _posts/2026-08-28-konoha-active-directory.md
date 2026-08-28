---
layout: post
title: "Konoha: From LDAP Discovery to an Active Directory WriteOwner Path"
date: 2026-08-28
platform: "Authorized AD Lab"
difficulty: "Hard"
category: "Active Directory"
featured: true
description: "An Active Directory attack path built from LDAP metadata, anime-themed usernames, AS-REP roasting, and delegated password-reset rights."
reading_time: "9 min"
tags: [active-directory, ldap, kerberos, asrep-roasting, bloodhound, evil-winrm]
techniques: [user enumeration, credential recovery, ACL abuse, APK analysis]
tools: [ldapsearch, Kerbrute, Impacket, Evil-WinRM, BloodHound]
disclaimer: "This article is reconstructed from an authorized training report. The evidence identifies a private lab domain, konoha.htb, and the 192.168.2.200 lab address; it is not presented as a Hack The Box machine because the source does not establish that attribution."
toc_items:
  - id: "domain-discovery"
    label: "Domain discovery"
  - id: "user-enumeration"
    label: "User enumeration"
  - id: "first-access"
    label: "First access"
  - id: "acl-path"
    label: "ACL path"
  - id: "takeaways"
    label: "Takeaways"
---

<div class="info-box"><table><tr><td>Target</td><td>DC at <code>192.168.2.200</code></td></tr><tr><td>Domain</td><td><code>konoha.htb</code></td></tr><tr><td>Environment</td><td>Private authorized AD lab</td></tr><tr><td>Objective</td><td>Document user and privileged attack paths</td></tr></table></div>

## Domain discovery {#domain-discovery}

The report opened with the target IP and domain name, then queried the LDAP RootDSE anonymously:

```bash
ldapsearch -x -H ldap://192.168.2.200 -s base
```

<figure class="evidence"><img src="{{ '/assets/writeups/konoha-active-directory/ldap-rootdse.webp' | relative_url }}" alt="LDAP RootDSE output identifying the Konoha domain" loading="lazy"><figcaption>RootDSE metadata confirmed a domain controller and the naming context DC=konoha,DC=htb.</figcaption></figure>

The response exposed useful structure without requiring a domain account:

- `defaultNamingContext: DC=konoha,DC=htb`
- `dnsHostName: DC.konoha.htb`
- Kerberos and GSSAPI support
- domain and forest functional levels

The HTTP service also exposed a themed site. The source report used the visible character names as a hypothesis for a username wordlist.

<figure class="evidence"><img src="{{ '/assets/writeups/konoha-active-directory/website-clues.webp' | relative_url }}" alt="Konoha lab website containing username clues" loading="lazy"><figcaption>Application content supplied the naming pattern used for the next enumeration step.</figcaption></figure>

## User enumeration {#user-enumeration}

The generated list included combinations such as `naruto.uzumaki`, `sasuke.uchiha`, and `sakura.haruno`. Kerbrute tested those candidates against the domain controller:

```bash
./kerbrute userenum \
  --dc 192.168.2.200 \
  -d konoha.htb \
  username_list.txt
```

<figure class="evidence"><img src="{{ '/assets/writeups/konoha-active-directory/kerbrute-users.webp' | relative_url }}" alt="Kerbrute validating usernames in the Konoha lab" loading="lazy"><figcaption>Valid account names turned a theme-based hypothesis into an AD foothold strategy.</figcaption></figure>

The report then tried `GetNPUsers` against candidate accounts to identify users without Kerberos pre-authentication:

```bash
impacket-GetNPUsers konoha.htb/ \
  -dc-ip 192.168.2.200 \
  -usersfile username_list.txt \
  -format hashcat
```

The captured hash was cracked to the lab password `sakuraharuno` for `haruno.sakura`.

## First access {#first-access}

With the recovered training credential, the report established a remote PowerShell session:

```bash
evil-winrm -i 192.168.2.200 \
  -u 'haruno.sakura' \
  -p 'sakuraharuno'
```

The source did not find a flag immediately, so it shifted from file hunting to capability analysis. That pivot was important: the next privilege boundary was an identity-management permission, not a local binary exploit.

The report records the user flag as:

<div class="callout root"><span class="callout-label">user flag</span><p><code>ZeroSploit{4D_Is_n0t_S3cur3}</code></p></div>

## ACL path {#acl-path}

The report found that the compromised identity could change another user's password. It then used BloodHound to visualize the delegated relationship and identify a WriteOwner / DACL path.

<figure class="evidence"><img src="{{ '/assets/writeups/konoha-active-directory/bloodhound-path.webp' | relative_url }}" alt="BloodHound relationship showing a delegated Active Directory path" loading="lazy"><figcaption>Relationship analysis made the delegated control edge visible.</figcaption></figure>

The source also analyzed `naruto.apk` and recovered the lab account `uzumaki.naruto` with the password `Rasenshuriken123$`. The report notes that the password matched a hint and an MD5 value embedded in the APK; this was treated as challenge data, not a general credential-recovery technique.

<figure class="evidence"><img src="{{ '/assets/writeups/konoha-active-directory/apk-analysis.webp' | relative_url }}" alt="JADX analysis of the Naruto lab APK" loading="lazy"><figcaption>APK analysis supplied another authorized lab credential for the AD path.</figcaption></figure>

The documented password-change sequence was:

```bash
net rpc password uchiha.obito \
  -U konoha.htb/'uzumaki.naruto'%'Rasenshuriken123$' \
  -S 192.168.2.200

net rpc password UZUMAKI.KUSHINA \
  -U konoha.htb/'uchiha.obito'%'Obito123!' \
  -S 192.168.2.200
```

The source report labels this as the root-flag phase, but the supplied evidence ends after the delegated password changes and does not show a root-flag value. I am leaving that result open rather than inventing a completion state.

## Takeaways {#takeaways}

- RootDSE is a high-signal first query: naming contexts, hostnames, and supported authentication mechanisms shape the rest of the assessment.
- Naming conventions from a web application can produce effective candidate usernames, but validation still has to happen against the domain.
- AS-REP roasting turns a pre-authentication configuration mistake into an offline password-cracking opportunity.
- In AD, “what can this user change?” can matter more than “what files can this user read?”
- The report proves a user path and delegated ACL path. It does not prove a final root flag, so the writeup keeps that distinction explicit.
