# Citizen Knowledge

Source files for https://citizenknowledge.co.uk, built with Eleventy and published to GitHub Pages by the workflow in `.github/workflows/deploy.yml`. Every push to `main` rebuilds and redeploys the site within a couple of minutes.

The rules for filenames, frontmatter, quotations, Counter-Reads and labels are in `naming-convention.md`. That file is the authority; this one only covers the day-to-day mechanics.

## What lives where

| Path | What it is |
|---|---|
| `src/posts/` | One Markdown file per entry, `post-NNN-YYYYMMDD-type-source-slug.md` |
| `src/_includes/` | Post page layouts: `post.njk` (Standard), `deep-read-post.njk`, `brief-post.njk` |
| `src/index.njk` | Homepage |
| `src/chapters/index.njk` | Browse by chapter |
| `src/search/index.njk`, `src/js/search.js`, `src/search-index.11ty.js` | Search page and its index |
| `src/about/about.njk` | About page |
| `src/feed.njk` | RSS feed at `/feed.xml` |
| `src/css/style.css` | All styling |
| `src/CNAME` | Custom domain for GitHub Pages |
| `CK_Branding_FaviconShare/` | Source logo, favicon and share-image files |
| `build-email.js` | Builds the daily email into `daily-email-output.txt` |
| `push-to-buttondown.js` | Sends that file to Buttondown as a draft (never sends to subscribers) |
| `build-print-pack.js` | Builds the weekly print pack `.docx` |
| `control-panel.js` + `Citizen Knowledge Control Panel.bat` | Local browser control panel at http://localhost:4600 |

Generated files (`_site/`, `daily-email-output.txt`, `CitizenKnowledge_PrintPack_*.docx`) and the Buttondown API key file (`buttondown.key`) are listed in `.gitignore` and are never committed.

## Adding posts

1. Write the post file following `naming-convention.md`.
2. On GitHub, open `src/posts/`, choose Add file, then Upload files, drag the new files in and commit.
3. Wait two minutes, then check the homepage shows the new entries.

## Working locally (Windows)

From the project folder in Command Prompt:

```
git pull
node node_modules\@11ty\eleventy\cmd.cjs --serve
```

The preview runs at http://localhost:8080 and updates as files are saved. Press Ctrl+C to stop it.

Daily email for a given date:

```
node build-email.js 2026-10-29
node push-to-buttondown.js
```

Weekly print pack for a date range:

```
node build-print-pack.js 2026-10-26 2026-10-30
```

## Post ordering

Posts sort by `date` (newest day first), then by `order` within the day. Lower `order` appears first. A post with no `order` goes last on its day.
