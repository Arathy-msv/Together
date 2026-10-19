# Together

Together is a browser-only proof of concept for an interactive fundraising platform. Organisers create campaigns. Supporters open a campaign link, give a simulated amount directly, or plant flowers in a short garden game and then contribute.

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

- Create a campaign with the three-step story, settings, and review flow.
- Save a draft and finish it later from My demo campaigns.
- Open a campaign, confirm a simulated direct contribution, and see the progress update after refresh.
- Plant up to three flowers in Grow Our Garden, then continue through the same simulated confirmation.
- Copy a campaign link, close a campaign, or reset the sample data from the organiser dashboard.
- Open Winter Care Kits to see a scheduled campaign that cannot accept contributions yet.

Closed campaigns use a demo access code shown to the organiser. That code is not secure access control.

## Sample data

The first visit seeds three campaigns for Riverside PTA: Grow Our School Library, Community Garden, and Winter Care Kits. Reset demo data on the dashboard restores those campaigns and clears simulated contributions created in this browser.
