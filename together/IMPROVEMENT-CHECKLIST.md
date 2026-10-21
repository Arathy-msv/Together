# Demo review — implementation checklist

Findings from the detailed demo review, each confirmed against the code before changing it. Items already handled by earlier work are marked so they are kept, not rebuilt.

| # | Stage | Finding (confirmed) | Status |
|---|---|---|---|
| 1 | 1 | Trust section read `story.beneficiary`, the assistant/form write `story.whoItHelps`, so entered beneficiaries showed "Not provided" | Done — `beneficiaryText()` everywhere, v5 migration |
| 2 | 1 | "Greenwood School · Greenwood School" when organizer = organization | Done — `organizerLine()` |
| 3 | 1 | Budget lines had only label + amount; no quantity, unit cost, milestone, note, estimate basis or target comparison | Done — `lib/budget.ts`, `BudgetEditor`, public `BudgetPlan` |
| 4 | 1 | Public money view already separates planned, confirmed simulated contributions and published expenses | Kept |
| 5 | 2 | Evidence label says "Supporting document attached"; spec wording is "Supporting evidence attached". Evidence lacks caption and update links | To do |
| 6 | 2 | Final report has one form; no closure outcome (delivered / partial / cancelled / activities remaining) or required explanations | To do |
| 7 | 3 | Review repeats the large cover and campaign card; side preview duplicates it | To do |
| 8 | 3 | Approval and publication already separate (`publishApprovedRevision`), self-approval blocked | Kept — verify labels |
| 9 | 3 | Public page: secondary tools at equal weight to giving | To do |
| 10 | 4 | Sponsor-funded play is a flag only ("not tracked in this prototype") — no commitments, allocations or confirmation | To do |
| 11 | 5 | Game amount explanation, giving limit, restart/replay separation, cause visual | To do |
| 12 | 6 | Voucher store view, thank-you page actions | To do |
| 13 | 7 | Launch checklist (reuse readiness), local demo analytics (none exist) | To do |
| 14 | 8 | Malayalam preview toggle and translation editor are still in the UI — remove the controls, keep saved text | To do |
| 15 | 8 | No team/class participation model — document as a future gap | To do |
| 16 | 8 | Management screens, mobile, keyboard, recovery states | To do |
| 17 | 9 | Walkthrough scenes, narration, presales cut (target 2–3 min), freshness | To do |
