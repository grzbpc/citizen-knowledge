Post filename convention (from post-029 onward):
post-NNN-YYYYMMDD-type-source-slug.md
type: standard / deep / brief
source: metro / standard

Posts 001–028 keep old-style live URLs via permalink: overrides
(added retroactively 18 July 2026). New posts (029+) get no
permalink override — URL follows filename automatically.

Counter-Read flag (added 24 July 2026):
Any post — standard, deep, or brief — can carry `counter: true`
in its frontmatter. This is independent of `deep_read: true` and
the `layout:`/`type` in the filename; it does not change which
layout file is used. A Counter-Read is a boundary case: a story
that resembles the book's usual material on the surface but which
the reporting does not actually support as an example of selective
enforcement or discretion.

Structural differences for a Counter-Read post:
- Standard/Deep Read layouts: the reframe ends with an additional
  `### Why this doesn't hold` heading and its own short paragraph(s).
- Brief layout: no extra heading (briefs only have story/reframe
  and an optional `quote`); the "why this doesn't hold" point is
  folded into the final sentence(s) of `### The reframe` instead.
- `book_reference` is still required on every Counter-Read post,
  phrased as the boundary condition rather than a confirming claim
  — e.g. "This entry is included as a boundary case: ... resembles
  the book's usual material, but the reporting does not support
  that reading."

Slugs for Counter-Read posts should end in `-counter` (e.g.
post-041-20260722-standard-metro-digital-id-scrapped-counter.md)
so they're identifiable by filename alone, in addition to the
`counter: true` flag and on-page badge.
