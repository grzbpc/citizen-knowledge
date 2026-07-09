# Citizen Knowledge

Source files for the Citizen Knowledge site, built with Eleventy.

## How to add a new post

1. Copy any existing file in `src/posts/` as a starting point, e.g. `src/posts/01-nation-of-speed-racers.md`.
2. Rename it, e.g. `src/posts/07-my-new-story.md`.
3. Edit the frontmatter at the top (between the `---` lines):

```
---
layout: post.njk
title: Your headline here
date: 2026-07-10
source: "Metro, Friday 10 July 2026"
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
