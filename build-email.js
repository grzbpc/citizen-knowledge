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

// ---- 3. Pull out sections from the body ----
// All three post types (Standard, Deep Read, Brief) use the same markdown
// heading structure in the actual site content:
//   ### The story
//   ### The reframe            (Standard, Brief)
//   ### The reframe, with the manuscript   (Deep Read)
// Deep Read posts interleave manuscript quotes as blockquote lines
// starting with ">" inside the reframe section. Briefs and Standards
// don't use quotes in the body, but the parser handles them the same way
// regardless, so nothing breaks if a quote line ever appears in either.
function extractSections(body) {
  const storyMatch = body.match(
    /###\s*The story\s*\r?\n+([\s\S]*?)(?=\r?\n###|\s*$)/i
  );
  // Matches either "The reframe" or "The reframe, with the manuscript"
  const reframeMatch = body.match(
    /###\s*The [Rr]eframe(?:,\s*[Ww]ith the [Mm]anuscript)?\s*\r?\n+([\s\S]*?)(?=\r?\n###|\s*$)/i
  );

  const story = storyMatch ? storyMatch[1].trim() : "";
  const reframeRaw = reframeMatch ? reframeMatch[1].trim() : "";

  // Split the reframe into ordered blocks, tagging manuscript excerpts.
  // Excerpts appear either as markdown blockquotes (lines starting ">")
  // or as raw HTML <div class="manuscript-quote">...</div>.
  const reframeBlocks = [];
  const divRegex = /<div class="manuscript-quote">([\s\S]*?)<\/div>/gi;
  let lastIndex = 0;
  let m;

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

  while ((m = divRegex.exec(reframeRaw)) !== null) {
    pushParaChunks(reframeRaw.slice(lastIndex, m.index));
    const quoteText = stripTags(m[1]).replace(/\s+/g, " ").trim();
    if (quoteText) reframeBlocks.push({ type: "quote", text: quoteText });
    lastIndex = divRegex.lastIndex;
  }
  pushParaChunks(reframeRaw.slice(lastIndex));

  return { story, reframeBlocks };
}

// Minimal HTML tag stripper (handles <em>, <strong> etc. inside manuscript divs)
function stripTags(html) {
  return html.replace(/<[^>]+>/g, "");
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

  const sections = extractSections(body);
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

  output += `**${data.title}**\n\n`;
  if (postType === "deep-read") output += `*DEEP READ ENTRY*\n\n`;
  if (postType === "standard") output += `*STANDARD ENTRY*\n\n`;
  if (postType === "brief") output += `*BRIEF ENTRY*\n\n`;
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

  // Book reference now prints for every post type, matching the site
  // itself. Plain italics, no heading label — it reads as clearly
  // separate from the article without needing to announce itself.
  if (data.book_reference) {
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