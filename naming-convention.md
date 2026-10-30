Post filename convention (from post-029 onward):
post-NNN-YYYYMMDD-type-source-slug.md
type: standard / deep / brief
source: metro / standard

Numbers run in strict sequence with no gaps or duplicates. The date
in the filename must match the `date:` field. Counter-Read slugs end
in `-counter`.

Posts 001-028 keep old-style live URLs via permalink: overrides
(added retroactively 18 July 2026). New posts (029+) get no
permalink override; the URL follows the filename automatically.
Any script that builds a live URL must use `permalink:` verbatim
when it is present and only fall back to the filename otherwise.

Live domain: https://citizenknowledge.co.uk (set in src/CNAME). The
old address citizenknowledge.theperformanceofobedience.co.uk is
retired and must not appear in any template or script.

=========================================================
REQUIRED FRONTMATTER (every post, every type)
=========================================================

layout          post.njk / deep-read-post.njk / brief-post.njk
title
date            YYYY-MM-DD, same as the filename
order           position within that day, 1 = first
source          e.g. "Metro, Thursday 29 October 2026"
part            I / II / III / IV / V
partTitle       must match the manuscript Part heading exactly:
                  I    When the Law Stops Meaning What It Says
                  II   Learning the System
                  III  Moral Inversion
                  IV   Criminality and Control
                  V    Withdrawal
chapter / chapterTitle
subheading      a real manuscript section heading, never invented
description     one-line summary for the homepage
book_reference  one analytical sentence, shown at the foot of the post
has_article_quote
                true only when verbatim words from the source
                article appear in the body; otherwise false

Deep Read posts also carry `deep_read: true` (underscore).
Brief posts also carry quote: / quote_source: / quote_cite:.

=========================================================
QUOTATION RULES (added 24 July 2026, after two fabricated
"manuscript" quotes were found live on the site)
=========================================================

NO quotation is published unless its source is verified first.

Three permitted sources, each with its own explicit label:

1. MANUSCRIPT EXCERPT
   - Must be verbatim, contiguous text from the current manuscript
     file. No ellipsis-splicing.
   - MUST be verified by searching the manuscript BEFORE the
     draft is written. If the passage cannot be found, it does
     not go in the post. No exceptions, no paraphrase presented
     as a quote, no sentence written "in the book's voice."
   - Standard posts: none by default. If one is ever used, it is
     raw HTML:
     <blockquote class="quote--manuscript"><p>...</p><span class="cite">The Performance of Obedience, Ch. N</span></blockquote>
   - Deep Read posts: 2 to 4 excerpts as markdown "> *text*"
     inside the reframe. The layout labels them automatically.
     (Posts 007 and 008 use an older raw HTML form; leave as is.)
   - Brief posts: one excerpt in the quote: field PLUS
     quote_source: "manuscript" PLUS
     quote_cite: "The Performance of Obedience, Ch. N".
     No blockquote markup in the body.

2. SOURCE ARTICLE QUOTATION
   - Verbatim words from the news story being covered.
   - Brief posts: quote: field PLUS quote_source: "article"
     PLUS quote_cite naming speaker and publication/date.
   - Standard/Deep Read: inline in quotation marks, or a raw HTML
     blockquote with class="quote--article".
   - Any post containing one of these must ALSO set
     has_article_quote: true so the footer says so.

3. UNLABELLED PULL-QUOTE
   - quote: field with quote_source omitted or set to "none".
   - Renders with no source label at all.
   - Use sparingly; a sentence with no verifiable source is
     usually better cut than published.

WHY THIS EXISTS: the CSS previously stamped "From the manuscript"
onto every blockquote sitewide, including Brief pull-quotes that
were news quotes or site-written sentences. Combined with two
fabricated passages, this put invented text under the author's
own book title on live pages. The label is now driven by an
explicit field, never inferred.

=========================================================
Counter-Read flag (added 24 July 2026)
=========================================================

Any post (standard, deep, or brief) can carry `counter: true`.
Independent of `deep_read: true` and of the layout used. A
Counter-Read is a boundary case: a story that resembles the
book's material on the surface but which the reporting does not
actually support as an example of selective enforcement.

- Standard/Deep Read: reframe ends with an additional
  `### Why this doesn't hold` heading and short paragraph(s).
- Brief: no extra heading; the point is folded into the final
  sentences of `### The reframe`.
- book_reference still required, phrased as the boundary
  condition rather than a confirming claim.
- Slug ends in `-counter`.

=========================================================
Labels and stamp colours (same on every surface)
=========================================================

Homepage, post pages, chapters page, search, daily email and
weekly print pack all use the same wording:

  Standard Entry      grey outline
  Deep Read Entry     black
  Brief Entry         burgundy
  Counter-Read Entry  slate, dashed (shown alongside the type label)

Any change to one surface is made on all of them in the same pass:
src/index.njk, src/_includes/*.njk, src/chapters/index.njk,
src/js/search.js, src/search/index.njk, src/css/style.css,
build-email.js, build-print-pack.js.

=========================================================
Retired formats
=========================================================

<p class="brief-gist"> / <p class="brief-angle"> is DEAD.
Retired 20 July 2026, no CSS rules remain for it. Briefs use
`### The story` / `### The reframe` exactly like every other
post type. Posts 021 and 022 were still carrying the old HTML
until 24 July 2026 and rendered unstyled; both converted.
