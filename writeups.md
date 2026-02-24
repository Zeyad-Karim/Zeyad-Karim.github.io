---
layout: default
title: Writeups
permalink: /writeups/
---
<div class="writeups-section">
  <div class="container">
    <h1 class="section-title" style="font-size:1.75rem;margin-bottom:2rem;">
      <span class="prompt-char">$</span> ls -la writeups/
    </h1>

    <!-- Hack The Box -->
    {% assign htb_posts = site.posts | where: "platform", "Hack The Box" %}
    <div class="platform-section" id="htb">
      <div class="platform-heading">
        <span>⬡</span> Hack The Box
        <span class="badge badge-platform platform-badge">({{ htb_posts | size }})</span>
      </div>
      {% if htb_posts.size > 0 %}
      <div class="writeup-list">
        {% for post in htb_posts %}
        <div class="writeup-row">
          <a href="{{ post.url | relative_url }}" class="writeup-title">{{ post.title }}</a>
          <div class="writeup-meta">
            {% if post.difficulty %}
            <span class="badge badge-{{ post.difficulty | downcase }}">{{ post.difficulty }}</span>
            {% endif %}
            <span class="writeup-date">{{ post.date | date: "%Y-%m-%d" }}</span>
            {% if post.tags %}
            <div class="writeup-tags">
              {% for tag in post.tags limit:3 %}
              <span class="tag">#{{ tag }}</span>
              {% endfor %}
            </div>
            {% endif %}
          </div>
        </div>
        {% endfor %}
      </div>
      {% else %}
      <div class="writeup-list"><p class="no-posts">// No HTB writeups yet — check back soon</p></div>
      {% endif %}
    </div>

    <!-- TryHackMe -->
    {% assign thm_posts = site.posts | where: "platform", "TryHackMe" %}
    <div class="platform-section" id="thm">
      <div class="platform-heading">
        <span>◈</span> TryHackMe
        <span class="badge badge-platform platform-badge">({{ thm_posts | size }})</span>
      </div>
      {% if thm_posts.size > 0 %}
      <div class="writeup-list">
        {% for post in thm_posts %}
        <div class="writeup-row">
          <a href="{{ post.url | relative_url }}" class="writeup-title">{{ post.title }}</a>
          <div class="writeup-meta">
            {% if post.difficulty %}
            <span class="badge badge-{{ post.difficulty | downcase }}">{{ post.difficulty }}</span>
            {% endif %}
            <span class="writeup-date">{{ post.date | date: "%Y-%m-%d" }}</span>
            {% if post.tags %}
            <div class="writeup-tags">
              {% for tag in post.tags limit:3 %}
              <span class="tag">#{{ tag }}</span>
              {% endfor %}
            </div>
            {% endif %}
          </div>
        </div>
        {% endfor %}
      </div>
      {% else %}
      <div class="writeup-list"><p class="no-posts">// No THM writeups yet — check back soon</p></div>
      {% endif %}
    </div>

    <!-- VulnHub -->
    {% assign vh_posts = site.posts | where: "platform", "VulnHub" %}
    <div class="platform-section" id="vulnhub">
      <div class="platform-heading">
        <span>◉</span> VulnHub
        <span class="badge badge-platform platform-badge">({{ vh_posts | size }})</span>
      </div>
      {% if vh_posts.size > 0 %}
      <div class="writeup-list">
        {% for post in vh_posts %}
        <div class="writeup-row">
          <a href="{{ post.url | relative_url }}" class="writeup-title">{{ post.title }}</a>
          <div class="writeup-meta">
            {% if post.difficulty %}
            <span class="badge badge-{{ post.difficulty | downcase }}">{{ post.difficulty }}</span>
            {% endif %}
            <span class="writeup-date">{{ post.date | date: "%Y-%m-%d" }}</span>
            {% if post.tags %}
            <div class="writeup-tags">
              {% for tag in post.tags limit:3 %}
              <span class="tag">#{{ tag }}</span>
              {% endfor %}
            </div>
            {% endif %}
          </div>
        </div>
        {% endfor %}
      </div>
      {% else %}
      <div class="writeup-list"><p class="no-posts">// No VulnHub writeups yet — check back soon</p></div>
      {% endif %}
    </div>

    <!-- PortSwigger -->
    {% assign ps_posts = site.posts | where: "platform", "PortSwigger" %}
    <div class="platform-section" id="portswigger">
      <div class="platform-heading">
        <span>◎</span> PortSwigger / Web Labs
        <span class="badge badge-platform platform-badge">({{ ps_posts | size }})</span>
      </div>
      {% if ps_posts.size > 0 %}
      <div class="writeup-list">
        {% for post in ps_posts %}
        <div class="writeup-row">
          <a href="{{ post.url | relative_url }}" class="writeup-title">{{ post.title }}</a>
          <div class="writeup-meta">
            {% if post.difficulty %}
            <span class="badge badge-{{ post.difficulty | downcase }}">{{ post.difficulty }}</span>
            {% endif %}
            <span class="writeup-date">{{ post.date | date: "%Y-%m-%d" }}</span>
            {% if post.tags %}
            <div class="writeup-tags">
              {% for tag in post.tags limit:3 %}
              <span class="tag">#{{ tag }}</span>
              {% endfor %}
            </div>
            {% endif %}
          </div>
        </div>
        {% endfor %}
      </div>
      {% else %}
      <div class="writeup-list"><p class="no-posts">// No PortSwigger writeups yet — check back soon</p></div>
      {% endif %}
    </div>

    <!-- Other -->
    {% assign other_posts = site.posts | where: "platform", "Other" %}
    {% assign misc_posts = site.posts | where: "platform", "Misc" %}
    {% assign all_other = other_posts | concat: misc_posts %}
    <div class="platform-section" id="other">
      <div class="platform-heading">
        <span>◌</span> Other / Misc
        <span class="badge badge-platform platform-badge">({{ all_other | size }})</span>
      </div>
      {% if all_other.size > 0 %}
      <div class="writeup-list">
        {% for post in all_other %}
        <div class="writeup-row">
          <a href="{{ post.url | relative_url }}" class="writeup-title">{{ post.title }}</a>
          <div class="writeup-meta">
            {% if post.difficulty %}
            <span class="badge badge-{{ post.difficulty | downcase }}">{{ post.difficulty }}</span>
            {% endif %}
            <span class="writeup-date">{{ post.date | date: "%Y-%m-%d" }}</span>
            {% if post.tags %}
            <div class="writeup-tags">
              {% for tag in post.tags limit:3 %}
              <span class="tag">#{{ tag }}</span>
              {% endfor %}
            </div>
            {% endif %}
          </div>
        </div>
        {% endfor %}
      </div>
      {% else %}
      <div class="writeup-list"><p class="no-posts">// No misc writeups yet — check back soon</p></div>
      {% endif %}
    </div>

  </div>
</div>
