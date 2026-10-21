# Demo-review audit

Audit date: 2026-10-21. Source of truth: the 30-section improvement prompt pasted in this session. Workspace: `/workspace/together` (this remote checkout, not `C:\Together_The_campaign`). Later repair passes changed the application. The original inspection commit was `3a52b67`. Player-facing repairs are `0247101`. This file’s later rows record the isolated-browser pass after that.

Browser checks used a throwaway Chrome profile, so they did not read or write an existing user’s `localStorage`. Demo videos were not regenerated.

Statuses mean:

- **Complete** — the behaviour was exercised by a test that passed in this audit, or by the isolated browser.
- **Partial** — some of the required behaviour exists, or it exists in code but this audit did not exercise that path.
- **Missing** — the required behaviour is not in the application.
- **Blocked** — verification could not proceed.
- **Not applicable** — the section is a working instruction, not a product behaviour.

Code that was only read is not marked Complete.

## Summary

| Status | Count |
| --- | ---: |
| Requirements checked | 82 |
| Complete | 40 |
| Partial | 40 |
| Missing | 0 |
| Blocked | 0 |
| Not applicable | 2 |

Counts are recounted from the requirement rows below. The four rows previously listed as Missing — 43 palette swatches, 52 in-game illustration, 61 sharing pages in My activity, and 69 timezone labels — are now Complete because an isolated browser exercised them. They were not moved into Partial. Rows 24, 25, 26, 47, 55, 59, and 65 also moved from Partial to Complete on new evidence. Demo videos are still stale.

Checks run this pass: `npm test` (187 passed, 0 failed) and `npm run build` (succeeded; the bundle-size note is a Vite warning, not a test failure). Isolated browser on port 9363 with a throwaway profile.

## Requirements

| # | Requirement | Status | Evidence | Verification performed | Remaining work |
| --- | --- | --- | --- | --- | --- |
| 1 | Section 1: inspect current behaviour before editing | Not applicable | Working instruction for implementation. This file is that inspection. | Read routes, storage, and tests. No product change. | None for this audit. |
| 2 | One beneficiary value on the public story | Complete | Story tab text: “Families staying in Open Harbour’s three night shelters, including about 60 children.” `beneficiaryText()` in `src/lib/budget.ts`. | Isolated browser, `/o/open-harbour/campaigns/cmp_harbour_blankets`. | None for this seeded campaign. |
| 3 | Assistant and form edit the same beneficiary | Partial | Assistant textarea writes `form.storyWho` (`src/pages/org/Assistant.tsx`). Form uses the same field (`src/lib/wizard.ts`). | Code inspection. Assistant was not clicked. | Click assistant → form → review with a new beneficiary. |
| 4 | Review shows the beneficiary | Partial | `DraftReviewSummary.tsx` row “Who will benefit” reads `form.storyWho`. | Code inspection. Review screen not opened. | Open the review step. |
| 5 | Publication keeps the beneficiary | Partial | `wizard.ts` writes `story.whoItHelps` from `form.storyWho`. | Code inspection. No publish click. | Publish a draft and reopen the public story. |
| 6 | Beneficiary edits follow approval rules | Partial | `story` is in `MATERIAL_FIELDS` (`src/lib/transparency.ts`). Re-review tests use description, not the beneficiary. | `tests/permissions.test.ts` passed for description changes. | Edit who-it-helps on a live campaign that requires review. |
| 7 | Migration copies only an existing beneficiary field | Complete | `tests/budget.test.ts`: “a v4 store migrates to v5 and copies beneficiaries only from the beneficiary field”. Empty prose is not turned into a beneficiary. | That test passed in `npm test`. | None. |
| 8 | No repeated organizer name | Partial | `organizerLine()` in `src/lib/budget.ts`. Open Harbour’s names differ, so the duplicate case was not on screen. | Browser showed one organizer line, not “Name · Name”. | Load a campaign whose organizer and organization names match. |
| 9 | Budget lines: description, quantity, unit cost, total, milestone, note | Complete | `tests/budget.test.ts` keeps quantity, unit cost, milestone, and note only when they add up. | Test passed. | None for the model. |
| 10 | Budget money is integer minor units | Complete | Same test: `amountMinor: 546_000`, `unitCostMinor: 4_550`. | Test passed. | None. |
| 11 | Show target, planned total, unallocated amount, and any excess | Partial | Story tab showed “Planned budget” and “Fundraising target”, plus `300` and `₹150`. Unallocated and over-target lines were not read. | Browser story tab. | Read the unallocated and over-target rows, including a plan above the target. |
| 12 | Budget edits do not change the fundraising target | Partial | No code path found that writes `goalAmount` from a budget line. | Code inspection only. | Change a budget and confirm the goal field is unchanged. |
| 13 | Planned spending, confirmed gifts, and published expenses stay separate | Partial | Fund tab is a different panel from the planned budget. `tests/transparency.test.ts` counts a linked expense once. | Evidence pills seen on the fund tab. The three totals were not read together. | Read raised, spent, and planned figures on one campaign. |
| 14 | Planned items are not shown as purchases | Complete | Heading on the story tab is “Planned budget”. | Browser. | None. |
| 15 | Approximate budgets require an explanation | Partial | `budgetApproximate` and `budgetNote` in `StoryEditor.tsx` and `LaunchChecklist.tsx`. | Code inspection. Editor not opened. | Save an estimate without a note and confirm it is refused. |
| 16 | No invented per-person impact | Partial | Impact examples still have a `costBasis` field in `src/lib/types.ts`. | Not submitted in the UI. | Try to save an impact line with no basis. |
| 17 | Fictional receipt upload | Partial | Sample receipts live in `src/lib/ai/receipts.ts`. Workspace receipt UI exists. | Not opened. | Upload a sample receipt and save it. |
| 18 | Private originals stay off the public page | Partial | `normalizeDocument` in `src/lib/records.ts` drops `fileSrc` unless visibility is public. | Code inspection. No private file was requested in the browser. | Add a private document and confirm the public page omits it. |
| 19 | Caption and links to expense, milestone, and update | Partial | `TrustEditor.tsx` and document fields on `SupportingDocument`. Seed `doc_hb_quote` is linked in `transparencySeed.ts`. | Code and seed inspection. Link was not clicked. | Open the linked evidence from the public expense. |
| 20 | One published expense with evidence and one without | Complete | Seed `exp_hb_blankets1` has `publicReceipt`; `exp_hb_van` does not. Browser fund tab contained both “Supporting evidence attached” and “No supporting evidence uploaded”. | Isolated browser, `?tab=fund`. | None for this seed. |
| 21 | Those two evidence phrases, and not “independently verified” | Partial | Both required phrases were on the fund tab. The absence of “independently verified” was not searched. | Browser text search for the two phrases. | Search the public page for verification claims. |
| 22 | Evidence image opens and is readable; missing files fall back | Partial | Public receipt path is `/docs/sample-receipt-redacted.svg`. | Image was not opened. | Open the receipt and a missing-file case. |
| 23 | Sponsor pledge, pending allocation, one confirmation | Complete | `tests/sponsors.test.ts`: “a sponsor reward stays pending, confirms once, and is not a personal supporter.” Second unlock is null. Second confirm adds ₹50 once. | Test passed. | None for the model. |
| 24 | Sponsor journey in the UI, Memory Match only | Complete | Sponsor screen options were only Memory Match campaigns, including the three stage-2 campaigns and Winter Care Kits. The page said garden, puzzle, and jacket are not listed. A fictional Northwind Stationery budget was saved from the form. | Isolated Chrome. Cap campaign: pledge ₹200, per-person cap ₹50, reward ₹50. One match unlocked ₹50 pending after the screen had already said “Next sponsor reward: ₹50”. Confirming once wrote one `spn_gift_` of ₹50. A second confirm returned the same confirmed row and did not add a gift. A later match said “No further sponsor reward for this match” while ₹150 of the pledge remained. Budget campaign: pledge ₹100, cap ₹200, reward ₹50. Two confirms wrote two ₹50 sponsor gifts and the page said “Sponsor budget is used up”. A further match added no allocation. Personal contributions on that campaign stayed 0. | Demo video still describes sponsor play without a budget. |
| 25 | Reward amount shown before a limited sponsor action | Complete | Before the first sponsor match the game said “Next sponsor reward: ₹50”. The pending line appeared only after the match. | Isolated Chrome, Stage 2 Cap Match, sponsor mode. | None for this screen. |
| 26 | Campaign and sponsorship dates block unlocks | Complete | A future open date, a past close date, and a sponsorship that has already ended each return no allocation and leave the allocation list empty. | `tests/sponsors.test.ts`: “sponsor unlocks stop when the campaign or the sponsorship is outside its dates”. Passed in this pass (187 tests). | The date cases were not clicked in the browser. The status follows the audit rule that a passing test can complete a model behaviour. |
| 27 | Sponsor amount is not added to personal checkout | Partial | Confirmed sponsor gifts use `source: 'sponsor'` and are skipped by `supporterCount`. Memory Match sponsor mode does not call `contribution.record`. | Model test. Checkout screen not used in sponsor mode. | Choose sponsor play and confirm the personal review does not include that amount. |
| 28 | One shared draft; review is a short summary with one preview | Partial | `DraftReviewSummary.tsx` no longer renders `CampaignCover`. Autosave remains in the form. | Code inspection. Create flow not clicked. | Walk assistant and form into the same draft and the review step. |
| 29 | Approval does not publish; a later action publishes | Complete | `tests/permissions.test.ts`: “admins cannot approve their own revision; another admin can.” Title stays old until `publishApprovedRevision`. | Test passed. | None for the action layer. |
| 30 | Self-approval is refused | Complete | Same test throws `/own revision/`. | Test passed. | None. |
| 31 | A material change after approval needs review again | Complete | `tests/permissions.test.ts`: “an approved revision is superseded by a later material change and needs review again.” | Test passed. | None for description edits. |
| 32 | The last published revision stays public during review | Complete | Same self-approval test: pending title is not the live title. `publicationState` of a live campaign with a pending revision stays `published` (`tests/lifecycle.test.ts`). | Tests passed. | None. |
| 33 | Reviewer, decision, and next action are visible | Partial | `src/components/campaign/RevisionReview.tsx`. | Screen not opened. | Open a submitted revision as a second admin. |
| 34 | Approval copy does not claim independent verification | Partial | Report and expense copy says organizer-reported. Review screen not read. | Not the review screen. | Read the approval panel. |
| 35 | Public page states cause, organizer, beneficiaries, fund use, progress, and how to take part | Complete | Story questions and give/play choices were on the Open Harbour page. Fund tab showed “Accepting contributions”. | Isolated browser. | None for this campaign. |
| 36 | Give directly and Play to support stay primary, with the game sentence beside play | Complete | Browser text included “Give directly”, “Play to support”, and “Play to build a suggested contribution”. | Isolated browser. | None. |
| 37 | Sponsor-funded play is a primary choice only when configured | Partial | Radios render when `sponsorOffer` returns an offer. This campaign had no offer, so the control was absent. | Browser absence matches the seed. Configured state not shown. | Enable a commitment and reload. |
| 38 | Share, partner offers, follow, and ask are secondary | Complete | Ask is inside `details.more-ways`. Isolated Chrome: Enter opened the summary and Tab reached share, follow, and the suggested questions. | Isolated browser, fund tab, 390px. | Demo video still shows the old placement. |
| 39 | Funded or closed campaigns replace giving and keep receipts and vouchers | Partial | `Funding goal reached` and “See what happens next” are in `Campaign.tsx`. | No funded campaign was opened. | Open a goal-reached campaign and a receipt. |
| 40 | Public fundraising and delivery labels match the prompt | Complete | Visible badge text is “Delivery in progress”. `tests/lifecycle.test.ts` asserts “Delivery not started”, “Delivery in progress”, and “Organizer-reported complete”. | Isolated browser on Open Harbour blankets, plus the label test. | A funded page was not opened in this pass. Milestone status options stay “In progress”. |
| 41 | Reaching the goal does not complete delivery | Complete | `tests/lifecycle.test.ts`: “fundraising labels come from the stored status and the goal, never from delivery” and “delivery is complete only when the organizer reports every activity complete”. | Tests passed. | None for the state functions. |
| 42 | Colour picker, hex entry, live preview, readable text | Partial | `Onboarding.tsx` `input type="color"` and hex field. `contrastChecks` and `readableOn` in `src/lib/theme.ts`. | Code inspection. Settings not opened. | Change a colour and read the preview and contrast note. |
| 43 | Suggested palette swatches | Complete | Harbour green, School blue, Warm clay, and Night library are buttons on organization colours and onboarding. Choosing School blue set the hex fields, the colour picker, and the preview CSS variables before save. All four contrast checks passed. | Isolated Chrome, My website. Primary `#163a66`, background `#e3ebf6`, accent `#0e4c81`, surface `#f6f8fb`. | The swatch row sits below the fold; the check read the live controls, not a single top-of-page screenshot. |
| 44 | Branding on website, campaigns, games, sharing, vouchers, and workspace; QR stays readable | Partial | Theme is applied from organization branding. QR quiet zone is tested. Surfaces were not compared. | `tests/sharing.test.ts` quiet-zone case. | Spot-check each surface after a colour change. |
| 45 | Before play: amount per action, no payment while playing, whether the total can change | Partial | `gameAmountRules()` and `GameIntro.tsx`. | Game intro not opened. | Start Memory Match and read the intro. |
| 46 | Optional giving limit stops the suggestion and leaves play available | Complete | `tests/gameContribution.test.ts`: “stops increasing at the cap without touching a chosen amount” (`capped:0`, suggestion stays 12000). | Test passed. | None for the ledger. |
| 47 | Raising the giving limit needs an explicit agreement | Complete | At a ₹50 rate and a ₹50 cap, the second match left the suggestion at ₹50. The enabled control named ₹50 and ₹100. After the click the suggestion stayed ₹50 and the cap became ₹100. A second click did not raise it. Refresh kept ₹50 / ₹100. The organizer setting stayed ₹50. | Isolated Chrome, Stage 2 Memory Match. Continuing play did not increase the suggestion before the explicit raise. | Keyboard activation of that same button was not repeated in this pass. |
| 48 | One editable game review and one simulated confirmation | Partial | An in-game amount dialog (`ContributionDialogs.tsx`) and a separate confirm page (`Confirm.tsx`) both summarize the amount. | Both files read. Flow not clicked. | Remove the repeated summary if one screen is enough. |
| 49 | Only a confirmed gift changes the campaign total; cancel and failure do not | Complete | `tests/checkout.test.ts`: “a failed payment leaves totals unchanged and keeps the pending amount.” `tests/gameContribution.test.ts` cancel discards the suggestion. | Tests passed. | None for those cases. |
| 50 | New board keeps the suggestion; a separate action starts a new session | Partial | `requestRestart` vs `requestNewSession` in `src/hooks/useGameContribution.ts`. | Code inspection. Buttons not clicked. | Play, deal a new board, then start a new session. |
| 51 | Sponsor replay does not pay the same unlock twice | Complete | Sponsors test: second `unlockSponsorMilestone` for the same person and unlock returns null. | Test passed. | None for that unlock id. |
| 52 | Category play reveals a symbolic illustration and does not look like a purchase | Complete | Memory Match shows a CSS education sketch. The caption says the drawing is not a purchase and that matching does not buy or deliver goods. Low-data mode leaves the sentence and removes the drawing. Reduced motion sets the symbol transition to 0s. No sketch image is requested. | Isolated Chrome, Stage 2 Memory Match, category education. | The sketch is on Memory Match. The other games were not given the same drawing. |
| 53 | No new games in this work | Complete | Game modules remain garden, puzzle, memory, and jacket. | File list under `src/pages/play`. | None. |
| 54 | Store-ready voucher: merchant, branch, headline, status, expiry, restrictions, QR, backup code, “Present this to store staff” | Partial | `VoucherCard.tsx` dialog includes those fields. | Dialog not opened; the fresh profile had no issued voucher. | Claim a reward and open Show voucher. |
| 55 | Statuses include partially used and cancelled | Complete | Store-value code GGL-0F1E-8B38 recorded a ₹200 redemption and left ₹300. A larger deduction was refused and the balance stayed ₹300. Percentage code GGL-B392-3F58 had no amount field and no balance. Cancelling the store voucher with the reason “Supporter asked to stop using the remaining credit” kept the terms, the ₹200 history, and the ₹300 balance. A later merchant redemption threw “This voucher was cancelled. It cannot be redeemed.” The merchant screen said this is not an expiry and hid the redeem control. | Isolated Chrome, merchant Mo Ali, plus `tests/vouchers.test.ts`. | None for these two offers. |
| 56 | Turning the feature off stops new vouchers and keeps issued ones | Complete | `tests/vouchers.test.ts`: “deactivation stops issuance but keeps vouchers, redemption and benefit settlement”. | Test passed. | None. |
| 57 | Honest closure: four outcomes, required explanations, no automatic milestone completion, partial-delivery label, refund is a statement | Partial | `CLOSURE_LABEL.partial` is “Campaign closed — partial delivery reported”. `FinalReportEditor.tsx` requires explanations. `tests/sponsors.test.ts` only normalizes a partial report. | Normalize test passed. Publish was not clicked, and milestones were not re-read after a report. | Publish a partial report and confirm milestones and fundraising stay unchanged. |
| 58 | Thank-you page: amount, receipt, next update only if dated, local follow, reward, at most three prominent actions | Partial | `Success.tsx` shows the receipt card, a dated or undated next-update sentence, a local-follow note, and up to three `btn-lg` links. | Source read. No gift was confirmed in the browser. | Confirm a gift and count the actions. |
| 59 | Optional personalized sharing action on the thank-you page | Complete | A new simulated contribution on a campaign with no sharing page offered “Create my sharing page” and “Nothing is created until you save it”. The referral count stayed 0. A later contribution on a campaign that already had this supporter’s page linked that page and did not add a referral. | Isolated Chrome. | Demo coverage still shows the older thank-you page. |
| 60 | My activity groups contributions, vouchers, and followed updates, and respects the feature flag | Partial | `/o/:slug/my-activity` in `App.tsx`. `SupporterHistory.tsx` hides the contribution list when history is off and still renders vouchers. | Code inspection. Page not opened. | Open My activity as two identities. |
| 61 | My activity includes personalized sharing pages | Complete | My activity lists “Sharing pages” for the current supporter only. Guest Asha’s page had Open and Edit and share. Tara’s admin page was not in that list. The empty-state copy says opening the list does not create a page. | Isolated Chrome, `/o/together/my-activity`. | None for this list. |
| 62 | Launch checklist from real draft state, with required, recommended, and optional, and a preview tick that is not a payment test | Partial | `LaunchChecklist.tsx` and the checkbox copy in `CreateCampaign.tsx`. | Source read. Last create step not opened. | Open the last step and compare each row with an empty draft. |
| 63 | No numerical trust score | Complete | `LaunchChecklist.tsx` renders Done / Still open and a kind. No score. | Full component read. | None. |
| 64 | QR PNG/SVG decode to the campaign or referral URL; WhatsApp and email drafts keep that URL | Complete | `tests/sharing.test.ts`: campaign QR, referral QR, quiet zone, and WhatsApp/email drafts. | Tests passed. | None for generation. |
| 65 | A4 poster and square, portrait, and story images have the expected pixels and do not clip | Complete | Campaign and referral QR PNG and SVG are 1024×1024 and decode to the exact campaign or referral URL. Posters are 2480×3508. Social images are 1080×1080, 1080×1350, and 1080×1920. The QR printed on each poster and social image decodes to the same URL. After the layout fix, poster edge pixels are clear and the footer “A fundraiser by Together” sits below the QR card. Social title, purpose, and the referral line do not run into the QR. | Isolated render in Chrome, files under `/tmp/stage2-assets`, decoded with jsQR. Previews were inspected. | Files were not copied into the repository. A long URL still wraps beside the poster QR; it was fully readable on the referral poster. |
| 66 | Journey events fire from the product, and the admin card shows counts and denominators | Partial | Call sites exist for all nine event names. `tests/analytics.test.ts` writes events directly. `DemoAnalyticsCard.tsx` was not opened. | Unit test passed. UI events not triggered. | Click each journey and read the card. |
| 67 | Analytics can be paused, cleared apart from campaigns, and exported without voucher codes | Complete | `tests/analytics.test.ts` pause/clear test, and the export assertion that the text does not include “voucher code”. | Test passed. | None for the module. |
| 68 | English-only UI; no language selector; saved translations are not deleted | Complete | `LanguageToggle` returns null. Browser pages had no Malayalam control. Seed `translations` remain in `transparencySeed.ts`. How it works is English. | Isolated browser. | None for the selector. |
| 69 | Dates show a timezone where it matters | Complete | `formatDateTime` appends the display timezone. Saving Europe/London on organization settings kept that zone, and a member timestamp read “1 Jan 2026, 00:00 Europe/London”. A date-only next update stayed “21 Oct 2026” with no zone shift. `tests/display.test.ts` covers the helper. | Isolated Chrome settings and members pages, plus the display tests. | Date ranges of campaign open and close still use `formatDate` and do not append the zone name. |
| 70 | Team or class participation is a documented gap, not a pupil system | Complete | How it works answer: “Not in this prototype…” and “future gap.” No class roster in `src`. | Browser opened the question. | None unless the product later asks for it. |
| 71 | Management screens: one Add action, readable lists, empty states, inline errors, save feedback, no permanent long form | Partial | Editors exist for expenses, updates, members, and offers. | Not walked. | Open members, offers, milestones, and expenses at desktop and mobile. |
| 72 | Supporter page has no horizontal overflow at 390px | Complete | At 390×844, `scrollWidth` equalled `clientWidth` (390). | Isolated browser, device metrics only. | Recheck after layout edits. |
| 73 | Increased zoom does not overflow | Complete | At CSS width 195 (a 390px device at 200% zoom) and device scale 1, `scrollWidth` equalled 195 on the Open Harbour fund page. | Isolated browser after the layout fix. | Other screens were not measured at this width. |
| 74 | Keyboard, focus, dialogs, names, and non-drag play | Partial | “More ways to take part” accepted focus. Other dialogs, labels, and games were not tabbed. | One focus check. | Tab the give panel, confirm dialog, and a game. |
| 75 | Low-data mode skips optional media; reduced motion is respected; direct giving does not need a game | Partial | With the saved preference on before navigation, the library campaign showed the initials cover and did not request `cover-library.jpg`. The sharing kit no longer prefetches that photo. Memory Match used word faces and did not request card photos; the sketch stayed text. `prefers-reduced-motion: reduce` set the card and sketch transitions to 0s. Give directly remains available. | Isolated Chrome, performance entries on the campaign and play documents. | Garden, puzzle, and jacket artwork still download when those games open. A referral page was not reloaded in low-data mode after the intro change. |
| 76 | Failed simulated payment does not show success or move the total | Complete | `tests/checkout.test.ts`: “a failed payment leaves totals unchanged and keeps the pending amount.” Confirm page still has “Simulate failed payment”. | Test passed. Button not clicked. | None for the ledger. |
| 77 | Cancelled review, closed campaign, expired voucher, exhausted stock, rejected revision, draft recovery, storage-full, and failed download | Partial | Copy and handlers exist (`Confirm.tsx`, voucher expiry, `StorageFullError`, `AssetRenderError`). Wrong-branch redeem is in `tests/permissions.test.ts`. | Branch test passed. The other states were not clicked. | Exercise each state in the isolated profile. |
| 78 | Prototype limits stay explicit | Partial | README and many screens say simulated. Not every screen was read for over-claiming. | README and fund/story pages. | Read sponsor, voucher, and approval screens for verification claims. |
| 79 | Detailed five-role video shows the current product | Partial | Application has later behaviour. Demo coverage missing. `demo-video/output/together-demo.mp4` is the previous assembly: `assembly-report.json` records 1857.27 seconds. Narration still says sponsor play has no budget (`demo-video/narration/script.md`). Scenes called out in `demo-video/README.md` include `og-assistant`, `og-form`, `sp-trust`, `sp-vouchers`, `fn-public`. | File list and assembly report. Video was not played. Compared narration text with current sponsor behaviour. | Re-record after scene checks match the UI. Do not describe this file as current. |
| 80 | Separate 2–3 minute presales video of the five-step story | Partial | `demo-video/scripts/presales.mjs` now lists `op-home`, `op-game`, `sp-direct`, `fn-public`, `card-end`. The file `demo-video/output/together-presales.mp4` is the older assembly: 642.93 seconds and the long scene list in `assembly-report.json`. | Assembly report compared with the script. Not played. | Reassemble only after a fresh recording. The file on disk is not a 2–3 minute cut. |
| 81 | Subtitles, scene checklist, and freshness notes match the files | Partial | `together-demo.en.srt`, `together-demo.en.vtt`, `together-presales.en.srt`, `scene-timings.md`, and `assembly-report.json` exist beside the mp4 files. `demo-video/README.md` marks both videos stale against commit `c7c2eed` and later UI. | File list and README. Cue text was not aligned to frames. | Update timings only when a new assembly exists. |
| 82 | Section 29: implement in nine runnable stages | Not applicable | Process instruction. Stages already landed in commits `4f12089` and `3a52b67`. This audit does not restart them. | Git log. | Repair only the gaps below. |

## 1. Critical functional defects

No money-counting defect was reproduced. The passing tests and the isolated sponsor walk still show:

- a failed payment leaves the total unchanged (`tests/checkout.test.ts`)
- a referral gift counts once (`tests/transparency.test.ts`)
- one sponsor confirm adds ₹50 once, and a second confirm does not add another gift
- cancelling a voucher does not restore the redeemed amount or change the campaign total

The first poster render clipped “A fundraiser by Together” under the QR card. That layout is fixed and the re-render was inspected. It was not a money defect.

## 2. Missing required functionality

None of the 82 rows is Missing after this pass. The four rows that were Missing are Complete: 43, 52, 61, and 69. See the summary for the Partial rows that also became Complete.

What is still unfinished is Partial, not Missing. The largest product gaps still open are closure publishing, a private-document public check, a receipt open check, garden/puzzle/jacket media under low-data mode, and the stale videos.

## 3. UI and accessibility issues

- Campaign, My activity, and organization settings do not overflow at 390px. The earlier 200% zoom check on the Open Harbour fund page still stands.
- Ask stays inside “More ways to take part”.
- Tab order was checked on the campaign header, settings, and My activity. The contribution review and the voucher dialog were not in that pass.
- Reduced motion set the Memory Match card and sketch transitions to 0s.
- Low-data mode no longer requests the library cover or Memory Match card photos. Garden, puzzle, and jacket art were not rechecked.
- This is not an accessibility certification.

## 4. Demo-only gaps

Application behaviour for beneficiary, budget, evidence labels, sponsor confirmation, English-only pages, and the launch checklist is ahead of the videos.

- Detailed walkthrough: `demo-video/output/together-demo.mp4` (1857.27 s, about 30:57). Application complete for several of those topics; demo coverage missing.
- Presales file: `demo-video/output/together-presales.mp4` (642.93 s, about 10:43). The script list is the shorter cut; the mp4 was not regenerated.
- Subtitles: `demo-video/output/together-demo.en.srt`, `together-demo.en.vtt`, `together-presales.en.srt`, `together-presales.en.vtt`.
- Manifest: `demo-video/output/assembly-report.json`.
- Copies of the same older renders also sit in `/home/ubuntu/Downloads/Together-demo-walkthrough.mp4` and `Together-presales-short.mp4`.

Narration was not re-timed. No encode was started.

## 5. Unverified in this audit

Still not clicked as a full journey: campaign assistant through publish, a funded campaign, launch checklist, storage-full failure, and garden or jacket play under low-data mode. Keyboard checks covered the campaign header, organization settings, and My activity. The voucher presentation dialog was not opened in the later pass because the library page had no “Show voucher” button. Videos were not played; durations come from `assembly-report.json`, not from a new playback.

## Repair progress

Statuses below are updated only where a new test or an isolated browser check ran after the audit. Demo coverage stays incomplete until the walkthrough videos are re-recorded. “Not exercised” is not a pass.

| # | Implementation | Behaviour verified | Demo coverage | Evidence |
| --- | --- | --- | --- | --- |
| 38 | Ask sits inside “More ways to take part” | Yes, isolated Chrome | No | Fund page: `#ask-title` is inside `details.more-ways` and not in `.campaign-main`. Enter opened the summary. Tab reached Share, Create my sharing page, the sharing kit, Follow, and the suggested questions. |
| 40 | Visible delivery labels include the word Delivery | Yes, isolated Chrome | No | Badges read “Delivery in progress”. `tests/lifecycle.test.ts` asserts the three strings. Milestone status text stays “In progress”. |
| 47 | `raiseGivingLimit` names the previous and proposed limits | Yes, isolated Chrome | No | Suggestion stayed ₹50 until the button that names ₹50 and ₹100. Second press and refresh kept ₹100. Organizer cap stayed ₹50. |
| 55 | Partially used and cancelled vouchers | Yes, isolated Chrome | No | ₹200 redemption left ₹300. Excess deduction refused. Percentage offer had no balance. Cancel kept terms and history and blocked a later redemption. |
| 59 | Thank-you sharing action | Yes, isolated Chrome | No | No page: create link, referral count stayed 0. Existing page: link only, no new referral. |
| 72 | Narrow layout rules kept | Yes, rechecked | No | 390×844 scrollWidth equals clientWidth on the campaign, My activity, and organization settings. |
| 73 | Tabs, fund grid, footer, and the support column can shrink | Yes at 195 CSS px | No | Device width 195 (390px at 200% zoom), `deviceScaleFactor` 1: `scrollWidth` 195. No `overflow: hidden` on the page. |
| 74 | Keyboard focus beyond the campaign disclosure | Partial | No | Tab reached skip link, site nav, settings actions, and My activity nav. Contribution review and the voucher dialog were not in this tab pass. Reduced motion was 0s. This is not an accessibility certification. |
| 24 | Sponsor play is Memory Match only | Yes, isolated Chrome | No | See requirement row 24. One confirm, a blocked second unlock at the per-person cap, and an exhausted ₹100 budget. |
| 43 | Suggested palette swatches | Yes, isolated Chrome | No | School blue updated the picker, hex fields, and preview before save. Contrast checks passed. |
| 52 | Symbolic game illustration | Yes, isolated Chrome | No | Education sketch. Caption denies purchase and delivery. Low-data hides the drawing. |
| 61 | Sharing pages in My activity | Yes, isolated Chrome | No | Current supporter’s page only. Opening the list does not create a page. |
| 65 | Poster and social assets | Yes, isolated render | No | Dimensions and QR payloads in `/tmp/stage2-assets`. Poster footer no longer collides with the QR card. |
| 69 | Timezone labels | Yes, isolated Chrome | No | Europe/London on a timestamp. Date-only “21 Oct 2026” did not shift. |

## Repair order

Stages 1, 2, 4, and 5 have isolated-browser or test evidence in the rows above. Stage 3 and the video stage are not done.

1. Player-facing gaps: giving-limit agreement, thank-you share action, Ask grouped with other secondary tools, voucher partial-use label, 390px at 200% zoom. Browser-verified.
2. Sponsor UI walkthrough. Memory Match only. Browser-verified, including one confirm, the per-person cap, and an exhausted budget.
3. Closure publish check, private-document check, and receipt open check. Not done.
4. Brand swatches, timezone, and My activity sharing pages. Browser-verified.
5. Poster and social files rendered, measured, and decoded. The poster footer overlap found in the first render was fixed and rechecked.
6. Update scene checks and narration, then re-record only if no encode is already running. Both videos stay stale. No encode was started in this pass.

## Storage

`together.demo.v1` version 6. The v4 fixture in `tests/budget.test.ts` migrates forward and keeps the old campaign. Analytics stay in `together.demo.analytics.v1`. This audit did not clear either key in a user’s browser.
