---
doc: scope
status: approved
---

# SubCut

One line: paste your bank statement, find every subscription quietly draining your money — entirely in your browser, nothing uploaded.

## The Unique Kernel
Every subscription finder wants your bank login. SubCut is the subscription finder that never sees your data — because your data never leaves your device. You paste statement text, all detection runs locally in JavaScript, and nothing is sent anywhere. Privacy isn't a policy page here; it's the architecture.

## Who It's For
Maya, 29, who signed up for three free trials last year and genuinely can't name all the things she's paying for monthly. Today she scrolls her banking app line by line, squinting at cryptic merchant names like "APL*ITUNES.COM/BILL" and "DNH*GODADDY.COM", and gives up. Surveys consistently find people underestimate their subscription spending by 2–3x — the money leaks while nobody's watching.

## The Core Loop
Open SubCut → paste a few months of statement text (or load the demo) → instantly see every recurring charge ranked with monthly/annual totals → toggle "cancel" on the ones you don't want → watch your projected yearly savings climb → copy a cancel script for each one. She comes back monthly to re-scan, or whenever a "your trial is ending" email makes her nervous.

## Inspiration & Identity
Fintech-plain, not fintech-bro: think a clean dark dashboard with one loud number (your monthly leak). The visual metaphor is a leak being plugged — red drips turning into green savings. Calm, trustworthy, slightly irreverent copy ("Found it. Cancel it. Keep the money."). No stock photos, no gradients-for-gradients'-sake.

## Why This Matters to the Learner
Built as the "Build With AI: Basics" hackathon entry — a proof that a solo builder with a coding agent can ship a complete, privacy-respecting consumer tool in an afternoon, and a genuine shot at the $2,500 prize pool.

## What "Working" Looks Like
Paste the demo statement → within a second, a dashboard shows ~10 detected subscriptions, "$127/month leaking ($1,524/year)", each with merchant name, amount, frequency, and first-seen date. Toggling three to "cancel" updates savings live. Clicking a subscription reveals step-by-step cancel instructions and a copyable cancellation script. The "oh, that's cool" beat: the forgotten $79.99 annual charge renewing in 12 days, flagged in red, that the user didn't know existed.

## The POC Boundary
IN: paste-text statement input + demo statement button; merchant-alias detection for common subscriptions; heuristic recurrence detection for unknown merchants; monthly/annual totals; keep/cancel toggles with live savings; cancel guides + scripts for known merchants and a generic template; renewal warnings for annual charges; 100% client-side, zero network calls after page load.
OUT: bank login / Plaid / any account connection; CSV file upload; real payment or cancellation automation; user accounts or saved history; mobile native app.

## Later
CSV/PDF statement upload; bank-specific format presets; price-increase detection ("Netflix went from $15.49 to $17.99"); email-forward scanning; shareable savings report.

## Explicitly Cut
- **Bank API integration (Plaid etc.)**: kills the privacy kernel, adds OAuth/keys/cost, and can't be demoed crisply. The whole point is no login.
- **Automatic cancellation**: legally and technically out of scope; scripts + guides achieve 90% of the value with 0% of the risk.
- **Accounts / history persistence**: localStorage-free by design for the demo narrative ("we can't store what we never receive"); re-scan each visit is the honest tradeoff.
- **CSV upload**: pasted text covers the demo and every bank lets you copy statement lines; format variance makes this a rabbit hole.
