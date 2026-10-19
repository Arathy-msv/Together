# Together

Together is a browser-only proof of concept for an interactive fundraising platform. Organisers create campaigns. Supporters open a campaign link, give a simulated amount directly, or play a short game (Grow Our Garden, Memory Match, or Community Puzzle) and then contribute.

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
```

## What you can try

- Create a campaign with the three-step story, settings, and review flow. Pick a cover template or upload your own cover, add an organisation logo, and choose which game supporters play.
- Save a draft and finish it later from My campaigns.
- Open a campaign, confirm a simulated direct contribution, and see the progress update after refresh.
- Play the campaign’s game, then continue through the same simulated confirmation.
- Copy a campaign link, close a campaign, or reset the sample data from the organiser dashboard.
- Open Winter Care Kits to see a scheduled campaign that cannot accept contributions yet.

Private campaigns use a demo access code shown to the organiser. That code is not secure access control.

Uploaded covers and logos are resized in the browser and stored in `localStorage` with the campaign. Browsers allow only a few megabytes there, so very large or many uploads can fill it; the app shows a message if that happens.

## Sample data

The first visit seeds three campaigns for Riverside School PTA: Grow Our School Library, Community Garden, and Winter Care Kits. Reset demo data on the dashboard restores those campaigns and clears simulated contributions created in this browser.
