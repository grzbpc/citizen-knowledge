// Citizen Knowledge — daily email builder
//
// Reads every post in src/posts/, filters to a target date (default: today),
// and writes a formatted, ready-to-paste block to a .txt file so it can be
// copied straight into Buttondown's "New email" screen.
//
// USAGE (from the project root, e.g. C:\Users\GRZ\citizen-knowledge):
//   node build-email.js
//       -> builds today's email
//   node build-email.js 2026-07-08
//       -> builds the email for a specific date (YYYY-MM-DD)
//
// Output is written to: daily-email-output.txt
// Open that file, copy everything, paste into Buttondown, send.

const fs = require("fs");
const path = require("path");

const POSTS_DIR = path.join(__dirname, "src", "posts");
const OUTPUT_FILE = path.join(__dirname, "daily-email-output.txt");

// ---- 1. Work out which date we're building for ----
const argDate = process.argv[2];
function localTodayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
const targetDate = argDate || localTodayISO(); // YYYY-MM-DD, local (not UTC)

if (argDate && !/^\d{4}-\d{2}-\d{2}$/.test(argDate)) {
  console.error(`Invalid date "${argDate}". Use format YYYY-MM-DD, e.g. 2026-07-14`);
  process.exit(1);
}

// ---- 2. Very small, dependency-free frontmatter parser ----
// Handles simple "key: value" lines between --- delimiters.
// Good enough for this site's frontmatter (no nested structures).
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
    // Strip surrounding quotes if present
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

// ---- 3. Pull out sections from the body, depending on post type ----
// Standard posts use: ### The story / ### The reframe
// Deep-read posts use: ### The story / ### The Reframe, With the Manuscript
//   and interleave manuscript quotes as blockquote lines starting with ">".
// Brief posts use raw HTML: <p class="brief-gist"> / <p class="brief-angle">
function extractSections(body, postType) {
  if (postType === "brief") {
    const gistMatch = body.match(
      /<p class="brief-gist">([\s\S]*?)<\/p>/i
    );
    const angleMatch = body.match(
      /<p class="brief-angle">([\s\S]*?)<\/p>/i
    );
    return {
      story: gistMatch ? stripTags(gistMatch[1]).trim() : "",
      reframeBlocks: [
        { type: "para", text: angleMatch ? stripTags(angleMatch[1]).trim() : "" }
      ].filter((b) => b.text),
    };
  }

  const storyMatch = body.match(
    /###\s*The story\s*\r?\n+([\s\S]*?)(?=\r?\n###|\s*$)/i
  );
  // Matches either "The reframe" or "The Reframe, With the Manuscript"
  const reframeMatch = body.match(
    /###\s*The [Rr]eframe(?:,\s*With the Manuscript)?\s*\r?\n+([\s\S]*?)(?=\r?\n###|\s*$)/i
  );

  const story = storyMatch ? storyMatch[1].trim() : "";
  const reframeRaw = reframeMatch ? reframeMatch[1].trim() : "";

  // Split the reframe into ordered blocks, tagging manuscript excerpts.
  // Excerpts appear in one of three formats depending on when the post was
  // written:
  //   1. Markdown blockquotes (lines starting ">") — current standard.
  //   2. Raw HTML <div class="manuscript-quote">...</div> — early format.
  //   3. Raw HTML <blockquote class="manuscript">...<span class="cite">...</span></blockquote>
  //      — used by posts 07 and 08. The cite span is appended to the quote
  //      text with an em dash rather than dropped.
  const reframeBlocks = [];
  const divRegex = /<div class="manuscript-quote">([\s\S]*?)<\/div>/gi;
  const blockquoteRegex = /<blockquote class="manuscript">([\s\S]*?)<\/blockquote>/gi;
  let lastIndex = 0;
  let m;

  function formatManuscriptHtml(rawHtml) {
    const citeMatch = rawHtml.match(/<span class="cite">([\s\S]*?)<\/span>/i);
    const citeText = citeMatch ? stripTags(citeMatch[1]).replace(/\s+/g, " ").trim() : "";
    const bodyOnly = rawHtml.replace(/<span class="cite">[\s\S]*?<\/span>/i, "");
    const quoteText = stripTags(bodyOnly).replace(/\s+/g, " ").trim();
    return citeText ? `${quoteText} — ${citeText}` : quoteText;
  }

  function pushParaChunks(chunk) {
    chunk.split(/\r?\n\r?\n/).forEach((p) => {
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
  while ((m = blockquoteRegex.exec(reframeRaw)) !== null) {
    withoutBlockquotes += reframeRaw.slice(lastIndex, m.index);
    withoutBlockquotes += `\n\n@@QUOTE@@${formatManuscriptHtml(m[1])}@@ENDQUOTE@@\n\n`;
    lastIndex = blockquoteRegex.lastIndex;
  }
  withoutBlockquotes += reframeRaw.slice(lastIndex);

  // Pass 2: extract <div class="manuscript-quote"> blocks the same way.
  let normalised = "";
  lastIndex = 0;
  while ((m = divRegex.exec(withoutBlockquotes)) !== null) {
    normalised += withoutBlockquotes.slice(lastIndex, m.index);
    const quoteText = stripTags(m[1]).replace(/\s+/g, " ").trim();
    normalised += `\n\n@@QUOTE@@${quoteText}@@ENDQUOTE@@\n\n`;
    lastIndex = divRegex.lastIndex;
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

// Minimal HTML tag stripper for brief-post <p> contents (handles <em>, <strong> etc.)
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

// ---- Detect post type from layout / flags ----
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

// ---- 4. Build the mapping line, matching the site's own format ----
function buildMappingLine(data) {
  let line = `Part ${data.part}: ${data.partTitle} → Chapter ${data.chapter}: ${data.chapterTitle}`;
  if (data.subheading) {
    line += ` → ${data.subheading}`;
  }
  return line;
}

// ---- 5. Read all posts, filter to target date ----
if (!fs.existsSync(POSTS_DIR)) {
  console.error(`Could not find posts folder at: ${POSTS_DIR}`);
  console.error("Run this script from your project root (the folder containing src/).");
  process.exit(1);
}

const files = fs
  .readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith(".md"))
  .sort(); // post-01, post-02... keeps stable order

const matchingPosts = [];
const allFilesReport = [];

for (const file of files) {
  const fullPath = path.join(POSTS_DIR, file);
  const raw = fs.readFileSync(fullPath, "utf8");
  const parsed = parsePost(raw);
  if (!parsed) {
    console.warn(`Skipped ${file}: could not parse frontmatter (no valid --- block found).`);
    allFilesReport.push(`${file} -> COULD NOT PARSE FRONTMATTER`);
    continue;
  }

  const { data, body } = parsed;
  if (!data.date) {
    console.warn(`Skipped ${file}: no date field found in frontmatter.`);
    allFilesReport.push(`${file} -> NO DATE FIELD FOUND`);
    continue;
  }

  const isMatch = data.date.trim() === targetDate;
  allFilesReport.push(
    `${file} -> date="${data.date.trim()}" ${isMatch ? "(MATCH)" : "(not " + targetDate + ")"}`
  );

  if (!isMatch) continue;

  const sections = extractSections(body, getPostType(data));
  matchingPosts.push({ file, data, sections });
}

// Always print the full scan report so mismatches are visible, not silent.
console.log(`\n--- Scan report: ${files.length} .md file(s) checked in ${POSTS_DIR} ---`);
allFilesReport.forEach((line) => console.log(line));
console.log(`--- End scan report ---\n`);

// ---- 6. Bail out cleanly if nothing to send ----
if (matchingPosts.length === 0) {
  console.log(`No posts found dated ${targetDate}. Nothing to build — no email needed today.`);
  process.exit(0);
}

// ---- 7. Format the output block ----
const dateForHeading = new Date(targetDate + "T00:00:00").toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const SITE_URL = "https://citizenknowledge.theperformanceofobedience.co.uk";

let output = `SUBJECT LINE:\nCitizen Knowledge — ${matchingPosts.length} new ${
  matchingPosts.length === 1 ? "entry" : "entries"
}, ${dateForHeading}\n\n`;

output += `EMAIL BODY (copy everything below this line into Buttondown):\n`;
output += `------------------------------------------------------------\n\n`;
output += `# Citizen Knowledge — ${dateForHeading}\n\n`;

// Explainer block: what this email is, the three post types, where to go
// for the full deep-read analysis, and a line about the site itself.
// Kept short and only sent once per email, at the top.
output += `Citizen Knowledge maps ordinary daily news against the argument of `;
output += `*The Performance of Obedience*: that selective enforcement, not `;
output += `consistent rule-following, is how modern institutions actually operate.\n\n`;
output += `This email bundles everything published on the site today. Three entry types appear below:\n\n`;
output += `- **Standard entries** — a news story mapped to the book, in full.\n`;
output += `- **Deep Read entries** — a fuller analysis that includes short excerpts from the manuscript itself, shown as indented quotes.\n`;
output += `- **Briefs** — a shorter-format entry, included here in full.\n\n`;
output += `Read the full archive any time at ${SITE_URL}\n\n`;
output += `---\n\n`;

matchingPosts.forEach((post, index) => {
  const { data, sections } = post;
  const mappingLine = buildMappingLine(data);
  const postType = getPostType(data);

  output += `**${data.title}**\n`;
  if (postType === "deep-read") output += `*DEEP READ ENTRY*\n`;
  if (postType === "brief") output += `*BRIEF ENTRY*\n`;
  if (postType === "standard") output += `*STANDARD ENTRY*\n`;
  output += `*Maps to: ${mappingLine}*\n\n`;

  if (sections.story) {
    output += `**The story**\n\n`;
    output += `${sections.story}\n\n`;
  }

  if (sections.reframeBlocks && sections.reframeBlocks.length) {
    const reframeLabel = postType === "deep-read"
      ? "**The reframe, with the manuscript**"
      : "**The reframe**";
    output += `${reframeLabel}\n\n`;
    sections.reframeBlocks.forEach((block) => {
      if (block.type === "quote") {
        // Markdown blockquote — Buttondown renders this as an indented quote.
        output += `> ${block.text}\n\n`;
      } else {
        output += `${block.text}\n\n`;
      }
    });
  }

  if (postType === "brief" && data.book_reference) {
    output += `_${data.book_reference}_\n\n`;
  }

  // Permalink based on Eleventy's default output for src/posts/*.md with no
  // permalink override: files land under /posts/<filename-without-.md>/
  // e.g. src/posts/post-15-pakistan-visa-leverage.md
  //   -> https://.../posts/post-15-pakistan-visa-leverage/
  const slug = post.file.replace(/\.md$/, "").replace(/ \(\d+\)$/, "");
  const linkLabel = postType === "deep-read" ? "Read the full deep read" : "Read on the site";
  output += `${linkLabel}: ${SITE_URL}/posts/${slug}/\n\n`;

  if (index < matchingPosts.length - 1) {
    output += `---\n\n`;
  }
});

output += `\n------------------------------------------------------------\n`;
output += `(${matchingPosts.length} post${matchingPosts.length === 1 ? "" : "s"} found for ${targetDate})\n`;

// ---- 8. Write to file and also print to screen ----
fs.writeFileSync(OUTPUT_FILE, output, "utf8");

console.log(output);
console.log(`\nSaved to: ${OUTPUT_FILE}`);
console.log(`Open that file, copy everything under "EMAIL BODY", paste into Buttondown, review, send.`);
