---
layout: post
title: "PortSwigger Web Security Academy: DOM XSS Sinks"
date: 2026-08-28
platform: "PortSwigger Web Security Academy"
difficulty: "Medium"
category: "Web Security"
description: "Six DOM and reflected XSS labs solved by tracing browser-controlled sources into HTML, URL, selector, attribute, and JavaScript sinks."
reading_time: "8 min"
tags: [web, xss, dom-xss, javascript, jquery, burp-suite]
techniques: [source-to-sink tracing, event handlers, URL scheme abuse, context breaking]
tools: [Burp Suite, browser devtools]
disclaimer: "Performed against PortSwigger Web Security Academy labs, an authorized security-training platform. All payloads and endpoints are limited to the supplied lab context."
toc_items:
  - id: "method"
    label: "The source-to-sink method"
  - id: "dom-labs"
    label: "DOM XSS labs"
  - id: "reflected-stored"
    label: "Reflected and stored contexts"
  - id: "takeaways"
    label: "Takeaways"
---

<div class="info-box"><table><tr><td>Labs</td><td>DOM, reflected, and stored XSS</td></tr><tr><td>Core idea</td><td>Trace attacker-controlled data into its rendering context</td></tr><tr><td>Validation</td><td>Browser behavior and lab success state</td></tr></table></div>

## The source-to-sink method {#method}

The common thread across these labs was not a single payload. It was identifying where data entered the page and what API consumed it. I used the application source, browser behavior, and Burp requests to classify the context before choosing a proof-of-execution payload.

| Source | Sink/context | Lab lesson |
| --- | --- | --- |
| `location.search` | `innerHTML` | HTML parsing creates executable markup |
| `location.search` | jQuery `href` | A URL value can become a `javascript:` navigation |
| `location.hash` | jQuery selector | Old selector APIs interpreted HTML |
| Search parameter | HTML attribute | Quotes can break out of the intended value |
| Comment author | Anchor `href` | Stored data can execute on a later click |
| Search parameter | JavaScript string | Quote termination changes script structure |

## DOM XSS labs {#dom-labs}

### `innerHTML` from `location.search`

The blog search page copied a query-string value into an element using `innerHTML`. A tag-and-event payload reached the sink and called `alert`:

```html
<img src=1 onerror=alert('xss')>
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-dom-xss/search-sink.webp' | relative_url }}" alt="PortSwigger DOM XSS search lab result" loading="lazy"><figcaption>The search input was only the visible surface; the unsafe `innerHTML` assignment was the root cause.</figcaption></figure>

### jQuery anchor `href` from `location.search`

The feedback page used a `returnPath` value to set an anchor's `href`. Replacing the expected path with a JavaScript URL produced the proof of execution:

```text
javascript:alert(document.cookie)
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-dom-xss/feedback-page.webp' | relative_url }}" alt="PortSwigger submit feedback lab page" loading="lazy"><figcaption>URL-valued input must be treated as data, not assigned to navigation properties without validation.</figcaption></figure>

### jQuery selector sink on hash change

Another lab used the URL fragment to auto-scroll to a post through jQuery. The page loaded the vulnerable `jquery_1-8-2.js` version, and the selector path could interpret attacker-controlled markup.

The lab payload used an iframe whose `onload` handler appended an image with an event handler:

```html
<iframe src="https://<lab-host>/#"
  onload="this.src+='<img src=x onerror=print()>'"
  hidden="hidden"></iframe>
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-dom-xss/hashchange-lab.webp' | relative_url }}" alt="PortSwigger DOM XSS hashchange lab completion" loading="lazy"><figcaption>Hash-based routing is still attacker-controlled input and needs the same sink analysis as query parameters.</figcaption></figure>

## Reflected and stored contexts {#reflected-stored}

### Reflected attribute injection

The search value was reflected into an HTML attribute, but angle brackets were encoded. That restriction did not stop context breaking: closing the attribute and adding an event handler was enough.

```text
" onmouseover=alert(1) x="
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-dom-xss/jquery-version.webp' | relative_url }}" alt="PortSwigger lab evidence showing the JavaScript dependency version" loading="lazy"><figcaption>Encoding one character class does not make an attribute context safe.</figcaption></figure>

### Stored anchor `href`

The comment form stored an author name that later rendered as a link. The same URL-scheme issue applied, but the execution happened when another user clicked the stored author value:

```text
javascript:alert(1)
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-dom-xss/stored-xss.webp' | relative_url }}" alt="PortSwigger stored XSS lab result" loading="lazy"><figcaption>Stored XSS changes the timing of exploitation: unsafe data can persist long after submission.</figcaption></figure>

### Reflected JavaScript string

The final lab reflected the query inside a JavaScript string. The payload escaped the string, called `alert`, and opened a new string to keep the surrounding script syntactically valid:

```javascript
' ';alert(1);' '
```

<figure class="evidence"><img src="{{ '/assets/writeups/portswigger-dom-xss/js-string-xss.webp' | relative_url }}" alt="PortSwigger reflected XSS in JavaScript string evidence" loading="lazy"><figcaption>Context determines the delimiter that must be controlled.</figcaption></figure>

## Takeaways {#takeaways}

- Identify the source and sink before reaching for a payload.
- `innerHTML`, dynamic selectors, navigation properties, and JavaScript string concatenation each require different defenses.
- Encoding is context-specific. HTML-encoding angle brackets does not protect an attribute or JavaScript string by itself.
- Stored XSS deserves extra attention because the dangerous value can outlive the request that introduced it.
