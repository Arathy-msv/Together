import { shiftLocal } from '../lib/format.ts'
import { preparedTranslation } from '../lib/ai/translations.ts'
import type { Campaign, CampaignUpdate, Contribution, Expense, Milestone, Referral, SupportingDocument } from '../lib/types.ts'

/* Fictional organizer content for a few sample campaigns. Everything here is an organizer claim in a
   demo; the only "verification" is an explicitly labelled demo example. */

type StoryFields = Pick<Campaign, 'category' | 'story' | 'budget' | 'impactExamples' | 'demoVerification' | 'fundingNote'>

const rupees = (amount: number) => amount * 100
const dollars = (amount: number) => amount * 100

export function seedStoryFields(): Record<string, Partial<StoryFields>> {
  return {
    cmp_harbour_blankets: {
      category: 'clothing',
      story: {
        whoItHelps: 'Families staying in Open Harbour’s three night shelters, including about 60 children.',
        whatTheyNeed: 'Shelter heating is limited overnight. Many families arrive with only light clothing and no bedding of their own.',
        whatItSupports: 'Thick blankets for every bed, winter jackets in children’s sizes, and transport to deliver them to each shelter.',
        whatHappensNext: 'We buy in two batches, deliver to each shelter, and publish receipts and a final report here.',
        beneficiary: 'Residents of Open Harbour night shelters. We do not publish residents’ names or photos.',
        imageStory: [
          { id: 'hb-img-1', src: '/covers/cover-winter.jpg', caption: 'Blankets and sweaters sorted by size before delivery.', alt: 'Folded knitted sweaters and scarves stacked on a table' },
          { id: 'hb-img-2', src: '/games/warmth/clothing-rail.jpg', caption: 'Jackets ready to be packed for the shelters.', alt: 'A clothing rail with navy and green jackets' },
        ],
      },
      budget: [
        { id: 'hb-b1', label: 'Thick blankets', amountMinor: rupees(45000), quantity: 300, unitCostMinor: rupees(150), note: 'Supplier quotation (sample) for 300 blankets.' },
        { id: 'hb-b2', label: 'Children’s winter jackets', amountMinor: rupees(22000), quantity: 80, unitCostMinor: rupees(275) },
        { id: 'hb-b3', label: 'Transport to three shelters', amountMinor: rupees(5000) },
        { id: 'hb-b4', label: 'Administration and packaging', amountMinor: rupees(3000) },
      ],
      impactExamples: [
        {
          id: 'hb-i1',
          amountMinor: rupees(150),
          outcome: 'one thick blanket',
          costBasis: 'Supplier quotation (sample) dated this season: $150 per blanket for 300 blankets.',
        },
      ],
      demoVerification: {
        label: 'Demo verification',
        note: 'Seeded example for this prototype. No real review took place and no identity documents were checked.',
        date: shiftLocal(-8, 10),
      },
    },
    cmp_harbour_reading: {
      category: 'education',
      story: {
        whoItHelps: 'Children living in Open Harbour family shelters.',
        whatTheyNeed: 'A quiet, well-lit place to read and do homework away from the busy common rooms.',
        whatItSupports: 'Bookshelves, reading lamps, beanbags and an initial set of books for four reading corners.',
        whatHappensNext: 'Corners are being set up one shelter at a time. We will share photos of the spaces, not of the children.',
        beneficiary: 'Children in four family shelters.',
        imageStory: [],
      },
      budget: [
        { id: 'hr-b1', label: 'Books', amountMinor: rupees(8000) },
        { id: 'hr-b2', label: 'Shelves, lamps and beanbags', amountMinor: rupees(7000) },
      ],
      fundingNote: 'The extra $1,200 above simulated contributions came from Open Harbour’s general fund, approved by our board.',
    },
    cmp_lumen_coats: {
      category: 'clothing',
      story: {
        whoItHelps: 'Families supported by our partner shelters in Pune, Leeds, Austin and Dublin.',
        whatTheyNeed: 'Warm coats before the coldest weeks of winter.',
        whatItSupports: 'New coats bought from local suppliers near each office, matched by Lumen & Co.',
        whatHappensNext: 'Each office team buys and delivers coats to its partner shelter, then posts an update here.',
        beneficiary: 'Families referred by four partner shelters.',
        imageStory: [],
      },
      budget: [
        { id: 'lc-b1', label: 'Coats (about 120)', amountMinor: dollars(5400) },
        { id: 'lc-b2', label: 'Delivery', amountMinor: dollars(600) },
      ],
    },
    cmp_maple_garden: {
      category: 'environment',
      story: {
        whoItHelps: 'Every Maple Grove class, from nursery to Grade 8.',
        whatTheyNeed: 'Space and tools to grow food and learn outdoors as part of the science curriculum.',
        whatItSupports: 'Raised beds, child-sized tools, seeds, compost and a rain barrel.',
        whatHappensNext: 'Beds are built during the first week, then each class plants and cares for its own bed.',
        beneficiary: 'Maple Grove students.',
        imageStory: [],
      },
      budget: [
        { id: 'mg-b1', label: 'Raised beds and compost', amountMinor: rupees(14000) },
        { id: 'mg-b2', label: 'Tools and seeds', amountMinor: rupees(7000) },
        { id: 'mg-b3', label: 'Rain barrel', amountMinor: rupees(4000) },
      ],
    },
  }
}

export function seedReferrals(): Referral[] {
  return [
    {
      id: 'ref_priya',
      campaignId: 'cmp_harbour_blankets',
      organizationId: 'org_harbour',
      code: 'priya-shares',
      displayName: 'Priya Nair',
      headline: 'Winter came early this year',
      message:
        'I volunteer at the Harbour Road shelter on Thursdays. Last January I watched parents give their own jackets to their kids. If you can, help make sure nobody has to choose this year.',
      personalTarget: 10000,
      coverImage: '/covers/cover-winter.jpg',
      createdAt: shiftLocal(-7, 18),
      updatedAt: shiftLocal(-7, 18),
    },
    {
      id: 'ref_daniel',
      campaignId: 'cmp_lumen_coats',
      organizationId: 'org_lumen',
      code: 'daniel-for-coats',
      displayName: 'Daniel Okafor',
      headline: 'Our Austin team is aiming for 20 coats',
      message: 'I’m sharing this with the Austin office. Play a round of the jacket game at lunch, or give directly — every confirmed gift is matched.',
      personalTarget: 500,
      createdAt: shiftLocal(-6, 12),
      updatedAt: shiftLocal(-6, 12),
    },
  ]
}

export function seedReferralContributions(): Contribution[] {
  const at = (days: number) => shiftLocal(-days, 15)
  return [
    { id: 'ctb_ref_priya_01', campaignId: 'cmp_harbour_blankets', amount: 2500, method: 'direct', reference: 'DEMO-1501', createdAt: at(6), status: 'success', referralId: 'ref_priya' },
    { id: 'ctb_ref_priya_02', campaignId: 'cmp_harbour_blankets', amount: 1000, method: 'game', reference: 'DEMO-1502', createdAt: at(4), status: 'success', referralId: 'ref_priya' },
    { id: 'ctb_ref_daniel_01', campaignId: 'cmp_lumen_coats', amount: 50, method: 'game', reference: 'DEMO-1503', createdAt: at(5), status: 'success', referralId: 'ref_daniel' },
    { id: 'ctb_ref_daniel_02', campaignId: 'cmp_lumen_coats', amount: 25, method: 'direct', reference: 'DEMO-1504', createdAt: at(2), status: 'success', referralId: 'ref_daniel' },
  ]
}

function milestone(id: string, campaignId: string, order: number, fields: Partial<Milestone> & Pick<Milestone, 'title' | 'dueDate'>): Milestone {
  return {
    id,
    campaignId,
    description: '',
    status: 'planned',
    progressNote: '',
    order,
    createdAt: shiftLocal(-12, 9),
    updatedAt: shiftLocal(-2, 9),
    ...fields,
  }
}

export function seedMilestones(): Milestone[] {
  return [
    milestone('ms_hb_identify', 'cmp_harbour_blankets', 1, {
      title: 'Confirm needs with each shelter',
      description: 'Count beds and children’s sizes at each of the three shelters.',
      dueDate: shiftLocal(-9, 18),
      status: 'reported_complete',
      completedAt: shiftLocal(-9, 16),
    }),
    milestone('ms_hb_purchase', 'cmp_harbour_blankets', 2, {
      title: 'Purchase blankets and jackets',
      description: 'Buy in two batches from a local supplier.',
      dueDate: shiftLocal(-2, 18),
      plannedBudgetMinor: rupees(67000),
      status: 'in_progress',
      progressNote: 'First batch of 120 blankets bought. Second batch delayed by the supplier.',
    }),
    milestone('ms_hb_distribute', 'cmp_harbour_blankets', 3, {
      title: 'Distribute to three shelters',
      description: 'Shelter staff hand out items. We will not photograph residents.',
      dueDate: shiftLocal(14, 18),
      plannedBudgetMinor: rupees(5000),
    }),
    milestone('ms_hb_report', 'cmp_harbour_blankets', 4, { title: 'Publish final report', dueDate: shiftLocal(40, 18) }),
    milestone('ms_hr_books', 'cmp_harbour_reading', 1, {
      title: 'Buy books and furniture',
      dueDate: shiftLocal(-12, 18),
      plannedBudgetMinor: rupees(15000),
      status: 'reported_complete',
      completedAt: shiftLocal(-13, 12),
    }),
    milestone('ms_hr_setup', 'cmp_harbour_reading', 2, {
      title: 'Set up four reading corners',
      dueDate: shiftLocal(6, 18),
      status: 'in_progress',
      progressNote: 'Two of four corners set up.',
    }),
    milestone('ms_lc_buy', 'cmp_lumen_coats', 1, { title: 'Each office buys coats locally', dueDate: shiftLocal(12, 18), plannedBudgetMinor: dollars(5400) }),
    milestone('ms_lc_deliver', 'cmp_lumen_coats', 2, { title: 'Deliver coats to partner shelters', dueDate: shiftLocal(22, 18), plannedBudgetMinor: dollars(600) }),
    milestone('ms_mg_beds', 'cmp_maple_garden', 1, { title: 'Build raised beds', dueDate: shiftLocal(17, 18), plannedBudgetMinor: rupees(14000) }),
    milestone('ms_mg_plant', 'cmp_maple_garden', 2, { title: 'Each class plants its bed', dueDate: shiftLocal(24, 18) }),
    milestone('ms_mg_care', 'cmp_maple_garden', 3, { title: 'Weekly care rota begins', dueDate: shiftLocal(31, 18) }),
  ]
}

function expense(id: string, campaignId: string, fields: Partial<Expense> & Pick<Expense, 'description' | 'amountMinor' | 'date'>): Expense {
  return {
    id,
    campaignId,
    category: 'materials',
    vendor: '',
    receiptRedacted: false,
    publicNote: '',
    status: 'published',
    createdAt: fields.date,
    updatedAt: fields.date,
    publishedAt: fields.status === 'draft' ? undefined : fields.date,
    ...fields,
  }
}

export function seedExpenses(): Expense[] {
  return [
    expense('exp_hb_blankets1', 'cmp_harbour_blankets', {
      description: 'First batch: 120 thick blankets',
      amountMinor: rupees(18000),
      date: shiftLocal(-4, 11),
      vendor: 'Warmline Textiles (fictional)',
      milestoneId: 'ms_hb_purchase',
      publicReceipt: '/docs/sample-receipt-redacted.svg',
      receiptRedacted: true,
      publicNote: 'Invoice total matches the quotation price of $150 per blanket.',
    }),
    expense('exp_hb_van', 'cmp_harbour_blankets', {
      description: 'Van hire to collect the first batch',
      category: 'transport',
      amountMinor: rupees(1250),
      date: shiftLocal(-4, 15),
      milestoneId: 'ms_hb_purchase',
    }),
    expense('exp_hb_jackets_draft', 'cmp_harbour_blankets', {
      description: 'Children’s jackets (awaiting invoice)',
      amountMinor: rupees(9000),
      date: shiftLocal(-1, 10),
      status: 'draft',
      milestoneId: 'ms_hb_purchase',
    }),
    expense('exp_hr_books', 'cmp_harbour_reading', {
      description: 'Books for four reading corners',
      amountMinor: rupees(8400),
      date: shiftLocal(-14, 11),
      vendor: 'Second Chapter Books (fictional)',
      milestoneId: 'ms_hr_books',
      publicReceipt: '/docs/sample-receipt-redacted.svg',
      receiptRedacted: true,
    }),
    expense('exp_hr_furniture', 'cmp_harbour_reading', {
      description: 'Shelves, lamps and beanbags',
      amountMinor: rupees(7800),
      date: shiftLocal(-13, 11),
      milestoneId: 'ms_hr_books',
    }),
  ]
}

function update(id: string, campaignId: string, fields: Partial<CampaignUpdate> & Pick<CampaignUpdate, 'title' | 'date' | 'body'>): CampaignUpdate {
  return {
    id,
    campaignId,
    type: 'progress',
    media: [],
    expenseIds: [],
    mediaConsent: false,
    status: 'published',
    createdAt: fields.date,
    updatedAt: fields.date,
    publishedAt: fields.status === 'draft' ? undefined : fields.date,
    ...fields,
  }
}

export function seedUpdates(): CampaignUpdate[] {
  return [
    update('upd_hb_launch', 'cmp_harbour_blankets', {
      type: 'launch',
      title: 'We’re collecting for winter blankets',
      date: shiftLocal(-11, 10),
      body: 'Our three night shelters asked for help before the cold sets in. We’ve confirmed numbers with each shelter and will post receipts as we buy.',
      milestoneId: 'ms_hb_identify',
    }),
    update('upd_hb_purchase', 'cmp_harbour_blankets', {
      type: 'purchase',
      title: 'First 120 blankets bought',
      date: shiftLocal(-4, 17),
      body: 'We bought the first batch of 120 blankets and collected them by van. The redacted invoice is attached to the expense below.',
      media: [{ id: 'upd-m1', src: '/covers/cover-winter.jpg', caption: 'Blankets stacked in our storeroom.', alt: 'Stacks of folded knitted blankets and scarves' }],
      mediaConsent: true,
      milestoneId: 'ms_hb_purchase',
      expenseIds: ['exp_hb_blankets1', 'exp_hb_van'],
    }),
    update('upd_hb_delay', 'cmp_harbour_blankets', {
      type: 'delay',
      title: 'Second batch delayed by about a week',
      date: shiftLocal(-1, 12),
      body: 'Our supplier is waiting on stock for the second batch. We expect it next week and will update the purchase milestone when it arrives.',
      milestoneId: 'ms_hb_purchase',
      // Also references the first blanket expense: totals still count it once.
      expenseIds: ['exp_hb_blankets1'],
    }),
    update('upd_hb_draft', 'cmp_harbour_blankets', {
      type: 'distribution',
      title: 'Planning the first delivery (draft)',
      date: shiftLocal(0, 9),
      body: 'Draft notes for the delivery update.',
      status: 'draft',
    }),
    update('upd_hr_done', 'cmp_harbour_reading', {
      type: 'progress',
      title: 'Two reading corners are open',
      date: shiftLocal(-3, 14),
      body: 'The Harbour Road and Mill Lane shelters now have reading corners. The other two are next.',
      media: [{ id: 'upd-m2', src: '/covers/cover-reading.jpg', caption: 'One of the new reading corners.', alt: 'A bright reading room with bookshelves and cushions' }],
      mediaConsent: true,
      milestoneId: 'ms_hr_setup',
    }),
    update('upd_lc_launch', 'cmp_lumen_coats', {
      type: 'launch',
      title: 'Coat drive is open in all four offices',
      date: shiftLocal(-9, 10),
      body: 'Each office has a partner shelter and a collection target. Lumen & Co. matches every confirmed colleague gift.',
    }),
  ]
}

export function seedDocuments(): SupportingDocument[] {
  return [
    {
      id: 'doc_hb_quote',
      campaignId: 'cmp_harbour_blankets',
      organizationId: 'org_harbour',
      visibility: 'public',
      title: 'Supplier quotation (sample)',
      docType: 'Quotation',
      description: 'Fictional quotation for 300 blankets at $150 each, used as the cost basis on this page.',
      caption: 'Redacted sample quotation. Personal details were never included.',
      expenseId: 'exp_hb_blankets1',
      milestoneId: 'ms_hb_purchase',
      updateId: 'upd_hb_purchase',
      fileSrc: '/docs/sample-quote.svg',
      sample: true,
      createdAt: shiftLocal(-10, 10),
    },
    {
      id: 'doc_hb_letter',
      campaignId: 'cmp_harbour_blankets',
      organizationId: 'org_harbour',
      visibility: 'public',
      title: 'Shelter partner letter (sample)',
      docType: 'Partner letter',
      description: 'Fictional letter from a shelter manager describing the need.',
      fileSrc: '/docs/sample-partner-letter.svg',
      sample: true,
      createdAt: shiftLocal(-10, 11),
    },
    {
      id: 'doc_hb_private',
      campaignId: 'cmp_harbour_blankets',
      organizationId: 'org_harbour',
      visibility: 'private',
      title: 'Charity registration — verification placeholder',
      docType: 'Registration certificate (sample)',
      description: 'Placeholder for a future secure review service. No file is stored in this prototype.',
      sample: true,
      reviewState: 'submitted_demo',
      createdAt: shiftLocal(-9, 9),
    },
  ]
}

/** Sample Malayalam translations, presented as already reviewed by the organizer. */
export function withSeedTranslations<T extends { id: string }>(record: T, fields: Record<string, string | undefined>): T {
  const ml: Record<string, string> = {}
  for (const [key, text] of Object.entries(fields)) {
    const translated = text ? preparedTranslation(text) : undefined
    if (translated) ml[key] = translated
  }
  return Object.keys(ml).length ? { ...record, translations: { ml } } : record
}

export const TRANSLATED_SAMPLES = { campaigns: ['cmp_harbour_blankets'], updates: ['upd_hb_purchase', 'upd_hb_delay'], referrals: ['ref_priya'] }
