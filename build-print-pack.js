// Citizen Knowledge — weekly print pack builder
//
// Reads every post in src/posts/, filters to a 7-day window, and produces a
// print-ready .docx for readers who don't use email/the website. Unlike the
// daily email, this includes deep-read entries IN FULL (manuscript quotes
// and all) rather than a teaser, and includes an explainer + domain/sign-up
// block ONCE at the very start of the document only.
//
// USAGE (from the project root, e.g. C:\Users\GRZ\citizen-knowledge):
//   node build-print-pack.js
//       -> builds a pack for the last 7 days ending today
//   node build-print-pack.js 2026-07-13
//       -> builds a pack for the 7-day window ending on this date (inclusive)
//   node build-print-pack.js 2026-07-07 2026-07-13
//       -> builds a pack for this exact date range (inclusive, both ends)
//
// Output is written to: CitizenKnowledge_PrintPack_<end-date>.docx
// Open it, check it looks right, print.

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  BorderStyle, Header, Footer, PageNumber, PageBreak, Table, TableRow,
  TableCell, WidthType, ShadingType, VerticalAlign
} = require("docx");

const POSTS_DIR = path.join(__dirname, "src", "posts");
const SITE_URL = "https://citizenknowledge.theperformanceofobedience.co.uk";

// ---- Colours (match the site's ledger/paper scheme) ----
const INK = "141412";
const BODY_INK = "242320";
const LEDGER = "7A2222";
const LEDGER_BG = "F1E3E0";
const RULE = "B8B2A2";

// ---- 1. Work out the date window ----
const argA = process.argv[2];
const argB = process.argv[3];

function isValidDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// Local-date string (not UTC), so defaults land on the correct day during BST.
function localISO(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

let startDate, endDate;

if (argA && argB) {
  if (!isValidDate(argA) || !isValidDate(argB)) {
    console.error("Invalid date(s). Use format YYYY-MM-DD.");
    process.exit(1);
  }
  startDate = argA;
  endDate = argB;
} else if (argA) {
  if (!isValidDate(argA)) {
    console.error(`Invalid date "${argA}". Use format YYYY-MM-DD, e.g. 2026-07-13`);
    process.exit(1);
  }
  endDate = argA;
  const d = new Date(argA + "T00:00:00");
  d.setDate(d.getDate() - 6);
  startDate = localISO(d);
} else {
  const today = new Date();
  endDate = localISO(today);
  const d = new Date(today);
  d.setDate(d.getDate() - 6);
  startDate = localISO(d);
}

// ---- 2. Frontmatter parser (same approach as build-email.js) ----
function parsePost(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  const [, frontmatterBlock, body] = match;
  const data = {};
  frontmatterBlock.split(/\r?\n/).forEach((line) => {
    const lineMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!lineMatch) return;
    let [, key, value] = lineMatch;
    value = value.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  });
  return { data, body: body.trim() };
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function getPostType(data) {
  if (data.layout && data.layout.trim() === "brief-post.njk") return "brief";
  if (
    (data.layout && data.layout.trim() === "deep-read-post.njk") ||
    (data.deep_read && data.deep_read.trim().toLowerCase() === "true")
  ) {
    return "deep-read";
  }
  return "standard";
}

// ---- 3. Extract sections — FULL content, no teaser-shortening for deep-read ----
// Deep-read manuscript quotes (lines starting with ">") are kept and returned
// as a separate array of quote blocks, in the order they appear, interleaved
// with the surrounding reframe paragraphs.
// Brief posts use the same ### The story / ### The reframe headings as
// standard posts (changed 20 July 2026 — they previously used raw
// <p class="brief-gist"> / <p class="brief-angle"> HTML, which is no longer
// produced by any post; see build-email.js for the matching fix).
function extractSections(body, postType) {
  const storyMatch = body.match(/###\s*The story\s*\r?\n+([\s\S]*?)(?=\r?\n###|\s*$)/i);
  const reframeMatch = body.match(
    /###\s*The [Rr]eframe(?:,\s*With the Manuscript)?\s*\r?\n+([\s\S]*?)(?=\r?\n###|\s*$)/i
  );

  const story = storyMatch ? storyMatch[1].trim() : "";
  const reframeRaw = reframeMatch ? reframeMatch[1].trim() : "";

  // Manuscript quotes appear in one of three forms in this project's posts:
  //   1. Markdown blockquote lines starting with ">" — current standard.
  //   2. Raw HTML: <div class="manuscript-quote">...</div> — early format.
  //   3. Raw HTML: <blockquote class="manuscript">...<span class="cite">...</span></blockquote>
  //      — used by posts 07 and 08. The cite span is appended to the quote
  //      text with an em dash rather than dropped.
  const reframeBlocks = [];
  const divSplitRegex = /<div class="manuscript-quote">([\s\S]*?)<\/div>/gi;
  const blockquoteSplitRegex = /<blockquote class="manuscript">([\s\S]*?)<\/blockquote>/gi;
  let lastIndex = 0;
  let match;

  function formatManuscriptHtml(rawHtml) {
    const citeMatch = rawHtml.match(/<span class="cite">([\s\S]*?)<\/span>/i);
    const citeText = citeMatch ? stripTags(citeMatch[1]).replace(/\s+/g, " ").trim() : "";
    const bodyOnly = rawHtml.replace(/<span class="cite">[\s\S]*?<\/span>/i, "");
    const quoteText = stripTags(bodyOnly).replace(/\s+/g, " ").trim();
    return citeText ? `${quoteText} — ${citeText}` : quoteText;
  }

  function pushParaChunks(chunk) {
    const paragraphs = chunk.split(/\r?\n\r?\n/);
    paragraphs.forEach((p) => {
      const trimmed = p.trim();
      if (!trimmed) return;
      if (trimmed.startsWith(">")) {
        const quoteText = trimmed
          .split(/\r?\n/)
          .map((line) => line.replace(/^>\s?/, ""))
          .join(" ")
          .trim();
        if (quoteText) reframeBlocks.push({ type: "quote", text: quoteText });
      } else {
        reframeBlocks.push({ type: "para", text: trimmed });
      }
    });
  }

  // Pass 1: extract <blockquote class="manuscript"> blocks first, since they
  // may contain their own blank lines internally that would otherwise
  // confuse the paragraph-chunk splitter.
  let withoutBlockquotes = "";
  lastIndex = 0;
  while ((match = blockquoteSplitRegex.exec(reframeRaw)) !== null) {
    withoutBlockquotes += reframeRaw.slice(lastIndex, match.index);
    withoutBlockquotes += `\n\n@@QUOTE@@${formatManuscriptHtml(match[1])}@@ENDQUOTE@@\n\n`;
    lastIndex = blockquoteSplitRegex.lastIndex;
  }
  withoutBlockquotes += reframeRaw.slice(lastIndex);

  // Pass 2: extract <div class="manuscript-quote"> blocks the same way.
  let normalised = "";
  lastIndex = 0;
  while ((match = divSplitRegex.exec(withoutBlockquotes)) !== null) {
    normalised += withoutBlockquotes.slice(lastIndex, match.index);
    const quoteText = stripTags(match[1]).replace(/\s+/g, " ").trim();
    normalised += `\n\n@@QUOTE@@${quoteText}@@ENDQUOTE@@\n\n`;
    lastIndex = divSplitRegex.lastIndex;
  }
  normalised += withoutBlockquotes.slice(lastIndex);

  // Pass 3: split into paragraph chunks, converting @@QUOTE@@ markers and
  // markdown ">" lines into quote blocks, everything else into para blocks.
  normalised.split(/\r?\n\r?\n/).forEach((p) => {
    const trimmed = p.trim();
    if (!trimmed) return;
    const markerMatch = trimmed.match(/^@@QUOTE@@([\s\S]*)@@ENDQUOTE@@$/);
    if (markerMatch) {
      const quoteText = markerMatch[1].trim();
      if (quoteText) reframeBlocks.push({ type: "quote", text: quoteText });
    } else if (trimmed.startsWith(">")) {
      const quoteText = trimmed
        .split(/\r?\n/)
        .map((line) => line.replace(/^>\s?/, ""))
        .join(" ")
        .trim();
      if (quoteText) reframeBlocks.push({ type: "quote", text: quoteText });
    } else {
      reframeBlocks.push({ type: "para", text: trimmed });
    }
  });

  return { story, reframeBlocks };
}

// ---- 4. Read & filter posts ----
if (!fs.existsSync(POSTS_DIR)) {
  console.error(`Could not find posts folder at: ${POSTS_DIR}`);
  console.error("Run this script from your project root (the folder containing src/).");
  process.exit(1);
}

const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md")).sort();
const matchingPosts = [];
const allFilesReport = [];

for (const file of files) {
  const fullPath = path.join(POSTS_DIR, file);
  const raw = fs.readFileSync(fullPath, "utf8");
  const parsed = parsePost(raw);
  if (!parsed) {
    allFilesReport.push(`${file} -> COULD NOT PARSE FRONTMATTER`);
    continue;
  }
  const { data, body } = parsed;
  if (!data.date) {
    allFilesReport.push(`${file} -> NO DATE FIELD FOUND`);
    continue;
  }
  const d = data.date.trim();
  const isMatch = d >= startDate && d <= endDate;
  allFilesReport.push(`${file} -> date="${d}" ${isMatch ? "(MATCH)" : "(outside window)"}`);
  if (!isMatch) continue;

  const sections = extractSections(body, getPostType(data));
  matchingPosts.push({ file, data, sections, postType: getPostType(data) });
}

console.log(`\n--- Scan report: ${files.length} .md file(s) checked in ${POSTS_DIR} ---`);
allFilesReport.forEach((line) => console.log(line));
console.log(`--- End scan report ---\n`);

if (matchingPosts.length === 0) {
  console.log(`No posts found between ${startDate} and ${endDate}. Nothing to build.`);
  process.exit(0);
}

// Sort chronologically (oldest first) for a natural reading order on paper
matchingPosts.sort((a, b) => a.data.date.localeCompare(b.data.date));

// ---- 5. Build the .docx ----
const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

const rangeLabel = startDate === endDate
  ? fmtDate(startDate)
  : `${fmtDate(startDate)} — ${fmtDate(endDate)}`;

const children = [];

// --- Cover / title block ---
children.push(
  new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: "CITIZEN KNOWLEDGE", bold: true, size: 20, font: "Courier New", color: LEDGER, characterSpacing: 20 })
    ]
  }),
  new Paragraph({
    spacing: { after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: INK, space: 8 } },
    children: [
      new TextRun({ text: "This Week's Entries", bold: true, size: 56, font: "Georgia", color: INK })
    ]
  }),
  new Paragraph({
    spacing: { after: 300 },
    children: [
      new TextRun({ text: rangeLabel, italics: true, size: 24, font: "Georgia", color: BODY_INK })
    ]
  })
);

// --- Explainer block (once only) ---
const explainerLines = [
  "Citizen Knowledge is a companion project to a book called The Performance of Obedience: Legitimacy, Law, and the Systems We Pretend to Believe In, by Greg Lewis, currently with UK literary agents.",
  "The book argues that selective enforcement — not consistent rule-following — is how modern institutions actually operate: the same law, the same rule, the same process, applied differently depending on who it lands on. Citizen Knowledge takes ordinary daily news stories and maps each one against that argument, showing which part of the book's structure the story illustrates.",
  "This printout gathers everything published on the site this week into one document. Three kinds of entry may appear:",
];

explainerLines.forEach((t) => {
  children.push(new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text: t, size: 22, font: "Georgia", color: BODY_INK })]
  }));
});

const entryTypeList = [
  ["Standard entries", "a news story mapped to the book, in full."],
  ["Deep Read entries", "a fuller analysis that includes short excerpts from the manuscript itself, printed here in full rather than summarised."],
  ["Briefs", "a shorter-format entry, included here in full."]
];
entryTypeList.forEach(([label, desc]) => {
  children.push(new Paragraph({
    spacing: { after: 100 },
    indent: { left: 260 },
    children: [
      new TextRun({ text: "•  ", size: 22, font: "Georgia", color: LEDGER }),
      new TextRun({ text: `${label} — `, bold: true, size: 22, font: "Georgia", color: INK }),
      new TextRun({ text: desc, size: 22, font: "Georgia", color: BODY_INK })
    ]
  }));
});

// --- Domain / online sign-up block ---
children.push(
  new Paragraph({ spacing: { before: 240, after: 100 }, children: [] }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: LEDGER },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: LEDGER },
      left: { style: BorderStyle.SINGLE, size: 4, color: LEDGER },
      right: { style: BorderStyle.SINGLE, size: 4, color: LEDGER },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: LEDGER },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: LEDGER },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: LEDGER_BG },
            margins: { top: 200, bottom: 200, left: 260, right: 260 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                spacing: { after: 100 },
                children: [
                  new TextRun({ text: "IF YOU'D LIKE TO TRY READING ONLINE", bold: true, size: 18, font: "Courier New", color: LEDGER, characterSpacing: 10 })
                ]
              }),
              new Paragraph({
                spacing: { after: 100 },
                children: [
                  new TextRun({ text: "Every entry also lives permanently on the website, where you can browse the full archive and search by chapter:", size: 22, font: "Georgia", color: BODY_INK })
                ]
              }),
              new Paragraph({
                spacing: { after: 100 },
                children: [
                  new TextRun({ text: SITE_URL, bold: true, size: 22, font: "Courier New", color: INK })
                ]
              }),
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({ text: "Type that address into any web browser (on a phone, tablet, or computer) to visit the site. If you'd like new entries sent to you by email automatically as they're published, there is a simple sign-up box on the site's homepage and About page — just enter your email address there.", size: 22, font: "Georgia", color: BODY_INK })
                ]
              })
            ]
          })
        ]
      })
    ]
  }),
  new Paragraph({ spacing: { after: 200 }, children: [new PageBreak()] })
);

// --- Entries ---
function buildMappingLine(data) {
  let line = `Part ${data.part}: ${data.partTitle}  →  Chapter ${data.chapter}: ${data.chapterTitle}`;
  if (data.subheading) line += `  →  ${data.subheading}`;
  return line;
}

matchingPosts.forEach((post, index) => {
  const { data, sections, postType } = post;

  // Stamp block — colours mirror the site's three-way scheme:
  //   Deep Read = solid black background, white text
  //   Brief     = white background, burgundy border and text
  //   Standard  = pale grey background, grey text (site uses transparent;
  //               paper needs a filled/bordered box to read as a stamp)
  const stampLabelText = postType === "deep-read" ? "MAPS TO THE PERFORMANCE OF OBEDIENCE — DEEP READ ENTRY"
    : postType === "brief" ? "MAPS TO THE PERFORMANCE OF OBEDIENCE — BRIEF ENTRY"
    : "MAPS TO THE PERFORMANCE OF OBEDIENCE — STANDARD ENTRY";

  const stampFill = postType === "deep-read" ? INK
    : postType === "brief" ? "FFFFFF"
    : "EDEBE5";
  const stampTextColor = postType === "deep-read" ? "F7F5F0"
    : postType === "brief" ? LEDGER
    : BODY_INK;
  const stampBorderColor = postType === "brief" ? LEDGER : stampFill;
  const stampBorderStyle = postType === "brief" ? BorderStyle.SINGLE : BorderStyle.NONE;
  const stampBorderSize = postType === "brief" ? 8 : 0;

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: stampBorderStyle, size: stampBorderSize, color: stampBorderColor },
        bottom: { style: stampBorderStyle, size: stampBorderSize, color: stampBorderColor },
        left: { style: stampBorderStyle, size: stampBorderSize, color: stampBorderColor },
        right: { style: stampBorderStyle, size: stampBorderSize, color: stampBorderColor },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: stampFill },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: stampFill },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: stampFill },
              margins: { top: 140, bottom: 140, left: 220, right: 220 },
              children: [
                new Paragraph({
                  spacing: { after: 40 },
                  children: [new TextRun({ text: stampLabelText, bold: true, size: 16, font: "Courier New", color: stampTextColor, characterSpacing: 8 })]
                }),
                new Paragraph({
                  children: [new TextRun({ text: buildMappingLine(data), bold: true, size: 19, font: "Courier New", color: stampTextColor })]
                })
              ]
            })
          ]
        })
      ]
    }),
    new Paragraph({ spacing: { before: 220, after: 40 }, children: [
      new TextRun({ text: data.title || "(untitled)", bold: true, size: 34, font: "Georgia", color: INK })
    ]}),
    new Paragraph({ spacing: { after: 220 }, children: [
      new TextRun({ text: data.source || "", italics: true, bold: true, size: 20, font: "Georgia", color: INK })
    ]})
  );

  // The story
  if (sections.story) {
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: LEDGER, space: 4 } },
        children: [new TextRun({ text: "THE STORY", bold: true, size: 18, font: "Courier New", color: LEDGER, characterSpacing: 10 })]
      }),
      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun({ text: sections.story, size: 23, font: "Georgia", color: BODY_INK })]
      })
    );
  }

  // The reframe (full — including manuscript quote blocks for deep-read)
  const reframeHeading = postType === "deep-read" ? "THE REFRAME, WITH THE MANUSCRIPT" : "THE REFRAME";
  children.push(
    new Paragraph({
      spacing: { after: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: LEDGER, space: 4 } },
      children: [new TextRun({ text: reframeHeading, bold: true, size: 18, font: "Courier New", color: LEDGER, characterSpacing: 10 })]
    })
  );

  (sections.reframeBlocks || []).forEach((block) => {
    if (block.type === "quote") {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: LEDGER },
            bottom: { style: BorderStyle.NONE, size: 0, color: LEDGER },
            left: { style: BorderStyle.SINGLE, size: 24, color: LEDGER },
            right: { style: BorderStyle.NONE, size: 0, color: LEDGER },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: LEDGER },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: LEDGER },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: LEDGER_BG },
                  margins: { top: 160, bottom: 160, left: 260, right: 260 },
                  children: [
                    new Paragraph({
                      spacing: { after: 60 },
                      children: [new TextRun({ text: "FROM THE MANUSCRIPT", bold: true, size: 15, font: "Courier New", color: LEDGER, characterSpacing: 8 })]
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: block.text, italics: true, size: 22, font: "Georgia", color: INK })]
                    })
                  ]
                })
              ]
            })
          ]
        }),
        new Paragraph({ spacing: { before: 200, after: 200 }, children: [] })
      );
    } else {
      children.push(
        new Paragraph({
          spacing: { after: 220 },
          children: [new TextRun({ text: block.text, size: 23, font: "Georgia", color: BODY_INK })]
        })
      );
    }
  });

  // Book reference footer line — this field appears on all post types
  if (data.book_reference) {
    children.push(
      new Paragraph({
        spacing: { before: 100, after: 200 },
        children: [new TextRun({ text: data.book_reference, italics: true, size: 20, font: "Georgia", color: BODY_INK })]
      })
    );
  }

  // Permalink line (informational — not a live link on paper, just a reference).
  // Posts 001-028 carry a `permalink:` override preserving their original
  // pre-rename URL (see naming-convention.md), so that value must win where
  // it exists. Posts from 029 onward have no override; Eleventy derives the
  // URL from the filename instead — same logic as build-email.js.
  let postUrl;
  if (data.permalink) {
    const cleaned = data.permalink.trim().replace(/index\.html$/, "");
    postUrl = `${SITE_URL}${cleaned.startsWith("/") ? "" : "/"}${cleaned}`;
  } else {
    const slug = post.file.replace(/\.md$/, "").replace(/ \(\d+\)$/, "");
    postUrl = `${SITE_URL}/posts/${slug}/`;
  }
  children.push(
    new Paragraph({
      spacing: { before: 100, after: 60 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 8 } },
      children: [
        new TextRun({ text: "Also online at: ", size: 17, font: "Courier New", color: INK }),
        new TextRun({ text: postUrl, size: 17, font: "Courier New", color: LEDGER })
      ]
    })
  );

  // Page break between entries (not after the last one)
  if (index < matchingPosts.length - 1) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }
});

// --- Closing note ---
children.push(
  new Paragraph({ spacing: { before: 400, after: 100 }, border: { top: { style: BorderStyle.SINGLE, size: 16, color: INK, space: 8 } }, children: [
    new TextRun({ text: `That's everything published between ${fmtDate(startDate)} and ${fmtDate(endDate)}.`, size: 20, font: "Georgia", color: BODY_INK })
  ]}),
  new Paragraph({ spacing: { after: 0 }, children: [
    new TextRun({ text: `${SITE_URL} — new entries most days.`, size: 18, font: "Courier New", color: LEDGER })
  ]})
);

// ---- 6. Assemble document ----
const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1100, bottom: 1100, left: 1100, right: 1100 }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: "CITIZEN KNOWLEDGE — WEEKLY PRINT PACK", size: 14, font: "Courier New", color: RULE, characterSpacing: 6 })]
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Page ", size: 16, font: "Courier New", color: RULE }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Courier New", color: RULE }),
                new TextRun({ text: " of ", size: 16, font: "Courier New", color: RULE }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: "Courier New", color: RULE })
              ]
            })
          ]
        })
      },
      children
    }
  ]
});

const outFile = path.join(__dirname, `CitizenKnowledge_PrintPack_${endDate}.docx`);
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outFile, buf);
  console.log(`Print pack built: ${outFile}`);
  console.log(`${matchingPosts.length} post(s) included, ${startDate} to ${endDate}.`);
});
