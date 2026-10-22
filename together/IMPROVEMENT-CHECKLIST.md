# Demo review — implementation checklist

Findings from the detailed demo review, each confirmed against the code before changing it. Items already handled by earlier work are marked so they are kept, not rebuilt.

| # | Stage | Finding (confirmed) | Status |
|---|---|---|---|
| 1 | 1 | Trust section read `story.beneficiary`, the assistant/form write `story.whoItHelps`, so entered beneficiaries showed "Not provided" | Done — `beneficiaryText()` everywhere, v5 migration |
| 2 | 1 | "Greenwood School · Greenwood School" when organizer = organization | Done — `organizerLine()` |
| 3 | 1 | Budget lines had only label + amount; no quantity, unit cost, milestone, note, estimate basis or target comparison | Done — `lib/budget.ts`, `BudgetEditor`, public `BudgetPlan` |
| 4 | 1 | Public money view already separates planned, confirmed simulated contributions and published expenses | Kept |
| 5 | 2 | Evidence label says "Supporting document attached"; spec wording is "Supporting evidence attached". Evidence lacks caption and update links | Done — captions and related expense, milestone and update; public pills use the specified wording |
| 6 | 2 | Final report has one form; no closure outcome (delivered / partial / cancelled / activities remaining) or required explanations | Done — publishing a report does not complete milestones or close fundraising |
| 7 | 3 | Review repeats the large cover and campaign card; side preview duplicates it | Done — review summary no longer repeats the cover; one public preview remains beside it |
| 8 | 3 | Approval and publication already separate (`publishApprovedRevision`), self-approval blocked | Kept — approval is not independent verification |
| 9 | 3 | Public page: secondary tools at equal weight to giving | Done — share, partner offers and follow sit under “More ways to take part” |
| 10 | 4 | Sponsor-funded play is a flag only ("not tracked in this prototype") — no commitments, allocations or confirmation | Done — pledge, pending allocation, one confirmation, separate from personal checkout. Memory Match only |
| 11 | 5 | Game amount explanation, giving limit, restart/replay separation, cause visual | Done — amount rules and optional cap already shown; new board keeps the suggestion; “Start a new giving session” clears only the unconfirmed suggestion; category mark on the campaign title, hidden in low-data mode, not animated |
| 12 | 6 | Voucher store view, thank-you page actions | Done — store view names staff, merchant, branch, status, expiry, restrictions, QR and backup code. Thank-you page keeps at most three prominent buttons. Follow stays on this device |
| 13 | 7 | Launch checklist (reuse readiness), local demo analytics (none exist) | Done — checklist on the last create step; `together.demo.analytics.v1` for the fixed event list |
| 14 | 8 | Malayalam preview toggle and translation editor are still in the UI — remove the controls, keep saved text | Done — controls render nothing and the Translate action is gone. Saved `translations` stay in storage |
| 15 | 8 | No team/class participation model — document as a future gap | Done — README and How it works. Not built |
| 16 | 8 | Management screens, mobile, keyboard, recovery states | Kept and lightly checked — existing recovery boundary, tab keyboard on the campaign page, focus ring on “More ways to take part”. Not a full audit |
| 17 | 9 | Walkthrough scenes, narration, presales cut (target 2–3 min), freshness | Recorded and assembled 22 Oct 2026. Detailed walkthrough 33:05. Presales 2:49, including the sponsor budget. See `demo-video/README.md` freshness. |

## Storage

- `together.demo.v1` version 6. Older stores gain empty sponsor lists. Beneficiary and budget migrations from version 5 are unchanged. Nothing in the user’s browser is wiped by these code changes.
- `together.demo.analytics.v1` is a separate key.
