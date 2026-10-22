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
This is a detailed walkthrough of Together, a prototype for organizations that raise funds with their communities.
In this demo, Greenwood School raises funds for school supplies.
Every screen you see is the real app, clicked and typed in this browser.
Payments, the subscription and the assistant are simulated, and the video says so whenever that matters.
We will follow six roles: platform admin, organization admin, campaign organizer, supporter, partner merchant, and then delivery and reporting.

# chapter opening | A first look

## op-home
This is the public website a supporter sees. The school’s logo, green colour, headline and homepage photo are all set by the organization.
The navigation is Home, Campaigns, About, and My activity.
Organizer tools are not on this page. A supporter cannot manage the website from here.
Below the headline, campaign cards show a fundraising status, such as Accepting contributions or Fundraising closed.

## op-game
On a campaign, the heading is How would you like to help?
One choice is Give directly. The other is Play to support, and beside it the page explains: play to build a suggested contribution, then review your final amount before confirming.
The bar under the game states the rule in words: each matched pair suggests {$50|fifty dollars}, and the final contribution is the player’s choice.
Nothing is charged while they play. Review and contribute stays disabled until there is a suggestion to review.

## op-offer
Partner offers stay on the campaign after the funding goal is reached. They sit under More ways to take part, not in the giving panel.
This one is from Corner Stationery: ten percent off one purchase, for a contribution of {$200|two hundred dollars} or more.
The card names the store, the reward, the terms, the end date and how many are left.
It is labelled as simulated. No real shop is connected.

## op-update
The Updates tab is separate from the fundraising total.
It shows delivery progress, milestone by milestone, and the updates the organizer has published.
Reaching a money target is not the same thing as finishing the work. The page says that in both places.
Next, the same website is set up from an empty account, one role at a time.

# chapter platform | Platform Admin

## card-platform
Chapter one: the platform admin. This role can see organizations and plans. It cannot see supporter records.

## pa-identities
Demo identities live on a page titled Simulated identities — not real sign-in or security.
Each person is a button: Act as Pat, Act as Grace, and the others. There is no password.
The page marks the selected person as Current.
We start as Pat, the platform admin. Switching identity only changes this browser. It is a demo control, not an account.

## pa-admin
Platform administration lists every organization, the demo plan it is on, and a control to change that plan.
Changing a plan here does not charge a card. Plans in this prototype are labels for which features are allowed.
Further down, Platform feature availability shows which optional tools the platform is offering at all.
A sentence at the top states the limit: supporter records and identity documents are not shown here.

## pa-no-records
Pat opens Maple Grove’s workspace directly, by its address.
The app refuses the page: only members of that organization can open it.
Being the platform admin does not grant a back door into a school’s campaigns, contributions or files.

# chapter orgadmin | Organization Admin

## card-orgadmin
Chapter two: the organization admin. Grace creates Greenwood School’s website, team and partner offer.

## oa-plan
Grace is chosen on the same demo identities page, with Act as Grace.
Plans are presented as demo plans. Each card has Choose this demo plan. No price is collected.
She picks one. A confirmation step is titled Confirm demo subscription, and the button is Confirm demo plan and start setup.
That opens a five-step website setup. The step indicator starts at Step 1 of 5.

## oa-details
Step 1 is the organization’s public details.
A Demo button, Fill demo values, enters the Greenwood sales values into the empty fields on this page. It does not submit the form.
Organization name becomes Greenwood School, and Type is School.
Short description is the sentence supporters read about the school. Public contact email and Public location are shown on the website, so they are not private fields.
The website address is built from the name: greenwood-school. The app checks it and says This address is available.
If that address is already saved in this browser, Fill demo values uses the next free name, such as Greenwood School 2.
Continue moves to Step 2. Nothing is public until the last step.

## oa-features
Step 2 starts on Use recommended settings. The panel Included with the recommended settings lists what a school on this plan gets, and why.
Choose individually opens every optional feature as its own card, with an on-off switch and a live preview of the website.
Sponsor-funded play lets a fictional sponsor fund Memory Match rewards. Grace turns it on here. After the campaign is published, she adds the pledge, the per-person cap, and the reward for each matched pair.
Campaign update commitments ask the organizer to name the date of the next progress update.
Campaign sharing kit prepares a QR code, a poster and ready-to-copy messages. It is already on, and Grace leaves it on.
Reuse past campaigns lets a finished drive become the starting draft of the next one.
Campaign review and approval means a second admin must approve a campaign before it can be published.
Low-data experience adds a switch that holds back photos and video on slow connections.
Campaign record exports lets an admin download the campaign’s records as a file.
Supporter impact history lets a supporter reopen their receipts on this device.
Give and Get Local is the partner-voucher feature. Turning it on asks which kinds of offer to allow.
Grace turns on sponsor-funded play, review and approval, and Give and Get Local, and she ticks Contribution rewards.
Contribution rewards means a supporter can receive a partner offer after giving. Store-value vouchers and online offers stay off.
The preview on the right updates as she chooses. Continue goes to Step 3.

## oa-look
Step 3 is the public look of the website.
The main colour is a hex field. She sets the school green, {#1F5A3D|one F five A three D}.
The image gallery is the homepage photo. The headline and the introduction are the words under that photo.
Customize more is optional. Inside it, she uploads the school logo from this computer.
Fundraising preferences includes Turn on the campaign creation assistant. It is already on, so organizers get the guided conversation.
Continue goes to the review step. All of these settings can be changed later in the workspace.

## oa-review
Step 4 is a written summary, not a new form.
It repeats the plan, the details, and each feature she enabled, including Partner vouchers: Enabled.
The voucher section names Contribution rewards as the only capability she turned on.
Continue opens Step 5, a preview. Desktop and Mobile are two buttons in the preview toolbar, and they show the same website at two widths.
She checks both, then returns to Desktop before publishing.

## oa-publish
The publish button is explicit: Confirm simulated subscription and publish.
The next screen is titled Your website is ready.
It shows the address, and it says the site exists in this browser only, because this prototype has no server.
The primary button is Create your first campaign. Beside it are Open website, Copy website link, and Go to my workspace.
She opens the website. The headline she wrote is the page title. There are no campaigns yet, and the empty state says so.

## oa-members
Manage this website opens the workspace. The workspace navigation is Overview, My website, Campaigns, Partner offers, Members and Settings.
Members has two jobs: a list of who already has access, and a form titled Add a member.
Demo identity is a dropdown of the simulated people. Role is the second dropdown.
She adds Daniel Brooks as Organization Admin. An organization admin can review campaigns, manage members, offers and settings.
She adds Olivia Chen as Campaign Organizer. A campaign organizer only works on campaigns someone assigns to her. She cannot approve her own campaign, and she cannot change the website.
Both names then appear in the members list with those roles.

## oa-offers
Partner offers is where Give and Get Local is actually set up. The feature switch alone does not create a shop.
She adds a partner store: the name Corner Stationery, the area Greenwood High Street, and a one-line description.
Create an offer asks for an offer title, the smallest qualifying contribution, the reward a supporter receives, the terms, and how many are available.
She sets the qualifying contribution at {$200|two hundred dollars}, fifty vouchers, and terms that say one use, in store, not cash.
Save offer stores it as a draft. A draft is not shown to supporters.
She opens Terms, uses the button that marks the terms as reviewed, and only then Activate offer.
The page confirms Offer activated. From here, a campaign can attach this offer.

## oa-store-staff
Store staff is on the same page, under the store.
Give access assigns Leo Martins, who works at the shop, to the store’s branches.
The line reads Leo Martins, all branches. That is what lets him open the merchant portal and redeem this store’s vouchers.
He still cannot see the school’s contributions or edit the campaign.

## oa-kit-settings
Settings, then Website features, is the same feature list after launch.
Campaign sharing kit is still listed and still on. Grace could turn any feature off here without repeating setup.
The workspace also shows publication, fundraising and delivery as separate status lines once a campaign exists.

# chapter organizer | Campaign Organizer

## card-organizer
Chapter three: the campaign organizer. Olivia drafts a campaign. Daniel, a different admin, approves it, and only then is it published.

## og-start
Olivia opens the workspace from the demo identities page.
Your campaigns shows only the campaigns assigned to her. Last term’s Reading Week book drive is already there, and it is closed.
Create a campaign offers two starts: Guide me through it, and Use a form.
Both use the same four groups: Your cause, Goal and dates, Ways to contribute, and Review.
She chooses Guide me through it.

## og-assistant
The assistant is a simulated conversation. A short badge says {AI preview · Simulated|A I preview, simulated}. What does this mean? expands the explanation: fixed rules, no {AI|A I} service, nothing invented. Discard draft is tucked into a More menu, away from the task.
The first box asks what the campaign is for. Olivia types the purpose, including a target of {$60,000|sixty thousand dollars}, in her own words.
Continue. The assistant replies that it noted the target, and it asks which type of campaign is closest. It has pre-selected Education, and she can change it.
Suggest a setup opens a panel marked {AI preview · Simulated|A I preview, simulated}. It suggests a category, a story template, a game and milestone examples. Nothing is added until she accepts it.
She continues, and answers who the campaign helps, what the money pays for, and what happens next. The assistant does not invent those.
She confirms the title, School supplies for every Greenwood pupil, and the goal.
Start now, thirty days, sets the opening and the closing date.
Open to everyone means any visitor can give. Both means the campaign offers a direct amount and a game.
She picks the game Memory Match, then a cover image, School library, and presses Finish.
The setup indicator on the left has followed the same four groups the form uses. The preview on the right has updated at each answer.

## og-ai-suggest
Suggest draft content asks before it writes anything.
Draft suggestions are listed for her to read. Text in square brackets is a placeholder she must replace. Nothing is applied automatically.
She ticks four milestones: Confirm needs with the school, Purchase materials, Deliver and set up, and Share what students did.
Accept 4 milestones adds only those. She could have accepted none.

## og-autosave
The draft is saved on this device while she works. Save and exit leaves the assistant without publishing.
Coming back to Create a campaign shows Continue your campaign draft? with the title she already entered.
Continue draft reopens it and says Continuing the draft you last edited. Discard draft would delete it. She continues.

## og-form
Fine-tune in the full form opens the same draft as a form, with the same four setup boxes at the top.
Goal and dates includes the commitment date, Next update. She sets it to a week from today. Supporters will see that date on the campaign.
Ways to contribute shows the games. Memory Match stays selected.
Offer partner rewards or vouchers asks whether to attach an offer that already exists. She selects the eligible offer, 10% off school supplies.
Sponsor-funded play is visible because the organization turned the feature on. An organization admin adds the fictional budget after publishing. Olivia does not invent a pledge on this form.
The review step includes Before you publish. It says a ticked preview means she looked, not that a payment was tested.
The Review box shows the same grouped summary as the assistant, with an Edit button on each group.

## og-submit
Because review before publishing is on, the primary button says Submit for review, not Publish.
After she submits, the campaign list shows Manage, Waiting for review. The public website still does not list this campaign.
Opening it shows Waiting for review, who submitted it, and the line Approving does not publish.
Olivia does not see Approve this revision. She wrote it, so she cannot approve it.

## og-approve
Daniel is a different organization admin. His campaign list shows the same waiting campaign, because review is his job.
The review card has three steps: submitted, then approved, then published. They are not the same action.
Submitted by names Olivia and the time. The note field is for the reviewer.
Approve this revision records Daniel’s decision and keeps the campaign as a draft. The heading changes to Approved, ready to publish.
The page says the campaign is not public yet, and that publishing makes exactly this approved version visible.
Only then does Daniel press Publish approved campaign.
The status lines underneath split into Publication, Fundraising, Delivery and Final report, each with its own state.

## oa-sponsor
Grace opens Sponsors. The page calls the budget fictional, and it says pending rewards stay out of the campaign total until she confirms them.
Only Memory Match is offered a sponsor budget. This school has no garden, puzzle, or jacket campaign on the list.
She names Northwind Stationery, a fictional sponsor. The pledge is {$5,000|five thousand dollars}, the cap is {$500|five hundred dollars} per person, and each of three matched pairs is worth {$50|fifty dollars}.
Add sponsor commitment saves it. The notice says no sponsor has been invoiced.
The card shows the pledge and says there are no play rewards yet.

## og-copy-link
Olivia returns to her campaign list. The row now has Copy link and View, because the campaign is public.
Copy link says Link copied. The address is the public campaign in this browser. It does not open on another device, because the records live in local storage.
View opens the public page. The title, the cover, the goal of {$60,000|sixty thousand dollars}, and Support this campaign are all visible.
Fundraising shows Accepting contributions. Delivery shows Not started, as a separate badge.

## og-share-qr
Share this campaign opens the sharing kit. The same link is used by the QR code, the poster and every message.
The first tab is Link and QR. The QR code is generated in the browser. Scanning it opens this campaign, with no personal referral attached.
Copy link copies that campaign address. Download PNG and Download SVG save the QR as a picture.
The recording checks that the picture decodes back to the same address.
A line on the page reminds the organizer that data saved only in this browser will not appear on another device.

## og-share-poster
The Poster tab is an A4 layout: school name, campaign purpose, target, and the same QR code.
Download poster PNG saves the image. Print or Save as PDF would open the browser’s print dialog. This recording leaves that dialog closed, so no PDF is produced.
The poster text can be copied separately, for a caption or a letter.

## og-share-messages
WhatsApp and Email are drafts, not sent messages.
Each draft includes the campaign link. Copy message puts it on the clipboard. Nothing is sent, and no recipient is chosen.
Opening WhatsApp or the email app is a further click, and it leaves this prototype. The recording does not take that click.

## og-share-social
Social images has three sizes: square, portrait and story.
Download saves the image. A link painted into a picture cannot be clicked, so Copy caption puts the campaign address in the text that goes with the image.
The caption is checked to contain the real campaign link.

## og-kit-off
Grace can turn the sharing kit off under Website features.
With the kit off, the poster, the QR download and the message drafts disappear. Copy link still works, so the organizer is not blocked from sharing the address.
She switches the kit back on, and the full kit returns. This recording turns it back on so the later scenes can use it.

## og-duplicate
Reuse past campaigns is the control that copies Reading Week book drive.
The copy is a new draft. Its raised amount is zero. The contributions, vouchers and updates stay on the original campaign.
She does not publish the copy. It is there to show that reuse does not move money.

## og-milestone-update
Olivia opens Milestones and marks Confirm needs with the school as reported complete, with a progress note supporters can read.
Reported complete means the organizer says it is done. The app does not verify it.
She then publishes an update, Our supply list is ready, and links that update to the same milestone.
On the public timeline, the update and the milestone point at each other.

# chapter supporter | Supporter

## card-supporter
Chapter four: the supporter. Mia gives, plays, claims a voucher, and shares the campaign with her own link.

## sp-home
Mia is a parent, chosen on the demo identities page. She is not a member of the school’s workspace.
The public website shows the headline, the campaigns, and no organizer navigation.
She opens School supplies for every Greenwood pupil.
The page shows two badges side by side: the fundraising badge, Accepting contributions, and the delivery badge.

## sp-trust
The story is split into short questions: What is needed?, Who will benefit?, How will funds be used?, and What happens next? Each answer is the organizer’s own words.
Before giving, she reads Updates. The update Our supply list is ready is there, linked to its milestone.
How funds are used shows the planned spending. There are no expenses yet, and the page does not pretend there are.
Partner offers shows Corner Stationery, the reward, the {$200|two hundred dollars} minimum, and the terms.
None of this is a receipt or an audit. It is what the organizer and the partner store entered.

## sp-direct
Back at How would you like to help?, Give directly is selected.
Suggested amounts are buttons, {$250|two hundred and fifty dollars} and {$500|five hundred dollars}. She chooses {$500|five hundred dollars}.
Continue to review opens Confirm your contribution. The screen says No payment will be collected.
Confirm simulated contribution is the only way the total moves. Closing the screen would leave the campaign unchanged.
The thank-you page repeats that the contribution is simulated, and it shows her receipt on this device.

## sp-reward
Because she gave at least {$200|two hundred dollars}, the thank-you page offers the partner reward.
Claim reward saves a voucher on this device. It does not email anyone, and it does not tell the shop yet.
The voucher card names the store, the offer and the state Ready to use.

## sp-game
She opens the campaign again and chooses Play to support. The game is Memory Match.
The rules are on the page before the first card: each matched pair suggests {$50|fifty dollars}, suggestions stop if a giving limit is set, and the final contribution is her choice.
Start playing opens the board. A short instructions step explains the game, then the cards are face down.
Each matched pair adds {$50|fifty dollars} and shows a one-line message under the board. Play is not interrupted by a dialog.
She matches three pairs. The suggestion reads {$150|one hundred and fifty dollars}.
New board deals new cards and keeps that suggestion. Start a new session is the control that clears it, and it asks first. She does not start a new session.

## sp-game-confirm
Review and contribute is on the bar the whole time. She opens it when she is ready, not when the game decides.
The dialog shows the suggestion and a field, Your final amount. She changes it from {$150|one hundred and fifty dollars} to {$200|two hundred dollars}.
Review and contribute then shows the final chosen amount again, and says that no payment will be collected.
Confirm simulated contribution adds {$200|two hundred dollars}. The campaign total becomes {$700|seven hundred dollars} of {$60,000|sixty thousand dollars}. The earlier {$500|five hundred dollars} is still part of that total.

## sp-sponsor
Mia returns to the campaign, chooses Play to support, and then chooses Sponsor-funded play.
The choice names the next reward, {$50|fifty dollars}, and says nothing is added to her checkout.
Before she matches a pair, the game states the next sponsor reward and the budget still available.
One match says the sponsor reward is pending and is not added to her personal amount.
The campaign total does not move. The reward waits for an organization admin.

## sp-share
Help spread the word offers Create my sharing page. This is a personal page, not a second campaign.
She enters a display name, Mia Patel, a short headline, why she supports it, and a personal goal of {$5,000|five thousand dollars}.
Create my sharing page builds a link that contains a referral code. It is a different address from the campaign link, and it still gives to the same campaign.
Her sharing kit uses that personal link for the QR code, the poster and the caption.
The recording checks that the downloaded QR decodes to her link, and that the poster and the caption contain it.

## sp-referral-gift
Ben is a different supporter. He opens Mia’s link, not the campaign link.
The page shows Mia’s name and that this is her personal introduction. The money still goes to the original campaign.
He gives {$100|one hundred dollars}, reviews the same no-payment screen, and confirms a simulated contribution.
The campaign total becomes {$800|eight hundred dollars}. It increases once. Mia’s page is credited {$100|one hundred dollars}, and that credit is part of the {$800|eight hundred dollars}, not extra money.

## sp-vouchers
My vouchers lists the reward as a card: the store, the offer, Ready to use, and the end date.
Show voucher opens a full-screen view for a shop counter. It says Present this to store staff, and it shows a QR code and the code in large type. Done closes it.
The code is what Leo will type. There is no camera scan in this prototype.
My activity, in the public navigation, brings three lists together.
Contributions shows her two gifts, with the amount, the time and Open receipt.
Following shows campaigns she has followed on this device, and whether a new update has been posted since.
Partner vouchers repeats the card she just opened.

## sp-lowdata
Low-data mode is a checkbox on the public site: hide photos and video until you ask, and turn off animations.
Turning it on removes the homepage photograph and replaces campaign photos with the campaign’s initials.
Turning it off brings the photographs back. The text of the page does not change.
The preference is kept for this visit, on this device.

# chapter merchant | Merchant

## card-merchant
Chapter five: the partner merchant. Leo redeems Mia’s voucher at Corner Stationery. The redemption is simulated.

## mc-portal
Leo opens the merchant portal from the demo identities page. The link is Merchant portal.
The screen says which store he belongs to: Corner Stationery, Greenwood High Street.
Redeem a voucher is a text field. He types the code. There is no camera button.

## mc-invalid
He tries a code that does not exist, GGL-0000-0000, and presses Look up.
The page rejects it. There is no redeem button for a code this store does not hold.
The rejection is an alert on the page, not a silent failure.

## mc-redeem
He enters Mia’s real code. Look up finds it and shows Valid, the offer title, and the terms.
He opens Terms and reads the same conditions Grace wrote: one use, in store, not cash.
The branch dropdown is set to Greenwood High Street.
Confirm simulated redemption records the use. The history list below shows the code.
No payment moves. The shop’s till is not connected.

## mc-repeat
He enters the same code again.
The voucher now shows Used. Confirm simulated redemption is gone.
The app also blocks a second redemption in its own check, so the block is not only the hidden button.
This is true inside one browser. A second device would not see the voucher at all, because it was never sent to a server.

# chapter final | Delivery and reporting

## card-final
Chapter six: delivery and reporting. The campaign passes its target. The school records spending, and delivery stays unfinished.

## fn-expense
Off camera, further simulated contributions arrive, using the same contribution action a supporter would take. The total passes the {$60,000|sixty thousand dollars} target.
Olivia records an expense. Add an expense asks for a description, a category, an amount, a vendor, a related milestone and a public note.
She enters {$18,400|eighteen thousand four hundred dollars} at Corner Stationery, linked to the milestone Purchase materials.
Publish expense marks it as organizer-reported spending. The app does not check the receipt with the shop, and the expense says so.

## fn-milestone
On Milestones she edits Purchase materials, sets the status to In progress, and writes a progress note about what has arrived and what is still on order.
Save milestone stores that status. The milestone row can say In progress. The public delivery badge says Delivery in progress, not Complete.
One earlier milestone, Confirm needs with the school, stays Reported complete. Two remain Planned.

## fn-report
Grace opens the final report. The figures are calculated from this browser’s own records: raised, spent, and not yet spent.
Unfinished milestones are listed. Three of the four are not reported complete, so the report is not ready to publish.
Draft final report asks the simulated assistant for a draft. The draft is built from those records. She still types the outcome in her own words.
Apply to report editor copies the draft into the editor. It does not publish it.
She fills Remaining funds and the plan for them, and presses Save draft.
The confirmation says the final report is saved as a draft and is not public.

## fn-export
Campaigns includes Export campaign records, for an organization admin.
The download is a JSON file. The recording checks that the file says supporter profiles are not included, and that it contains no supporter identifier.
It is a copy of this browser’s demo records. It is not an accounting export.

## oa-sponsor-confirm
Grace returns to Sponsors. Mia’s matched pair is listed as pending, still outside the campaign total.
Confirm simulated funds adds {$50|fifty dollars} once. The row then says it was counted once in the campaign total.
The confirm button is gone, so the same reward cannot be added again.
This is a simulated sponsor gift. It was never part of Mia’s personal checkout.

## fn-public
On the public page the total is {$61,200|sixty one thousand two hundred dollars} of {$60,000|sixty thousand dollars}.
Fundraising has closed, so the contribution panel is replaced by Funding goal reached, with See what happens next.
Delivery is reported beside the total, not inside the percentage. The badge says Delivery in progress, and one of four planned activities is reported complete.
The sentence on the panel says reaching the goal does not mean the work is done.
See what happens next opens Updates. Each milestone lists Expenses, Evidence and Updates.
Purchase materials shows the {$18,400|eighteen thousand four hundred dollars} expense. Choosing that amount opens How funds are used, already filtered to that milestone.
The expense row says no supporting evidence has been uploaded. The amount not yet spent, {$42,800|forty two thousand eight hundred dollars}, stays visible above the list.

# chapter end | Together

## card-end
Create your website. Launch a campaign. Keep supporters connected to the impact.
