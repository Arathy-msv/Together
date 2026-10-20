# What the demo shows, and what is missing or unfinished

Checked against the running app while the recording scripts were built. Every flow in the video
is real UI interaction in the app. Demo data that would take weeks in real life (a past campaign
and the extra contributions that take the campaign past its target) is prepared off camera
with the app's own modules, acting as the person who would do it, so permission checks still run.

## Shown in the video and working

| Area | What works |
| --- | --- |
| Demo identities | Labelled "Simulated identities — not real sign-in or security". Switching identity is a demo control, not authentication. |
| Platform Admin | Organization list, demo plan per organization, platform feature availability. A workspace of an organization Pat is not a member of is refused. |
| Organization Admin | Demo plan choice, five-step setup (details, website address check, features, look, review, preview on desktop/mobile), simulated subscription and publish, members and roles, partner stores, offers with terms review and activation, store staff access. |
| Campaign Organizer | Guided assistant (simulated), draft suggestions and milestones, autosave and draft recovery, full form with update commitment, game choice and partner offer, submission for review, copy link, sharing kit for the original campaign (QR PNG and SVG, A4 poster PNG, WhatsApp and email drafts, social image), reuse of a campaign as a clean draft, milestone status, published update, expense. |
| Review and approval | A different Organization Admin approves; authors cannot approve their own revision. |
| Supporter | Website, campaign updates and fund use, direct simulated contribution, partner reward and My vouchers, Memory Match with an editable final amount, personal sharing page with its own QR, poster and caption, a second supporter's gift attributed once through that link, impact history, low-data page. |
| Merchant | Assigned store and branch, manual code entry, invalid code rejected, simulated redemption, second redemption blocked. |
| Delivery and reporting | Organizer-reported expense linked to a milestone, milestone "In progress", final report drafted by the simulated assistant and saved as a draft, records export (JSON file), public delivery progress kept separate from the fundraising target. |

## Unavailable, limited or simulated

| Feature | Status in this prototype |
| --- | --- |
| Payments, subscriptions, voucher redemption | Simulated. No money is collected, no subscription is purchased, no store system is charged. |
| "AI" assistant | Simulated with fixed rules; not connected to any AI service. Some suggestions contain [bracketed] placeholders that must be replaced. |
| Sponsor-funded play | Only an on/off flag and a notice. There is **no sponsor rule, budget, pledge or pending allocation**, and nothing is tracked as received. Only an Organization Admin can switch it on for a campaign; the demo campaign leaves it off. |
| QR codes | Campaign and referral QR codes are generated in the browser and decode to the real link. The merchant portal still has no camera scanning — voucher codes are typed by hand. |
| Sharing kit | QR PNG/SVG, A4 poster PNG, WhatsApp and email drafts, and square/portrait/story social images. All are created locally. "Print / Save as PDF" opens the browser print dialog; the recording does not download a PDF. Downloaded images are not clickable. With the kit turned off, only "Share campaign link" remains. Data stays in this browser. |
| Verification | No organization, document or receipt is independently verified. Expenses are labelled organizer-reported. |
| Security and sign-in | Role checks run in the browser only. They are not production security. |
| Cross-device use | All data lives in one browser's localStorage. Campaign links, vouchers and redemptions do not work on another device; the redemption in the video uses the same browser context as the supporter. |
| Platform Admin detail | No per-organization detail page; the admin has no access to supporter records. |
| Records export | Organization Admins only; a JSON file without supporter profiles. No CSV or accounting format. |
| Low-data mode | Removes the large homepage images and animations; it does not compress other media. |
| Suggestion cart | Exists in the Giving Tree game only. The demo campaign uses Memory Match, which builds a suggested amount the supporter can edit before confirming. |
| Final report | Implemented, but the demo saves it as a draft because delivery is not finished. Publishing needs a review tick and all placeholders replaced. |

## Chapter order compared with the brief

* Expense, milestone progress, the final report and records export are in the final
  "Delivery and reporting" chapter instead of the organizer chapter, so they come after supporters
  have contributed (an expense before any money arrives would be misleading).
* The milestone status change and published update are in the organizer chapter.
* The opening preview is assembled first but parts of it are recorded later in the run; it shows
  the same browser data as the rest of the video.
