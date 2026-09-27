# SubCut — build notes

## What was built
SubCut: a privacy-first subscription leak detector. Single static web page (vanilla HTML/CSS/JS, zero dependencies, zero build step). Paste bank statement text → two-pass detection engine (verified merchant dictionary of ~25 subscriptions + periodicity heuristic for unknown recurring charges) → leak dashboard with monthly/yearly totals, keep/cancel toggles + live savings calculator, annual renewal flags, cancel guides + copyable cancellation scripts. 100% client-side; the page makes no network requests after load.

Built 2026-09-27 (within the Sept 22 – Oct 26, 2026 submission window) using the Devpost Learn Skill Pack (`npx skills add challengepost/learn-ai-basics --all -y`). All code is new; the only third-party material is the Skill Pack scaffolding itself (`.agents/`, `agent/`, `.claude/`, `skills-lock.json`), which is tooling, not project code. No frameworks, libraries, or starter templates beyond that.

## How to run
- **Easiest:** double-click `index.html` — it works from `file://`.
- Or serve the folder: `python3 -m http.server` (or `npx serve`) and open the URL.
- Click **Load demo statement** → **Find my leaks**. Expected: 10 subscriptions, $143.96/mo, $1,727.56/yr, Streambox Premium flagged as "Detected pattern", Amazon Prime flagged "Renews in 12 days".
- Paste your own statement text to scan real data (nothing is stored or sent).

## Verify the logic headlessly
```bash
cd ~/workspace/build-with-ai-basics
cat js/merchants.js js/demo-data.js js/app.js > /tmp/bundle.js
node -e "$(cat /tmp/bundle.js); const s=detectRecurring(parseStatement(DEMO_STATEMENT).txs); console.log(s.length, 'subs detected');"
```
Expected output: `10 subs detected`.

## What's left (for the parent agent — do NOT do these in this task)
1. **Create the public GitHub repo** (github.com — new repo, e.g. `subcut`), push this directory. Confirm MIT LICENSE renders in the repo About section.
2. **Record the demo video** (< 3 min) following `DEMO_SCRIPT.md`; upload to YouTube/Vimeo as public.
3. **Submit on Devpost** at learn-ai-basics.devpost.com: repo URL + video link + text from `SUBMISSION_DESCRIPTION.md`. Deadline **Oct 26, 2026 @ 5:00pm EDT**.
4. Optional polish before submission: GitHub Pages deploy for a live demo link.

## Known limitations / follow-ups
- Parser handles common US statement formats; exotic formats may need the format-hint error path.
- Heuristic needs ≥2 occurrences and consistent amounts — single mysterious charges won't flag (documented in UI hint).
- False-positive rate on real-world statements is untested — confidence badges + Keep toggles mitigate; worth a real-statement test before the video.
- `renewsInDays` is computed against the viewer's current date (dynamic, correct whenever run).
