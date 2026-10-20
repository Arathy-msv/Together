# Together — narrated demo script

<!--
Editable narration. Format:
  "# chapter <id> | <title>"  starts a chapter (its title card uses the line after it).
  "## <scene-id>"           starts a scene; ids match demo-video/scripts/scenes.mjs.
                            "card-*" scenes are title cards rendered during assembly, not screen recordings.
  Every other non-empty line is one narrated sentence (one subtitle cue).
  {shown|spoken} shows the left text in subtitles and speaks the right text.
After editing, run: node narrate.mjs && node record.mjs && node assemble.mjs
Timings for each scene are written to output/scene-timings.md after assembly.
-->

# chapter intro | Together

## card-intro
This is Together, a prototype for organizations that raise funds with their communities.
In this demo, Greenwood School raises funds for school supplies.
Please note: this is a product prototype. Payments and selected services are simulated.

# chapter opening | A first look

## op-home
Greenwood School has its own website, with its logo, colours and campaigns.

## op-game
Supporters can give directly, or play a short game such as Memory Match.
Nothing is charged while they play.

## op-offer
A local stationery shop offers a reward to supporters who contribute {₹200|two hundred rupees} or more.

## op-update
And the school posts progress updates, so supporters can follow what happens next.
Let's see how this was set up, one role at a time.

# chapter platform | Platform Admin

## card-platform
Chapter one: the platform admin.

## pa-identities
Everyone in this demo is a simulated identity, chosen on a clearly labelled demo page.
This is not real sign-in, and it is not security.
We start as Pat, the platform admin.

## pa-admin
Pat sees the organizations on the platform, their demo plans, and which features the platform makes available.
Supporter records and identity documents are not shown here.

## pa-no-records
Pat isn't on any school's team, so opening an organization's workspace is refused.
The platform admin does not automatically get access to supporter data.

# chapter orgadmin | Organization Admin

## card-orgadmin
Chapter two: the organization admin.

## oa-plan
Grace runs Greenwood School's fundraising. She picks a demo plan.
No subscription is purchased; the plan is simulated.

## oa-details
She enters the school's name, type, short description and public contact details.
The website address follows the name, and the app checks that it is free.

## oa-features
Next, she chooses the features the school needs: sponsor-funded play, review before publishing, and partner vouchers with contribution rewards.

## oa-look
She sets the school's green, picks a homepage image, and writes a headline and introduction.
She uploads the school logo, and leaves the campaign creation assistant switched on.

## oa-review
A review step summarises every choice, including partner vouchers.
Then she previews the website on desktop and on mobile.

## oa-publish
She confirms the simulated subscription and publishes.
The website is live, in this browser only.

## oa-members
In Members, Grace adds Daniel as a second organization admin, and Olivia as a campaign organizer.

## oa-offers
Under Partner offers, she adds Corner Stationery, a shop near the school.
She creates an offer: ten percent off school supplies, for contributions of {₹200|two hundred rupees} or more.
She saves it as a draft, reviews the terms, and then activates it.

## oa-store-staff
Finally, she gives Leo, who works at the shop, access to its branches, so he can redeem vouchers.

# chapter organizer | Campaign Organizer

## card-organizer
Chapter three: the campaign organizer.

## og-start
Olivia, the campaign organizer, opens the workspace.
She sees the campaigns assigned to her, including last term's Reading Week book drive.
She starts a new campaign with the guided assistant.

## og-assistant
She describes the campaign in her own words.
The assistant is simulated. It follows fixed rules and is not connected to an A I service.
It suggests a setup, and Olivia adds who the campaign helps, what it pays for, and what happens next.
Then she confirms the target, the dates, who can take part, both ways to contribute, the Memory Match game, and a cover image.

## og-ai-suggest
Draft suggestions appear for her to review. Nothing is applied automatically, and text in square brackets must be replaced before use.
Olivia accepts four delivery milestones.

## og-autosave
Her draft is saved as she works.
She leaves, comes back, and the app offers to continue the draft.

## og-form
In the full form, she commits to a date for the first update, keeps Memory Match, and attaches the partner offer.
Sponsor-funded play can only be confirmed by an organization admin.

## og-submit
Because review before publishing is on, Olivia submits the campaign for review.
She can't approve her own work.

## og-approve
Daniel, a different organization admin, sees that Olivia submitted it.
He adds a note, approves the revision, and the campaign is published.

## og-copy-link
Back as Olivia, she copies the campaign link and checks the public page.
In this prototype, links and records live in this browser; they don't carry over to other devices.

## og-duplicate
She can also reuse last term's campaign.
The copy is a clean draft with nothing raised. Past contributions stay with the original campaign.

## og-milestone-update
Olivia marks the first milestone as reported complete.
Then she publishes an update: the supply list is ready.

# chapter supporter | Supporter

## card-supporter
Chapter four: the supporter.

## sp-home
Mia, a parent, visits the school's website. Supporters don't see any organizer tools.
She opens the campaign.

## sp-trust
Before giving, she can read the updates, see how funds will be used, and check the partner offer.

## sp-direct
Mia gives {₹500|five hundred rupees} directly.
The review screen says clearly that no payment will be collected, and she confirms a simulated contribution.

## sp-reward
Her contribution qualifies for the partner reward, so she claims the voucher.

## sp-game
She also plays Memory Match. Each matched pair adds to a suggested amount, but nothing is charged during play.

## sp-game-confirm
At the end, the suggestion is only a starting point. She changes it to {₹200|two hundred rupees}, reviews it, and confirms.
The campaign total now shows {₹700|seven hundred rupees}.

## sp-share
Mia creates her own sharing page, with a personal goal.
The sharing kit includes ready-made poster text. The QR code shown is a placeholder in this prototype.

## sp-vouchers
My vouchers holds her reward code.
Her impact history lists the campaigns she has supported.

## sp-lowdata
For slow connections, a low-data page removes large images and animations.

# chapter merchant | Merchant

## card-merchant
Chapter five: the partner merchant.

## mc-portal
Leo, from Corner Stationery, opens the merchant portal. He is assigned to the High Street branch.

## mc-invalid
He types the voucher code by hand. There is no camera scanning in this prototype.
A code that doesn't exist at his store is rejected.

## mc-redeem
With Mia's real code, the voucher shows as valid.
Leo checks the terms, chooses the branch, and confirms a simulated redemption.

## mc-repeat
If the same code is entered again, it shows as used, and it can't be redeemed a second time.
This works within one browser. Redemption across devices is not part of this prototype.

# chapter final | Delivery and reporting

## card-final
Chapter six: delivery and reporting.

## fn-expense
Over the following weeks, more simulated contributions arrive, and the campaign passes its target.
Olivia records the first purchase: {₹18,400|eighteen thousand, four hundred rupees} of notebooks, pencils and art materials from Corner Stationery.
She links it to the Purchase materials milestone and publishes it as organizer-reported spending.

## fn-milestone
She sets that milestone to in progress, with a note about what has arrived.

## fn-report
Grace opens the final report. The figures come from the app's own records, and three milestones are still unfinished.
The simulated assistant drafts a report from those records.
Because delivery isn't finished, Grace saves it as a draft. It is not public.

## fn-export
As an organization admin, she can export the campaign records as a file. Supporter profiles are not included.

## fn-public
On the public page, the target is reached, but delivery shows one of four milestones complete.
Reaching the goal does not mean delivery is done.
Supporters can see each organizer-reported expense, and the amount not yet spent.

# chapter end | Together

## card-end
Create your website. Launch a campaign. Keep supporters connected to the impact.
