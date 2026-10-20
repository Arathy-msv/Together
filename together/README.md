# Together

Together is a browser-only proof of concept for an interactive fundraising platform. Organisers create campaigns. Supporters open a campaign link, which opens the campaign’s game when one is enabled (Grow Our Garden, Memory Match, Community Puzzle, or Zip the Jacket). Each completed game action adds a set amount to a suggested contribution that the supporter can edit, donate, or cancel. Direct giving stays available from the campaign details.

The organiser and supporter screens use a clean, photographic product style. The games keep an illustrated, storybook style.

One codebase serves many organizations — companies, schools, clubs, and nonprofits. Each organization has its own logo, colours, fonts, homepage content, campaign defaults, and available games, all driven by configuration.

No real money is collected. There is no backend, database, account system, or payment gateway. Organizations, campaigns, and simulated contributions stay in `localStorage` in this browser.

## Run it

```bash
npm install
npm run dev
```

The dev server runs at [http://127.0.0.1:4321](http://127.0.0.1:4321).

```bash
npm run build
npm run lint
npm test
```

`npm test` runs the contribution rules, stage gating, checkout, organization, theming, storage migration, assistant, referral attribution, fund summary, trust and draft tests with Node’s built-in test runner.

## Organizations

Every page lives under an organization:

| Route | What it shows |
| --- | --- |
| `/o/:organizationSlug` | Branded homepage |
| `/o/:organizationSlug/campaigns` | That organization’s campaigns |
| `/o/:organizationSlug/campaigns/:campaignId` | Campaign (opens the game when one is enabled) |
| `/o/:organizationSlug/create` | Campaign form, pre-filled with the organization’s defaults |
| `/o/:organizationSlug/assistant` | Scripted campaign creation assistant |
| `/o/:organizationSlug/settings` | Brand settings with a live preview |
| `/o/:organizationSlug/dashboard` | Organizer view of that organization’s campaigns |

A campaign only opens under the organization it belongs to (`organizationId`). Unknown slugs and mismatched campaigns show a not-found screen. Old links still work: `/campaigns/:id/...` redirects to the campaign’s organization, and `/`, `/explore`, `/create`, `/dashboard` redirect to the organization last picked in the demo switcher (Together by default).

Seeded organizations:

- **Together** (`/o/together`) — the default theme (warm ivory, forest green, soft sage, gold). Campaigns saved before organizations existed belong here.
- **Lumen & Co.** (`/o/lumen-co`) — a company with employee campaigns in US dollars.
- **Maple Grove Public School** (`/o/maple-grove`) — a school with student and family campaigns.
- **Open Harbour Foundation** (`/o/open-harbour`) — a nonprofit with shelter and kitchen campaigns.

Organizer pages (dashboard, create, assistant, settings) show a **Demo organizer controls** bar with an organization switcher. It exists for reviewing the demo and is not secure tenant isolation. Supporter pages never show it.

### Brand settings

Edit identity, colours and fonts, homepage content, games and participation, and footer links. The preview on the right updates as you type, in desktop or mobile size; the live site only changes when you choose **Save changes**. **Discard changes** returns to the saved version, and **Restore default branding** puts the Together colours and fonts into the preview.

Text colours are chosen automatically for contrast, and the page warns when a colour combination is hard to read. Logo and hero uploads are checked for type and size, resized, and compressed; the hero can also come from a built-in gallery. If browser storage is full, nothing is saved and a message explains why.

Turning a game off stops new campaigns from choosing it; campaigns that already use it keep working. Pencil writing and Paper opening are listed as coming soon.

Campaign currency is fixed per campaign. The organization currency is only the default for new campaigns.

### Campaign assistant

A scripted, question-by-question flow (no AI service). It asks for the purpose, name, target, dates, group type, participation, game, amounts, and cover, with quick-answer chips, back and edit, a live draft preview, and **Save draft** (kept per organization). Answers are validated with the same rules as the campaign form. Nothing is published until you choose **Create campaign** on the review step.

## Sharing pages and attribution

Any open campaign that is running or about to open has a **Create my sharing page** action. A sharing page lives at `/o/:organizationSlug/campaigns/:campaignId/r/:referralCode` and points at the original campaign — it is not a copy. A sharer can add a name, optional photo, headline, “Why I support this campaign” message, optional personal target (“My sharing goal”) and a cover from the approved gallery. They cannot change the story, organizer, campaign goal, currency, where contributions go, updates, fund use or verification indicators.

The sharing workspace (`…/share` and `…/share/:code`) is a **demo control**: the device that created a page can edit it. A referral code is attribution, not an editing password.

Attribution rule: **the sharing page used when you begin your contribution receives credit.** The referral is snapshotted when review begins (direct donation, game review, or the giving tree cart) and later page visits never change it. Only a confirmed simulated contribution stores `referralId`; it counts once in the campaign total and is also shown in the sharing page’s credited total. Donor names are never shown on sharing pages.

## Transparency: updates, fund use and trust

Campaign pages have **Story**, **Updates**, **Fund use** and **Trust & documents** tabs, with the contribution panel kept in a sticky side column.

- **Fundraising progress and delivery progress are separate.** Reaching the goal never marks delivery complete. Milestones show Planned, In progress, Reported complete (organizer-reported) or Past expected date.
- **Updates** show published updates only, newest first, with images (alt text required), optional short local video (never autoplays), related milestones and expenses. “Follow updates on this device” is a local bookmark; no emails are sent. The contribution receipt lists updates published since the contribution.
- **Fund use** is a demo calculation in integer minor units: confirmed simulated contributions − published organizer-reported expenses. Planned budgets are shown separately, and draft expenses, game suggestions and failed attempts are never counted. A negative balance is shown exactly, with the organizer’s explanation. An expense linked from several updates is counted once.
- **Trust & documents** separates “Information provided”, “Supporting document attached”, “Not independently verified” and “Demo verification example” (seeded on one campaign only). Uploading evidence never creates a verified badge, and organizers cannot grant one. Private verification placeholders use fictional samples, store no files and are never shown publicly; real identity review would need a future secure service.

### Organizer workspace

From the organizer dashboard, **Manage** opens `/o/:organizationSlug/dashboard/:campaignId` with Overview, Story & settings, Referral pages, Milestones, Updates, Expenses, Trust & documents and Final report. The overview suggests next steps (no published updates, past-due milestones, expenses without evidence, goal reached). Closing fundraising and publishing a final report are separate actions. Receipts can be kept organizer-only with a separate redacted public copy, and publishing asks for privacy confirmation.

## Stories, templates and drafts

Campaigns can have a short summary plus optional “Who this helps / What they need / What contributions will support / What happens next”, a beneficiary description, image story, video, budget breakdown and cost examples (each must state its cost basis). Text-only campaigns are fine.

Category templates (Education, Clothing & essential supplies, Environment, Sports & clubs, Community projects, Other) suggest prompts, milestones, budget headings, a cover and a suitable game. The form shows a preview of exactly what changes; story text is never replaced, and lists are only replaced when you tick the option.

The campaign form and the assistant autosave drafts on this device (“Saving…”, “Saved on this device”, or a visible “Not saved” error). Returning shows **Continue your campaign draft?** with Continue, Start another and Discard. Drafts have stable IDs per organization and starting another never overwrites one. Progress counts required fields only.

## Storage

| Key | Contents |
| --- | --- |
| `together.organizations.v1` | Organization configurations |
| `together.demo.v1` | Format version 3: campaigns, contributions (optional `referralId`), referrals, milestones, campaignUpdates, expenses, supportingDocuments |
| `together.campaignDrafts.v1` | Form and assistant drafts, each with a stable ID and organization |
| `together.followed.v1` | Campaigns followed on this device |
| `together.myReferrals.v1` | Sharing pages created on this device (demo editing only) |

Each stored organization is repaired or skipped on its own, so one broken record never wipes the rest. Missing demo organizations and sample campaigns are added back. Loading version 1 or 2 data upgrades it to version 3 without removing campaigns or contributions; records that point at missing campaigns are dropped individually, and missing images fall back to a placeholder. Drafts and follows live in their own keys so autosave never rewrites campaign data. Earlier assistant drafts are imported automatically.

## What you can try

- Create a campaign with the three-step story, settings, and review flow. Pick a cover template or upload your own cover, add an organisation logo, and choose which game supporters play.
- Save a draft and finish it later from the organizer dashboard.
- Open a campaign, confirm a simulated direct contribution, and see the progress update after refresh.
- Play the campaign’s game. After every completed action (a plant, a correct piece, a matched pair, or a zip stage) a checkpoint shows what was added, the running suggestion, and an editable total. Donate now opens the demo payment review, and nothing is saved until you confirm there.
- Set a custom total and keep playing: the game suggestion keeps growing while your chosen amount stays fixed until you edit it or reset to the game total.
- Set the per-action rate, round size, custom-total permission, and an optional suggestion cap in Game contribution settings when you create a campaign.
- Copy a campaign link, close a campaign, or reset the sample data from the organiser dashboard.
- Open Winter Care Kits to see a scheduled campaign that cannot accept contributions yet.

Private campaigns use a demo access code shown to the organiser. That code is not secure access control.

Uploaded covers and logos are resized in the browser and stored in `localStorage` with the campaign. Browsers allow only a few megabytes there, so very large or many uploads can fill it; the app shows a message if that happens.

## Sample data

The Together organization has the original sample campaigns: Grow Our School Library (garden game), Community Garden (puzzle), Winter Care Kits (memory, scheduled), Zip Up for Winter (jacket), and Class Circle (private group). Each other organization has three campaigns of its own. Reset demo data on the dashboard restores sample campaigns and organization branding and clears simulated contributions created in this browser.

## Game contributions

Game money is handled in integer paise. Each campaign and game has its own pending session in `localStorage` with the session ID, round IDs, each completed action’s ID and amount, the rate snapshot, the suggested total, an optional custom total, and its status. Recording the same action ID twice changes nothing, and actions that were paid or discarded can never count again. Game progress is saved separately, so a refresh restores the board without adding anything. Campaign totals come only from confirmed contribution records.

| Game | Default rate | Counts as one action |
| --- | --- | --- |
| Grow Our Garden | ₹50 | A plant that finishes growing in an empty plot |
| Community Puzzle | ₹25 | A piece that snaps into its correct space |
| Memory Match | ₹50 | A newly matched pair |
| Zip the Jacket | ₹50 | Each zip stage at 25%, 50%, 75% and 100% |
