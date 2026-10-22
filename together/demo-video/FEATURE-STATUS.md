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
| Organization Admin | Demo plan choice, five-step setup (details, website address check, features, look, review, preview on desktop/mobile), features from recommended settings or chosen individually, simulated subscription and publish with a "Your website is ready" next-step screen, members and roles, partner stores, offers with terms review and activation, store staff access. |
| Campaign Organizer | Guided assistant (simulated) and full form sharing one setup indicator and review summary, draft suggestions and milestones, autosave and draft recovery, full form with update commitment, game choice and partner offer, submission for review, copy link, sharing kit for the original campaign (QR PNG and SVG, A4 poster PNG, WhatsApp and email drafts, social image), reuse of a campaign as a clean draft, milestone status, published update, expense. |
| Review and approval | A different Organization Admin approves; authors cannot approve their own revision. Approval does not publish: "Publish approved campaign" is a separate step. Publication, fundraising and delivery status are shown separately. |
| Supporter | Website, campaign updates and fund use, a labelled choice between giving an amount and playing, direct simulated contribution, partner reward, voucher cards with a full-screen "Show voucher" view that says "Present this to store staff", Memory Match with its amount rules stated up front, nonblocking per-pair feedback, a new board that keeps the suggestion and an editable final amount, sponsor-funded play that leaves a reward pending and out of the personal checkout, personal sharing page with its own QR, poster and caption, a second supporter's gift attributed once through that link, My activity (contributions, followed campaigns, vouchers), low-data mode. |
| Sponsor budget | An Organization Admin records one fictional Memory Match commitment. A match creates one pending reward. Confirming it adds that amount once and does not add it to a personal checkout. Garden, puzzle, and jacket campaigns are not offered. |
| Merchant | Assigned store and branch, manual code entry, invalid code rejected, simulated redemption, second redemption blocked. |
| Delivery and reporting | Organizer-reported expense linked to a milestone, milestone "In progress", final report drafted by the simulated assistant and saved as a draft, records export (JSON file), a "Funding goal reached" panel once fundraising closes, public delivery progress kept separate from the fundraising target, and milestones linked to their expenses, receipts and updates. |

## Unavailable, limited or simulated

| Feature | Status in this prototype |
| --- | --- |
| Payments, subscriptions, voucher redemption | Simulated. No money is collected, no subscription is purchased, no store system is charged. |
| "AI" assistant | Simulated with fixed rules; not connected to any AI service. Some suggestions contain [bracketed] placeholders that must be replaced. |
| Team or class participation | Not built. There is no class list, roster, or shared pupil account. Documented as a future gap. |
| Languages | Public pages and organizer controls are English. Saved translation text remains in browser storage and is not deleted. |
| Closure reports | An organizer can publish delivered, partial, cancelled, or activities remaining. Publishing does not complete milestones or close fundraising. |
| Demo analytics | Browser-local counts for a fixed set of journey events. Pause, clear and JSON export. Abandoned reviews are a count gap, not a failed payment. |
| QR codes | Campaign and referral QR codes are generated in the browser and decode to the real link. The merchant portal still has no camera scanning — voucher codes are typed by hand. |
| Sharing kit | QR PNG/SVG, A4 poster PNG, WhatsApp and email drafts, and square/portrait/story social images. All are created locally. "Print / Save as PDF" opens the browser print dialog; the recording does not download a PDF. Downloaded images are not clickable. With the kit turned off, only "Share campaign link" remains. Data stays in this browser. |
| Verification | No organization, document or receipt is independently verified. Expenses are labelled organizer-reported. |
| Security and sign-in | Role checks run in the browser only. They are not production security. |
| Cross-device use | All data lives in one browser's localStorage. Campaign links, vouchers and redemptions do not work on another device; the redemption in the video uses the same browser context as the supporter. |
| Platform Admin detail | No per-organization detail page; the admin has no access to supporter records. |
| Records export | Organization Admins only; a JSON file without supporter profiles. No CSV or accounting format. |
| Low-data mode | Holds back photos and video until the visitor asks for them, shows text placeholders for campaign covers, and turns off animations. It does not compress media. |
| Suggestion cart | Exists in the Giving Tree game only. The demo campaign uses Memory Match, which builds a suggested amount the supporter can edit before confirming. |
| Workspace status | The "Needs your attention" list and status lines are derived from saved browser data; nothing is sent as a notification. |
| Final report | Implemented, but the demo saves it as a draft because delivery is not finished. Publishing needs a review tick and all placeholders replaced. |

## Chapter order compared with the brief

* Expense, milestone progress, the final report and records export are in the final
  "Delivery and reporting" chapter instead of the organizer chapter, so they come after supporters
  have contributed (an expense before any money arrives would be misleading).
* The milestone status change and published update are in the organizer chapter.
* The opening preview is assembled first but parts of it are recorded later in the run; it shows
  the same browser data as the rest of the video.
