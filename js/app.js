/* SubCut — 100% client-side subscription leak detector.
 * Pure functions (parse/detect) are DOM-free so the logic is testable;
 * all DOM wiring lives in init(), guarded for non-browser environments. */
"use strict";

/* ---------- parsing ---------- */

const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11 };

function extractDate(line) {
  let m = line.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const mo = +m[1], d = +m[2], y = +m[3];
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31)
      return { date: new Date(y, mo - 1, d), match: m[0] };
  }
  m = line.match(/(\d{1,2})-(\d{1,2})-(\d{2})(?!\d)/);
  if (m) {
    const mo = +m[1], d = +m[2], y = 2000 + +m[3];
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31)
      return { date: new Date(y, mo - 1, d), match: m[0] };
  }
  m = line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase().slice(0,3)] ?? MONTHS[m[1].toLowerCase()];
    const d = +m[2], y = +m[3];
    if (mo !== undefined && d >= 1 && d <= 31)
      return { date: new Date(y, mo, d), match: m[0] };
  }
  return null;
}

function extractAmount(line) {
  // Credits (parenthesized) are not spending.
  if (/\(\s*\$?[\d,]+\.\d{2}\s*\)/.test(line)) return null;
  const re = /\$?\s*(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})/g;
  let m, last = null;
  while ((m = re.exec(line)) !== null) last = m;
  if (!last) return null;
  const before = line.slice(0, last.index).trimEnd();
  if (/[-−]\s*$/.test(before)) return null; // negative = credit
  return { amount: parseFloat(last[0].replace(/[$,\s]/g, "")), match: last[0] };
}

const CREDIT_RE = /deposit|payroll|paycheck|refund|interest paid|credit\b|transfer in|cash ?back/i;

function cleanMerchant(text) {
  return text
    .toUpperCase()
    .replace(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/g, " ") // phone numbers
    .replace(/#\s*\d+/g, " ")                      // store numbers
    .replace(/[^A-Z0-9*+ ]/g, " ")
    .replace(/\s+[A-Z]{2}\s*$/, " ")               // trailing state code
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(text) {
  return text.toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function parseStatement(text) {
  const txs = [];
  let skipped = 0;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (CREDIT_RE.test(line)) continue; // credits/paychecks aren't leaks
    const d = extractDate(line);
    const a = extractAmount(line);
    if (!d || !a) { skipped++; continue; }
    let rest = line;
    rest = rest.replace(d.match, " ");
    rest = rest.replace(a.match, " ");
    const merchant = cleanMerchant(rest);
    if (!merchant || merchant.length < 3) { skipped++; continue; }
    txs.push({ date: d.date, raw: line, merchant, amount: a.amount });
  }
  return { txs, skipped };
}

/* ---------- detection ---------- */

function matchMerchant(merchantUpper) {
  const norm = normalizeKey(merchantUpper).replace(/ /g, "");
  for (const m of MERCHANTS) {
    for (const a of m.aliases) {
      if (norm.includes(normalizeKey(a).replace(/ /g, ""))) return m;
    }
  }
  return null;
}

function median(nums) {
  const s = nums.slice().sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function inferFrequency(dates) {
  if (dates.length < 2) return null;
  const gaps = [];
  for (let i = 1; i < dates.length; i++)
    gaps.push(Math.round((dates[i] - dates[i - 1]) / 86400000));
  const med = median(gaps);
  if (med >= 25 && med <= 35) return "monthly";
  if (med >= 350 && med <= 380) return "annual";
  return null;
}

function titleCaseMerchant(upper) {
  return upper.replace(/\*/g, " ").toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase()).replace(/\s+/g, " ").trim();
}

let __id = 0;

function detectRecurring(txs) {
  const groups = new Map();
  for (const t of txs) {
    const m = matchMerchant(t.merchant);
    const key = m ? "M:" + m.name : "K:" + normalizeKey(t.merchant);
    if (!groups.has(key)) groups.set(key, { merchant: m, txs: [] });
    groups.get(key).txs.push(t);
  }
  const subs = [];
  for (const [, g] of groups) {
    const sorted = g.txs.slice().sort((a, b) => a.date - b.date);
    const amounts = sorted.map(t => t.amount);
    const medAmt = median(amounts);
    const consistent = amounts.every(a =>
      Math.abs(a - medAmt) <= Math.max(medAmt * 0.01, 0.50));
    if (!consistent) continue;
    let freq, confidence;
    if (g.merchant) {
      confidence = "verified";
      freq = g.merchant.billing || inferFrequency(sorted.map(t => t.date));
    } else {
      if (sorted.length < 2) continue;
      confidence = "detected";
      freq = inferFrequency(sorted.map(t => t.date));
    }
    if (!freq) continue;
    const name = g.merchant ? g.merchant.name : titleCaseMerchant(sorted[0].merchant);
    subs.push({
      id: "sub" + (++__id),
      name,
      category: g.merchant ? g.merchant.category : "Detected charge",
      amount: Math.round(medAmt * 100) / 100,
      frequency: freq,
      occurrences: sorted.length,
      firstSeen: sorted[0].date,
      lastSeen: sorted[sorted.length - 1].date,
      confidence,
      steps: g.merchant ? g.merchant.steps : GENERIC_CANCEL_STEPS,
      script: cancelScriptFor(name),
      keep: true,
    });
  }
  // Rank by annual cost, priciest leak first.
  subs.sort((a, b) =>
    annualCost(b) - annualCost(a));
  return subs;
}

function annualCost(s) {
  return s.frequency === "annual" ? s.amount : s.amount * 12;
}

function computeTotals(subs) {
  let monthly = 0, yearly = 0, savings = 0;
  for (const s of subs) {
    monthly += s.frequency === "annual" ? s.amount / 12 : s.amount;
    yearly += annualCost(s);
    if (!s.keep) savings += annualCost(s);
  }
  return { monthly, yearly, savings, count: subs.length };
}

/* ---------- formatting ---------- */

const fmt$ = n => "$" + n.toLocaleString("en-US",
  { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMonthYear = d => d.toLocaleString("en-US",
  { month: "short", year: "numeric" });
const esc = s => s.replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function renewalInfo(s) {
  if (s.frequency !== "annual") return null;
  const next = new Date(s.lastSeen.getTime() + 365 * 86400000);
  const days = Math.ceil((next - Date.now()) / 86400000);
  if (days < 0) return { text: "Renewed recently — verify on your statement", urgent: false };
  if (days <= 60) return { text: "Renews in " + days + " day" + (days === 1 ? "" : "s"), urgent: true };
  return { text: "Renews " + next.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), urgent: false };
}

/* ---------- UI ---------- */

let state = { subs: [], analyzed: 0, skipped: 0 };

function cardHTML(s) {
  const per = s.frequency === "annual" ? "/yr" : "/mo";
  const badge = s.confidence === "verified"
    ? '<span class="badge verified">Verified merchant</span>'
    : '<span class="badge detected">Detected pattern</span>';
  const ren = renewalInfo(s);
  const flag = ren ? `<span class="flag${ren.urgent ? " urgent" : ""}">${esc(ren.text)}</span>` : "";
  const steps = s.steps.map(st => `<li>${esc(st)}</li>`).join("");
  return `<article class="card" data-id="${s.id}">
    <div class="card-top">
      <div>
        <div class="card-name">${esc(s.name)}</div>
        <div class="card-meta">${esc(s.category)} · ${s.frequency === "annual" ? "Annual" : "Monthly"} · since ${fmtMonthYear(s.firstSeen)} · ${s.occurrences} charge${s.occurrences === 1 ? "" : "s"}</div>
      </div>
      <div class="card-amount">${fmt$(s.amount)}<span>${per}</span></div>
    </div>
    <div class="card-flags">${badge}${flag}</div>
    <div class="card-actions">
      <label class="toggle" title="Mark to cancel">
        <input type="checkbox" data-toggle="${s.id}" ${s.keep ? "checked" : ""}>
        <span class="track"><span class="thumb"></span></span>
        <span class="toggle-label">${s.keep ? "Keep" : "Cancel"}</span>
      </label>
      <button class="expand-btn" data-expand="${s.id}">How to cancel ▾</button>
    </div>
    <div class="cancel-panel" hidden>
      <ol class="steps">${steps}</ol>
      <div class="script-box">
        <p class="script-text">${esc(s.script)}</p>
        <button class="btn small" data-copy="${s.id}">Copy cancel script</button>
      </div>
    </div>
  </article>`;
}

function renderTotals() {
  const t = computeTotals(state.subs);
  document.getElementById("stat-monthly").textContent = fmt$(t.monthly);
  document.getElementById("stat-yearly").textContent = fmt$(t.yearly);
  document.getElementById("stat-count").textContent = t.count;
  document.getElementById("stat-savings").textContent = fmt$(t.savings);
  document.getElementById("savings-line").textContent =
    t.savings > 0
      ? `Cancelling ${state.subs.filter(s => !s.keep).length} subscription${state.subs.filter(s => !s.keep).length === 1 ? "" : "s"} keeps ${fmt$(t.savings)}/year in your pocket.`
      : "Toggle subscriptions to Cancel to see your potential savings.";
}

function renderResults() {
  const grid = document.getElementById("subs-grid");
  grid.innerHTML = state.subs.map(cardHTML).join("");
  document.getElementById("scan-meta").textContent =
    `Analyzed ${state.analyzed} transactions · ${state.skipped} lines skipped · ran entirely in your browser`;
  renderTotals();
  document.getElementById("input-view").hidden = true;
  document.getElementById("results-view").hidden = false;
  document.getElementById("results-view").scrollIntoView({ behavior: "smooth" });
}

function renderEmpty() {
  const grid = document.getElementById("subs-grid");
  grid.innerHTML = `<div class="empty-state">
    <h2>No recurring charges detected.</h2>
    <p>Either you're admirably frugal, or the statement was too short.
    Paste at least 2 months of history — or try the demo statement.</p></div>`;
  document.getElementById("scan-meta").textContent =
    `Analyzed ${state.analyzed} transactions · ${state.skipped} lines skipped`;
  document.getElementById("stat-monthly").textContent = fmt$(0);
  document.getElementById("stat-yearly").textContent = fmt$(0);
  document.getElementById("stat-count").textContent = "0";
  document.getElementById("stat-savings").textContent = fmt$(0);
  document.getElementById("savings-line").textContent = "";
  document.getElementById("input-view").hidden = true;
  document.getElementById("results-view").hidden = false;
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, 2200);
}

function copyScript(id) {
  const s = state.subs.find(x => x.id === id);
  if (!s) return;
  const done = () => toast("Cancel script copied — paste it into their contact form or chat.");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(s.script).then(done).catch(() => fallbackCopy(s.script, done));
  } else fallbackCopy(s.script, done);
}

function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.readOnly = true;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); done(); }
  catch (e) { toast("Copy failed — select the text manually."); }
  document.body.removeChild(ta);
}

function analyze() {
  const ta = document.getElementById("statement");
  const err = document.getElementById("input-error");
  const btn = document.getElementById("analyze-btn");
  const text = ta.value.trim();
  err.hidden = true;
  if (!text) {
    err.textContent = "Paste your statement first — or try the demo statement.";
    err.hidden = false;
    return;
  }
  btn.disabled = true;
  btn.textContent = "Scanning…";
  setTimeout(() => {
    const { txs, skipped } = parseStatement(text);
    state.analyzed = txs.length;
    state.skipped = skipped;
    state.subs = detectRecurring(txs);
    btn.disabled = false;
    btn.textContent = "Find my leaks";
    if (txs.length === 0) {
      err.textContent = "Couldn't find any transactions. Check the format — each line needs a date, a merchant, and an amount.";
      err.hidden = false;
      return;
    }
    if (state.subs.length === 0) renderEmpty();
    else renderResults();
  }, 450);
}

function init() {
  document.getElementById("analyze-btn").addEventListener("click", analyze);
  document.getElementById("demo-btn").addEventListener("click", () => {
    document.getElementById("statement").value = DEMO_STATEMENT;
    document.getElementById("input-error").hidden = true;
    toast("Demo statement loaded — hit “Find my leaks”.");
  });
  document.getElementById("scan-again").addEventListener("click", () => {
    document.getElementById("results-view").hidden = true;
    document.getElementById("input-view").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document.getElementById("subs-grid").addEventListener("change", e => {
    const t = e.target;
    if (t.matches("[data-toggle]")) {
      const s = state.subs.find(x => x.id === t.dataset.toggle);
      if (s) {
        s.keep = t.checked;
        t.closest(".card").querySelector(".toggle-label").textContent = s.keep ? "Keep" : "Cancel";
        renderTotals();
      }
    }
  });
  document.getElementById("subs-grid").addEventListener("click", e => {
    const xp = e.target.closest("[data-expand]");
    if (xp) {
      const panel = xp.closest(".card").querySelector(".cancel-panel");
      panel.hidden = !panel.hidden;
      xp.textContent = panel.hidden ? "How to cancel ▾" : "Hide ▴";
      return;
    }
    const cp = e.target.closest("[data-copy]");
    if (cp) copyScript(cp.dataset.copy);
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", init);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { parseStatement, detectRecurring, computeTotals, matchMerchant, inferFrequency, median, cleanMerchant, normalizeKey };
}
