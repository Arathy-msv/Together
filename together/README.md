# Together

Together is a browser-only proof of concept for an interactive fundraising platform. Organisers create campaigns. Supporters open a campaign link, which opens the campaign’s game when one is enabled (Grow Our Garden, Memory Match, Community Puzzle, or Zip the Jacket). Each completed game action adds a set amount to a suggested contribution that the supporter can edit, donate, or cancel. Direct giving stays available from the campaign details.

The organiser and supporter screens use a clean, photographic product style. The games keep an illustrated, storybook style.

No real money is collected. There is no backend, database, account system, or payment gateway. Campaigns and simulated contributions stay in `localStorage` in this browser.

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

`npm test` runs the contribution rules, stage gating, and checkout tests with Node’s built-in test runner.

## What you can try

- Create a campaign with the three-step story, settings, and review flow. Pick a cover template or upload your own cover, add an organisation logo, and choose which game supporters play.
- Save a draft and finish it later from My campaigns.
- Open a campaign, confirm a simulated direct contribution, and see the progress update after refresh.
- Play the campaign’s game. After every completed action (a plant, a correct piece, a matched pair, or a zip stage) a checkpoint shows what was added, the running suggestion, and an editable total. Donate now opens the demo payment review, and nothing is saved until you confirm there.
- Set a custom total and keep playing: the game suggestion keeps growing while your chosen amount stays fixed until you edit it or reset to the game total.
- Set the per-action rate, round size, custom-total permission, and an optional suggestion cap in Game contribution settings when you create a campaign.
- Copy a campaign link, close a campaign, or reset the sample data from the organiser dashboard.
- Open Winter Care Kits to see a scheduled campaign that cannot accept contributions yet.

Private campaigns use a demo access code shown to the organiser. That code is not secure access control.

Uploaded covers and logos are resized in the browser and stored in `localStorage` with the campaign. Browsers allow only a few megabytes there, so very large or many uploads can fill it; the app shows a message if that happens.

## Sample data

The first visit seeds four campaigns: Grow Our School Library (garden game), Community Garden (puzzle), Winter Care Kits (memory, scheduled), and Zip Up for Winter (jacket). Reset demo data on the dashboard restores those campaigns and clears simulated contributions created in this browser.

## Game contributions

Game money is handled in integer paise. Each campaign and game has its own pending session in `localStorage` with the session ID, round IDs, each completed action’s ID and amount, the rate snapshot, the suggested total, an optional custom total, and its status. Recording the same action ID twice changes nothing, and actions that were paid or discarded can never count again. Game progress is saved separately, so a refresh restores the board without adding anything. Campaign totals come only from confirmed contribution records.

| Game | Default rate | Counts as one action |
| --- | --- | --- |
| Grow Our Garden | ₹50 | A plant that finishes growing in an empty plot |
| Community Puzzle | ₹25 | A piece that snaps into its correct space |
| Memory Match | ₹50 | A newly matched pair |
| Zip the Jacket | ₹50 | Each zip stage at 25%, 50%, 75% and 100% |
