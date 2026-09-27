---
doc: spec
status: approved
---

# SubCut — Technical Spec

## How This Works, In Plain Language
SubCut is one web page with no server and no build step. It has four parts: (1) an input box where you paste statement text; (2) a parser that reads each line and pulls out the date, merchant name, and dollar amount; (3) a detector that figures out which charges repeat on a schedule — first by recognizing known subscription companies from a built-in list, then by noticing when an unknown charge shows up month after month for the same amount; (4) a dashboard that totals the damage, lets you mark things to cancel, and shows cancel instructions. Everything happens inside the browser tab — the page makes zero network requests after it loads, so your financial text physically cannot leave your device.

Why this shape: a single static page is the most demoable, most testable thing a judge can open — double-click `index.html` and it works. No backend means no keys, no hosting, no privacy review.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. User pastes text → textarea value read by `app.js`.
2. "Find my leaks" → `parseStatement(text)` returns `[{date, rawMerchant, amount}]`, skipping unparseable lines (counted).
3. `detectRecurring(transactions)` → first pass: `matchMerchant()` against `MERCHANTS` alias dictionary (canonical name, category, cancel guide); second pass: group unmatched by normalized key, test periodicity (median interval 25–35d → monthly; 350–370d → annual; also handle 2 occurrences).
4. Results rendered as cards by `renderResults()`; hero stats computed by `computeTotals()`; toggles update savings via event listeners; expand shows `cancelGuide` HTML; copy button uses `navigator.clipboard.writeText` with fallback.
5. "Scan again" clears state and shows the input panel.

## Stack
- HTML5 + CSS3 + vanilla JavaScript (ES2020), no frameworks, no bundler, no npm dependencies for the app itself.
- Rationale: zero-install demo for judges; page must run from `file://`; keeps the "nothing leaves your browser" claim trivially auditable. Tradeoff accepted: hand-written CSS, no component reuse.
- Docs: MDN Web Docs (https://developer.mozilla.org/) for any API questions.

## Where It Runs and How Someone Tries It
- Runs in any modern desktop browser (Chrome, Edge, Firefox, Safari).
- Requirements: none. No API keys, no server, no install.
- Try it: open `index.html` in a browser (double-click, or `python3 -m http.server` / `npx serve` and visit the URL). Click "Load demo statement", then "Find my leaks".
- Demo recording: screen-record the browser window; the whole flow fits in ~90 seconds.
- Deployment: optional; any static host (GitHub Pages) works by serving the repo root. Not required for submission.

## Look and Feel
Dark dashboard. Background deep ink `#0d1319`; surfaces `#151d26`; text `#f2f5f7`; muted `#8b98a5`. Accent red `#ff5d5d` for leaks/warnings, green `#3ddc84` for savings. System font stack; display numbers 700 weight, tight letter-spacing; labels uppercase 11px letterspaced. Cards with 12px radius, 1px subtle borders, generous padding. Copy tone direct and a little irreverent. No external assets — offline-capable by construction.

## Components

### Parser (`js/app.js` → `parseStatement`)
Splits text into lines; per line extracts date via regexes (`MM/DD/YYYY`, `MM-DD-YY`, `Mon DD`), amount via `\$?[\d,]+\.\d{2}` (last match wins; parenthesized or `-` prefix = negative, ignored for spend), merchant = remaining text cleaned. Returns transactions + skipped count.
PRD ref: `prd.md > Leak detection engine`.

### Merchant matcher (`js/merchants.js` → `MERCHANTS`, `matchMerchant`)
Dictionary of ~25 subscriptions: each has `aliases` (substrings to match, uppercase), `name`, `category`, `cancelSteps[]`, `script` template. Match = alias substring found in normalized description. Confidence: `verified`.
PRD ref: `prd.md > Leak detection engine`.

### Recurrence heuristic (`js/app.js` → `detectRecurring`)
Unmatched transactions grouped by normalized key (uppercase, strip non-alphanumerics, collapse spaces, drop pure numbers). Groups with ≥2 occurrences and amount variance <1% tested for periodicity: median day-gap 25–35 → monthly; 350–370 → annual; 2 occurrences ~30d apart → monthly (lower confidence). Confidence: `detected`.
PRD ref: `prd.md > Leak detection engine`.

### Dashboard renderer (`js/app.js` → `renderResults`, `computeTotals`)
Hero stats (monthly leak, yearly projection, count, potential savings), ranked cards, keep/cancel toggles, renewal flags (annual + renews within 60 days of latest date), expandable cancel guides, copy-to-clipboard, "Scan again" reset, empty/error states.
PRD ref: `prd.md > Results dashboard`, `prd.md > Cancel assistant`, `prd.md > States and Boundaries`.

### Demo data (`js/demo-data.js`)
One realistic 4-month statement string: ~10 subscriptions (Netflix, Spotify, Planet Fitness, iCloud+, Amazon Prime annual renewing in 12 days, Adobe, a forgotten "STREAMBOX*PREMIUM" trial conversion as the heuristic catch, etc.) + ~40 noise lines (groceries, gas, paycheck, coffee). Deterministic — same output every run.

## Data Model
In-memory only; nothing persisted:
```js
Transaction { date: Date, raw: string, merchant: string, amount: number }
Subscription {
  id: string, name: string, category: string,
  amount: number, frequency: 'monthly'|'annual',
  occurrences: number, firstSeen: Date, lastSeen: Date,
  confidence: 'verified'|'detected',
  cancelSteps: string[], script: string,
  renewsInDays: number|null, keep: true|false
}
```
State lives in a single `state` object in `app.js`; refresh wipes it (by design).

## File Structure
```
build-with-ai-basics/
├── index.html            # single-page shell: header, input panel, results, footer
├── css/
│   └── styles.css        # dark dashboard theme, cards, responsive grid
├── js/
│   ├── app.js            # parser, recurrence heuristic, rendering, state
│   ├── merchants.js      # MERCHANTS dictionary + cancel guides
│   └── demo-data.js      # DEMO_STATEMENT string
├── scope.md              # Skill Pack planning doc (required)
├── prd.md                # Skill Pack planning doc (required)
├── spec.md               # Skill Pack planning doc (required)
├── README.md             # run instructions
├── LICENSE               # MIT
├── SUBMISSION_DESCRIPTION.md  # text for the Devpost form
├── DEMO_SCRIPT.md        # <3min video shot list + narration
├── BUILD_NOTES.md        # what was built, how to run, what's left
├── .agents/skills/       # Devpost Learn Skill Pack (installed via npx)
├── .claude/              # skill symlinks (installed via npx)
├── agent/                # skill symlinks (installed via npx)
└── skills-lock.json      # skill pack manifest
```

## External Services and Dependencies
None. Zero. The page must make no network requests after load (verifiable in DevTools → Network). No APIs, no databases, no hosting required.

## Important Failure Modes
- **Weird statement formats** → parser skips unparseable lines and reports the count; if zero transactions parse, shows the format-hint error state instead of empty results.
- **False positives** (e.g., monthly rent flagged as subscription) → confidence badges + the user can toggle Keep; heuristic detections are labeled "Detected pattern", never "Verified".
- **Clipboard blocked** (`file://` in some browsers) → fallback: selects the script text in a readonly textarea for manual copy.

## What Was Simplified and Why
- **Pasted text instead of CSV upload** — every bank exports differently; paste is universal and demoable. A format-preset system would be a second project.
- **In-memory only, no localStorage** — persistence would weaken the absolute privacy claim; re-scan is the honest tradeoff for a PoC.
- **Vanilla JS instead of a framework** — no build step means judges can run it by double-clicking; the app is small enough that a framework adds nothing.

## Decisions and Open Issues
- Decision: single `index.html` + separate `css/` and `js/` files (not one mega-file) — readable for judges browsing the repo, still zero-build. Tradeoff: a few more files; accepted.
- Decision: ~25 merchants in the dictionary — covers the demo and the most common real subscriptions; community PRs could extend it later.
- Decision: heuristic needs ≥2 occurrences — a single charge can't be "recurring"; documented in UI hint ("paste 2+ months for best results").
- Genuine uncertainty discussed: false-positive rate of the periodicity heuristic on real statements — mitigated by confidence badges and Keep toggles; needs real-world testing post-hackathon (listed in BUILD_NOTES.md as follow-up).
- Open: demo video and public repo push are deliberately left to the parent agent (per task constraints); code is complete and committed locally.
