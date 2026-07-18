// add-permalinks.js
// Run once, from the project root, after renaming the 28 posts:
//   node add-permalinks.js
//
// For each renamed file listed below, inserts a `permalink:` line into its
// frontmatter (right after the opening `---`) so the live URL stays exactly
// as it was before the rename. Skips a file safely (no changes, no crash)
// if the file is missing, or if it already has a permalink line.

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join('src', 'posts');

// [ new filename, permalink to insert ]
const mapping = [
  ['post-001-20260708-standard-metro-speed-racers.md', '/posts/post-01-nation-of-speed-racers/index.html'],
  ['post-002-20260708-standard-metro-politicians-neutral-systems.md', '/posts/post-02-politicians-and-neutral-systems/index.html'],
  ['post-003-20260708-standard-metro-baby-wine-tastings.md', '/posts/post-03-baby-wine-tastings/index.html'],
  ['post-004-20260708-standard-metro-harry-privacy-case.md', '/posts/post-04-harry-privacy-case/index.html'],
  ['post-005-20260708-standard-metro-cold-case-forensics.md', '/posts/post-05-cold-case-forensics/index.html'],
  ['post-006-20260708-standard-metro-court-reporting.md', '/posts/post-06-court-reporting/index.html'],
  ['post-007-20260709-deep-metro-ruth-ellis-pardon.md', '/posts/07-ruth-ellis-pardon/index.html'],
  ['post-008-20260709-deep-metro-ukraine-ioc-russia-ban.md', '/posts/08-ukraine-ioc-russia-ban/index.html'],
  ['post-009-20260710-standard-metro-clacton-fox-race.md', '/posts/post-09-clacton-two-fox-race/index.html'],
  ['post-010-20260713-standard-standard-hosepipe-postcode-lottery.md', '/posts/post-09-hosepipe-postcode-lottery/index.html'],
  ['post-011-20260710-standard-metro-chelmsford-heatwave.md', '/posts/post-10-chelmsford-heatwave/index.html'],
  ['post-012-20260713-standard-metro-pardon-for-sale.md', '/posts/post-11-pardon-for-sale/index.html'],
  ['post-013-20260714-standard-metro-irgc-proscription.md', '/posts/post-12-irgc-proscription/index.html'],
  ['post-014-20260714-deep-metro-widdecombe-reclassification.md', '/posts/post-13-widdecombe-reclassification/index.html'],
  ['post-015-20260714-standard-metro-smuggling-convictions.md', '/posts/post-14-smuggling-convictions/index.html'],
  ['post-016-20260714-standard-metro-pakistan-visa-leverage.md', '/posts/post-15-pakistan-visa-leverage/index.html'],
  ['post-017-20260715-deep-metro-ppe-failures.md', '/posts/post-16-ppe-failures/index.html'],
  ['post-018-20260715-standard-metro-flood-risk-homes.md', '/posts/post-17-flood-risk-homes/index.html'],
  ['post-019-20260715-standard-metro-rapist-mayor-latvia.md', '/posts/post-18-rapist-mayor-latvia/index.html'],
  ['post-020-20260715-standard-metro-hotel-sex-offences.md', '/posts/post-19-hotel-sex-offences/index.html'],
  ['post-021-20260715-brief-metro-mills-investigation.md', '/posts/post-20-mills-investigation_b/index.html'],
  ['post-022-20260715-brief-metro-hillsborough-law.md', '/posts/post-21-hillsborough-law_b/index.html'],
  ['post-023-20260716-standard-metro-nursery-safeguarding.md', '/posts/post-22-nursery-safeguarding/index.html'],
  ['post-024-20260716-standard-metro-voluntary-curfew.md', '/posts/post-23-voluntary-curfew/index.html'],
  ['post-025-20260716-standard-metro-tfl-hack-sentencing.md', '/posts/post-24-tfl-hack-sentencing/index.html'],
  ['post-026-20260716-standard-metro-mp-groucho-trial.md', '/posts/post-25-mp-groucho-trial/index.html'],
  ['post-027-20260717-standard-metro-mi5-systemic-failures.md', '/posts/post-26-mi5-systemic-failures/index.html'],
  ['post-028-20260717-deep-metro-falklands-flag-fine.md', '/posts/post-27-falklands-flag-fine/index.html'],
];

let okCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const [filename, permalink] of mapping) {
  const filePath = path.join(POSTS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${filename}`);
    errorCount++;
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('permalink:')) {
    console.log(`SKIP (already has permalink): ${filename}`);
    skipCount++;
    continue;
  }

  // Frontmatter starts with a line that is exactly "---" (allowing for
  // trailing \r on Windows-saved files). Insert the permalink line right
  // after that first line.
  const lines = content.split('\n');

  if (lines[0].trim() !== '---') {
    console.log(`SKIP (no frontmatter found at top): ${filename}`);
    errorCount++;
    continue;
  }

  lines.splice(1, 0, `permalink: ${permalink}`);
  content = lines.join('\n');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`OK: ${filename}`);
  okCount++;
}

console.log('');
console.log(`Done. ${okCount} updated, ${skipCount} skipped (already had permalink), ${errorCount} not found/errors.`);
if (errorCount > 0) {
  console.log('Check the file list above — some files were not found. Make sure you have run the git mv rename commands first, and that this script is run from the project root (C:\\Users\\GRZ\\citizen-knowledge).');
}
