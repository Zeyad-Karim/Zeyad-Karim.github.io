---
layout: post
title: "PortSwigger Web Security Academy: File Upload Validation"
date: 2026-08-28
platform: "PortSwigger Web Security Academy"
difficulty: "Medium"
category: "Web Security"
description: "Three upload labs showing how path traversal, configuration overwrite, and null-byte filename handling can turn an image feature into code execution."
reading_time: "7 min"
tags: [web, file-upload, path-traversal, php, apache, burp-suite]
techniques: [web shell, extension bypass, configuration manipulation, null-byte bypass]
tools: [Burp Suite, PHP, Netcat]
disclaimer: "Performed against PortSwigger Web Security Academy file-upload labs. All shells, accounts, paths, and secrets are confined to the authorized training platform."
toc_items:
  - id: "path-traversal"
    label: "Path traversal upload"
  - id: "extension-blacklist"
    label: "Extension blacklist"
  - id: "null-byte"
    label: "Obfuscated extension"
  - id: "takeaways"
    label: "Takeaways"
---

<div class="info-box"><table><tr><td>Lab account</td><td><code>wiener:peter</code></td></tr><tr><td>Goal</td><td>Read <code>/home/carlos/secret</code> from the lab</td></tr><tr><td>Feature</td><td>Profile image upload</td></tr><tr><td>Core lesson</td><td>Validate content, name, destination, and execution policy together</td></tr></table></div>

## Path traversal upload {#path-traversal}

The first lab accepted a PHP web shell as an uploaded image. The file landed in a directory where script execution was disabled, so the upload alone did not produce code execution.

```php
<?php echo system($_GET['cmd']); ?>
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-file-upload/account-upload.webp' | relative_url }}" alt="PortSwigger account page with an upload control" loading="lazy"><figcaption>The profile image feature became the entry point for the upload tests.</figcaption></figure>

The source notes then used path traversal in the filename to place the file in the parent directory, where the execution policy differed:

```http
Content-Disposition: form-data; name="avatar"; filename="..%2fshell.php"
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-file-upload/path-traversal.webp' | relative_url }}" alt="Path traversal in a file upload request" loading="lazy"><figcaption>Storage and execution permissions were separated by directory, making the destination part of the attack.</figcaption></figure>

The lab web shell could then be requested with a command parameter. The exercise used it to retrieve the challenge secret, not to target a real host.

## Extension blacklist {#extension-blacklist}

The second lab blocked common PHP extensions but allowed a second upload that could change server configuration. The target disclosed `Apache/2.4.41 (Ubuntu)`, and the source notes used an `.htaccess` file to add PHP handling for a custom extension:

```apache
AddType application/x-httpd-php .shell
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-file-upload/htaccess-overwrite.webp' | relative_url }}" alt="PortSwigger upload lab evidence involving htaccess" loading="lazy"><figcaption>Configuration files can change the meaning of an otherwise harmless extension.</figcaption></figure>

The follow-up upload used the new `.shell` extension for the web shell. The key failure was not just the blacklist; it was allowing an upload to write into a directory whose configuration was also user-influenced.

## Obfuscated extension {#null-byte}

The final lab allowed only `.JPG` and `.PNG` names and rejected a normal PHP upload. The source notes used a null-byte sequence to create a mismatch between the validation string and the effective filename:

```text
shell.php%00.jpg
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-file-upload/null-byte-upload.webp' | relative_url }}" alt="Null-byte extension bypass in the upload lab" loading="lazy"><figcaption>Different layers interpreted the filename differently, defeating suffix-only validation.</figcaption></figure>

Modern frameworks may handle null bytes differently, but the underlying lesson persists: normalize once, validate the normalized value, and make storage non-executable.

## Takeaways {#takeaways}

- An upload defense needs content inspection, an allowlisted extension, a generated server-side name, and a non-executable storage location.
- Never allow user-controlled uploads to overwrite `.htaccess` or other execution configuration.
- Validate the complete path after canonicalization, not just the final filename suffix.
- Make a web shell impossible to execute even if a validation check is bypassed; defense in depth matters more than one filter.
