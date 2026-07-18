// Citizen Knowledge — push the daily email to Buttondown as a DRAFT
//
// This does NOT send anything to subscribers. It creates a draft inside your
// Buttondown dashboard, formatted and ready, for you to review and send by hand.
//
// It reads the email your build-email.js already produced
// (daily-email-output.txt), pulls out the subject and body, and posts them to
// Buttondown with status "draft".
//
// SETUP (once):
//   1. Get your API key: Buttondown dashboard -> Settings -> Programming/API
//      (or your API requests page). Copy the key.
//   2. In this project folder, create a plain text file named exactly:
//         buttondown.key
//      Paste ONLY your API key into it, nothing else, and save.
//      (This file stays on your machine. See the .gitignore note below.)
//
// USAGE:
//   node push-to-buttondown.js
//       -> reads daily-email-output.txt, creates a Buttondown draft
//
// Uses built-in Node modules only — nothing to install.

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = __dirname;
const KEY_FILE = path.join(ROOT, "buttondown.key");
const EMAIL_FILE = path.join(ROOT, "daily-email-output.txt");
const API_HOST = "api.buttondown.com";
const API_PATH = "/v1/emails";

// ---- 1. Read the API key ----------------------------------------------
if (!fs.existsSync(KEY_FILE)) {
  console.error(`\nNo API key found.\nCreate a file called "buttondown.key" in this folder and paste your Buttondown API key into it.\nFolder: ${ROOT}\n`);
  process.exit(1);
}
const apiKey = fs.readFileSync(KEY_FILE, "utf8").trim();
if (!apiKey) {
  console.error(`\nThe buttondown.key file is empty. Paste your API key into it and save.\n`);
  process.exit(1);
}

// ---- 2. Read the built email ------------------------------------------
if (!fs.existsSync(EMAIL_FILE)) {
  console.error(`\nCould not find daily-email-output.txt in this folder.\nRun the daily email build first, then push.\nFolder: ${ROOT}\n`);
  process.exit(1);
}
const raw = fs.readFileSync(EMAIL_FILE, "utf8");

// ---- 3. Extract subject + body ----------------------------------------
// build-email.js writes a file with a human-readable preamble, then a SUBJECT
// line, then an "EMAIL BODY" marker followed by the body. We parse those out.
// If the markers aren't found, we fall back to sensible defaults so nothing
// is lost.

// The file build-email.js writes looks like:
//
//   SUBJECT LINE:
//   Citizen Knowledge — 6 new entries, Wednesday, 8 July 2026
//
//   EMAIL BODY (copy everything below this line into Buttondown):
//   ------------------------------------------------------------
//   <the body, in markdown>
//   ------------------------------------------------------------
//   (6 posts found for 2026-07-08)
//
// So: subject is the line after "SUBJECT LINE:", and body is the text between
// the first dashed rule and the last dashed rule.

let subject = null;
const subjMatch = raw.match(/SUBJECT LINE:\s*\r?\n(.+?)\r?\n/i);
if (subjMatch) subject = subjMatch[1].trim();

let body = null;
// Grab everything after the first line of dashes...
const afterFirstRule = raw.match(/-{10,}\r?\n([\s\S]*)$/);
if (afterFirstRule) {
  let chunk = afterFirstRule[1];
  // ...then cut it off at the closing line of dashes, if present.
  const closingRule = chunk.search(/\r?\n-{10,}/);
  if (closingRule !== -1) chunk = chunk.slice(0, closingRule);
  body = chunk.trim();
}

// Fallbacks
if (!subject) {
  subject = "Citizen Knowledge — new entries";
  console.warn('Note: no "SUBJECT:" line found in the file; using a default subject. Edit it in Buttondown before sending.');
}
if (!body) {
  body = raw.trim();
  console.warn('Note: no "EMAIL BODY" marker found; using the whole file as the body. Check it in Buttondown before sending.');
}

// ---- 4. Post to Buttondown as a draft ---------------------------------
const payload = JSON.stringify({
  subject: subject,
  body: body,
  status: "draft"   // <-- the safety switch. Nothing is sent to subscribers.
});

const options = {
  hostname: API_HOST,
  path: API_PATH,
  method: "POST",
  headers: {
    "Authorization": `Token ${apiKey}`,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload)
  }
};

console.log(`\nCreating a Buttondown draft...`);
console.log(`Subject: ${subject}`);

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (c) => (data += c));
  res.on("end", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      let url = "";
      try {
        const parsed = JSON.parse(data);
        url = parsed.canonical_url || "";
      } catch {}
      console.log(`\nDone. A draft has been created in your Buttondown dashboard.`);
      console.log(`Open Buttondown, review it, and send it yourself when ready.`);
      if (url) console.log(`Archive URL (once sent): ${url}`);
      console.log(`\nNOTHING has been sent to subscribers. This is a draft only.\n`);
    } else if (res.statusCode === 401 || res.statusCode === 403) {
      console.error(`\nAuthorisation failed (${res.statusCode}). Your API key may be wrong or expired.`);
      console.error(`Check the key in buttondown.key against Buttondown -> Settings -> API.\n`);
      process.exit(1);
    } else {
      console.error(`\nButtondown returned an error (${res.statusCode}):`);
      console.error(data + "\n");
      process.exit(1);
    }
  });
});

req.on("error", (e) => {
  console.error(`\nCould not reach Buttondown: ${e.message}`);
  console.error(`Check your internet connection and try again.\n`);
  process.exit(1);
});

req.write(payload);
req.end();
