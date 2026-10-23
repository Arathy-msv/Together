# What the demo shows, and what is missing or unfinished

Checked against the running app while the recording scripts were built. Every flow in the video
is real UI interaction in the app. Demo data that would take weeks in real life (a past campaign
and the extra contributions that take the campaign past its target) is prepared off camera
with the app's own modules, acting as the person who would do it, so permission checks still run.

## Shown in the video and working

| Area | What works |
| --- | --- |
| Demo identities | Labelled "Simulated identities — not real sign-in or security". Switching identity is a demo control, not authentication. |
| Fill demo values | A Demo button on every page writes the Greenwood sales values into the empty fields on that page and selects the scripted choices (features, cover, schedule, direct amount). It does not submit, publish, pay, or redeem. Fields that already have a value are left as they are. The merchant code it enters is the invalid sample `GGL-0000-0000`. |
| Platform Admin | Organization list, demo plan per organization, platform feature availability. A workspace of an organization Pat is not a member of is refused. |
| Organization Admin | Demo plan choice, five-step setup (details, website address check, features, look, review, preview on desktop/mobile), features from recommended settings or chosen individually, simulated subscription and publish with a "Your website is ready" next-step screen. Workspace nav is Home, Website, Campaigns, and More (members, partner offers, settings, plan, features). Members and roles, partner stores, offers with terms review and activation, store staff access. |
| Campaign Organizer | Creates campaigns on the public organization website (`/o/.../create`). First screen: Create with AI (one purpose sentence → simulated draft of title/goal/cover/story) or Fill the form (two-step essentials → review). Advanced accordion for dates, games, amounts and optional story. Autosave and draft recovery, update commitment, game choice and partner offer under Advanced, submission for review, copy link, sharing kit, reuse as draft, milestone status, published update, expense. |
| Review and approval | A different Organization Admin approves; authors cannot approve their own revision. Approval does not publish: "Publish approved campaign" is a separate step. Publication, fundraising and delivery status are shown separately. |
| Supporter | Public nav is Campaigns, plus Partner offers when offers are live. My activity is in the Demo identity menu. Campaign page is compact: title + Share button, purpose, give panel; Story / Updates / How funds / Partner offers open from links under the purpose into popups. No category chip, organizer line, dates, delivery badge, or next-update commitment line on the main view. Giving choice, direct contribution (suggested amounts or custom), partner reward, vouchers, Memory Match, sponsor-funded play, personal sharing page, My activity. Thank-you page keeps share and post-gift updates under a More accordion. |
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
| Low-data mode | Optional organization feature. Holds back photos and video, shows text placeholders for campaign covers, and turns off animations. No public toggle on the simplified site; preference is device-local when set. It does not compress media. |
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

## First-time customer presales coverage

The 04:30 presales export is `output/together-presales-first-time.mp4`. Its source map and
storyboard are in `PRESALES-FIRST-TIME.md`. The application now shows dollars; that export still
shows Indian rupees and is stale.

| Presales section | Working product coverage |
| --- | --- |
| Product and audience | Branded Greenwood public website, real campaign purpose and beneficiary, prototype notice |
| Organization website | Name/address, feature selection, logo/colour/content, desktop/mobile preview, publication |
| Campaign launch | Two-step create form (essentials + Advanced), beneficiary/story optional, target, participation, update commitment, review, approval, explicit publication |
| Community sharing | One campaign URL, generated QR, poster, WhatsApp/email drafts, social image, browser-local limitation |
| Supporter contribution | Purpose/progress, direct-giving alternative, Memory Match suggestion, edited amount, simulated confirmation, thank-you/receipt |
| Sponsor-funded play | Fictional Northwind Memory Match commitment, pending reward outside checkout, separate simulated-funds confirmation |
| Partner reward | Eligibility, Corner Stationery voucher, expiry, QR/backup code, assigned-store simulated redemption |
| Personal sharing | Mia’s personalized page/link and one-time attribution to the original campaign |
| Transparency | Next expected update, published update, delivery milestone, planned spending, organizer-reported expense/evidence state, goal reached with delivery in progress |
| Close | Branded website, four-part value statement, “Explore a pilot for your organization” |

This presales edit does not claim that every contribution earns a voucher, every game supports a
sponsor, uploaded evidence is independently verified, or browser-local data works across devices.
