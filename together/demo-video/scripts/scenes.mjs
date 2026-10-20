// Ordered scenes. `record: false` steps prepare demo data off camera using the app's own modules,
// acting as the identity that would really perform the action (permission checks still apply).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../package.json'))
const { PNG } = require('pngjs')
const jsQR = require('jsqr')

const here = path.dirname(fileURLToPath(import.meta.url))
const LOGO = path.resolve(here, '..', 'assets', 'greenwood-logo.png')
const DOWNLOADS = path.resolve(here, '..', 'work', 'downloads')

function decodeQrFile(file) {
  const png = PNG.sync.read(fs.readFileSync(file))
  const pixels = new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.byteLength)
  const result = jsQR(pixels, png.width, png.height)
  return { text: result ? result.data : null, width: png.width, height: png.height }
}

function pngSize(file) {
  const png = PNG.sync.read(fs.readFileSync(file))
  return { width: png.width, height: png.height }
}

async function waitForDownload(pattern, timeout = 12000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const names = fs.existsSync(DOWNLOADS) ? fs.readdirSync(DOWNLOADS) : []
    const hit = names.find((name) => pattern.test(name) && !name.endsWith('.crdownload'))
    if (hit) {
      const file = path.join(DOWNLOADS, hit)
      const size = fs.statSync(file).size
      await new Promise((resolve) => setTimeout(resolve, 250))
      if (fs.existsSync(file) && fs.statSync(file).size === size && size > 100) return file
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error(`No download matching ${pattern} in ${DOWNLOADS}`)
}

async function prepareDownloads(r) {
  fs.rmSync(DOWNLOADS, { recursive: true, force: true })
  fs.mkdirSync(DOWNLOADS, { recursive: true })
  await r.browserCall('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS, eventsEnabled: true })
}

async function openShareKit(r) {
  await r.scrollToSel('h2', { text: 'Share this campaign' }).catch(async () => {
    await r.scrollToSel('h2', { text: 'My sharing kit' })
  })
  const closed = await r.ev(`[...document.querySelectorAll('button')].some(b => b.innerText.includes('Open sharing kit') && b.getBoundingClientRect().width > 0)`)
  if (closed) {
    await r.press('Open sharing kit', { selector: 'button' })
    await r.sleep(600)
  }
  await r.waitFor('Link & QR')
}

async function waitEnabled(r, label) {
  const start = Date.now()
  while (Date.now() - start < 10000) {
    const ready = await r.ev(`[...document.querySelectorAll('button')].some(b => b.innerText.includes(${JSON.stringify(label)}) && !b.disabled && b.getBoundingClientRect().width > 0)`)
    if (ready) return
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`${label} never became available`)
}

async function showDownloadedImage(r, file) {
  await r.call('Page.navigate', { url: `file://${file}` })
  await r.waitFor('body', 8000)
  await r.sleep(1800)
}

export const PEOPLE = {
  grace: 'Grace Mensah',
  daniel: 'Daniel Brooks',
  olivia: 'Olivia Chen',
  leo: 'Leo Martins',
  mia: 'Mia Patel',
  ben: 'Ben Okoro',
}
const PAT = 'usr_platform_pat'

async function actAs(r, state, who) {
  await r.switchTo(who === 'guest' ? null : who === 'pat' ? PAT : state.users[who])
}

/** Visible identity switch on the labelled demo identities page. */
async function switchOnCamera(r, name) {
  const origin = await r.ev('location.origin').catch(() => '')
  if (origin !== new URL(r.base).origin) await r.go('/demo-identities')
  else await r.nav('/demo-identities')
  await r.waitFor('Act as')
  await r.press(`Act as ${name.split(' ')[0]}`, { selector: 'button' })
  await r.sleep(500)
  await r.expectText('Current')
}

export const SCENES = [
  {
    id: 'fixture-people',
    record: false,
    async run(r, state) {
      await r.go('/')
      state.users = await r.app(`
        const m = await import('/src/lib/identity.ts')
        m.switchIdentity(null)
        const ids = {}
        for (const [key, name] of Object.entries(${JSON.stringify(PEOPLE)})) ids[key] = m.createDemoUser(name).id
        m.switchIdentity(null)
        return ids`)
    },
  },

  /* ───────────── Chapter 1 · Platform Admin ───────────── */
  {
    id: 'pa-identities',
    chapter: 'platform',
    async run(r) {
      await r.go('/demo-identities')
      await r.expectText('Simulated identities — not real sign-in or security')
      await r.sleep(1500)
      await r.scrollToSel('#identities-title')
      await r.sleep(800)
      await r.press('Act as Pat', { selector: 'button' })
      await r.expectText('Current')
      await r.sleep(800)
    },
  },
  {
    id: 'pa-admin',
    chapter: 'platform',
    async run(r) {
      await r.press('Platform admin', { selector: 'a' })
      await r.waitFor('Platform administration')
      await r.expectText('Supporter records and identity documents are not shown here.')
      await r.sleep(2000)
      await r.hover('select[id^="plan-org_maple"]')
      await r.sleep(1500)
      await r.scrollToSel('h2', { text: 'Platform feature availability' })
      await r.sleep(2500)
      await r.scrollBy(300)
      await r.sleep(1500)
    },
  },
  {
    id: 'pa-no-records',
    chapter: 'platform',
    async run(r) {
      await r.nav('/workspace/org_maple/overview')
      await r.waitFor('Only members of this organization')
      await r.sleep(2500)
    },
  },

  /* ───────────── Chapter 2 · Organization Admin ───────────── */
  {
    id: 'oa-plan',
    chapter: 'orgadmin',
    async run(r) {
      await switchOnCamera(r, PEOPLE.grace)
      await r.sleep(600)
      await r.nav('/plans')
      await r.waitFor('Choose a demo plan')
      await r.sleep(1500)
      await r.press('Choose this demo plan', { selector: 'button', index: 2 })
      await r.waitFor('Confirm demo subscription')
      await r.scrollToSel('#confirm-plan-title')
      await r.sleep(1500)
      await r.press('Confirm demo plan and start setup', { selector: 'button' })
      await r.waitFor('Step 1 of 5')
      await r.sleep(800)
    },
  },
  {
    id: 'oa-details',
    chapter: 'orgadmin',
    async run(r) {
      await r.fillLabel('Organization name', 'Greenwood School')
      await r.chooseLabel('Type', 'school')
      await r.fillLabel('Short description', 'A primary school of 420 pupils. Parents, staff and neighbours raise funds together for the things our classrooms need.', { delay: 12 })
      await r.fillLabel('Public contact email', 'office@greenwood.example')
      await r.fillLabel('Public location', 'Greenwood, Riverside District')
      await r.scrollToSel('.url-preview')
      await r.expectText('greenwood-school')
      await r.expectText('This address is available.')
      await r.sleep(1800)
      await r.press('Continue', { selector: 'button', exact: true })
      await r.waitFor('Step 2 of 5')
    },
  },
  {
    id: 'oa-features',
    chapter: 'orgadmin',
    async run(r) {
      await r.sleep(1200)
      await r.scrollToSel('label:has(#feature-sponsorPlay)')
      await r.sleep(800)
      await r.click('label:has(#feature-sponsorPlay)')
      await r.sleep(600)
      await r.scrollToSel('label:has(#feature-reviewApproval)')
      await r.click('label:has(#feature-reviewApproval)')
      await r.sleep(600)
      await r.scrollToSel('label:has(#feature-partnerVouchers)')
      await r.click('label:has(#feature-partnerVouchers)')
      await r.sleep(700)
      await r.click('label.voucher-capability', { text: 'Contribution rewards' })
      await r.sleep(800)
      await r.scrollToSel('label:has(#feature-shareKit)')
      await r.expectText('Create QR codes, posters, and ready-to-copy sharing messages.')
      if (!(await r.ev(`document.querySelector('#feature-shareKit').checked`))) throw new Error('The sharing kit should stay on with the recommended settings')
      await r.sleep(2200)
      await r.press('Continue', { selector: 'button', exact: true })
      await r.waitFor('Step 3 of 5')
    },
  },
  {
    id: 'oa-look',
    chapter: 'orgadmin',
    async run(r) {
      await r.fill('input[aria-label="Main colour hex value"]', '#1F5A3D')
      await r.sleep(500)
      await r.scrollToSel('.image-gallery')
      await r.click('.image-gallery .gallery-choice', { index: 1 })
      await r.sleep(800)
      await r.fillLabel('Homepage headline', 'Help Greenwood School stock every classroom', { delay: 20 })
      await r.fillLabel('Introduction', 'Notebooks, pencils, art supplies and reading books for 420 pupils. Give directly or play a short game.', { delay: 12 })
      await r.press('Customize more (optional)', { selector: 'summary' })
      await r.sleep(600)
      await r.upload(`[...document.querySelectorAll('input[type=file]')].find(i => i.closest('.field')?.innerText.includes('Logo'))`, LOGO)
      await r.scrollToSel('.field', { text: 'Logo' })
      await r.sleep(1500)
      await r.press('Fundraising preferences', { selector: 'summary' })
      await r.sleep(500)
      await r.hover('label', { text: 'Turn on the campaign creation assistant' })
      if (!(await r.ev(`[...document.querySelectorAll('label')].find(l => l.innerText.includes('Turn on the campaign creation assistant'))?.querySelector('input')?.checked`))) throw new Error('Assistant should be on by default')
      await r.sleep(1500)
      await r.press('Continue', { selector: 'button', exact: true })
      await r.waitFor('Step 4 of 5')
    },
  },
  {
    id: 'oa-review',
    chapter: 'orgadmin',
    async run(r) {
      await r.expectText('Partner vouchers: Enabled')
      await r.sleep(2500)
      await r.scrollToSel('.voucher-summary')
      await r.sleep(2000)
      await r.press('Continue', { selector: 'button', exact: true })
      await r.waitFor('Step 5 of 5')
      await r.sleep(1500)
      await r.press('Desktop', { selector: '.preview-toolbar button' })
      await r.press('Mobile', { selector: '.preview-toolbar button' })
      await r.sleep(2200)
      await r.press('Desktop', { selector: '.preview-toolbar button' })
      await r.sleep(800)
    },
  },
  {
    id: 'oa-publish',
    chapter: 'orgadmin',
    async run(r, state) {
      await r.press('Confirm simulated subscription and publish', { selector: 'button' })
      await r.waitFor('is live in this browser')
      state.orgId = await r.app(`const m = await import('/src/lib/orgStorage.ts'); return m.loadOrganizations().find(o => o.slug === 'greenwood-school')?.id`)
      if (!state.orgId) throw new Error('Greenwood School was not saved')
      await r.sleep(2500)
      await r.press('Open website', { selector: 'a' })
      await r.waitFor('Help Greenwood School stock every classroom')
      await r.sleep(2500)
      await r.scrollBy(500)
      await r.sleep(1500)
      await r.scrollTop()
    },
  },
  {
    id: 'oa-members',
    chapter: 'orgadmin',
    async run(r, state) {
      await r.press('Manage this website', { selector: 'a' })
      await r.waitFor('Get started')
      await r.sleep(1500)
      await r.press('Members', { selector: '.ws-nav a' })
      await r.waitFor('Add a member')
      await r.scrollToSel('#add-member-title')
      const form = 'section[aria-labelledby="add-member-title"]'
      await r.chooseOption(await r.fieldByLabel('Demo identity', form), PEOPLE.daniel)
      await r.chooseOption(await r.fieldByLabel('Role', form), 'Organization Admin')
      await r.press('Add member', { selector: `${form} button[type=submit]` })
      await r.waitFor(PEOPLE.daniel)
      await r.sleep(800)
      await r.scrollToSel('#add-member-title')
      await r.chooseOption(await r.fieldByLabel('Demo identity', form), PEOPLE.olivia)
      await r.chooseOption(await r.fieldByLabel('Role', form), 'Campaign Organizer')
      await r.press('Add member', { selector: `${form} button[type=submit]` })
      await r.sleep(900)
      await r.scrollTop()
      await r.scrollToSel('#members-title')
      await r.expectText(PEOPLE.olivia)
      await r.sleep(2500)
      state.membersOk = true
    },
  },
  {
    id: 'oa-offers',
    chapter: 'orgadmin',
    async run(r) {
      await r.scrollTop()
      await r.press('Partner offers', { selector: '.ws-nav a' })
      await r.waitFor('Partner stores')
      await r.sleep(1200)
      await r.fillLabel('Store name', 'Corner Stationery')
      await r.fillLabel('Area', 'Greenwood High Street')
      await r.fillLabel('Short description', 'Family-run stationery and art supplies shop near the school gates.', { delay: 10 })
      await r.press('Add partner store', { selector: 'button[type=submit]' })
      await r.waitFor('Create an offer')
      await r.sleep(1000)
      const offerForm = 'section[aria-labelledby="create-offer-title"]'
      await r.scrollToSel('#create-offer-title')
      await r.fillLabel('Offer title', '10% off school supplies', { within: offerForm })
      await r.fillLabel('Smallest qualifying contribution', '200', { within: offerForm })
      await r.fillLabel('Reward', '10% off one purchase at Corner Stationery', { within: offerForm, delay: 15 })
      await r.fillLabel('Terms', 'One use per voucher. In-store only at the High Street branch. Not exchangeable for cash.', { within: offerForm, delay: 10 })
      await r.fillLabel('Number available', '50', { within: offerForm })
      await r.press('Save offer', { selector: `${offerForm} button[type=submit]` })
      await r.waitFor('Offer saved as a draft')
      await r.scrollToSel('#offers-title')
      await r.sleep(1200)
      await r.press('Terms', { selector: '.offer-admin summary' })
      await r.sleep(1500)
      await r.press('reviewed these terms', { selector: 'button' })
      await r.waitFor('Terms marked as reviewed.')
      await r.sleep(700)
      await r.press('Activate offer', { selector: 'button' })
      await r.waitFor('Offer activated.')
      await r.sleep(1500)
    },
  },
  {
    id: 'oa-store-staff',
    chapter: 'orgadmin',
    async run(r) {
      await r.scrollToSel('.store-staff')
      await r.sleep(800)
      await r.chooseOption('.store-staff select[id^="staff-"]', PEOPLE.leo)
      await r.sleep(500)
      await r.press('Give access', { selector: '.store-staff button' })
      await r.waitFor('Store access given.')
      await r.scrollToSel('.store-staff')
      await r.expectText(`${PEOPLE.leo} · all branches`)
      await r.sleep(1200)
    },
  },
  {
    id: 'oa-kit-settings',
    chapter: 'orgadmin',
    async run(r, state) {
      await r.nav(`/workspace/${state.orgId}/features`)
      await r.waitFor('Website features')
      await r.sleep(800)
      await r.expectText('Campaign sharing kit')
      await r.scrollToSel('#feature-shareKit')
      if (!(await r.ev(`document.querySelector('#feature-shareKit').checked`))) throw new Error('Sharing kit is missing from website features')
      await r.sleep(2200)
    },
  },
  {
    id: 'fixture-past-campaign',
    record: false,
    async run(r, state) {
      const u = state.users
      state.pastCampaignId = await r.app(`
        const identity = await import('/src/lib/identity.ts')
        const orgs = await import('/src/lib/orgStorage.ts')
        const wizard = await import('/src/lib/wizard.ts')
        const actions = await import('/src/lib/featureActions.ts')
        const campaigns = await import('/src/lib/campaigns.ts')
        const members = await import('/src/lib/members.ts')
        identity.switchIdentity(${JSON.stringify(u.grace)})
        const org = orgs.loadOrganizations().find(o => o.id === ${JSON.stringify(state.orgId)})
        const form = wizard.blankForm(org)
        Object.assign(form, {
          title: 'Reading Week book drive',
          description: 'New picture books and early readers for the Reading Week library corner.',
          storyWho: 'Nursery to Year 2 pupils at Greenwood School.',
          storySupports: 'Picture books and early readers chosen by our teachers.',
          goalAmount: '20000',
          coverImageId: 'reading',
          game: false,
          direct: true,
        })
        const campaign = actions.formCampaignForOrg(form, org, { isDraft: false })
        actions.publishWithPolicy(campaign)
        const pending = campaigns.getCampaign(campaign.id)
        identity.switchIdentity(${JSON.stringify(u.daniel)})
        actions.reviewRevision(campaign.id, pending.pendingRevision.id, 'approve', 'Approved for Reading Week.')
        let n = 0
        for (const [who, rupees] of [[${JSON.stringify(u.ben)}, 6000], [null, 8500], [${JSON.stringify(u.ben)}, 5500]]) {
          identity.switchIdentity(who)
          campaigns.addContribution({ id: 'fixture-past-' + (++n), campaignId: campaign.id, amount: rupees, method: 'direct', detail: 'Direct contribution' })
        }
        identity.switchIdentity(${JSON.stringify(u.grace)})
        campaigns.closeCampaign(campaign.id)
        members.updateMember(org.id, ${JSON.stringify(u.olivia)}, { campaignIds: [campaign.id] })
        identity.switchIdentity(null)
        return campaign.id`)
    },
  },

  /* ───────────── Chapter 3 · Campaign Organizer ───────────── */
  {
    id: 'og-start',
    chapter: 'organizer',
    async run(r, state) {
      await switchOnCamera(r, PEOPLE.olivia)
      await r.press('Open workspace', { selector: 'a' })
      await r.waitFor('Your campaigns')
      await r.sleep(1500)
      await r.press('Campaigns', { selector: '.ws-nav a' })
      await r.waitFor('Reading Week book drive')
      await r.sleep(2000)
      await r.press('Create a campaign', { selector: 'a.btn, button.btn' })
      await r.waitFor('Guide me through it')
      await r.sleep(1000)
      await r.press('Guide me through it', { selector: 'a' })
      await r.waitFor('#a-purpose')
      state.olivia = true
    },
  },
  {
    id: 'og-assistant',
    chapter: 'organizer',
    async run(r) {
      await r.sleep(1200)
      await r.fill('#a-purpose', 'We want to raise ₹60,000 for school supplies for our 420 pupils: notebooks, pencils, art materials and reading books for every classroom.', { delay: 14 })
      await r.press('Continue', { selector: '.btn.btn-primary', exact: true })
      await r.waitFor('I noted a target of')
      await r.sleep(1500)
      await r.press('Suggest a setup', { selector: 'button' })
      await r.waitFor('.ai-close')
      await r.sleep(2500)
      await r.press('Continue', { selector: '.btn.btn-primary', exact: true })
      await r.fill('#a-who', 'All 420 pupils of Greenwood School, from nursery to Year 6.', { delay: 12 })
      await r.fill('#a-supports', 'Notebooks, pencils, art materials and new reading books for every classroom.', { delay: 12 })
      await r.fill('#a-next', 'Teachers order from local shops, and we post photos and receipts as supplies arrive.', { delay: 12 })
      await r.press('Continue', { selector: '.btn.btn-primary', exact: true })
      await r.fill('#a-title', 'School supplies for every Greenwood pupil')
      await r.press('Continue', { selector: '.btn.btn-primary', exact: true })
      await r.waitFor('#a-goal')
      await r.sleep(1000)
      await r.press('Continue', { selector: '.btn.btn-primary', exact: true })
      await r.sleep(500)
      await r.press('Continue', { selector: '.btn.btn-primary', exact: true })
      await r.waitFor('#a-opens')
      await r.press('Start now · 30 days', { selector: 'button.chip' })
      await r.sleep(800)
      await r.press('Continue', { selector: '.btn.btn-primary', exact: true })
      await r.waitFor('Open to everyone')
      await r.press('Continue', { selector: '.btn.btn-primary', exact: true })
      await r.waitFor('Both')
      await r.press('Continue', { selector: '.btn.btn-primary', exact: true })
      await r.waitFor('.chat-game')
      await r.click('.chat-game', { text: 'Memory Match' })
      await r.sleep(800)
      await r.press('Continue', { selector: '.btn.btn-primary', exact: true })
      await r.sleep(600)
      await r.press('Continue', { selector: '.btn.btn-primary', exact: true })
      await r.waitFor('.cover-choice')
      await r.click('.cover-choice', { text: 'School library' })
      await r.sleep(600)
      await r.press('Finish', { selector: '.btn.btn-primary', exact: true })
      await r.waitFor('Suggest draft content')
      await r.sleep(1000)
    },
  },
  {
    id: 'og-ai-suggest',
    chapter: 'organizer',
    async run(r) {
      await r.press('Suggest draft content', { selector: 'button' })
      await r.waitFor('Draft suggestions')
      await r.scrollToSel('h3', { text: 'Draft suggestions' })
      await r.sleep(2500)
      await r.scrollToSel('label', { text: 'What they need' }).catch(() => {})
      await r.sleep(1500)
      for (const title of ['Confirm needs with the school', 'Purchase materials', 'Deliver and set up', 'Share what students did']) {
        await r.click('label.check-row', { text: title })
        await r.sleep(250)
      }
      await r.press('Accept 4 milestones', { selector: 'button' })
      await r.sleep(2000)
    },
  },
  {
    id: 'og-autosave',
    chapter: 'organizer',
    async run(r) {
      await r.scrollTop()
      await r.press('Save and exit', { selector: 'button' })
      await r.sleep(1200)
      await r.nav(await r.ev('location.pathname.replace(/\\/(campaigns|assistant).*$/, "/campaigns/new")'))
      await r.waitFor('Continue your campaign draft?')
      await r.sleep(2500)
      await r.press('Continue draft', { selector: 'button, a' })
      await r.waitFor('Continuing the draft you last edited')
      await r.sleep(2000)
    },
  },
  {
    id: 'og-form',
    chapter: 'organizer',
    async run(r) {
      await r.press('Fine-tune in the full form', { selector: 'button' })
      await r.waitFor('Submit for review')
      await r.sleep(1200)
      await r.press('Goal and dates', { selector: 'button[aria-label="Back to Goal and dates"]' })
      await r.waitFor('#next-update')
      await r.scrollToSel('#next-update')
      const nextUpdate = await r.ev(`(()=>{const d=new Date(Date.now()+7*864e5); return d.toISOString().slice(0,10)})()`)
      await r.ev(`(()=>{const e=document.querySelector('#next-update'); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(e, ${JSON.stringify(nextUpdate)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}))})()`)
      await r.hover('#next-update')
      await r.sleep(2000)
      await r.press('Continue', { selector: '.btn.btn-primary', exact: true })
      await r.waitFor('Ways to contribute')
      await r.sleep(1000)
      await r.scrollToSel('.game-choice-main', { text: 'Memory Match' })
      await r.sleep(1500)
      await r.scrollToSel('h2', { text: 'Offer partner rewards or vouchers?' })
      await r.click('label', { text: 'Select eligible existing offers' })
      await r.sleep(800)
      await r.click('label', { text: '10% off school supplies' })
      await r.sleep(1500)
      await r.scrollToSel('.switch, p', { text: 'Sponsor-funded play' }).catch(() => {})
      await r.sleep(1500)
      await r.press('Continue', { selector: '.btn.btn-primary', exact: true })
      await r.waitFor('Submit for review')
      await r.sleep(1200)
    },
  },
  {
    id: 'og-submit',
    chapter: 'organizer',
    async run(r, state) {
      await r.scrollToSel('button', { text: 'Submit for review' })
      await r.sleep(800)
      await r.press('Submit for review', { selector: 'button' })
      await r.waitFor('Manage · Waiting for review')
      state.campaignId = await r.ev(`new URLSearchParams(location.search).get('pending')`)
      if (!state.campaignId) throw new Error('No pending campaign id')
      await r.sleep(1800)
      await r.press('Manage · Waiting for review', { selector: 'a' })
      await r.waitFor('Waiting for review')
      await r.expectText('An Organization Admin will review it.')
      await r.rejectText('Approve this revision and publish')
      await r.sleep(2500)
    },
  },
  {
    id: 'og-approve',
    chapter: 'organizer',
    async run(r, state) {
      await switchOnCamera(r, PEOPLE.daniel)
      await r.press('Open workspace', { selector: 'a' })
      await r.waitFor('Your campaigns')
      await r.press('Campaigns', { selector: '.ws-nav a' })
      await r.waitFor('Manage · Waiting for review')
      await r.sleep(1500)
      await r.press('Manage · Waiting for review', { selector: 'a' })
      await r.waitFor('Approve this revision and publish')
      await r.expectText(`Revision submitted by ${PEOPLE.olivia}`)
      await r.sleep(1500)
      await r.fill('#revision-note, .field textarea', 'Approved. Thank you, Olivia — please post the first update next week.', { delay: 12 }).catch(async () => {
        await r.fill('section[aria-labelledby="revision-title"] textarea', 'Approved. Thank you, Olivia — please post the first update next week.', { delay: 12 })
      })
      await r.press('Approve this revision and publish', { selector: 'button' })
      await r.sleep(1200)
      await r.rejectText('Approve this revision and publish')
      const live = await r.app(`const c = await import('/src/lib/campaigns.ts'); const x = c.getCampaign(${JSON.stringify(state.campaignId)}); return !x.isDraft && !x.pendingRevision`)
      if (!live) throw new Error('Campaign was not published by approval')
      await r.sleep(2500)
    },
  },
  {
    id: 'og-copy-link',
    chapter: 'organizer',
    async run(r) {
      await switchOnCamera(r, PEOPLE.olivia)
      await r.press('Open workspace', { selector: 'a' })
      await r.waitFor('Your campaigns')
      await r.press('Campaigns', { selector: '.ws-nav a' })
      await r.waitFor('School supplies for every Greenwood pupil')
      await r.sleep(1200)
      const row = await r.rowWith('School supplies for every Greenwood pupil')
      await r.press('Copy link', { selector: 'button', within: row })
      await r.waitFor('Link copied.')
      const copied = await r.ev('navigator.clipboard.readText()')
      if (!copied.includes('/o/greenwood-school/campaigns/')) throw new Error('Copied link is wrong: ' + copied)
      await r.sleep(1800)
      await r.press('View', { selector: 'a', within: row, exact: true })
      await r.waitFor('Support this campaign')
      await r.sleep(1800)
      await r.scrollBy(450)
      await r.sleep(800)
    },
  },
  {
    id: 'og-share-qr',
    chapter: 'organizer',
    async run(r, state) {
      await prepareDownloads(r)
      await r.scrollToSel('#campaign-share-kit')
      await openShareKit(r)
      await r.sleep(800)
      await r.waitFor('.qr-preview canvas')
      await waitEnabled(r, 'Download PNG')
      const campaignUrl = `${r.base}/o/greenwood-school/campaigns/${state.campaignId}`
      const shown = await r.ev(`document.querySelector('.share-url-text')?.textContent?.trim()`)
      if (shown !== campaignUrl) throw new Error('Sharing kit URL is not the original campaign: ' + shown)
      if (shown.includes('/r/')) throw new Error('Original campaign kit must not carry a referral code')
      await r.sleep(1200)
      await r.press('Copy link', { selector: '.share-kit-panel button' })
      await r.waitFor('Link copied.')
      await r.sleep(700)
      await r.press('Download PNG', { selector: 'button' })
      await r.waitFor('Download started.')
      const png = await waitForDownload(/-qr\.png$/)
      const decoded = decodeQrFile(png)
      if (decoded.text !== campaignUrl) throw new Error('QR decoded to ' + decoded.text)
      state.campaignUrl = campaignUrl
      await r.sleep(900)
      await r.press('Download SVG', { selector: 'button' })
      let svg
      try {
        svg = await waitForDownload(/-qr\.svg$/)
      } catch (error) {
        const names = fs.existsSync(DOWNLOADS) ? fs.readdirSync(DOWNLOADS).join(', ') : '(none)'
        const note = await r.ev(`document.body.innerText.includes('SVG') ? document.body.innerText.slice(0, 400) : ''`).catch(() => '')
        throw new Error(`${error.message}; folder: ${names}; page: ${note}`)
      }
      if (!fs.readFileSync(svg, 'utf8').includes('<svg')) throw new Error('QR SVG is not an SVG')
      await r.sleep(1200)
      await r.go(`/o/greenwood-school/campaigns/${state.campaignId}`)
      await r.waitFor('Support this campaign')
      await r.rejectText('is supporting')
      await r.sleep(1500)
    },
  },
  {
    id: 'og-share-poster',
    chapter: 'organizer',
    async run(r, state) {
      await prepareDownloads(r)
      await r.scrollToSel('#campaign-share-kit')
      await openShareKit(r)
      await r.press('Poster', { selector: '[role=tab]' })
      await waitEnabled(r, 'Download poster PNG')
      const posterCopy = await r.ev(`document.querySelector('.poster-print-sheet')?.textContent || ''`)
      if (!posterCopy.includes('Scan to support') || !posterCopy.includes(state.campaignUrl)) throw new Error('Poster layout is missing the QR caption or the campaign link')
      await r.sleep(1200)
      await r.press('Download poster PNG', { selector: 'button' })
      await r.waitFor('Download started.')
      const poster = await waitForDownload(/-poster\.png$/)
      const size = pngSize(poster)
      if (size.width !== 2480 || size.height !== 3508) throw new Error(`Poster is ${size.width}x${size.height}`)
      state.posterFile = poster
      await r.sleep(800)
      await showDownloadedImage(r, poster)
      await r.go(`/o/greenwood-school/campaigns/${state.campaignId}`)
      await r.waitFor('Support this campaign')
      await r.scrollToSel('#campaign-share-kit')
      await openShareKit(r)
      await r.press('Poster', { selector: '[role=tab]' })
      await r.sleep(600)
      await r.hover('button', { text: 'Print / Save as PDF' })
      await r.sleep(1500)
    },
  },
  {
    id: 'og-share-messages',
    chapter: 'organizer',
    async run(r, state) {
      await r.scrollToSel('#campaign-share-kit')
      await openShareKit(r)
      await r.press('WhatsApp', { selector: '[role=tab]' })
      await r.waitFor('WhatsApp message')
      const message = await r.ev(`document.querySelector('.share-kit-panel textarea').value`)
      if (!message.includes(state.campaignUrl) || message.includes('/r/')) throw new Error('WhatsApp draft has the wrong link')
      await r.sleep(1200)
      await r.press('Copy message', { selector: 'button' })
      await r.waitFor('Message copied.')
      const encoded = await r.ev(`'https://wa.me/?text=' + encodeURIComponent(document.querySelector('.share-kit-panel textarea').value)`)
      if (!encoded.startsWith('https://wa.me/?text=') || !decodeURIComponent(encoded).includes(state.campaignUrl)) throw new Error('WhatsApp link is not encoded correctly')
      await r.hover('button', { text: 'Open WhatsApp' })
      await r.sleep(1200)
      await r.press('Email', { selector: '[role=tab]' })
      await r.waitFor('Email subject')
      const subject = await r.ev(`document.querySelector('.share-kit-panel input').value`)
      const body = await r.ev(`document.querySelector('.share-kit-panel textarea').value`)
      if (!subject.startsWith('Help support ') || !body.includes(state.campaignUrl)) throw new Error('Email draft is incomplete')
      await r.sleep(1000)
      await r.press('Copy subject', { selector: 'button' })
      await r.waitFor('Subject copied.')
      await r.press('Copy body', { selector: 'button' })
      await r.waitFor('Email body copied.')
      await r.hover('button', { text: 'Open email app' })
      await r.sleep(1500)
    },
  },
  {
    id: 'og-share-social',
    chapter: 'organizer',
    async run(r, state) {
      await prepareDownloads(r)
      await r.scrollToSel('#campaign-share-kit')
      await openShareKit(r)
      await r.press('Social images', { selector: '[role=tab]' })
      await r.waitFor('Square')
      await r.sleep(600)
      await r.press('Portrait', { selector: '.social-size-picker button' })
      await r.sleep(700)
      await r.press('Story', { selector: '.social-size-picker button' })
      await r.sleep(700)
      await r.press('Square', { selector: '.social-size-picker button' })
      await waitEnabled(r, 'Download Square PNG')
      await r.sleep(800)
      await r.press('Download Square PNG', { selector: 'button' })
      await r.waitFor('Download started.')
      const image = await waitForDownload(/social-square\.png$/)
      const size = pngSize(image)
      if (size.width !== 1080 || size.height !== 1080) throw new Error(`Social image is ${size.width}x${size.height}`)
      await r.sleep(600)
      await r.press('Copy caption', { selector: 'button' })
      await r.waitFor('Caption copied.')
      const caption = await r.ev('navigator.clipboard.readText()')
      if (!caption.includes(state.campaignUrl)) throw new Error('Caption is missing the campaign link')
      await r.sleep(800)
      await showDownloadedImage(r, image)
      await r.sleep(1200)
      await r.go(`/o/greenwood-school/campaigns/${state.campaignId}`)
      await r.waitFor('Support this campaign')
    },
  },
  {
    id: 'og-kit-off',
    chapter: 'organizer',
    async run(r, state) {
      await switchOnCamera(r, PEOPLE.grace)
      await r.nav(`/workspace/${state.orgId}/features`)
      await r.waitFor('Website features')
      await r.scrollToSel('#feature-shareKit')
      await r.sleep(600)
      if (await r.ev(`document.querySelector('#feature-shareKit').checked`)) await r.click('#feature-shareKit')
      await r.sleep(500)
      await r.expectText('Copying a campaign link still works.')
      await r.hover('button.btn-primary')
      await r.ev(`[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Save changes' && !b.disabled)?.click()`)
      await new Promise((resolve) => setTimeout(resolve, 500))
      await r.ev(`[...document.querySelectorAll('button')].find(b => b.innerText.includes('Confirm and save') && !b.disabled)?.click()`)
      await new Promise((resolve) => setTimeout(resolve, 700))
      const turnedOff = await r.app(`const o = await import('/src/lib/orgStorage.ts'); return o.loadOrganizations().find(x => x.id === ${JSON.stringify(state.orgId)}).features.shareKit === false`)
      if (!turnedOff) throw new Error('Sharing kit did not turn off')
      await r.sleep(600)
      await r.go(`/o/greenwood-school/campaigns/${state.campaignId}`)
      await r.waitFor('Share campaign link')
      await r.scrollToSel('h2', { text: 'Help spread the word' })
      await r.rejectText('Open the full sharing kit')
      await r.sleep(1600)
      await r.go(`/workspace/${state.orgId}/features`)
      await r.waitFor('Website features')
      await r.scrollToSel('#feature-shareKit')
      if (!(await r.ev(`document.querySelector('#feature-shareKit').checked`))) await r.click('#feature-shareKit')
      await r.sleep(400)
      const needsSave = await r.ev(`[...document.querySelectorAll('button')].some(b => b.innerText.trim() === 'Save changes' && !b.disabled)`)
      if (needsSave) {
        await r.hover('button.btn-primary')
        await r.ev(`[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Save changes' && !b.disabled)?.click()`)
        await new Promise((resolve) => setTimeout(resolve, 500))
        await r.ev(`[...document.querySelectorAll('button')].find(b => b.innerText.includes('Confirm and save') && !b.disabled)?.click()`)
        await new Promise((resolve) => setTimeout(resolve, 700))
      }
      const turnedOn = await r.app(`const o = await import('/src/lib/orgStorage.ts'); return o.loadOrganizations().find(x => x.id === ${JSON.stringify(state.orgId)}).features.shareKit === true`)
      if (!turnedOn) throw new Error('Sharing kit was not turned back on')
      await r.sleep(800)
      await switchOnCamera(r, PEOPLE.olivia)
      await r.sleep(600)
    },
  },
  {
    id: 'og-duplicate',
    chapter: 'organizer',
    async run(r, state) {
      await r.nav(`/workspace/${state.orgId}/campaigns`)
      await r.waitFor('Reading Week book drive')
      const row = await r.rowWith('Reading Week book drive')
      await r.scrollToSel(row)
      await r.sleep(1500)
      await r.click('button[aria-label="More actions"]', { within: row })
      await r.sleep(500)
      await r.press('Reuse this campaign', { selector: '[role=menuitem]' })
      await r.waitFor('Review')
      await r.sleep(800)
      const copy = await r.app(`const c = await import('/src/lib/campaigns.ts'); const s = await import('/src/lib/storage.ts'); const store = s.loadStore(); const copies = store.campaigns.filter(x => x.id !== ${JSON.stringify(state.pastCampaignId)} && x.title.includes('Reading Week')); return copies.map(x => ({ id: x.id, isDraft: x.isDraft, contributions: store.contributions.filter(k => k.campaignId === x.id).length }))`)
      if (copy.length !== 1 || !copy[0].isDraft || copy[0].contributions !== 0) throw new Error('Duplicate is not a clean draft: ' + JSON.stringify(copy))
      state.duplicateId = copy[0].id
      await r.expectText('₹0 raised')
      await r.sleep(2500)
      await r.scrollBy(400)
      await r.sleep(1500)
    },
  },
  {
    id: 'og-milestone-update',
    chapter: 'organizer',
    async run(r, state) {
      await r.nav(`/workspace/${state.orgId}/campaigns/${state.campaignId}/milestones`)
      await r.waitFor('Delivery milestones')
      await r.sleep(1000)
      await r.press('Edit', { selector: 'button', exact: true })
      await r.waitFor('Edit milestone')
      await r.chooseOption(await r.fieldByLabel('Status'), 'omplete')
      await r.fillLabel('Progress note', 'Teachers confirmed the supply list for all 14 classrooms.', { delay: 14 })
      await r.press('Save milestone', { selector: 'button' })
      await r.sleep(1500)
      await r.press('Updates', { selector: '[role=tab], nav a, a' , exact: true })
      await r.waitFor('Post an update')
      await r.press('Post an update', { selector: 'button.btn-primary' })
      await r.waitFor('New update')
      await r.fillLabel('Title', 'Our supply list is ready', { delay: 18 })
      await r.fillLabel('Story', 'Teachers have confirmed what every classroom needs: 840 notebooks, 1,200 pencils, art materials and 60 new reading books. We will order from local shops as contributions arrive and post receipts here.', { delay: 6 })
      await r.chooseOption(await r.fieldByLabel('Related milestone'), 'Confirm needs')
      await r.press('Publish update', { selector: 'button' })
      await r.sleep(1500)
      await r.expectText('Our supply list is ready')
      await r.sleep(2000)
    },
  },
  /* Opening preview (game part). Recorded while the campaign is open; the assembly puts it first. */
  {
    id: 'op-game',
    chapter: 'opening',
    async before(r, state) {
      await r.switchTo(null)
      await r.go(`/o/greenwood-school/campaigns/${state.campaignId}`)
      await r.waitFor('Support this campaign')
    },
    async run(r) {
      await r.scrollToSel('h2', { text: 'Support this campaign' })
      await r.press('Play a game', { selector: '[role=tab], button', exact: true })
      await r.sleep(900)
      await r.press('Start playing', { selector: 'a, button' })
      await r.waitFor('.mem-card')
      await r.sleep(800)
      if (await r.ev(`!!document.querySelector('.game-intro .btn-primary')`)) { await r.click('.game-intro .btn-primary'); await r.sleep(800) }
      const faces = await r.ev(`[...document.querySelectorAll('.mem-card')].map(c => c.querySelector('.mem-face').style.backgroundImage)`)
      const other = faces.findIndex((face) => face !== faces[0])
      await r.click('.mem-card', { index: 0 })
      await r.sleep(500)
      await r.click('.mem-card', { index: other })
      await r.sleep(2500)
    },
  },
  /* ───────────── Chapter 4 · Supporter ───────────── */
  {
    id: 'sp-home',
    chapter: 'supporter',
    async run(r, state) {
      await switchOnCamera(r, PEOPLE.mia)
      await r.sleep(500)
      await r.go('/o/greenwood-school')
      await r.waitFor('Help Greenwood School stock every classroom')
      await r.rejectText('Organizer tools')
      await r.sleep(2500)
      await r.scrollToSel('h2', { text: 'Campaigns' })
      await r.sleep(2000)
      await r.click('a', { text: 'School supplies for every Greenwood pupil' })
      await r.waitFor('Support this campaign')
      await r.sleep(1500)
      state.supporter = true
    },
  },
  {
    id: 'sp-trust',
    chapter: 'supporter',
    async run(r) {
      await r.scrollBy(380)
      await r.sleep(2000)
      await r.press('Updates', { selector: '[role=tab], button', exact: true })
      await r.sleep(1200)
      await r.expectText('Our supply list is ready')
      await r.sleep(1800)
      await r.press('How funds are used', { selector: '[role=tab], button', exact: true })
      await r.sleep(2500)
      await r.scrollToSel('h2', { text: 'Partner offers' })
      await r.sleep(2500)
    },
  },
  {
    id: 'sp-direct',
    chapter: 'supporter',
    async run(r) {
      await r.scrollToSel('h2', { text: 'Support this campaign' })
      await r.press('Give directly', { selector: '[role=tab], button', exact: true }).catch(() => {})
      await r.sleep(800)
      await r.press('₹250', { selector: 'button.amount-choice' })
      await r.sleep(900)
      await r.press('₹500', { selector: 'button.amount-choice' })
      await r.sleep(900)
      await r.press('Continue to review', { selector: 'button, a' })
      await r.waitFor('Confirm your contribution')
      await r.expectText('No payment will be collected.')
      await r.sleep(2500)
      await r.press('Confirm simulated contribution', { selector: 'button' })
      await r.waitFor('Thank you for supporting')
      await r.expectText('simulated contribution')
      await r.sleep(2500)
    },
  },
  {
    id: 'sp-reward',
    chapter: 'supporter',
    async run(r) {
      await r.scrollToSel('h2', { text: 'Your partner reward' })
      await r.sleep(1500)
      await r.press('Claim reward', { selector: 'button' })
      await r.sleep(600)
      await r.moveTo(1250, 700)
      await r.waitFor('Open My vouchers')
      await r.scrollToSel('h2', { text: 'Your partner reward' })
      await r.sleep(2500)
    },
  },
  {
    id: 'sp-game',
    chapter: 'supporter',
    async run(r, state) {
      await r.nav(`/o/greenwood-school/campaigns/${state.campaignId}`)
      await r.waitFor('Support this campaign')
      await r.scrollToSel('h2', { text: 'Support this campaign' })
      await r.press('Play a game', { selector: '[role=tab], button', exact: true })
      await r.sleep(1000)
      await r.press('Start playing', { selector: 'a, button' })
      await r.waitFor('.mem-card')
      await r.sleep(800)
      if (await r.ev(`!!document.querySelector('.game-intro .btn-primary')`)) { await r.click('.game-intro .btn-primary'); await r.sleep(800) }
      const faces = await r.ev(`[...document.querySelectorAll('.mem-card')].map(c => c.querySelector('.mem-face').style.backgroundImage)`)
      const seen = new Set()
      let pairs = 0
      for (let i = 0; i < faces.length && pairs < 3; i += 1) {
        if (seen.has(faces[i])) continue
        seen.add(faces[i])
        const j = faces.indexOf(faces[i], i + 1)
        if (pairs > 0) { await r.press('Keep playing', { selector: 'button' }); await r.sleep(500) }
        await r.click('.mem-card', { index: i })
        await r.sleep(350)
        await r.click('.mem-card', { index: j })
        await r.waitFor('Keep playing', 8000)
        await r.sleep(1200)
        pairs += 1
      }
      await r.waitFor('3 matched pairs')
      await r.sleep(1500)
    },
  },
  {
    id: 'sp-game-confirm',
    chapter: 'supporter',
    async run(r) {
      await r.fillLabel('Your final amount', '200', { within: '.gc-modal, [role=dialog], body' })
      await r.sleep(1200)
      await r.press('Review & contribute — ₹200', { selector: 'button' })
      await r.waitFor('Review your contribution')
      await r.expectText('Final chosen amount')
      await r.sleep(1500)
      await r.scrollBy(250)
      await r.sleep(1500)
      await r.press('Confirm simulated contribution', { selector: 'button' })
      await r.waitFor('Thank you for supporting')
      await r.sleep(1500)
      await r.scrollToSel('.progress, [class*=progress]').catch(() => {})
      await r.expectText('₹700 of ₹60,000')
      await r.sleep(2500)
    },
  },
  {
    id: 'sp-share',
    chapter: 'supporter',
    async run(r, state) {
      await r.nav(`/o/greenwood-school/campaigns/${state.campaignId}`)
      await r.waitFor('Help spread the word')
      await r.expectText('₹700')
      await r.scrollToSel('h2', { text: 'Help spread the word' })
      await r.sleep(1200)
      await r.press('Create my sharing page', { selector: 'a, button' })
      await r.waitFor('Your display name')
      await r.fillLabel('Your display name', 'Mia Patel')
      await r.fillLabel('Short personal headline', 'Help me fill Year 3’s pencil pots', { delay: 18 })
      await r.fillLabel('Why I support this campaign', 'My daughter is in Year 3. Every classroom deserves full shelves and sharp pencils.', { delay: 10 })
      await r.fillLabel('My sharing goal', '5000')
      await prepareDownloads(r)
      await r.press('Create my sharing page', { selector: 'button.btn-primary' })
      await r.waitFor('My sharing kit')
      state.referralUrl = (await r.ev(`document.querySelector('.share-link-card code')?.textContent || ''`)).trim()
      const campaignUrl = `${r.base}/o/greenwood-school/campaigns/${state.campaignId}`
      if (!state.referralUrl.includes('/r/') || !state.referralUrl.startsWith(campaignUrl)) throw new Error('Personal link is wrong: ' + state.referralUrl)
      await r.sleep(1000)
      await openShareKit(r)
      await r.waitFor('.qr-preview canvas')
      const kitUrl = (await r.ev(`document.querySelector('.share-url-text')?.textContent || ''`)).trim()
      if (kitUrl !== state.referralUrl) throw new Error('Kit URL does not match the personal link')
      await r.sleep(900)
      await r.press('Download PNG', { selector: 'button' })
      await r.waitFor('Download started.')
      const qr = await waitForDownload(/mia-patel-qr\.png$/)
      const decoded = decodeQrFile(qr)
      if (decoded.text !== state.referralUrl) throw new Error('Personal QR decoded to ' + decoded.text)
      await r.sleep(700)
      await r.press('Poster', { selector: '[role=tab]' })
      await waitEnabled(r, 'Download poster PNG')
      const posterText = await r.ev(`document.querySelector('.poster-print-sheet')?.textContent || ''`)
      if (!posterText.includes('Mia Patel is supporting this campaign') || !posterText.includes(state.referralUrl)) throw new Error('Personal poster is missing Mia or her link')
      await r.press('Copy poster text', { selector: 'button' })
      await r.waitFor('Poster text copied.')
      await r.sleep(600)
      await r.press('Social images', { selector: '[role=tab]' })
      await waitEnabled(r, 'Download Square PNG')
      await r.press('Copy caption', { selector: 'button' })
      await r.waitFor('Caption copied.')
      const caption = await r.ev('navigator.clipboard.readText()')
      if (!caption.includes(state.referralUrl)) throw new Error('Personal caption is missing the referral link')
      await r.sleep(1500)
    },
  },
  {
    id: 'sp-referral-gift',
    chapter: 'supporter',
    async run(r, state) {
      await switchOnCamera(r, PEOPLE.ben)
      await r.go(state.referralUrl.replace(r.base, ''))
      await r.waitFor('Mia Patel', 15000)
      await r.expectText('personal introduction')
      await r.sleep(1200)
      await r.scrollToSel('h2', { text: 'Support this campaign' })
      await r.press('₹100', { selector: 'button.amount-choice' })
      await r.sleep(700)
      await r.press('Continue to review', { selector: 'button, a' })
      await r.waitFor('Confirm your contribution')
      await r.expectText('No payment will be collected.')
      await r.sleep(1000)
      await r.press('Confirm simulated contribution', { selector: 'button' })
      await r.waitFor('Thank you for supporting')
      await r.expectText('₹800 of ₹60,000')
      const credit = await r.app(`
        const s = await import('/src/lib/storage.ts')
        const referrals = await import('/src/lib/referrals.ts')
        const campaigns = await import('/src/lib/campaigns.ts')
        const store = s.loadStore()
        const referral = store.referrals.find(item => item.campaignId === ${JSON.stringify(state.campaignId)} && item.displayName === 'Mia Patel')
        const credited = referrals.referralTotals(referral, store.contributions)
        return { raised: campaigns.raisedOf(${JSON.stringify(state.campaignId)}, store.contributions), credited: credited.amount, count: credited.count }
      `)
      if (credit.raised !== 800 || credit.credited !== 100 || credit.count !== 1) throw new Error('Referral attribution is wrong: ' + JSON.stringify(credit))
      await r.sleep(1800)
      await switchOnCamera(r, PEOPLE.mia)
      await r.sleep(600)
    },
  },
  {
    id: 'sp-vouchers',
    chapter: 'supporter',
    async run(r, state) {
      await r.nav('/o/greenwood-school/my-vouchers')
      await r.waitFor('10% off school supplies')
      state.voucherCode = await r.app(`const v = await import('/src/lib/vouchers.ts'); const s = v.loadVoucherStore ? v.loadVoucherStore() : null; return JSON.stringify(s ? s.vouchers.map(x => x.code) : [])`).catch(() => null)
      await r.sleep(3000)
      await r.nav('/o/greenwood-school/my-history')
      await r.sleep(1200)
      await r.expectText('School supplies for every Greenwood pupil')
      await r.sleep(3000)
    },
  },
  {
    id: 'sp-lowdata',
    chapter: 'supporter',
    async run(r, state) {
      await r.press('Home', { selector: '.oh-nav a', exact: true })
      await r.waitFor('Help Greenwood School stock every classroom')
      await r.sleep(1500)
      await r.click('label', { text: 'Low-data page' })
      await r.sleep(800)
      if (!(await r.ev(`document.documentElement.classList.contains('low-data')`))) throw new Error('Low-data mode did not turn on')
      await r.sleep(2500)
      await r.scrollBy(400)
      await r.sleep(1500)
      await r.scrollTop()
      await r.click('label', { text: 'Low-data page' })
      await r.sleep(1200)
    },
  },
  /* ───────────── Chapter 5 · Merchant ───────────── */
  {
    id: 'mc-portal',
    chapter: 'merchant',
    async run(r, state) {
      state.voucherCode = await r.app(`const v = await import('/src/lib/vouchers.ts'); const s = v.loadVoucherStore(); return s.vouchers.find(x => x.title === '10% off school supplies').code`)
      await r.go('/demo-identities')
      await switchOnCamera(r, PEOPLE.leo)
      await r.press('Merchant portal', { selector: 'a' })
      await r.waitFor('Redeem a voucher')
      await r.expectText('Corner Stationery (Greenwood High Street)')
      await r.sleep(3000)
    },
  },
  {
    id: 'mc-invalid',
    chapter: 'merchant',
    async run(r) {
      await r.fill('#voucher-code', 'GGL-0000-0000', { delay: 60 })
      await r.press('Look up', { selector: 'button' })
      await r.sleep(1200)
      await r.waitFor('[role=alert]')
      await r.sleep(2500)
    },
  },
  {
    id: 'mc-redeem',
    chapter: 'merchant',
    async run(r, state) {
      await r.fill('#voucher-code', state.voucherCode, { delay: 70 })
      await r.press('Look up', { selector: 'button' })
      await r.waitFor('Confirm simulated redemption')
      await r.expectText('Valid')
      await r.sleep(1500)
      await r.press('Terms', { selector: 'summary' })
      await r.sleep(1800)
      await r.chooseOption('.offer-admin select', 'Greenwood High Street')
      await r.sleep(800)
      await r.press('Confirm simulated redemption', { selector: 'button' })
      await r.sleep(1500)
      await r.scrollToSel('#history-title')
      await r.expectText(state.voucherCode)
      await r.sleep(2500)
    },
  },
  {
    id: 'mc-repeat',
    chapter: 'merchant',
    async run(r, state) {
      await r.scrollTop()
      await r.fill('#voucher-code', state.voucherCode, { delay: 50 })
      await r.press('Look up', { selector: 'button' })
      await r.sleep(1200)
      await r.expectText('Used')
      await r.rejectText('Confirm simulated redemption')
      const blocked = await r.app(`const v = await import('/src/lib/vouchers.ts'); const b = (await import('/src/lib/vouchers.ts')); try { const store = v.loadVoucherStore(); const voucher = store.vouchers.find(x => x.code === ${JSON.stringify(state.voucherCode)}); v.merchantRedeem(voucher.code, store.merchants.find(m => m.id === voucher.merchantId).branches[0].id); return 'allowed' } catch (e) { return e.message }`)
      if (blocked === 'allowed') throw new Error('A second redemption was allowed')
      state.repeatMessage = blocked
      await r.sleep(3000)
    },
  },
  {
    id: 'fixture-more-support',
    record: false,
    async run(r, state) {
      const u = state.users
      state.raisedAfterFixture = await r.app(`
        const identity = await import('/src/lib/identity.ts')
        const campaigns = await import('/src/lib/campaigns.ts')
        const s = await import('/src/lib/storage.ts')
        const id = ${JSON.stringify(state.campaignId)}
        const supporters = [null, ${JSON.stringify(u.ben)}, null, null, ${JSON.stringify(u.daniel)}, null, null, null]
        const amounts = [5000, 2500, 1000, 3000, 2000, 1500, 4000, 2500, 1000, 5000, 3000, 2000, 1500, 2500, 5000, 3000, 2000, 1000, 4000, 2500, 1500, 1000, 3000, 2000]
        let total = s.loadStore().contributions.filter(c => c.campaignId === id).reduce((n, c) => n + c.amount, 0)
        const want = 61200
        let n = 0
        for (const rupees of amounts) {
          if (total + rupees > want) break
          identity.switchIdentity(supporters[n % supporters.length])
          campaigns.addContribution({ id: 'fixture-more-' + (++n), campaignId: id, amount: rupees, method: 'direct', detail: 'Direct contribution' })
          total += rupees
        }
        if (want > total) { identity.switchIdentity(null); campaigns.addContribution({ id: 'fixture-more-' + (++n), campaignId: id, amount: want - total, method: 'direct', detail: 'Direct contribution' }); total = want }
        identity.switchIdentity(null)
        return total`)
      if (state.raisedAfterFixture !== 61200) throw new Error('Unexpected total ' + state.raisedAfterFixture)
    },
  },

  /* ───────────── Chapter 6 · Delivery and reporting ───────────── */
  {
    id: 'fn-expense',
    chapter: 'final',
    async run(r, state) {
      await switchOnCamera(r, PEOPLE.olivia)
      await r.press('Open workspace', { selector: 'a' })
      await r.waitFor('Your campaigns')
      await r.nav(`/workspace/${state.orgId}/campaigns/${state.campaignId}`)
      await r.waitFor('Expenses')
      await r.sleep(1500)
      await r.press('Expenses', { selector: '[role=tab], nav a, a', exact: true })
      await r.waitFor('Add an expense')
      await r.sleep(1000)
      await r.press('Add an expense', { selector: 'button.btn-primary' })
      await r.waitFor('Publish expense')
      const form = 'section[aria-label="New expense"]'
      await r.fillLabel('Description', 'Notebooks, pencils and art materials — first order', { within: form, delay: 14 })
      await r.chooseLabel('Category', 'materials', form)
      await r.fillLabel('Amount', '18400', { within: form })
      await r.fillLabel('Vendor', 'Corner Stationery', { within: form })
      await r.chooseOption(await r.fieldByLabel('Related milestone', form), 'Purchase materials')
      await r.fillLabel('Public note', '840 notebooks and 1,200 pencils for all 14 classrooms.', { within: form, delay: 12 })
      await r.press('Publish expense', { selector: 'button' })
      await r.waitFor('Expense published as organizer-reported spending.')
      await r.scrollTop()
      await r.sleep(2500)
    },
  },
  {
    id: 'fn-milestone',
    chapter: 'final',
    async run(r, state) {
      await r.press('Milestones', { selector: '[role=tab], nav a, a', exact: true })
      await r.waitFor('Delivery milestones')
      await r.sleep(1000)
      const index = await r.ev(`(()=>{ const btns=[...document.querySelectorAll('button')].filter(b=>b.innerText.trim()==='Edit' && b.getBoundingClientRect().width>0); return btns.findIndex(b=>{ let p=b; for(let i=0;i<6&&p;i++){ if(p.innerText && p.innerText.includes('Purchase materials') && !p.innerText.includes('Confirm needs')) return true; p=p.parentElement } return false }) })()`)
      if (index < 0) throw new Error('No Edit button for Purchase materials')
      await r.click('button', { text: 'Edit', exact: true, index })
      await r.waitFor('Edit milestone')
      await r.chooseOption(await r.fieldByLabel('Status'), 'In progress')
      await r.fillLabel('Progress note', 'Notebooks and pencils delivered. Art materials and reading books are on order.', { delay: 12 })
      await r.press('Save milestone', { selector: 'button' })
      await r.sleep(1500)
      const ms = await r.app(`const s = await import('/src/lib/storage.ts'); return s.loadStore().milestones.filter(m => m.campaignId === ${JSON.stringify(state.campaignId)} && m.title === 'Purchase materials').map(m => m.status)`)
      if (!ms.includes('in_progress')) throw new Error('Milestone not in progress: ' + JSON.stringify(ms))
      await r.scrollToSel('h2', { text: 'Delivery milestones' }).catch(() => {})
      await r.sleep(2500)
    },
  },
  {
    id: 'fn-report',
    chapter: 'final',
    async run(r, state) {
      await switchOnCamera(r, PEOPLE.grace)
      await r.press('Open workspace', { selector: 'a' })
      await r.waitFor('Your campaigns')
      await r.nav(`/workspace/${state.orgId}/campaigns/${state.campaignId}/report`)
      await r.waitFor('Unfinished milestones')
      await r.sleep(3000)
      await r.press('Draft final report', { selector: 'button' })
      await r.waitFor('Outcomes you want to report')
      await r.fill('textarea[placeholder="What was actually delivered, in your words."]', 'Notebooks and pencils have reached all 14 classrooms. Art materials and reading books are still on order.', { delay: 10 })
      await r.press('Draft report', { selector: 'button', exact: true })
      await r.waitFor('Apply to report editor', 10000)
      await r.scrollToSel('.report-preview')
      await r.sleep(2500)
      await r.scrollToSel('.ai-footnote').catch(() => {})
      await r.sleep(1500)
      await r.press('Apply to report editor', { selector: 'button' })
      await r.waitFor('Draft applied to the report editor')
      await r.sleep(1200)
      await r.fillLabel('Remaining funds and the plan for them', 'The remaining funds will pay for the art materials and reading books on order. Receipts will be posted here.', { delay: 8 })
      await r.press('Save draft', { selector: 'button', exact: true })
      await r.waitFor('Final report saved as a draft. It is not public.')
      await r.scrollToSel('[role=status]')
      await r.sleep(2500)
      const report = await r.app(`const c = await import('/src/lib/campaigns.ts'); return c.getCampaign(${JSON.stringify(state.campaignId)}).finalReport?.status`)
      if (report !== 'draft') throw new Error('Final report should be a draft, got ' + report)
    },
  },
  {
    id: 'fn-export',
    chapter: 'final',
    async run(r, state) {
      fs.rmSync(DOWNLOADS, { recursive: true, force: true })
      fs.mkdirSync(DOWNLOADS, { recursive: true })
      await r.browserCall('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS })
      await r.press('Campaigns', { selector: '.ws-nav a' })
      await r.waitFor('Export campaign records')
      await r.sleep(1500)
      await r.press('Export campaign records', { selector: 'button' })
      const file = path.join(DOWNLOADS, 'greenwood-school-records.json')
      for (let i = 0; i < 40 && !fs.existsSync(file); i += 1) await new Promise((done) => setTimeout(done, 150))
      if (!fs.existsSync(file)) throw new Error('Export did not download')
      const data = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (!data.note.includes('Supporter profiles are not included') || JSON.stringify(data).includes('supporterId')) throw new Error('Export content is not as expected')
      state.exportCounts = { campaigns: data.campaigns.length, contributions: data.contributions.length, expenses: data.expenses.length }
      await r.sleep(2500)
    },
  },
  {
    id: 'fn-public',
    chapter: 'final',
    async before(r, state) {
      await r.switchTo(null)
      await r.go(`/o/greenwood-school/campaigns/${state.campaignId}`)
      await r.waitFor('Support this campaign').catch(() => r.waitFor('Goal reached'))
    },
    async run(r) {
      await r.expectText('₹61,200 of ₹60,000')
      await r.sleep(2500)
      await r.scrollToSel('.section-tabs')
      await r.press('Updates', { selector: '[role=tab]', exact: true })
      await r.waitFor('Delivery progress')
      await r.scrollToSel('h3', { text: 'Delivery progress' })
      await r.expectText('Reaching the fundraising goal does not mean delivery is complete.')
      await r.expectText('1 of 4 milestones reported complete')
      await r.sleep(3500)
      await r.scrollToSel('.section-tabs')
      await r.press('How funds are used', { selector: '[role=tab]', exact: true })
      await r.waitFor('Organizer-reported expenses')
      await r.sleep(2500)
      await r.scrollToSel('h3', { text: 'Organizer-reported expenses' })
      await r.sleep(2500)
    },
  },

  /* Opening preview (website, partner reward, progress). Recorded last; the assembly puts it first. */
  {
    id: 'op-home',
    chapter: 'opening',
    async before(r) {
      await r.switchTo(null)
      await r.go('/o/greenwood-school')
      await r.waitFor('Help Greenwood School stock every classroom')
    },
    async run(r) {
      await r.sleep(3000)
      await r.scrollBy(450, 1400)
      await r.sleep(2000)
    },
  },
  {
    id: 'op-offer',
    chapter: 'opening',
    async before(r, state) {
      await r.go(`/o/greenwood-school/campaigns/${state.campaignId}`)
      await r.waitFor('Partner offers')
    },
    async run(r) {
      await r.sleep(1500)
      await r.scrollToSel('h2', { text: 'Partner offers' })
      await r.sleep(3000)
    },
  },
  {
    id: 'op-update',
    chapter: 'opening',
    async run(r) {
      await r.scrollToSel('.section-tabs')
      await r.press('Updates', { selector: '[role=tab]', exact: true })
      await r.waitFor('Our supply list is ready')
      await r.sleep(1200)
      await r.scrollToSel('h3', { text: 'Updates' })
      await r.sleep(3000)
    },
  },
  ...(process.env.PROBE ? [{ id: "probe", record: false, async run(r, state) { const steps = (await import(process.env.PROBE)).default; await steps(r, state, PEOPLE) } }] : []),
]
