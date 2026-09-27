# SubCut — submission text description (for the Devpost form)

**Tagline:** Find every subscription draining your bank account — 100% in your browser, nothing uploaded.

**What it is:** SubCut is a privacy-first subscription leak detector. Paste a few months of bank statement text and it finds every recurring charge, totals your monthly and yearly "leak", flags annual renewals coming up, and hands you step-by-step cancel guides plus copyable cancellation scripts.

**How it works:** A statement parser extracts dates, merchants, and amounts from pasted text (any bank's format). A two-pass detection engine first matches ~25 known subscription merchants (Netflix, Spotify, Adobe, Planet Fitness…), then uses a periodicity heuristic to catch unknown recurring charges — like the forgotten free trial hiding behind a cryptic merchant string. Everything runs client-side in vanilla JavaScript: the page makes zero network requests after load, so your financial data physically cannot leave your device. No bank login, no Plaid, no account, no storage — privacy is the architecture, not a policy page.

**Features:**
- Paste-text statement input + one-click realistic demo statement
- Recurring-charge detection: verified merchant dictionary + heuristic pattern detection
- Leak dashboard: monthly/yearly totals, per-subscription cards ranked by annual cost
- Keep/Cancel toggles with live potential-savings calculator
- Annual renewal warnings (e.g. "Renews in 12 days")
- Cancel assistant: 3-step guides for known merchants, generic template for the rest, one-click copyable cancellation scripts
- Empty, error, and "no leaks found" states; credits/payroll lines auto-ignored

**Built with:** the Devpost Learn Skill Pack (`npx skills add challengepost/learn-ai-basics --all -y`) — see `scope.md`, `prd.md`, `spec.md` in the repo. Vanilla HTML/CSS/JS, zero dependencies, zero build step. Open `index.html` and it works.

**Why it matters:** People underestimate their subscription spending by 2–3x. The money leaks while nobody's watching — SubCut makes the leak visible in seconds, and every existing solution demands your bank login first.
