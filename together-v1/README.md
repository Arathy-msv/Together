# Together

Together is a browser-only proof of concept for a fundraising platform. Companies, schools, clubs and nonprofits set up and publish their own branded fundraising website in four short steps, then create campaigns from a simple workspace. Supporters open a campaign page that explains the cause first, then choose to **give directly** or **play a short game** (Grow Our Garden, Memory Match, Community Puzzle, or Zip the Jacket). Each completed game action adds a set amount to a *suggested contribution* that the supporter reviews, edits and confirms. No payment is taken while playing.

The organizer and supporter screens use a clean, photographic product style. The games keep an illustrated, storybook style.

One codebase serves every organization. Each has its own website address, logo, colours, fonts, homepage, about page, campaign defaults and available games, all driven by configuration rather than separate copies of the site.

No real money is collected. There is no backend, database, account system, or payment gateway. Organizations, campaigns, and simulated contributions stay in `localStorage` in this browser.

## Run it

```bash
npm install
npm run dev
```

The dev server runs at [http://127.0.0.1:4321](http://127.0.0.1:4321).

## Published site

Pushes to `main` publish this `together-v1` demo with GitHub Actions. The public address is [https://arathy-msv.github.io/Together/](https://arathy-msv.github.io/Together/).

The published site stays in the browser you are using. Organizations, campaigns, and simulated contributions are saved in that browser’s localStorage. Payments, plans, and voucher redemption stay simulated.

```bash
npm run build
npm run lint
npm test
```

`npm test` runs the contribution rules, stage gating, checkout, organization, theming, storage migration, assistant, referral attribution, fund summary, trust, draft and AI-preview tests with Node’s built-in test runner.

## Roles and demo identities

The prototype has five roles, played through **simulated demo identities** (pick one from the labelled switcher on the platform pages or at `/demo-identities`). There is no real sign-in: anyone using the browser can choose any identity, and the checks below demonstrate the product rules — they are not production security.

| Role | Can do |
| --- | --- |
| Platform Admin | Organizations, demo plans and platform feature availability (`/admin`). No supporter records. |
| Organization Admin | Their organization only: website, features, members, campaigns, reviews, expenses, sponsors, partner offers, reports. |
| Campaign Organizer | Create campaigns; edit own drafts and explicitly assigned campaigns; submit for review when required. |
| Merchant | Look up and redeem vouchers at assigned stores and branches (`/merchant`). |
| Supporter | Everyone, including guests: browse, contribute, play, own sharing pages, own receipts and vouchers. |

All checks go through `can` / `assertCan` in `src/lib/permissions.ts` and are enforced in the library functions that write data, not only by hiding buttons. When review is required, revisions are approved by an Organization Admin who did not author them; the last published version stays public during review, and nothing is approved automatically when no other admin exists.

## Optional website features

Organizations choose which optional features to activate during setup (and later under **Settings → Website features**). A feature is usable only when it is implemented on the platform, included in the selected demo plan, and turned on for that organization. Checks go through `canUseFeature` in `src/lib/features.ts` — hiding a button alone is not enough.

| Key | What it adds |
| --- | --- |
| `sponsorPlay` | Sponsor-funded play on campaigns that opt in |
| `updateCommitments` | Next-update date for supporters |
| `shareKit` | QR/poster/message kit (basic copy-link always stays) |
| `campaignDuplication` | Reuse a past campaign as a template |
| `reviewApproval` | Submit for review before publish |
| `lowDataMode` | Optional low-data page switch |
| `recordExports` | Download JSON records from this browser |
| `supporterHistory` | Device-local contribution history |

Baseline accessibility, copy-link sharing and individual receipts are never optional upgrades. Disabling a feature that would break an active sponsorship or review is blocked with an explanation; other disables stop new use and keep history.

## The three journeys

Every screen has one primary action, and advanced settings stay folded away until needed.

| Who | Steps |
| --- | --- |
| Organization | **Create your website** (homepage) → Your organization (essentials; Advanced for address, features, look) → Review and publish → Create your first campaign. Empty fields get safe defaults. The first workspace visit shows a four-item checklist; reopen it from **More → Setup checklist**. |
| Campaign creator | Choose **Create with AI** (one purpose sentence → simulated draft) or **Fill the form** (enter fields) → edit → Review and publish → **Publish campaign** → “Your campaign is ready to share.” with **Copy campaign link**. Both paths save the same draft and use the same validation. |
| Supporter | Read the cause, organizer and progress at the top → **Give directly** or **Play a game** → review the amount → **Confirm simulated contribution**. A game link opens a short inline explanation with **Start playing** / **Give directly** before the game. |

Organizers keep supporters informed from each campaign’s overview with four tasks: **Post an update**, **Add an expense**, **Update a milestone** and **Prepare final report**. Supporters can **Share campaign link** or **Create my sharing page** (their own message and link).

## Platform structure

Together is now a platform where companies, schools, clubs and nonprofits each get their own branded fundraising website. There are three separate areas:

| Area | Routes | Purpose |
| --- | --- | --- |
| Together platform website | `/`, `/start`, `/start/:organizationId`, `/workspace` | Product homepage (how it works, organizations, who it’s for), four-step setup, demo workspace entry. Legacy `/plans` redirects into setup. |
| Organization public website | `/o/:organizationSlug`, `/about`, `/campaigns`, `/campaigns/:campaignId`, `/campaigns/:campaignId/r/:referralCode` (plus play, confirm, success, share) | One branded site per organization, showing only that organization’s campaigns |
| Organization workspace | `/workspace/:organizationId/overview`, `/website`, `/campaigns`, `/campaigns/new`, `/campaigns/:campaignId/:tab`, `/assistant`, `/settings`, `/plan` | Navigation: Home, Website, Campaigns, and More (Members, Partner offers, Sponsors, Settings, plan, features, help) |

- **Demo plans:** three sample plans with features and illustrative limits. They have no prices. New websites start on the Community plan; change it any time under Settings. Confirmation is simulated: no payment, billing, renewals or invoices, and limits are not enforced.
- **Setup:** choose a demo plan, then five steps (organization details including website address, website features, look and content, review selections, confirm simulated subscription and publish). Branding asks for a main colour and homepage photo first; **Use sample content** fills the text, and logo, fonts, footer and fundraising defaults sit under **Customize more**. Progress autosaves; unfinished setups resume, including older four-step and six-step progress mapped onto the current flow. Website addresses are lowercase, unique ignoring case, and can’t use reserved platform names.
- **Website lifecycle:** *Setup in progress* → *Draft* → *Published*. The public site always uses the published settings. In the website editor, *Save draft*, *Preview changes*, *Publish changes* and *Discard unpublished changes* work on a separate draft. Organizer preview is a labelled demo control on this device only. Publishing a website never publishes campaign drafts. Before the first publish, the public address shows an “isn’t published yet” page.
- **Website addresses are locked once published**, so shared links keep working.
- **Isolation:** campaigns, sharing pages, drafts and totals are filtered by `organizationId`. A campaign or referral code under the wrong organization address shows not found. The demo organization switcher appears only in the workspace, never on public sites.
- **Local only:** websites you create work at their addresses in this browser. Because there is no server, they are not visible on other devices.

Seeded organizations: **Maple Grove Public School** (`/o/maple-grove`), **Lumen & Co.** (`/o/lumen-co`) and **Open Harbour Foundation** (`/o/open-harbour`). Each has distinct branding, a published site, an about page, campaigns and different games. **Together** (`/o/together`) keeps the original sample campaigns. **Riverside Runners Club** is an unfinished setup (step 3) you can resume from **Continue a setup** (`/start`).

Old links still work: `/campaigns/:id/...` goes to the campaign’s organization site; `/dashboard`, `/create` and `/o/:slug/dashboard|create|assistant|settings` go to the matching workspace page; `/explore` goes to the demo organization’s campaigns.

## Sharing pages

Any open campaign that is running or about to open has a **Create my sharing page** action. A sharing page lives at `/o/:organizationSlug/campaigns/:campaignId/r/:referralCode` and points at the original campaign — it is not a copy. A sharer can add a name, optional photo, headline, “Why I support this campaign” message, optional personal target (“My sharing goal”) and a cover from the approved gallery. They cannot change the story, organizer, campaign goal, currency, where contributions go, updates, fund use or verification indicators.

The sharing page editor (`…/share` and `…/share/:code`) is a demo convenience: only the device that created a page can edit it. The code in the link records who shared it; it is not an editing password.

Attribution rule: **the sharing page used when you begin your contribution receives credit.** The referral is snapshotted when review begins (direct donation, game review, or the giving tree cart) and later page visits never change it. Only a confirmed simulated contribution stores `referralId`; it counts once in the campaign total and is also shown in the sharing page’s credited total. Donor names are never shown on sharing pages.

## Transparency: updates, fund use and trust

Campaign pages open with the title, a one-sentence purpose (**Read the full story**), organizer, progress and the contribution action (on mobile, a **Support this campaign** button sits right under the purpose). Below are three tabs: **Story**, **Updates** and **How funds are used**. Old `?tab=trust` links open **How funds are used**, which ends with “Who is running this campaign”.

- **Fundraising progress and delivery progress are separate.** Reaching the goal never marks delivery complete. Milestones show Planned, In progress, Reported complete (organizer-reported) or Past expected date.
- **Updates** show published updates only, newest first, with images (alt text required), optional short local video (never autoplays), related milestones and expenses. “Follow updates on this device” is a local bookmark; no emails are sent. The contribution receipt lists updates published since the contribution.
- **How funds are used** is a demo calculation in integer minor units: confirmed simulated contributions − published organizer-reported expenses. Planned budgets are shown separately, and draft expenses, game suggestions and failed attempts are never counted. A negative balance is shown exactly, with the organizer’s explanation. An expense linked from several updates is counted once.
- **Who is running this campaign** shows organizer-provided details with light labels: “Organizer-reported expenses”, “Supporting evidence attached” or “No supporting evidence uploaded”, and “Not independently verified”. An attachment is never called independently verified. Private originals stay off the public page. A demo verification example is seeded on one campaign only. Real identity review would need a future secure service.
- **Closure reports** can say delivered, partial, cancelled, or activities remaining. Unmet outcomes need an explanation. Publishing a report does not mark milestones complete and does not close fundraising. Remaining funds are an organizer statement, not a processed refund.

### Organizer workspace

In the workspace, Campaigns → **Manage** opens `/workspace/:organizationId/campaigns/:campaignId` with Overview, Story & settings, Sharing pages, Milestones, Updates, Expenses, Documents and Final report. The overview starts with the four reporting tasks and keeps fundraising status (goal reached, in progress, closed), delivery (organizer-reported milestones) and final report status on separate lines, followed by reminders (no published updates, past-due milestones, expenses without evidence). Closing fundraising and publishing a final report are separate actions. Receipts can be kept organizer-only with a separate redacted public copy, and publishing asks for privacy confirmation.

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
| Receipt assistance | Workspace → Expenses | Three fictional sample receipts map to fixed values (no OCR). Values need review and only become an expense when you save or publish. Other currencies are not converted. |
| Translation preview | Stored only | Public pages are English. Saved translation text is kept in this browser and is not shown. There is no language selector. |
| Suggest a setup | Campaign form, assistant | Category-based template, available game, milestones, expense categories and cover, each accepted individually. |

## Storage

| Key | Contents |
| --- | --- |
| `together.organizations.v1` | Organizations, version 2: details, slug, demo plan, onboarding progress, published website settings, website draft, status and timestamps |
| `together.demo.v1` | Format version 6. Version 5 keeps one beneficiary value and itemized budget fields. Version 6 adds `sponsorCommitments` and `sponsorAllocations` (empty when older data had none). Campaigns, contributions, referrals, milestones, updates, expenses and documents are kept. |
| `together.demo.analytics.v1` | Optional demo journey counts on this device: views, mode choices, game starts, reviews, confirmed gifts, sharing pages, update views, voucher claims and redemptions. No free text, voucher codes, or supporter details. Separate from campaign data, so clearing analytics does not reset a campaign. |
| `together.campaignDrafts.v1` | Form and assistant drafts, each with a stable ID and organization |
| `together.followed.v1` | Campaigns followed on this device |
| `together.myReferrals.v1` | Sharing pages created on this device (demo editing only) |

Each stored organization is repaired or skipped on its own, so one broken record never wipes the rest. Missing demo organizations and sample campaigns are added back. Loading version 1 or 2 data upgrades it to version 3 without removing campaigns or contributions; records that point at missing campaigns are dropped individually, and missing images fall back to a placeholder. Drafts and follows live in their own keys so autosave never rewrites campaign data. Earlier assistant drafts are imported automatically.

## What you can try

- Create a campaign in four steps (your cause, goal and dates, ways to contribute, review). Pick a cover or upload your own, and choose which game supporters play. Logo, templates, budget and game rules are under the optional sections.
- Leave mid-way and come back: **Continue your campaign draft?** offers the saved draft.
- Open a campaign, confirm a simulated direct contribution, and see the progress update after refresh.
- Play the campaign’s game. After every completed action (a plant, a correct piece, a matched pair, or a zip stage) a checkpoint shows “₹50 added to your suggestion.”, the suggested contribution and an editable final amount. **Review & contribute** opens the simulated payment review, and nothing is saved until you confirm there.
- Set a custom total and keep playing: the game suggestion keeps growing while your chosen amount stays fixed until you edit it or reset to the game total.
- Set the per-action rate, round size, custom-total permission, and an optional suggestion cap in Game contribution settings when you create a campaign.
- Copy a campaign link, close a campaign, or reset the sample data from Campaigns in the workspace.
- Open Winter Care Kits to see a scheduled campaign that cannot accept contributions yet.

Private campaigns (“Invited group only”) use a demo access code shown to the organizer. That code is not secure access control.

Team or class participation is not built. There is no roster, shared class account, or pupil management. A future version would need that as its own model; this prototype treats every supporter as one person on this device.

Uploaded covers and logos are resized in the browser and stored in `localStorage` with the campaign. Browsers allow only a few megabytes there, so very large or many uploads can fill it; the app shows a message if that happens.

## Sample data

The Together organization has the original sample campaigns: Grow Our School Library (garden game), Community Garden (puzzle), Winter Care Kits (memory, scheduled), Zip Up for Winter (jacket), and Class Circle (private group). Each other organization has three campaigns of its own. Reset demo data on the Campaigns page restores sample campaigns and organization branding and clears simulated contributions created in this browser.

## Game contributions

Game money is handled in integer paise. Each campaign and game has its own pending session in `localStorage` with the session ID, round IDs, each completed action’s ID and amount, the rate snapshot, the suggested total, an optional custom total, and its status. Recording the same action ID twice changes nothing, and actions that were paid or discarded can never count again. Game progress is saved separately, so a refresh restores the board without adding anything. Campaign totals come only from confirmed contribution records.

| Game | Default rate | Counts as one action |
| --- | --- | --- |
| Grow Our Garden | ₹50 | A plant that finishes growing in an empty plot |
| Community Puzzle | ₹25 | A piece that snaps into its correct space |
| Memory Match | ₹50 | A newly matched pair |
| Zip the Jacket | ₹50 | Each zip stage at 25%, 50%, 75% and 100% |
