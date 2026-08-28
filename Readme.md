# z3y4d / security research

Personal cybersecurity portfolio and Jekyll/GitHub Pages research notebook for [Zeyad Karim](https://github.com/Zeyad-Karim).

The site documents hands-on work in intentionally vulnerable machines, security academy labs, Android testing, reverse engineering, and Active Directory. It is designed to keep the reasoning, commands, and evidence together in readable web-native articles.

## Local development

The project targets GitHub Pages with the `github-pages` gem:

```bash
bundle install
bundle exec jekyll serve
```

Open `http://localhost:4000` after the server starts.

## Structure

```text
_posts/                  Native Markdown writeups
_layouts/                Page, home, and article templates
_includes/               Shared head, header, navigation, and footer
_sass/main.scss          Site design system and responsive layout
assets/writeups/<slug>/  Extracted and optimized evidence images
assets/js/writeups.js    Client-side research library filters
source-pdfs/             Local source material, ignored by Git
```

## Research library

The `/writeups/` page includes client-side search plus platform, category, and difficulty filters. Articles carry structured metadata for platform, category, techniques, tools, reading time, and tags.

## Scope and disclosure

All published exercises are framed as intentionally vulnerable machines, CTFs, security academy labs, or authorized training environments. The local `source-pdfs/` directory is ignored by Git. Potentially live or user-specific testing artifacts from the source material are omitted from the public articles.
