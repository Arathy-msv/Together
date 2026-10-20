# Together

Together is a browser-only proof of concept for a fundraising platform. Companies, schools, clubs and nonprofits choose a demo plan, set up and publish their own branded fundraising website, and create campaigns from a management workspace. Supporters open a campaign link, which opens the campaign’s game when one is enabled (Grow Our Garden, Memory Match, Community Puzzle, or Zip the Jacket). Each completed game action adds a set amount to a suggested contribution that the supporter can edit, donate, or cancel. Direct giving stays available from the campaign details.

The organiser and supporter screens use a clean, photographic product style. The games keep an illustrated, storybook style.

One codebase serves every organization. Each has its own website address, logo, colours, fonts, homepage, about page, campaign defaults and available games, all driven by configuration rather than separate copies of the site.

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

`npm test` runs the contribution rules, stage gating, checkout, organization, theming, storage migration, assistant, referral attribution, fund summary, trust, draft and AI-preview tests with Node’s built-in test runner.

## Platform structure

Together is now a platform where companies, schools, clubs and nonprofits each get their own branded fundraising website. There are three separate areas:

| Area | Routes | Purpose |
| --- | --- | --- |
| Together platform website | `/`, `/plans`, `/start`, `/start/:organizationId`, `/workspace` | Product homepage (how it works, features, examples), demo plan selection, guided onboarding, demo workspace entry |
| Organization public website | `/o/:organizationSlug`, `/about`, `/campaigns`, `/campaigns/:campaignId`, `/campaigns/:campaignId/r/:referralCode` (plus play, confirm, success, share) | One branded site per organization, showing only that organization’s campaigns |
| Organization workspace | `/workspace/:organizationId/overview`, `/website`, `/campaigns`, `/campaigns/new`, `/campaigns/:campaignId/:tab`, `/assistant`, `/settings`, `/plan` | Management: website editor, campaigns (updates, milestones, expenses, evidence, sharing pages), assistant, settings, demo plan |

**Customer journey:** Choose a plan → Add organization details → Customize website → Publish demo site → Create campaigns.

- **Demo plans:** three sample plans with features and illustrative limits. They have no prices. Confirmation is simulated: no payment, billing, renewals or invoices, and limits are not enforced.
- **Onboarding:** six steps (details, website address, branding, content, fundraising preferences, review with desktop/mobile preview). Progress autosaves, and `/start` resumes an unfinished setup. Website addresses are lowercase, unique ignoring case, and can’t use reserved platform names.
- **Website lifecycle:** *Setup in progress* → *Draft* → *Published*. The public site always uses the published settings. In the website editor, *Save draft*, *Preview changes*, *Publish changes* and *Discard unpublished changes* work on a separate draft. Organizer preview is a labelled demo control on this device only. Publishing a website never publishes campaign drafts. Before the first publish, the public address shows an “isn’t published yet” page.
- **Website addresses are locked once published**, so shared links keep working.
- **Isolation:** campaigns, sharing pages, drafts and totals are filtered by `organizationId`. A campaign or referral code under the wrong organization address shows not found. The demo organization switcher appears only in the workspace, never on public sites.
- **Local only:** websites you create work at their addresses in this browser. Because there is no server, they are not visible on other devices.

Seeded organizations: **Maple Grove Public School** (`/o/maple-grove`), **Lumen & Co.** (`/o/lumen-co`) and **Open Harbour Foundation** (`/o/open-harbour`). Each has distinct branding, a published site, an about page, campaigns and different games. **Together** (`/o/together`) keeps the original sample campaigns. **Riverside Runners Club** is an unfinished onboarding (step 3) you can resume from `/start`.

Old links still work: `/campaigns/:id/...` goes to the campaign’s organization site; `/dashboard`, `/create` and `/o/:slug/dashboard|create|assistant|settings` go to the matching workspace page; `/explore` goes to the demo organization’s campaigns.

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

In the workspace, Campaigns → **Manage** opens `/workspace/:organizationId/campaigns/:campaignId` with Overview, Story & settings, Referral pages, Milestones, Updates, Expenses, Trust & documents and Final report. The overview suggests next steps (no published updates, past-due milestones, expenses without evidence, goal reached). Closing fundraising and publishing a final report are separate actions. Receipts can be kept organizer-only with a separate redacted public copy, and publishing asks for privacy confirmation.

## Stories, templates and drafts

Campaigns can have a short summary plus optional “Who this helps / What they need / What contributions will support / What happens next”, a beneficiary description, image story, video, budget breakdown and cost examples (each must state its cost basis). Text-only campaigns are fine.

Category templates (Education, Clothing & essential supplies, Environment, Sports & clubs, Community projects, Other) suggest prompts, milestones, budget headings, a cover and a suitable game. The form shows a preview of exactly what changes; story text is never replaced, and lists are only replaced when you tick the option.

The campaign form and the assistant autosave drafts on this device (“Saving…”, “Saved on this device”, or a visible “Not saved” error). Returning shows **Continue your campaign draft?** with Continue, Start another and Discard. Drafts have stable IDs per organization and starting another never overwrites one. Progress counts required fields only.

## AI preview · Simulated

The AI-assisted features are deterministic mocks. No model, API or credentials are involved, and every panel is labelled **AI preview · Simulated**. Suggestions stay separate from saved data until you apply them. Nothing is published, contributed, verified or used to change totals automatically.

All features go through one small typed interface, `AssistantService` in `src/lib/ai/service.ts`. The mock (`mockAssistant`) adds a short simulated latency and supports cancellation, and newer requests always win over older ones. To use a real model later, implement the same interface behind a secure server. Campaign text and documents are passed as data, never as instructions. Readiness rules, money calculations, validation and permissions stay in application code.

| Feature | Where | How the mock works |
| --- | --- | --- |
| Conversational campaign creator | `/o/:slug/assistant` | Opens with “Tell me what you’re raising funds for…”. Picks out only an explicit amount with a currency (e.g. ₹50,000, 2 lakh rupees) and *suggests* a category for you to confirm. Asks one question at a time and accepts corrections. Your target answer wins once given. Has a setup sidebar, live preview, “Save and exit”, autosave and resume. Draft suggestions (summary, story, suggested milestones, game, missing information) are applied one by one with undo. Creating needs explicit confirmation and uses the existing validation and save flow. |
| Campaign readiness | Form review, assistant review, workspace overview | Transparent rules grouped into *Required before publishing* (the form’s real validation), *Recommended* and *Optional*. Each result links to its field; some have an editable suggestion. No scores, fraud labels or verification. |
| Update writer | Workspace → Updates, and beside each milestone | Uses only the facts you enter plus the selected milestone, published expenses and public evidence. Milestone wording comes from the organizer’s status, so plans never read as completed. Placeholders block use until you fill them. Offers Apply to editor, Save as draft and Discard; publishing is still explicit. |
| Final report writer | Workspace → Final report | Figures come from `fundSummary`. Unfinished milestones and expenses without evidence stay visible. Publishing needs placeholders replaced and a review tick. |
| Referral message | Sharing page editor | Up to three options built from your own reason and connection plus the campaign title and organizer. Offers Apply, Shorten and Reset. |
| Ask about this campaign | Supporter campaign pages | Answers a fixed set of questions from a public snapshot of one campaign. Anything unpublished gets “This information has not been published yet.”; other questions get a demo-limitation message. |
| Receipt assistance | Workspace → Expenses | Three fictional sample receipts map to fixed values (no OCR). Values need review and only become an expense when you save or publish. Other currencies are not converted. |
| Translation preview | Story, updates, sharing pages | Malayalam prepared by hand for the seeded sample content. For anything else, live translation is “not connected” and a manual field is offered. Translations are stored separately and shown publicly only after review. |
| Suggest a setup | Campaign form, assistant | Category-based template, available game, milestones, expense categories and cover, each accepted individually. |

## Storage

| Key | Contents |
| --- | --- |
| `together.organizations.v1` | Organizations, version 2: details, slug, demo plan, onboarding progress, published website settings, website draft, status and timestamps |
| `together.demo.v1` | Format version 4 (adds optional reviewed `translations` on campaigns, updates and sharing pages): campaigns, contributions (optional `referralId`), referrals, milestones, campaignUpdates, expenses, supportingDocuments |
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
