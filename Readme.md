# z3y4d — Cybersecurity Blog

Personal blog for publishing CTF writeups, vulnerable machine walkthroughs, and security research. Hosted on GitHub Pages at **https://Zeyad-Karim.github.io**.

Built with [Jekyll](https://jekyllrb.com/) using a custom dark hacker-aesthetic theme.

---

## Adding a New Writeup

1. Create a new Markdown file in `_posts/` using the naming convention:
   ```
   YYYY-MM-DD-machine-name.md
   ```

2. Add the following front matter at the top of the file:
   ```yaml
   ---
   layout: post
   title: "Machine Name"
   date: YYYY-MM-DD
   platform: "Hack The Box"   # Hack The Box | TryHackMe | VulnHub | PortSwigger | Other
   difficulty: "Medium"        # Easy | Medium | Hard | Insane
   tags: [linux, privesc, web]
   image: /assets/img/banner.png  # optional
   ---
   ```

3. Write your writeup in Markdown below the front matter. Recommended sections:
   - **Enumeration** — initial recon and service discovery
   - **Foothold** — gaining initial access
   - **Privilege Escalation** — path to root/SYSTEM
   - **Flags** — user and root hashes
   - **Lessons Learned** — key takeaways

4. Commit and push — GitHub Pages builds and deploys automatically.

---

## Local Development

### Prerequisites

- Ruby (≥ 2.7)
- Bundler (`gem install bundler`)

### Setup

```bash
bundle install
bundle exec jekyll serve
```

The site will be available at `http://localhost:4000`.

---

## Site Structure

```
├── _config.yml          # Jekyll configuration
├── _layouts/            # Page templates (default, home, post, page)
├── _includes/           # Reusable HTML partials (header, footer, head, nav)
├── _posts/              # Writeup posts (Markdown)
├── _sass/               # SCSS stylesheets
├── assets/              # CSS, images, and other static files
├── index.html           # Home page with latest posts
├── writeups.md          # All writeups grouped by platform
├── about.md             # Bio, skills, and social links
└── 404.html             # Custom 404 page
```

---

## Platforms Covered

| Platform | Description |
|----------|-------------|
| Hack The Box | Retired and active machine writeups |
| TryHackMe | Guided room walkthroughs |
| VulnHub | Offline vulnerable VM writeups |
| PortSwigger | Web security lab solutions |
| Other | CTF challenges and misc research |
