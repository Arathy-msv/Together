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

`npm test` runs the contribution rules, stage gating, checkout, organization, theming, storage migration, and assistant tests with Node’s built-in test runner.

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

## Storage

| Key | Contents |
| --- | --- |
| `together.organizations.v1` | Organization configurations |
| `together.demo.v1` | Campaigns (with `organizationId` and `currency`) and simulated contributions, format version 2 |
| `together.assistantDrafts.v1` | Assistant drafts, one per organization |

Each stored organization is repaired or skipped on its own, so one broken record never wipes the rest. Missing demo organizations and sample campaigns are added back.

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
