# Demo-review audit

Audit date: 2026-10-21. Source of truth: the 30-section improvement prompt pasted in this session. Workspace: `/workspace/together` (this remote checkout, not `C:\Together_The_campaign`). Application commit inspected: `3a52b67`.

This pass did not change application behaviour, reset browser data, or regenerate videos. Browser checks used a throwaway Chrome profile, so they did not read or write an existing user’s `localStorage`.

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
| Complete | 27 |
| Partial | 46 |
| Missing | 7 |
| Blocked | 0 |
| Not applicable | 2 |

Checks run: `npm test` (177 passed, 0 failed) and `npm run build` (succeeded; the bundle-size note is a Vite warning, not a test failure). Isolated browser: Open Harbour blankets story and fund tabs, How it works, 390px width, and 200% zoom.

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
| 24 | Sponsor journey in the UI, Memory Match only | Partial | `SponsorsPage.tsx`, `SponsorPlayChoice` in `Campaign.tsx`, unlock in `MemoryGame.tsx`. Other games do not call `unlockSponsorMilestone`. | API test only. Screens not clicked. The Open Harbour page had no sponsor offer. | Walk org feature → commitment → play → confirm in the browser. Wire or explicitly limit other games. |
| 25 | Reward amount shown before a limited sponsor action | Partial | `SponsorPlayChoice` and `MemoryGame.tsx` render `formatMinor` for the next reward. | Code inspection. Game not played. | Play until the cap and read the amount first. |
| 26 | Campaign and sponsorship dates block unlocks | Partial | `unlockSponsorMilestone` checks campaign open/close and `sponsorOffer` checks commitment dates. | Test used an open window only. | Try a date outside the window. |
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
| 38 | Share, partner offers, follow, and ask are secondary | Partial | Share, offers, and follow are inside `<details class="more-ways">`. “Ask about this campaign” is still in the main column (`Campaign.tsx`). | Browser found both “More ways to take part” and “Ask about this campaign” on the fund view. | Move Ask into the same group. |
| 39 | Funded or closed campaigns replace giving and keep receipts and vouchers | Partial | `Funding goal reached` and “See what happens next” are in `Campaign.tsx`. | No funded campaign was opened. | Open a goal-reached campaign and a receipt. |
| 40 | Public fundraising and delivery labels match the prompt | Partial | `FUNDRAISING_LABEL` matches Opens soon, Accepting contributions, Funding goal reached, Fundraising closed. Visible delivery badge is “In progress”, with a visually hidden “Delivery:” prefix (`StatusBadge.tsx`). Prompt asks for “Delivery in progress”. | `tests/lifecycle.test.ts`. Badge wording read in code. Browser showed “Accepting contributions” only. | Decide the visible delivery wording and check a funded page. |
| 41 | Reaching the goal does not complete delivery | Complete | `tests/lifecycle.test.ts`: “fundraising labels come from the stored status and the goal, never from delivery” and “delivery is complete only when the organizer reports every activity complete”. | Tests passed. | None for the state functions. |
| 42 | Colour picker, hex entry, live preview, readable text | Partial | `Onboarding.tsx` `input type="color"` and hex field. `contrastChecks` and `readableOn` in `src/lib/theme.ts`. | Code inspection. Settings not opened. | Change a colour and read the preview and contrast note. |
| 43 | Suggested palette swatches | Missing | No palette swatch control in onboarding or organization settings. | Search of `src` for swatch palettes. | Add swatches or record a product decision to drop them. |
| 44 | Branding on website, campaigns, games, sharing, vouchers, and workspace; QR stays readable | Partial | Theme is applied from organization branding. QR quiet zone is tested. Surfaces were not compared. | `tests/sharing.test.ts` quiet-zone case. | Spot-check each surface after a colour change. |
| 45 | Before play: amount per action, no payment while playing, whether the total can change | Partial | `gameAmountRules()` and `GameIntro.tsx`. | Game intro not opened. | Start Memory Match and read the intro. |
| 46 | Optional giving limit stops the suggestion and leaves play available | Complete | `tests/gameContribution.test.ts`: “stops increasing at the cap without touching a chosen amount” (`capped:0`, suggestion stays 12000). | Test passed. | None for the ledger. |
| 47 | Raising the giving limit needs an explicit agreement | Missing | Cap UI says the suggestion will not increase. No agreement step raises `capPaise`. | Search of game dialogs. | Add the agreement, or record that the organizer cap cannot be raised by a player. |
| 48 | One editable game review and one simulated confirmation | Partial | An in-game amount dialog (`ContributionDialogs.tsx`) and a separate confirm page (`Confirm.tsx`) both summarize the amount. | Both files read. Flow not clicked. | Remove the repeated summary if one screen is enough. |
| 49 | Only a confirmed gift changes the campaign total; cancel and failure do not | Complete | `tests/checkout.test.ts`: “a failed payment leaves totals unchanged and keeps the pending amount.” `tests/gameContribution.test.ts` cancel discards the suggestion. | Tests passed. | None for those cases. |
| 50 | New board keeps the suggestion; a separate action starts a new session | Partial | `requestRestart` vs `requestNewSession` in `src/hooks/useGameContribution.ts`. | Code inspection. Buttons not clicked. | Play, deal a new board, then start a new session. |
| 51 | Sponsor replay does not pay the same unlock twice | Complete | Sponsors test: second `unlockSponsorMilestone` for the same person and unlock returns null. | Test passed. | None for that unlock id. |
| 52 | Category play reveals a symbolic illustration and does not look like a purchase | Missing | `CategoryMotif.tsx` is a static coloured mark on the campaign title. It is not in the game and does not reveal an illustration. | Component read. | Add the in-game treatment or narrow the requirement. |
| 53 | No new games in this work | Complete | Game modules remain garden, puzzle, memory, and jacket. | File list under `src/pages/play`. | None. |
| 54 | Store-ready voucher: merchant, branch, headline, status, expiry, restrictions, QR, backup code, “Present this to store staff” | Partial | `VoucherCard.tsx` dialog includes those fields. | Dialog not opened; the fresh profile had no issued voucher. | Claim a reward and open Show voucher. |
| 55 | Statuses include partially used and cancelled | Missing | `voucherState` is only ready, used, or expired. A remaining balance stays “Ready to use”. There is no cancelled status. | `src/components/vouchers/VoucherCard.tsx` and `applyRedemption`. | Show partially used when balance remains. Define cancelled only if a voucher can be cancelled. |
| 56 | Turning the feature off stops new vouchers and keeps issued ones | Complete | `tests/vouchers.test.ts`: “deactivation stops issuance but keeps vouchers, redemption and benefit settlement”. | Test passed. | None. |
| 57 | Honest closure: four outcomes, required explanations, no automatic milestone completion, partial-delivery label, refund is a statement | Partial | `CLOSURE_LABEL.partial` is “Campaign closed — partial delivery reported”. `FinalReportEditor.tsx` requires explanations. `tests/sponsors.test.ts` only normalizes a partial report. | Normalize test passed. Publish was not clicked, and milestones were not re-read after a report. | Publish a partial report and confirm milestones and fundraising stay unchanged. |
| 58 | Thank-you page: amount, receipt, next update only if dated, local follow, reward, at most three prominent actions | Partial | `Success.tsx` shows the receipt card, a dated or undated next-update sentence, a local-follow note, and up to three `btn-lg` links. | Source read. No gift was confirmed in the browser. | Confirm a gift and count the actions. |
| 59 | Optional personalized sharing action on the thank-you page | Missing | `Success.tsx` has no sharing-page action. | File read. | Add one secondary share action without exceeding three prominent buttons. |
| 60 | My activity groups contributions, vouchers, and followed updates, and respects the feature flag | Partial | `/o/:slug/my-activity` in `App.tsx`. `SupporterHistory.tsx` hides the contribution list when history is off and still renders vouchers. | Code inspection. Page not opened. | Open My activity as two identities. |
| 61 | My activity includes personalized sharing pages | Missing | `SupporterHistory.tsx` has contributions, following, and vouchers only. | File read. | List this device’s sharing pages, or document why they stay in the share workspace. |
| 62 | Launch checklist from real draft state, with required, recommended, and optional, and a preview tick that is not a payment test | Partial | `LaunchChecklist.tsx` and the checkbox copy in `CreateCampaign.tsx`. | Source read. Last create step not opened. | Open the last step and compare each row with an empty draft. |
| 63 | No numerical trust score | Complete | `LaunchChecklist.tsx` renders Done / Still open and a kind. No score. | Full component read. | None. |
| 64 | QR PNG/SVG decode to the campaign or referral URL; WhatsApp and email drafts keep that URL | Complete | `tests/sharing.test.ts`: campaign QR, referral QR, quiet zone, and WhatsApp/email drafts. | Tests passed. | None for generation. |
| 65 | A4 poster and square, portrait, and story images have the expected pixels and do not clip | Partial | Constants: poster `2480×3508`, social `1080×1080`, `1080×1350`, `1080×1920` in `src/lib/canvasAssets.ts`. | Constants read. No PNG was rendered. | Render one poster and one social image into an audit folder and measure them. |
| 66 | Journey events fire from the product, and the admin card shows counts and denominators | Partial | Call sites exist for all nine event names. `tests/analytics.test.ts` writes events directly. `DemoAnalyticsCard.tsx` was not opened. | Unit test passed. UI events not triggered. | Click each journey and read the card. |
| 67 | Analytics can be paused, cleared apart from campaigns, and exported without voucher codes | Complete | `tests/analytics.test.ts` pause/clear test, and the export assertion that the text does not include “voucher code”. | Test passed. | None for the module. |
| 68 | English-only UI; no language selector; saved translations are not deleted | Complete | `LanguageToggle` returns null. Browser pages had no Malayalam control. Seed `translations` remain in `transparencySeed.ts`. How it works is English. | Isolated browser. | None for the selector. |
| 69 | Dates show a timezone where it matters | Missing | `formatDate` and `formatDateTime` in `src/lib/format.ts` use `en-GB` and do not set `timeZone` or print a zone name. | Function read. | Add a zone to date-times that can be misunderstood. |
| 70 | Team or class participation is a documented gap, not a pupil system | Complete | How it works answer: “Not in this prototype…” and “future gap.” No class roster in `src`. | Browser opened the question. | None unless the product later asks for it. |
| 71 | Management screens: one Add action, readable lists, empty states, inline errors, save feedback, no permanent long form | Partial | Editors exist for expenses, updates, members, and offers. | Not walked. | Open members, offers, milestones, and expenses at desktop and mobile. |
| 72 | Supporter page has no horizontal overflow at 390px | Complete | At 390×844, `scrollWidth` equalled `clientWidth` (390). | Isolated browser, device metrics only. | Recheck after layout edits. |
| 73 | Increased zoom does not overflow | Partial | At 390px and `zoom: 2`, `documentElement.scrollWidth` exceeded the viewport. At 1280px and `zoom: 2`, the page did not overflow; tab row scrolls inside itself. | Isolated browser. | Find the overflowing element and fix the 390px zoom case. |
| 74 | Keyboard, focus, dialogs, names, and non-drag play | Partial | “More ways to take part” accepted focus. Other dialogs, labels, and games were not tabbed. | One focus check. | Tab the give panel, confirm dialog, and a game. |
| 75 | Low-data mode skips optional media; reduced motion is respected; direct giving does not need a game | Partial | Low-data CSS hides `.hero-stack`. `CategoryMotif` returns null in low data. Give directly was on the page. | Give directly seen. Low-data toggle not used. | Turn low-data on and reload the campaign. |
| 76 | Failed simulated payment does not show success or move the total | Complete | `tests/checkout.test.ts`: “a failed payment leaves totals unchanged and keeps the pending amount.” Confirm page still has “Simulate failed payment”. | Test passed. Button not clicked. | None for the ledger. |
| 77 | Cancelled review, closed campaign, expired voucher, exhausted stock, rejected revision, draft recovery, storage-full, and failed download | Partial | Copy and handlers exist (`Confirm.tsx`, voucher expiry, `StorageFullError`, `AssetRenderError`). Wrong-branch redeem is in `tests/permissions.test.ts`. | Branch test passed. The other states were not clicked. | Exercise each state in the isolated profile. |
| 78 | Prototype limits stay explicit | Partial | README and many screens say simulated. Not every screen was read for over-claiming. | README and fund/story pages. | Read sponsor, voucher, and approval screens for verification claims. |
| 79 | Detailed five-role video shows the current product | Partial | Application has later behaviour. Demo coverage missing. `demo-video/output/together-demo.mp4` is the previous assembly: `assembly-report.json` records 1857.27 seconds. Narration still says sponsor play has no budget (`demo-video/narration/script.md`). Scenes called out in `demo-video/README.md` include `og-assistant`, `og-form`, `sp-trust`, `sp-vouchers`, `fn-public`. | File list and assembly report. Video was not played. Compared narration text with current sponsor behaviour. | Re-record after scene checks match the UI. Do not describe this file as current. |
| 80 | Separate 2–3 minute presales video of the five-step story | Partial | `demo-video/scripts/presales.mjs` now lists `op-home`, `op-game`, `sp-direct`, `fn-public`, `card-end`. The file `demo-video/output/together-presales.mp4` is the older assembly: 642.93 seconds and the long scene list in `assembly-report.json`. | Assembly report compared with the script. Not played. | Reassemble only after a fresh recording. The file on disk is not a 2–3 minute cut. |
| 81 | Subtitles, scene checklist, and freshness notes match the files | Partial | `together-demo.en.srt`, `together-demo.en.vtt`, `together-presales.en.srt`, `scene-timings.md`, and `assembly-report.json` exist beside the mp4 files. `demo-video/README.md` marks both videos stale against commit `c7c2eed` and later UI. | File list and README. Cue text was not aligned to frames. | Update timings only when a new assembly exists. |
| 82 | Section 29: implement in nine runnable stages | Not applicable | Process instruction. Stages already landed in commits `4f12089` and `3a52b67`. This audit does not restart them. | Git log. | Repair only the gaps below. |

## 1. Critical functional defects

No money-counting defect was reproduced. The passing tests still show:

- a failed payment leaves the total unchanged (`tests/checkout.test.ts`)
- a referral gift counts once (`tests/transparency.test.ts`)
- a sponsor confirm adds ₹50 once (`tests/sponsors.test.ts`)
- a second sponsor unlock does not create another allocation

The visible delivery badge does not use the full public phrase “Delivery in progress”. That is a wording gap, not a wrong total.

## 2. Missing required functionality

- Suggested brand palette swatches (requirement 43).
- An explicit agreement before a player raises the giving limit (requirement 47).
- An in-game symbolic category illustration (requirement 52). The title mark is not that treatment.
- Partially used and cancelled voucher states (requirement 55).
- A personalized sharing action on the thank-you page (requirement 59).
- Sharing pages inside My activity (requirement 61).
- A timezone on displayed date-times (requirement 69).

Sponsor unlocks run from Memory Match only. Garden, puzzle, and jacket do not create allocations.

## 3. UI and accessibility issues

- At 390px width and 200% zoom, the campaign page overflowed horizontally. At 390px without zoom it did not.
- “Ask about this campaign” is still a main-column tool, not inside “More ways to take part”.
- Game contribution still has an amount dialog and a confirm page.
- Keyboard was checked only for the “More ways” summary. Dialogs, games, and mobile touch targets were not measured.
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

Not clicked, even where code exists: campaign assistant, review and publish screens, brand settings, game intro and restart, sponsor screens, voucher presentation, thank-you page after a new gift, My activity, launch checklist, sharing-kit downloads, low-data toggle, storage-full failure, and a funded campaign. Poster and social PNGs were not rasterized, so clipping was not judged. Videos were not played; durations come from `assembly-report.json`, not from a new playback.

## Repair order

Do not treat this list as started.

1. Player-facing gaps: giving-limit agreement, thank-you share action, Ask grouped with other secondary tools, voucher partial-use label, 390px at 200% zoom.
2. Sponsor UI walkthrough and a decision on non-memory games.
3. Closure publish check, private-document check, and receipt open check.
4. Brand swatches, timezone, and My activity sharing pages.
5. Render poster and social files into an isolated folder and measure them.
6. Update scene checks and narration, then re-record only if no encode is already running. Until then the videos stay stale.

## Storage

`together.demo.v1` version 6. The v4 fixture in `tests/budget.test.ts` migrates forward and keeps the old campaign. Analytics stay in `together.demo.analytics.v1`. This audit did not clear either key in a user’s browser.
