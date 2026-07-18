// Citizen Knowledge — Control Panel server
//
// A tiny local web server (built-in Node modules only — nothing to install)
// that gives you a browser form for running the daily email builder and the
// weekly print-pack builder, instead of typing commands.
//
// It runs your existing build-email.js and build-print-pack.js unchanged.
//
// USAGE:
//   Double-click "Citizen Knowledge Control Panel.bat"
//   (or, from the project root:  node control-panel.js)
//
// It opens http://localhost:4600 in your browser automatically.
// Leave the black window open while you use the panel; close it when done.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile, exec } = require("child_process");

const PORT = 4600;
const ROOT = __dirname;

// ---- Locate the two build scripts (must sit alongside this file) ----
const EMAIL_SCRIPT = path.join(ROOT, "build-email.js");
const PRINT_SCRIPT = path.join(ROOT, "build-print-pack.js");
const PUSH_SCRIPT = path.join(ROOT, "push-to-buttondown.js");

// ---- Helpers ----------------------------------------------------------
function todayISO() {
  // Local date (not UTC). Using toISOString() here would roll over at UTC
  // midnight, which is an hour early during British Summer Time and would
  // build the wrong (previous) day's email late/early in the day.
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

function isValidDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// Open a URL in a specific Chrome profile, or fall back to the OS default.
function openInChrome(url) {
  const CHROME_PROFILE = "Profile 9"; // Citizen Knowledge profile
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe")
  ];
  const chromePath = candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } });

  if (process.platform === "win32" && chromePath) {
    execFile(chromePath, [`--profile-directory=${CHROME_PROFILE}`, url], (err) => {
      if (err) openWithDefaultApp(url); // fall back if Chrome launch fails
    });
  } else {
    openWithDefaultApp(url);
  }
}

// Open a file (or URL) with the OS default handler.
function openWithDefaultApp(target) {
  // Windows: "start" needs an empty title arg; wrap path in quotes.
  if (process.platform === "win32") {
    exec(`start "" "${target}"`);
  } else if (process.platform === "darwin") {
    exec(`open "${target}"`);
  } else {
    exec(`xdg-open "${target}"`);
  }
}

// Find the newest file in ROOT matching a prefix + extension (for auto-open).
function newestMatching(prefix, ext) {
  try {
    const files = fs
      .readdirSync(ROOT)
      .filter((f) => f.startsWith(prefix) && f.endsWith(ext))
      .map((f) => ({ f, t: fs.statSync(path.join(ROOT, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    return files.length ? path.join(ROOT, files[0].f) : null;
  } catch {
    return null;
  }
}

// ---- The HTML page ----------------------------------------------------
function pageHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Citizen Knowledge — Control Panel</title>
<style>
  :root{
    --paper:#F7F5F0; --ink:#141412; --body-ink:#242320;
    --ledger:#7A2222; --ledger-bg:#F1E3E0; --rule:#B8B2A2;
  }
  *{box-sizing:border-box;}
  body{
    margin:0; background:var(--paper); color:var(--body-ink);
    font-family:Georgia,"Times New Roman",serif; line-height:1.5;
    padding:0 20px 60px;
  }
  .wrap{max-width:640px; margin:0 auto;}
  header{border-bottom:4px solid var(--ink); padding:40px 0 20px; margin-bottom:28px;}
  .eyebrow{
    font-family:"Courier New",monospace; font-size:12px; font-weight:700;
    letter-spacing:0.12em; text-transform:uppercase; color:var(--ledger); margin:0 0 10px;
  }
  h1{margin:0; font-size:38px; letter-spacing:-0.01em; color:var(--ink);}
  .card{
    background:#fff; border:1px solid var(--rule); border-radius:4px;
    padding:24px; margin-bottom:22px;
  }
  fieldset{border:none; padding:0; margin:0 0 18px;}
  legend{
    font-family:"Courier New",monospace; font-size:12px; font-weight:700;
    letter-spacing:0.1em; text-transform:uppercase; color:var(--ledger);
    padding:0; margin-bottom:12px;
  }
  label.opt{
    display:block; padding:12px 14px; margin-bottom:8px; border:1px solid var(--rule);
    border-radius:4px; cursor:pointer; background:var(--paper); font-size:16px;
  }
  label.opt:hover{border-color:var(--ledger);}
  label.opt input{margin-right:10px;}
  label.opt.sel{border-color:var(--ledger); background:var(--ledger-bg);}
  .row{display:flex; gap:14px; flex-wrap:wrap;}
  .field{flex:1; min-width:180px; margin-bottom:14px;}
  .field label{
    display:block; font-family:"Courier New",monospace; font-size:11px; font-weight:700;
    letter-spacing:0.08em; text-transform:uppercase; color:var(--ink); margin-bottom:6px;
  }
  input[type=date]{
    width:100%; padding:10px 12px; font-size:16px; font-family:Georgia,serif;
    border:1px solid var(--rule); border-radius:4px; background:#fff; color:var(--ink);
  }
  .hint{font-size:13px; color:#6b675e; margin:4px 0 0;}
  button.run{
    background:var(--ledger); color:var(--paper); border:none; border-radius:4px;
    font-family:"Courier New",monospace; font-size:15px; font-weight:700;
    letter-spacing:0.05em; text-transform:uppercase; padding:15px 24px; cursor:pointer;
    width:100%;
  }
  button.run:hover{background:#5f1a1a;}
  button.run:disabled{opacity:0.5; cursor:default;}
  button.push-btn{background:#fff; color:var(--ledger); border:2px solid var(--ledger);}
  button.push-btn:hover{background:var(--ledger-bg);}
  .output{
    background:var(--ink); color:#e8e6e0; font-family:"Courier New",monospace;
    font-size:13px; line-height:1.5; padding:18px; border-radius:4px; margin-top:22px;
    white-space:pre-wrap; word-break:break-word; max-height:340px; overflow:auto; display:none;
  }
  .output.show{display:block;}
  .status{font-family:"Courier New",monospace; font-size:13px; margin-top:14px; min-height:20px;}
  .status.ok{color:var(--ledger);}
  .status.err{color:#a11;}
  .hide{display:none;}
  footer{font-family:"Courier New",monospace; font-size:12px; color:#6b675e; margin-top:30px;}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <p class="eyebrow">A companion record to The Performance of Obedience</p>
    <h1>Control Panel</h1>
  </header>

  <div class="card">
    <fieldset>
      <legend>1. What do you want to build?</legend>
      <label class="opt sel" id="opt-email">
        <input type="radio" name="mode" value="email" checked>
        <strong>Daily email</strong> — a ready-to-paste block for Buttondown (.txt)
      </label>
      <label class="opt" id="opt-print">
        <input type="radio" name="mode" value="print">
        <strong>Weekly print pack</strong> — a printable document for readers (.docx)
      </label>
    </fieldset>

    <!-- EMAIL date controls -->
    <fieldset id="email-dates">
      <legend>2. Which day's posts?</legend>
      <div class="field">
        <label for="email-date">Date</label>
        <input type="date" id="email-date">
        <p class="hint">Leave as today for today's email. Pick any date to rebuild that day.</p>
      </div>
    </fieldset>

    <!-- PRINT date controls -->
    <fieldset id="print-dates" class="hide">
      <legend>2. Which week?</legend>
      <div class="row">
        <div class="field">
          <label for="print-start">From</label>
          <input type="date" id="print-start">
        </div>
        <div class="field">
          <label for="print-end">To</label>
          <input type="date" id="print-end">
        </div>
      </div>
      <p class="hint">Defaults to the last 7 days ending today. Adjust either end for a custom range.</p>
    </fieldset>

    <fieldset>
      <legend>3. Build</legend>
      <button class="run" id="runBtn">Build it</button>
      <div class="status" id="status"></div>
    </fieldset>

    <!-- Buttondown push — email mode only -->
    <fieldset id="push-section">
      <legend>4. Send to Buttondown (optional)</legend>
      <button class="run push-btn" id="pushBtn">Push last email to Buttondown as a draft</button>
      <p class="hint">Creates a draft in your Buttondown dashboard for you to review and send yourself. Nothing goes to subscribers automatically. Build the email first (step 3), then push.</p>
      <div class="status" id="push-status"></div>
    </fieldset>

    <div class="output" id="output"></div>
  </div>

  <footer>Leave the black command window open while using this panel. Close it to shut the panel down.</footer>
</div>

<script>
  const T = new Date();
  // Local-date string (not UTC) so the pickers pre-fill the correct day even
  // late in the evening during British Summer Time.
  const iso = (d) => {
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0,10);
  };
  const today = iso(T);
  const weekAgo = iso(new Date(T.getTime() - 6*86400000));

  document.getElementById("email-date").value = today;
  document.getElementById("print-start").value = weekAgo;
  document.getElementById("print-end").value = today;

  const optEmail = document.getElementById("opt-email");
  const optPrint = document.getElementById("opt-print");
  const emailDates = document.getElementById("email-dates");
  const printDates = document.getElementById("print-dates");
  const pushSection = document.getElementById("push-section");

  function syncMode(){
    const mode = document.querySelector('input[name=mode]:checked').value;
    const isEmail = mode === "email";
    emailDates.classList.toggle("hide", !isEmail);
    printDates.classList.toggle("hide", isEmail);
    pushSection.classList.toggle("hide", !isEmail);
    optEmail.classList.toggle("sel", isEmail);
    optPrint.classList.toggle("sel", !isEmail);
  }
  document.querySelectorAll('input[name=mode]').forEach(r => r.addEventListener("change", syncMode));

  const runBtn = document.getElementById("runBtn");
  const statusEl = document.getElementById("status");
  const outputEl = document.getElementById("output");

  runBtn.addEventListener("click", async () => {
    const mode = document.querySelector('input[name=mode]:checked').value;
    const payload = { mode };
    if (mode === "email") {
      payload.date = document.getElementById("email-date").value;
    } else {
      payload.start = document.getElementById("print-start").value;
      payload.end = document.getElementById("print-end").value;
    }

    runBtn.disabled = true;
    statusEl.className = "status";
    statusEl.textContent = "Building…";
    outputEl.className = "output show";
    outputEl.textContent = "";

    try {
      const res = await fetch("/run", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      outputEl.textContent = data.output || "(no output)";
      outputEl.scrollTop = outputEl.scrollHeight;
      if (data.ok) {
        statusEl.className = "status ok";
        statusEl.textContent = data.message || "Done.";
      } else {
        statusEl.className = "status err";
        statusEl.textContent = data.message || "Something went wrong — see output above.";
      }
    } catch (e) {
      statusEl.className = "status err";
      statusEl.textContent = "Could not reach the local server. Is the black window still open?";
    } finally {
      runBtn.disabled = false;
    }
  });

  const pushBtn = document.getElementById("pushBtn");
  const pushStatus = document.getElementById("push-status");

  pushBtn.addEventListener("click", async () => {
    pushBtn.disabled = true;
    pushStatus.className = "status";
    pushStatus.textContent = "Pushing to Buttondown…";
    try {
      const res = await fetch("/push", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        pushStatus.className = "status ok";
        pushStatus.textContent = data.message || "Draft created in Buttondown.";
      } else {
        pushStatus.className = "status err";
        pushStatus.textContent = data.message || "Push failed.";
      }
    } catch (e) {
      pushStatus.className = "status err";
      pushStatus.textContent = "Could not reach the local server. Is the black window still open?";
    } finally {
      pushBtn.disabled = false;
    }
  });
</script>
</body>
</html>`;
}

// ---- Run a build script and capture output ----------------------------
function runBuild(mode, args, callback) {
  const script = mode === "email" ? EMAIL_SCRIPT : PRINT_SCRIPT;
  if (!fs.existsSync(script)) {
    return callback({
      ok: false,
      output: `Could not find ${path.basename(script)} in this folder:\n${ROOT}\n\nMake sure control-panel.js sits in the same folder as your build scripts.`,
      message: `Missing ${path.basename(script)}.`
    });
  }

  execFile("node", [script, ...args], { cwd: ROOT, windowsHide: true }, (err, stdout, stderr) => {
    const output = (stdout || "") + (stderr ? "\n" + stderr : "");

    if (err && !stdout) {
      return callback({ ok: false, output: output || String(err), message: "Build failed — see output above." });
    }

    // Work out which file was produced, and auto-open it.
    let openedName = null;
    if (mode === "email") {
      const f = path.join(ROOT, "daily-email-output.txt");
      if (fs.existsSync(f)) { openWithDefaultApp(f); openedName = "daily-email-output.txt"; }
    } else {
      const f = newestMatching("CitizenKnowledge_PrintPack_", ".docx");
      if (f) { openWithDefaultApp(f); openedName = path.basename(f); }
    }

    // "No posts found" is a clean, valid result, not an error.
    const noPosts = /No posts found|Nothing to build/i.test(output);
    if (noPosts) {
      return callback({ ok: true, output, message: "No posts found for that date — nothing to build." });
    }

    callback({
      ok: true,
      output,
      message: openedName ? `Done. Opened ${openedName}.` : "Done."
    });
  });
}

// ---- Server -----------------------------------------------------------
const server = http.createServer((req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(pageHtml());
  }

  if (req.method === "POST" && req.url === "/run") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let payload;
      try { payload = JSON.parse(body); } catch { payload = {}; }

      const mode = payload.mode === "print" ? "print" : "email";
      const args = [];

      if (mode === "email") {
        const d = payload.date;
        if (d && !isValidDate(d)) {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ ok: false, output: "", message: "Invalid date." }));
        }
        // Always pass the selected date explicitly. Previously we dropped the
        // arg when it matched "today" and let build-email.js default — but that
        // default is UTC-based and builds the wrong day during BST. Passing the
        // date the user actually picked removes any ambiguity.
        if (d) args.push(d);
        else args.push(todayISO());
      } else {
        const s = payload.start, e = payload.end;
        if ((s && !isValidDate(s)) || (e && !isValidDate(e))) {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ ok: false, output: "", message: "Invalid date(s)." }));
        }
        if (s && e) { args.push(s, e); }
        else if (e) { args.push(e); }
        // both empty = script default (last 7 days ending today)
      }

      runBuild(mode, args, (result) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      });
    });
    return;
  }

  if (req.method === "POST" && req.url === "/push") {
    if (!fs.existsSync(PUSH_SCRIPT)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: false, message: "push-to-buttondown.js is missing from this folder." }));
    }
    execFile("node", [PUSH_SCRIPT], { cwd: ROOT, windowsHide: true }, (err, stdout, stderr) => {
      const output = (stdout || "") + (stderr || "");
      if (err) {
        // Pull the most useful line out of the script's error output.
        let msg = "Push failed.";
        if (/No API key found/i.test(output)) msg = "No API key yet — create a buttondown.key file first (see setup notes).";
        else if (/Authorisation failed/i.test(output)) msg = "API key rejected — check your buttondown.key file.";
        else if (/daily-email-output\.txt/i.test(output)) msg = "No built email found — run the email build (step 3) first.";
        else if (/Could not reach Buttondown/i.test(output)) msg = "Could not reach Buttondown — check your internet connection.";
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ ok: false, message: msg }));
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, message: "Draft created in Buttondown. Open Buttondown to review and send. Nothing was sent to subscribers." }));
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\nCitizen Knowledge Control Panel is running.`);
  console.log(`Opening ${url} in your browser…`);
  console.log(`(Leave this window open. Close it to shut the panel down.)\n`);
  openInChrome(url);
});
