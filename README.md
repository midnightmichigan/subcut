# SubCut

**Find every subscription draining your bank account — 100% in your browser, nothing uploaded.**

Paste a few months of bank statement text. SubCut detects recurring charges (known subscription merchants + heuristic pattern detection for unknown ones), totals your monthly/yearly "leak", flags annual renewals coming up, and gives you step-by-step cancel guides plus copyable cancellation scripts.

Built for the Devpost **"Build With AI: Basics"** hackathon ($2,500 prize pool) using the Devpost Learn Skill Pack. See `scope.md`, `prd.md`, `spec.md` for the planning docs.

## Try it (no install)

1. Open `index.html` in any modern browser (double-click it, or serve the folder: `python3 -m http.server` / `npx serve`).
2. Click **Load demo statement**, then **Find my leaks**.
3. Toggle subscriptions to **Cancel** and watch your potential yearly savings climb.
4. Expand any card for cancel instructions + a copyable cancel script.

Or paste your own statement text — every bank's copy-paste format works. Deposits and payroll lines are ignored automatically.

## How it works

- `js/app.js` — statement parser (dates, merchants, amounts), recurrence detection engine, dashboard rendering. All DOM-free pure functions, testable with node.
- `js/merchants.js` — dictionary of ~25 known subscription merchants with cancel guides.
- `js/demo-data.js` — deterministic demo statement (10 subscriptions hidden in everyday noise).
- `css/styles.css` — dark dashboard theme, no external assets.

**Privacy:** the page makes zero network requests after load. Your statement text physically cannot leave the tab (check DevTools → Network).

## Test the logic

```bash
node --check js/merchants.js && node --check js/demo-data.js && node --check js/app.js
```

The detection engine is DOM-free; see `BUILD_NOTES.md` for a one-liner that runs the full detection against the demo statement in node.

## License

MIT — see `LICENSE`.
