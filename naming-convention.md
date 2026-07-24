Post filename convention (from post-029 onward):
post-NNN-YYYYMMDD-type-source-slug.md
type: standard / deep / brief
source: metro / standard

Posts 001-028 keep old-style live URLs via permalink: overrides
(added retroactively 18 July 2026). New posts (029+) get no
permalink override - URL follows filename automatically.

=========================================================
QUOTATION RULES (added 24 July 2026, after two fabricated
"manuscript" quotes were found live on the site)
=========================================================

NO quotation is published unless its source is verified first.

Three permitted sources, each with its own explicit label:

1. MANUSCRIPT EXCERPT
   - Must be verbatim text from the current manuscript file.
   - MUST be verified by searching the manuscript BEFORE the
     draft is written. If the passage cannot be found, it does
     not go in the post. No exceptions, no paraphrase presented
     as a quote, no sentence written "in the book's voice."
   - Deep Read posts: markdown "> *text*" inside the body,
     followed by a <span class="cite"> line naming the chapter.
   - Brief posts: quote: field PLUS quote_source: "manuscript"
     PLUS quote_cite: "The Performance of Obedience, Ch. N".

2. SOURCE ARTICLE QUOTATION
   - Verbatim words from the news story being covered.
   - Brief posts: quote: field PLUS quote_source: "article"
     PLUS quote_cite naming speaker and publication/date.
   - Standard/Deep Read: raw HTML blockquote with
     class="quote--article".
   - Any post containing one of these must ALSO set
     has_article_quote: true so the footer stops claiming
     "no verbatim text reproduced."

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

Any post - standard, deep, or brief - can carry `counter: true`.
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
Retired formats
=========================================================

<p class="brief-gist"> / <p class="brief-angle"> is DEAD.
Retired 20 July 2026, no CSS rules remain for it. Briefs use
`### The story` / `### The reframe` exactly like every other
post type. Posts 021 and 022 were still carrying the old HTML
until 24 July 2026 and rendered unstyled; both converted.
