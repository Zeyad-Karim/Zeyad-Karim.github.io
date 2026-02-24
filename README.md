# z3y4d — Cybersecurity Blog

Personal cybersecurity blog hosted on GitHub Pages. Dark-themed Jekyll site for publishing writeups of vulnerable machines, CTF solutions, and security research.

**Live site:** [https://Zeyad-Karim.github.io](https://Zeyad-Karim.github.io)

---

## Adding a New Writeup

1. Create a new file in `_posts/` with the naming convention:
   ```
   YYYY-MM-DD-platform-machine-name.md
   ```

2. Add the front matter at the top of your file:
   ```yaml
   ---
   layout: post
   title: "Machine Name"
   date: YYYY-MM-DD
   categories: [htb, writeup]
   tags: [linux, privesc, web, sqli]
   platform: "Hack The Box"
   difficulty: "Medium"
   image: /assets/img/machine-name-banner.png  # optional
   ---
   ```

3. Write your writeup in Markdown. Suggested sections:
   - Enumeration
   - Foothold
   - Privilege Escalation
   - Flags
   - Lessons Learned

4. Push to `main` — GitHub Pages will build and deploy automatically.

---

## Local Development

```bash
# Install dependencies
bundle install

# Serve locally
bundle exec jekyll serve

# Open in browser
open http://localhost:4000
```

---

## Supported Platforms

Set the `platform` front matter to one of:
- `"Hack The Box"`
- `"TryHackMe"`
- `"VulnHub"`
- `"PortSwigger"`
- `"Other"` or `"Misc"`

---

## Structure

```
├── _config.yml          # Jekyll configuration
├── _layouts/            # HTML layouts
├── _includes/           # Reusable HTML partials
├── _posts/              # Writeup posts (Markdown)
├── _sass/               # SCSS stylesheets
├── assets/css/          # Compiled CSS entry point
├── assets/img/          # Images and banners
├── index.md             # Home page
├── writeups.md          # Writeups listing
├── about.md             # About page
└── 404.html             # Custom 404 page
```
