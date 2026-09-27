---
doc: prd
status: approved
---

# SubCut — Product Requirements

SubCut: paste your bank statement, find every subscription quietly draining your money — entirely in your browser, nothing uploaded. For anyone who has ever lost track of what they're paying for monthly.
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

## The Core Journey
1. Maya opens SubCut and sees a one-screen app: headline, a big statement input box, a "Load demo statement" button, and a privacy note ("runs 100% in your browser — nothing is uploaded").
2. She pastes ~4 months of statement text (or clicks the demo button) and hits "Find my leaks".
3. Within a second, a results dashboard appears: a hero number ("$127/mo leaking"), yearly projection, and a ranked list of detected subscriptions.
4. Each subscription card shows: clean merchant name, amount, frequency (monthly/annual), first-seen date, confidence badge (Verified merchant vs. Detected pattern), and a Keep/Cancel toggle.
5. She toggles three subscriptions to Cancel; the hero savings number updates live ("You'll keep $840/year").
6. She expands the $79.99 annual charge flagged "renews in 12 days", reads the 3-step cancel guide, and copies the cancellation script with one click.
7. She clicks "Scan again" to paste a fresh statement. Nothing was stored; nothing left her device.

## Screens and Layout
Single-page, single surface — no navigation, no routing:
- **Header**: SubCut wordmark + "100% private — runs in your browser" badge.
- **Input panel** (top): textarea for statement text, "Load demo statement" secondary button, big "Find my leaks" primary button. Privacy reassurance line underneath.
- **Results dashboard** (appears after analysis): hero stat row (monthly leak, yearly leak, subscriptions found, potential savings), then subscription cards in a responsive grid, then a "How to cancel" detail area when a card is expanded.
- **Footer**: one-line disclaimer ("estimates from pasted text; verify before cancelling").

## Look and Feel
Dark fintech dashboard: deep ink background (#0e141b-ish), one red accent for leaks, one green accent for savings, high-contrast white text. Typography: system stack, tight bold display numbers, small caps labels. Dense but breathable — a dashboard, not a landing page. Copy tone: direct, slightly irreverent ("Found it. Cancel it. Keep the money."). No external fonts, images, or CSS frameworks — must work fully offline after first load.

## Features and Behavior

### Statement input
- Paste arbitrary statement text into the textarea (works with copied lines from any bank).
- "Load demo statement" fills a realistic 4-month statement with ~10 subscriptions mixed into everyday noise (groceries, gas, paycheck).
- "Find my leaks" runs detection; button shows a brief analyzing state.
- Empty input → inline error: "Paste your statement first — or try the demo."

### Leak detection engine
- Parses each line for a date, merchant description, and amount (handles `MM/DD/YYYY`, `MM-DD-YY`, `Sep 12` formats; `$1,234.56` amounts; ignores non-transaction lines).
- Matches descriptions against a built-in merchant alias dictionary (~25 common subscriptions: streaming, music, cloud, gym, software) → canonical name, category, known cancel guide.
- For unmatched descriptions: groups by normalized merchant key; flags groups with 2+ occurrences of similar amounts at roughly periodic intervals (25–35 days = monthly, 350–370 days = annual) as "Detected pattern" with medium confidence.
- Source: `scope.md > The POC Boundary`.

- As Maya, I want every recurring charge found even if I've never heard of the merchant string, so that cryptic lines like "DNH*GODADDY.COM" don't slip through.
  - [ ] Demo statement yields ≥ 8 detected subscriptions including at least 1 heuristic (non-dictionary) detection.
  - [ ] Each detection shows amount, frequency, first-seen date, and confidence badge.

### Results dashboard
- Hero stats: monthly leak total, yearly projection, count of subscriptions found, potential yearly savings (sum of toggled-to-cancel, annualized).
- Subscription cards ranked by annual cost, each with Keep/Cancel toggle; toggling updates savings live.
- Annual subscriptions renewing within 60 days get a red "renews in N days" flag.
- "Scan again" resets to the input panel.

### Cancel assistant
- Expanding a card shows: 3-step cancel instructions for known merchants; a generic 4-step template for heuristic detections; a "Copy cancel script" button that copies a polite, firm cancellation message to clipboard with a toast confirmation.
- Source: `scope.md > The Unique Kernel` (guidance, not automation).

## States and Boundaries
- **First use / empty**: input panel only; demo button prominent; example line format hint.
- **Analyzing**: button spinner < 1s; results render when done.
- **Results**: dashboard as described; persists in-memory until "Scan again".
- **No leaks found**: friendly empty state ("No recurring charges detected — either you're frugal or your statement was too short. Try the demo.").
- **Unparseable input**: counts skipped lines; if zero transactions parsed, error state suggests checking format.
- **Persistence**: none by design — refresh wipes everything. This is a privacy feature, stated in the UI.
- **Assumption**: pasted text contains at least ~2 months of history for monthly detection; documented in the hint text.

## Product Decisions
- Vanilla HTML/CSS/JS, no build step, no framework — judges and users open `index.html` and it works; zero install friction. Tradeoff: hand-rolled CSS instead of a component library.
- Paste-text input instead of CSV upload or bank login — covers every bank uniformly, preserves the privacy kernel, demoable in seconds.
- No storage of any kind (not even localStorage) — the privacy story is absolute and checkable in DevTools' Network tab.
- Detection runs synchronously in <1s for demo-sized statements; no web worker complexity for the POC.

## What We're Building
Everything under Features and Behavior above: input panel, detection engine (parser + alias dictionary + recurrence heuristic), results dashboard with live savings, cancel guides + copyable scripts, renewal flags, empty/error states, privacy-by-architecture.

## Deferred From the POC
- CSV/PDF upload and bank-specific presets — paste covers the demo; format variance is a rabbit hole.
- Price-increase detection across periods — valuable, but needs denser history UI.
- Saved scans / history — contradicts the no-storage privacy stance for now.

## Possible Later Enhancements
Browser extension that highlights subscriptions on the bank's own site; email-forward scanning for trial-ending warnings; shareable "I saved $X" report card.

## Non-Goals
- We will NOT connect to banks or payment networks (kills the kernel).
- We will NOT cancel anything automatically (legal/safety risk; scripts are the 90% solution).
- We will NOT give financial advice — the footer says to verify before cancelling.

## Open Questions
- None blocking `4-spec`. Minor: exact demo-statement merchant mix — resolved during build (must include 1 annual renewal <60 days out and 1 heuristic-only detection).
