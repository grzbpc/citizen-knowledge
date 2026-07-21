# Citizen Knowledge

Source files for the Citizen Knowledge site, built with Eleventy.

## How to add a new post

1. Copy any existing file in `src/posts/` as a starting point, e.g. `src/posts/post-15-slug.md`.
2. Rename it, e.g. `src/posts/post-16-my-new-story.md`.
3. Edit the frontmatter at the top (between the `---` lines):

```
---
layout: post.njk
title: Your headline here
date: 2026-07-16
order: 1
source: "Metro, Thursday 16 July 2026"
part: II
partTitle: Learning the System
chapter: 3
chapterTitle: Learning the Rules That Are Never Taught
subheading: Optional subheading here
description: "One-line summary for the homepage."
---
```

4. Below the frontmatter, write your two sections as before:

```
### The story

Your paraphrased summary of the news story, with attribution.

### The reframe

Your analysis, mapping the story to the book.
```

5. Save the file. That's the entire posting workflow, no other file needs to change. The homepage and the chapter index update automatically because they pull from every file in `src/posts/`.

## Post ordering

Posts sort by `date` first (newest day first), then by `order` within the same date.

- `order` is a plain number. **Lower number = appears first** on that day.
- If you post several stories on the same day, give each one an `order` value (1, 2, 3...) in the sequence you want them to appear, regardless of type (brief, standard, or deep-read) — order is entirely separate from format, so you can put a brief above a deep-read if it's the bigger story that day.
- If you leave `order` out of a post, it defaults to last place among that day's posts. Existing posts do not need to be edited unless you want to change their position.
- For a future "pinned" or ongoing feature that should sit above everything regardless of date, use a very low or negative `order` value (e.g. `order: -1`) as a stopgap. A proper `pinned: true` flag that breaks pinned posts out of date-sorting entirely can be added later if and when that's actually needed — not built yet.

## Testing locally before publishing

From the project folder in Command Prompt:

```
npm run start
```

This builds the site and opens a local preview address (usually `http://localhost:8080`) that updates live as you save changes. Press Ctrl+C to stop it when done.

## Publishing

If hosted via GitHub Pages with the Actions workflow set up (see the main setup guide), simply commit and push the new file:

```
git add .
git commit -m "Add new post: your headline"
git push
```

The site rebuilds and goes live automatically within a minute or two.
