---
layout: page
title: Writeups
description: "A searchable library of offensive-security labs, vulnerable machines, and application research."
permalink: /writeups/
---

<div class="library-summary">
  <div><h2><span class="accent">{{ site.posts | size }}</span> field notes</h2><p>Each article is based on an intentionally vulnerable or authorized training environment.</p></div>
</div>

<div class="filter-bar" role="search" aria-label="Filter research notes">
  <label class="search-wrap"><span class="visually-hidden">Search notes</span><input class="filter-input" type="search" placeholder="search title, tool, technique..." data-library-search></label>
  {% assign platforms = site.posts | map: "platform" | uniq | sort %}
  <label><span class="visually-hidden">Platform</span><select class="filter-select" name="platform" data-library-filter="platform"><option value="">all platforms</option>{% for platform in platforms %}<option value="{{ platform | slugify }}">{{ platform }}</option>{% endfor %}</select></label>
  {% assign categories = site.posts | map: "category" | uniq | sort %}
  <label><span class="visually-hidden">Category</span><select class="filter-select" name="category" data-library-filter="category"><option value="">all categories</option>{% for category in categories %}<option value="{{ category | slugify }}">{{ category }}</option>{% endfor %}</select></label>
  {% assign difficulties = site.posts | map: "difficulty" | uniq | sort %}
  <label><span class="visually-hidden">Difficulty</span><select class="filter-select" name="difficulty" data-library-filter="difficulty"><option value="">all levels</option>{% for difficulty in difficulties %}<option value="{{ difficulty | slugify }}">{{ difficulty }}</option>{% endfor %}</select></label>
</div>

<p class="filter-result" data-library-result></p>
<div class="library-grid">
  {% for post in site.posts %}
  <article class="library-card" data-library-card data-platform="{{ post.platform | slugify }}" data-category="{{ post.category | slugify }}" data-difficulty="{{ post.difficulty | slugify }}" data-search="{{ post.title | append: ' ' | append: post.description | append: ' ' | append: post.platform | append: ' ' | append: post.category | append: ' ' | append: post.tags | join: ' ' | downcase | escape }}">
    <div class="library-card-head"><h2><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h2><span class="read-arrow" aria-hidden="true">↗</span></div>
    <div class="card-meta"><span class="badge badge-platform">{{ post.platform }}</span><span class="badge badge-{{ post.difficulty | downcase }}">{{ post.difficulty }}</span><time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%Y-%m-%d" }}</time></div>
    <p class="library-excerpt">{{ post.description }}</p>
    <div class="card-footer">{% for tag in post.tags limit:4 %}<span class="tag">#{{ tag }}</span>{% endfor %}</div>
  </article>
  {% endfor %}
</div>
<p class="empty-state is-hidden" data-library-empty>No notes match that search. Try a different platform, category, or keyword.</p>
<script src="{{ '/assets/js/writeups.js' | relative_url }}" defer></script>
