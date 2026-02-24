---
layout: default
title: Writeups
description: "All writeups organized by platform."
permalink: /writeups/
---

<div class="page-header">
  <h1 class="page-title">$ ls ./writeups/</h1>
  <p class="page-desc">All writeups organized by platform — {{ site.posts | size }} total.</p>
</div>

<div class="writeups-page">
  {% assign platforms = site.posts | map: "platform" | uniq | sort %}
  {% for platform in platforms %}
  {% assign platform_posts = site.posts | where: "platform", platform %}
  {% if platform_posts.size > 0 %}
  <div class="platform-section">
    <h3 class="platform-header">{{ platform }} ({{ platform_posts.size }})</h3>
    <table class="writeups-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Difficulty</th>
          <th>Date</th>
          <th>Tags</th>
        </tr>
      </thead>
      <tbody>
        {% for post in platform_posts %}
        <tr>
          <td><a href="{{ post.url | relative_url }}">{{ post.title }}</a></td>
          <td>
            {% if post.difficulty %}
            <span class="badge badge-{{ post.difficulty | downcase }}">{{ post.difficulty }}</span>
            {% endif %}
          </td>
          <td><span style="font-family:monospace;font-size:0.85rem;color:#8b949e;">{{ post.date | date: "%Y-%m-%d" }}</span></td>
          <td>
            {% if post.tags %}
            <div style="display:flex;flex-wrap:wrap;gap:0.3rem;">
              {% for tag in post.tags limit:4 %}
              <span class="tag">#{{ tag }}</span>
              {% endfor %}
            </div>
            {% endif %}
          </td>
        </tr>
        {% endfor %}
      </tbody>
    </table>
  </div>
  {% endif %}
  {% endfor %}
</div>
