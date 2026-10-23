/**
 * Greenwood sales-demo values for the on-page "Fill demo values" control.
 * Fills empty fields and a few scripted choices. It never submits a form.
 */

export type DemoContext = {
  id: string
  label: string
  aria: string
  placeholder: string
  type: string
  pathname: string
  section: string
  nearbyTitle: string
  inStoreForm: boolean
  memberNames: string[]
  identityNames: string[]
}

export const DEMO_GREEN = '#1F5A3D'

const SALES_IDENTITIES = ['Grace Mensah', 'Daniel Brooks', 'Olivia Chen', 'Leo Martins', 'Mia Patel', 'Ben Okoro']

const MILESTONES = ['Confirm needs with the school', 'Purchase materials', 'Deliver and set up', 'Share what students did']

const PURPOSE = 'We want to raise $60,000 for school supplies for our 420 pupils: notebooks, pencils, art materials and reading books for every classroom.'
const WHO = 'All 420 pupils of Greenwood School, from nursery to Year 6.'
const SUPPORTS = 'Notebooks, pencils, art materials and new reading books for every classroom.'
const NEXT = 'Teachers order from local shops, and we post photos and receipts as supplies arrive.'
const CAMPAIGN_TITLE = 'School supplies for every Greenwood pupil'
const ORG_ABOUT = 'A primary school of 420 pupils. Parents, staff and neighbours raise funds together for the things our classrooms need.'
const STORE_ABOUT = 'Family-run stationery and art supplies shop near the school gates.'
const UPDATE_STORY = 'Teachers have confirmed what every classroom needs: 840 notebooks, 1,200 pencils, art materials and 60 new reading books. We will order from local shops as contributions arrive and post receipts here.'
const EXPENSE_DESCRIPTION = 'Notebooks, pencils and art materials — first order'
const PUBLIC_NOTE = '840 notebooks and 1,200 pencils for all 14 classrooms.'
const PROGRESS_CONFIRM = 'Teachers confirmed the supply list for all 14 classrooms.'
const PROGRESS_PURCHASE = 'Notebooks and pencils delivered. Art materials and reading books are on order.'
const OUTCOMES = 'Notebooks and pencils have reached all 14 classrooms. Art materials and reading books are still on order.'
const REMAINING = 'The remaining funds will pay for the art materials and reading books on order. Receipts will be posted here.'
const APPROVAL = 'Approved. Thank you, Olivia — please post the first update next week.'

const SIMPLE: Record<string, string> = {
  'organization name': 'Greenwood School',
  'public contact email': 'office@greenwood.example',
  'public location': 'Greenwood, Riverside District',
  'homepage headline': 'Help Greenwood School stock every classroom',
  introduction: 'Notebooks, pencils, art supplies and reading books for 420 pupils. Give directly or play a short game.',
  'store name': 'Corner Stationery',
  area: 'Greenwood High Street',
  'offer title': '10% off school supplies',
  'smallest qualifying contribution': '200',
  reward: '10% off one purchase at Corner Stationery',
  terms: 'One use per voucher. In-store only at the High Street branch. Not exchangeable for cash.',
  'number available': '50',
  'sponsor name': 'Northwind Stationery (fictional)',
  'pledged budget': '5000',
  'cap per person': '500',
  'reward for each of 3 matched pairs': '50',
  'your display name': 'Mia Patel',
  'short personal headline': 'Help me fill Year 3’s pencil pots',
  'why i support this campaign': 'My daughter is in Year 3. Every classroom deserves full shelves and sharp pencils.',
  'my sharing goal': '5000',
  'campaign title': CAMPAIGN_TITLE,
  'campaign name': CAMPAIGN_TITLE,
  'what are you raising money for?': PURPOSE,
  'who will benefit?': WHO,
  'what contributions will pay for': SUPPORTS,
  'what contributions will support': SUPPORTS,
  'what happens next': NEXT,
  'what they need': SUPPORTS,
  'short opening summary': PURPOSE,
  'organizer name': 'Olivia Chen',
  'organizer name shown to supporters': 'Olivia Chen',
  'how much do you want to raise?': '60000',
  'when will you post the next update?': 'date+7',
  'note for the author': APPROVAL,
  story: UPDATE_STORY,
  'public note': PUBLIC_NOTE,
  vendor: 'Corner Stationery',
  description: EXPENSE_DESCRIPTION,
  'outcomes reported by the organizer': OUTCOMES,
  'remaining funds and the plan for them': REMAINING,
  'enter an amount': '500',
  'your final amount': '200',
  'your contribution': '200',
}

const BY_ID: Record<string, string> = {
  'a-purpose': PURPOSE,
  purpose: PURPOSE,
  'a-who': WHO,
  'story-who': WHO,
  'a-supports': SUPPORTS,
  'story-supports': SUPPORTS,
  'a-next': NEXT,
  'story-next': NEXT,
  'a-title': CAMPAIGN_TITLE,
  title: CAMPAIGN_TITLE,
  'a-goal': '60000',
  goal: '60000',
  'a-organizer': 'Olivia Chen',
  organizer: 'Olivia Chen',
  'next-update': 'date+7',
  'custom-amount': '500',
  'gt-amount': '200',
  'wm-amount': '200',
  'voucher-code': 'GGL-0000-0000',
}

const FEATURES_ON = new Set(['feature-sponsorPlay', 'feature-reviewApproval', 'feature-partnerVouchers', 'feature-shareKit', 'feature-updateCommitments'])

export function cleanLabel(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\boptional\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function daysFromToday(days: number, now = new Date()): string {
  const copy = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  copy.setDate(copy.getDate() + days)
  const month = String(copy.getMonth() + 1).padStart(2, '0')
  const day = String(copy.getDate()).padStart(2, '0')
  return `${copy.getFullYear()}-${month}-${day}`
}

function resolveToken(value: string, now: Date): string {
  if (value === 'date+0') return daysFromToday(0, now)
  if (value === 'date+7') return daysFromToday(7, now)
  if (value === 'date+30') return daysFromToday(30, now)
  if (value === 'date+90') return daysFromToday(90, now)
  return value
}

function nextIdentity(existing: string[]): string | null {
  return SALES_IDENTITIES.find((name) => !existing.includes(name)) ?? null
}

function nextMember(existing: string[]): string | null {
  if (!existing.includes('Daniel Brooks')) return 'Daniel Brooks'
  if (!existing.includes('Olivia Chen')) return 'Olivia Chen'
  return null
}

function isMainColour(ctx: DemoContext): boolean {
  const text = `${ctx.aria} ${ctx.label}`.toLowerCase()
  return text.includes('main colour') && !text.includes('accent') && !text.includes('background')
}

/** Text to write into an empty field, or a forced Greenwood colour. Null means leave the field alone. */
export function demoTextFor(ctx: DemoContext, now = new Date()): { value: string; overwrite: boolean } | null {
  const aria = ctx.aria.toLowerCase()
  if (/^remove\b/.test(aria) || aria.startsWith('amount to redeem') || aria.startsWith('cancellation reason') || aria === 'new suggested amount' || aria === 'new branch name') return null

  const milestoneTitle = aria.match(/^milestone (\d+) title$/)
  if (milestoneTitle) {
    const title = MILESTONES[Number(milestoneTitle[1]) - 1]
    return title ? { value: title, overwrite: false } : null
  }
  const milestoneDate = aria.match(/^milestone (\d+) expected date$/)
  if (milestoneDate) {
    const offsets = [14, 30, 45, 60]
    const offset = offsets[Number(milestoneDate[1]) - 1]
    return offset ? { value: daysFromToday(offset, now), overwrite: false } : null
  }

  if (ctx.id === 'new-identity') {
    const name = nextIdentity(ctx.identityNames)
    return name ? { value: name, overwrite: false } : null
  }

  if (isMainColour(ctx)) return { value: DEMO_GREEN, overwrite: true }

  if (ctx.placeholder.toLowerCase().includes('what was actually delivered')) return { value: OUTCOMES, overwrite: false }

  const fromId = BY_ID[ctx.id]
  if (fromId && ctx.id !== 'title') return { value: resolveToken(fromId, now), overwrite: false }

  const label = ctx.label.toLowerCase()
  if (label === 'name' && (ctx.section.toLowerCase().includes('add a member') || ctx.pathname.includes('/members'))) {
    const name = nextMember(ctx.memberNames)
    return name ? { value: name, overwrite: false } : null
  }
  if (label === 'short description') {
    return { value: ctx.inStoreForm || ctx.pathname.includes('/offers') ? STORE_ABOUT : ORG_ABOUT, overwrite: false }
  }
  if (label === 'title' || ctx.id === 'title') {
    if (ctx.section.toLowerCase().includes('update')) return { value: 'Our supply list is ready', overwrite: false }
    if (ctx.id === 'a-title' || ctx.id === 'title' || label === 'campaign title') return { value: CAMPAIGN_TITLE, overwrite: false }
    return null
  }
  if (label === 'description' || label === 'amount' || label.startsWith('amount (')) {
    const expense = ctx.section.toLowerCase().includes('expense')
    if (!expense) return null
    if (label === 'description') return { value: EXPENSE_DESCRIPTION, overwrite: false }
    return { value: '18400', overwrite: false }
  }
  if (label === 'progress note') {
    const where = `${ctx.nearbyTitle} ${ctx.section}`.toLowerCase()
    if (where.includes('purchase')) return { value: PROGRESS_PURCHASE, overwrite: false }
    if (where.includes('confirm')) return { value: PROGRESS_CONFIRM, overwrite: false }
    return null
  }
  if (label === 'valid until') return { value: daysFromToday(90, now), overwrite: false }
  if (label === 'expense date') return { value: daysFromToday(0, now), overwrite: false }
  if ((label === 'vendor' || label === 'public note') && !ctx.section.toLowerCase().includes('expense')) return null

  const simple = SIMPLE[label]
  if (!simple) return null
  return { value: resolveToken(simple, now), overwrite: false }
}

/** Option labels to prefer, in order. Overwrite is for controls whose default is not a blank placeholder. */
export function demoSelectFor(ctx: DemoContext): { queries: string[]; overwrite: boolean } | null {
  const label = ctx.label.toLowerCase()
  const id = ctx.id.toLowerCase()
  if (id.startsWith('staff-') || (label === 'demo identity' && id.startsWith('staff'))) return { queries: ['Leo Martins'], overwrite: false }
  if (id.startsWith('scope-')) return null
  if (label === 'demo identity') {
    const member = nextMember(ctx.memberNames)
    if (!member) return null
    return { queries: [member, 'Create a new demo identity'], overwrite: false }
  }
  if (label === 'role') {
    const member = nextMember(ctx.memberNames)
    if (!member) return null
    return { queries: [member === 'Olivia Chen' ? 'Campaign Organizer' : 'Organization Admin'], overwrite: true }
  }
  if (label === 'type' && ctx.pathname.includes('/start')) return { queries: ['School'], overwrite: true }
  if (label === 'category' && ctx.section.toLowerCase().includes('expense')) return { queries: ['Materials or goods', 'materials'], overwrite: false }
  if (label === 'status' && /purchase/i.test(ctx.nearbyTitle)) return { queries: ['In progress'], overwrite: true }
  if (label === 'currency' || label === 'default currency') return { queries: ['US dollar', 'USD'], overwrite: false }
  if (label === 'partner store') return { queries: ['Corner Stationery'], overwrite: false }
  if (label === 'branch') return { queries: ['Greenwood High Street'], overwrite: false }
  if (label === 'campaign' || label.includes('campaign this')) return { queries: ['School supplies'], overwrite: false }
  if (label === 'related milestone' && ctx.section.toLowerCase().includes('expense')) return { queries: ['Purchase materials'], overwrite: false }
  if (label === 'related milestone' && ctx.section.toLowerCase().includes('update')) return { queries: ['Confirm needs'], overwrite: false }
  if (label === 'update type') return { queries: ['Fundraising progress'], overwrite: false }
  return null
}

/** True when a checkbox or radio should be switched on. Null means leave it alone. */
export function demoShouldCheck(ctx: DemoContext): boolean | null {
  const label = `${ctx.label} ${ctx.aria}`.toLowerCase()
  if (ctx.type === 'radio') {
    if (label.includes('choose individually')) return true
    if (label.includes('contribution rewards')) return true
    if (label.includes('give directly') && !label.includes('instead')) return true
    return null
  }
  if (ctx.type !== 'checkbox') return null
  if (FEATURES_ON.has(ctx.id)) return true
  if (label.includes('permission') || label.includes('consent') || label.includes('personal') || label.includes('identity documents')) return null
  if (label.includes('contribution rewards')) return true
  if (label.includes('memory match')) return true
  if (label.includes('allow direct contributions')) return true
  if (label.includes('offer games')) return true
  if (label.includes('campaign creation assistant')) return true
  if (label.includes('school supplies for every greenwood')) return true
  return null
}

function isVisible(el: HTMLElement): boolean {
  if (el.closest('.demo-fill, .demo-tools, [hidden]')) return false
  const style = getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  return el.getClientRects().length > 0
}

function labelText(el: HTMLElement, doc: Document): string {
  const labelledby = el.getAttribute('aria-labelledby')
  if (labelledby) {
    const text = labelledby
      .split(/\s+/)
      .map((id) => doc.getElementById(id)?.textContent || '')
      .join(' ')
    if (text.trim()) return cleanLabel(text)
  }
  if (el.id) {
    const explicit = doc.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    if (explicit?.textContent) return cleanLabel(explicit.textContent)
  }
  const wrap = el.closest('label')
  if (wrap) {
    const nested = wrap.querySelector('.field-label')
    if (nested && !nested.contains(el) && nested.textContent) return cleanLabel(nested.textContent)
    const clone = wrap.cloneNode(true) as HTMLElement
    clone.querySelectorAll('input, textarea, select, button').forEach((node) => node.remove())
    if (clone.textContent?.trim()) return cleanLabel(clone.textContent)
  }
  const field = el.closest('.field, .colour-field')
  const span = field?.querySelector('.field-label')
  if (span && !span.contains(el) && span.textContent) return cleanLabel(span.textContent)
  return ''
}

function sectionOf(el: HTMLElement, doc: Document): string {
  const section = el.closest('section, form')
  if (!section) return ''
  const aria = section.getAttribute('aria-label')
  if (aria) return cleanLabel(aria)
  const labelledby = section.getAttribute('aria-labelledby')
  if (labelledby) {
    const text = labelledby
      .split(/\s+/)
      .map((id) => doc.getElementById(id)?.textContent || '')
      .join(' ')
    if (text.trim()) return cleanLabel(text)
  }
  return ''
}

function titleNear(el: HTMLElement, doc: Document): string {
  const section = el.closest('section, form')
  if (!section) return ''
  const input = [...section.querySelectorAll('input')].find((candidate) => {
    const aria = candidate.getAttribute('aria-label') || ''
    const label = labelText(candidate, doc).toLowerCase()
    return label === 'title' || /title$/i.test(aria)
  })
  return input?.value ?? ''
}

function inStoreForm(el: HTMLElement): boolean {
  const form = el.closest('form')
  return Boolean(form?.textContent?.includes('Store name'))
}

function listedNames(doc: Document, selector: string): string[] {
  return [...doc.querySelectorAll(selector)].map((node) => cleanLabel(node.textContent || '').replace(/\s*\(you\)$/i, '')).filter(Boolean)
}

function setValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const prototype = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function contextFor(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, doc: Document, memberNames: string[], identityNames: string[]): DemoContext {
  return {
    id: el.id,
    label: labelText(el, doc),
    aria: cleanLabel(el.getAttribute('aria-label') || ''),
    placeholder: 'placeholder' in el ? el.placeholder : '',
    type: el instanceof HTMLTextAreaElement ? 'textarea' : el.type || el.tagName.toLowerCase(),
    pathname: doc.location?.pathname || '',
    section: sectionOf(el, doc),
    nearbyTitle: titleNear(el, doc),
    inStoreForm: inStoreForm(el),
    memberNames,
    identityNames,
  }
}

function pickOption(select: HTMLSelectElement, queries: string[]): boolean {
  const options = [...select.options]
  for (const query of queries) {
    const needle = query.toLowerCase()
    const match =
      options.find((option) => option.disabled === false && (option.label || option.text).trim().toLowerCase() === needle) ||
      options.find((option) => !option.disabled && `${option.label} ${option.text} ${option.value}`.toLowerCase().includes(needle))
    if (!match) continue
    if (select.value === match.value) return false
    setValue(select, match.value)
    return true
  }
  return false
}

function clickScriptedButtons(doc: Document): number {
  let changed = 0
  const buttons = [...doc.querySelectorAll('button')].filter((button) => isVisible(button) && !button.disabled)
  for (const button of buttons) {
    const text = cleanLabel(button.textContent || '')
    const pressed = button.getAttribute('aria-pressed') === 'true' || button.classList.contains('selected')
    const click = () => {
      button.click()
      changed += 1
    }
    if (button.classList.contains('chip') && text === 'Start now · 30 days') {
      const opens = doc.querySelector<HTMLInputElement>('#a-opens')
      if (opens && !opens.value) click()
    } else if (button.classList.contains('chip') && (text === 'Open to everyone' || text === 'Both') && !pressed) click()
    else if (button.classList.contains('chat-game') && text.includes('Memory Match') && !pressed) click()
    else if (button.classList.contains('cover-choice') && text.includes('School library') && !pressed) click()
    else if (button.classList.contains('gallery-choice') && text.includes('Reading room') && !pressed && (button.closest('fieldset')?.querySelector('legend')?.textContent || '').includes('Homepage photo')) click()
    else if (button.classList.contains('amount-choice') && /^\$?\s*500$/.test(text.replace(/,/g, '')) && !pressed) click()
    else if ((text === '+ Add milestone' || text === 'Add milestone') && [...doc.querySelectorAll('input')].filter((input) => /^Milestone \d+ title$/.test(input.getAttribute('aria-label') || '')).length < 4) click()
    if (changed) return changed
  }
  return changed
}

function canFill(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
  if (!isVisible(el) || el.disabled || ('readOnly' in el && el.readOnly)) return false
  if (el instanceof HTMLInputElement && (el.type === 'file' || el.type === 'hidden' || el.type === 'password' || el.type === 'submit' || el.type === 'button')) return false
  return true
}

/**
 * Fill the visible page. Returns how many controls changed.
 * Call again after React renders fields that appear because of a choice.
 * Selects and scripted clicks stop the pass so the next call sees the new fields.
 */
export function fillDemoPage(doc: Document = document, now = new Date()): number {
  const memberNames = listedNames(doc, '.member-list strong')
  const identityNames = listedNames(doc, '.identity-list strong')
  const controls = [...doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')].filter(canFill)
  let changed = 0

  for (const el of controls) {
    if (el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio'))) continue
    const text = demoTextFor(contextFor(el, doc, memberNames, identityNames), now)
    if (!text) continue
    if (!text.overwrite && el.value.trim()) continue
    if (el.value.trim().toLowerCase() === text.value.trim().toLowerCase()) continue
    setValue(el, text.value)
    return changed + 1
  }

  for (const el of controls) {
    if (!(el instanceof HTMLSelectElement)) continue
    const choice = demoSelectFor(contextFor(el, doc, memberNames, identityNames))
    if (!choice) continue
    if (!choice.overwrite && el.value !== '') continue
    if (!pickOption(el, choice.queries)) continue
    changed += 1
    return changed
  }

  for (const el of controls) {
    if (!(el instanceof HTMLInputElement) || (el.type !== 'checkbox' && el.type !== 'radio')) continue
    const want = demoShouldCheck(contextFor(el, doc, memberNames, identityNames))
    if (want && !el.checked) {
      el.click()
      changed += 1
      return changed
    }
  }

  changed += clickScriptedButtons(doc)
  return changed
}
