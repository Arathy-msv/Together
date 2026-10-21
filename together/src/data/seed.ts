import { shiftLocal } from '../lib/format.ts'
import type { Campaign, CampaignUpdate, Contribution, DemoStore, Referral } from '../lib/types.ts'
import { ORG_HARBOUR, ORG_LUMEN, ORG_MAPLE } from './organizations.ts'
import {
  seedDocuments,
  seedExpenses,
  seedMilestones,
  seedReferralContributions,
  seedReferrals,
  seedStoryFields,
  seedUpdates,
  TRANSLATED_SAMPLES,
  withSeedTranslations,
} from './transparencySeed.ts'

function contribution(
  id: string,
  campaignId: string,
  amount: number,
  method: Contribution['method'],
  reference: string,
  daysAgo: number,
): Contribution {
  const created = new Date()
  created.setDate(created.getDate() - daysAgo)
  created.setHours(10 + (daysAgo % 6), (daysAgo * 7) % 60, 0, 0)
  return {
    id,
    campaignId,
    amount,
    method,
    reference,
    createdAt: created.toISOString(),
    status: 'success',
  }
}

const libraryAmounts = [2500, 2000, 2000, 2500, 2500, 1500, 1500, 1000, 1000, 1000, 500, 500]
const gardenAmounts = [2500, 2000, 1500, 1500, 1000, 500]

export function createSeed(): DemoStore {
  const campaigns: Campaign[] = [
    {
      id: 'cmp_library',
      title: 'Grow Our School Library',
      description:
        'Help us fill our school library with more books and create a welcoming reading corner where every child can discover new worlds, build confidence and fall in love with reading.',
      coverImageId: 'library',
      organizerName: 'Riverside School PTA',
      access: 'open',
      goalAmount: 50000,
      donationMode: 'fixed',
      fixedAmounts: [100, 250, 500],
      opensAt: shiftLocal(-18, 9),
      closesAt: shiftLocal(32, 18),
      autoCloseOnGoal: true,
      participation: { direct: true, game: true },
      gameType: 'garden',
      createdAt: shiftLocal(-20, 9),
      organizationId: 'org_together',
      currency: 'INR',
    },
    {
      id: 'cmp_garden',
      title: 'Community Garden',
      description:
        'A community garden for greener neighbourhoods and happier tomorrows. We are raising funds for beds, tools, seeds and a shady reading bench anyone can use.',
      coverImageId: 'garden',
      organizerName: 'Riverside School PTA',
      access: 'open',
      goalAmount: 30000,
      donationMode: 'custom',
      fixedAmounts: [],
      opensAt: shiftLocal(-12, 9),
      closesAt: shiftLocal(32, 18),
      autoCloseOnGoal: true,
      participation: { direct: true, game: true },
      gameType: 'puzzle',
      createdAt: shiftLocal(-14, 11),
      organizationId: 'org_together',
      currency: 'INR',
    },
    {
      id: 'cmp_winter',
      title: 'Winter Care Kits',
      description:
        'Warm kits for children heading into the colder months — coats, blankets, socks and a note that someone nearby is looking out for them.',
      coverImageId: 'winter',
      organizerName: 'Riverside School PTA',
      access: 'open',
      goalAmount: 20000,
      donationMode: 'custom',
      fixedAmounts: [],
      opensAt: shiftLocal(43, 9),
      closesAt: shiftLocal(73, 18),
      autoCloseOnGoal: true,
      participation: { direct: true, game: true },
      gameType: 'memory',
      createdAt: shiftLocal(-2, 15),
      organizationId: 'org_together',
      currency: 'INR',
    },
    {
      id: 'cmp_jacket',
      title: 'Zip Up for Winter',
      description:
        'Warm jackets for children who need one this season. A small action — and a working zip — goes a long way on a cold morning.',
      coverImageId: 'jacket',
      organizerName: 'Neighbourhood Collective',
      access: 'open',
      goalAmount: 25000,
      donationMode: 'fixed',
      fixedAmounts: [100, 250, 500],
      opensAt: shiftLocal(-4, 9),
      closesAt: shiftLocal(28, 18),
      autoCloseOnGoal: true,
      participation: { direct: true, game: true },
      gameType: 'jacket',
      createdAt: shiftLocal(-5, 14),
      organizationId: 'org_together',
      currency: 'INR',
    },
    {
      id: 'cmp_circle',
      title: 'Class Circle',
      description:
        'A private group for one class. Players keep their names, share a referral, and climb the leadership board when someone contributes through them.',
      coverImageId: 'sports',
      organizerName: 'Riverside School PTA',
      access: 'closed',
      accessCode: 'CLASS1',
      goalAmount: 10000,
      donationMode: 'fixed',
      fixedAmounts: [100, 250, 500],
      opensAt: shiftLocal(-6, 9),
      closesAt: shiftLocal(40, 18),
      autoCloseOnGoal: false,
      participation: { direct: true, game: true },
      gameType: 'garden',
      createdAt: shiftLocal(-7, 11),
      organizationId: 'org_together',
      currency: 'INR',
    },
    ...organizationCampaigns(),
  ]

  const contributions: Contribution[] = [
    ...libraryAmounts.map((amount, index) =>
      contribution(
        `ctb_lib_${String(index + 1).padStart(2, '0')}`,
        'cmp_library',
        amount,
        index % 3 === 0 ? 'game' : 'direct',
        `DEMO-${1024 + index}`,
        16 - index,
      ),
    ),
    ...gardenAmounts.map((amount, index) =>
      contribution(
        `ctb_garden_${String(index + 1).padStart(2, '0')}`,
        'cmp_garden',
        amount,
        index % 2 === 0 ? 'game' : 'direct',
        `DEMO-${1036 + index}`,
        10 - index,
      ),
    ),
    {
      ...contribution('ctb_circle_rohan', 'cmp_circle', 250, 'direct', 'DEMO-1101', 3),
      playerId: 'player_rohan',
      playerName: 'Rohan Iyer',
      referralCode: 'ASHA01',
    },
    {
      ...contribution('ctb_circle_meera', 'cmp_circle', 100, 'game', 'DEMO-1102', 1),
      playerId: 'player_meera',
      playerName: 'Meera Shah',
    },
    ...organizationContributions(),
    ...seedReferralContributions(),
  ]

  const stories = seedStoryFields()
  return {
    version: 6,
    campaigns: campaigns.map((campaign) => translateSampleCampaign({ ...campaign, ...stories[campaign.id] })),
    contributions,
    referrals: seedReferrals().map(translateSampleReferral),
    milestones: seedMilestones(),
    campaignUpdates: seedUpdates().map(translateSampleUpdate),
    expenses: seedExpenses(),
    supportingDocuments: seedDocuments(),
    sponsorCommitments: [],
    sponsorAllocations: [],
  }
}

type SampleInput = Pick<Campaign, 'id' | 'organizationId' | 'currency' | 'title' | 'description' | 'coverImageId' | 'organizerName' | 'goalAmount' | 'gameType'> &
  Partial<Campaign> & { opensIn: number; closesIn: number; createdDaysAgo: number }

function sample({ opensIn, closesIn, createdDaysAgo, ...input }: SampleInput): Campaign {
  return {
    access: 'open',
    donationMode: 'fixed',
    fixedAmounts: [],
    autoCloseOnGoal: true,
    participation: { direct: true, game: true },
    opensAt: shiftLocal(opensIn, 9),
    closesAt: shiftLocal(closesIn, 18),
    createdAt: shiftLocal(-createdDaysAgo, 10),
    ...input,
  }
}

function organizationCampaigns(): Campaign[] {
  return [
    sample({
      id: 'cmp_lumen_coats',
      organizationId: ORG_LUMEN,
      currency: 'USD',
      title: 'Winter Coat Drive 2026',
      description:
        'Every Lumen office is collecting warm coats for partner shelters. Zip up a jacket in the game or give directly — the company matches every confirmed colleague gift.',
      coverImageId: 'jacket',
      organizerName: 'Lumen People Team',
      goalAmount: 6000,
      fixedAmounts: [10, 25, 50],
      gameType: 'jacket',
      opensIn: -9,
      closesIn: 19,
      createdDaysAgo: 10,
    }),
    sample({
      id: 'cmp_lumen_laptops',
      organizationId: ORG_LUMEN,
      currency: 'USD',
      title: 'Laptops for Learners — Team Challenge',
      description:
        'A private challenge for Lumen engineering teams. Match cards, climb the team board and fund refurbished laptops for students at our partner schools.',
      coverImageId: 'reading',
      organizerName: 'Lumen Engineering Volunteers',
      access: 'closed',
      accessCode: 'LUMEN26',
      goalAmount: 12000,
      donationMode: 'custom',
      gameType: 'memory',
      autoCloseOnGoal: false,
      opensIn: -5,
      closesIn: 30,
      createdDaysAgo: 6,
    }),
    sample({
      id: 'cmp_lumen_trees',
      organizationId: ORG_LUMEN,
      currency: 'USD',
      title: 'Plant 500 Trees on Volunteer Day',
      description:
        'On our company volunteer day we will plant 500 native saplings along the river path. Grow the shared giving tree to fund saplings, tools and water.',
      coverImageId: 'garden',
      organizerName: 'Lumen Green Team',
      goalAmount: 5000,
      fixedAmounts: [10, 25, 50],
      gameType: 'garden',
      opensIn: -3,
      closesIn: 25,
      createdDaysAgo: 4,
    }),
    sample({
      id: 'cmp_maple_lab',
      organizationId: ORG_MAPLE,
      currency: 'INR',
      title: 'Science Lab Starter Kits',
      description:
        'Microscopes, circuit kits and safe chemistry sets for Grades 6–8. Piece the puzzle together and help our young scientists run real experiments.',
      coverImageId: 'library',
      organizerName: 'Maple Grove PTA',
      goalAmount: 80000,
      fixedAmounts: [100, 250, 500],
      gameType: 'puzzle',
      opensIn: -14,
      closesIn: 16,
      createdDaysAgo: 15,
    }),
    sample({
      id: 'cmp_maple_sports',
      organizationId: ORG_MAPLE,
      currency: 'INR',
      title: 'Sports Day Kits for Every House',
      description:
        'New bibs, relay batons and first-aid kits for all four school houses before Sports Day. Families can give directly or play a round of memory match.',
      coverImageId: 'sports',
      organizerName: 'Maple Grove PTA',
      goalAmount: 40000,
      donationMode: 'custom',
      gameType: 'memory',
      opensIn: -8,
      closesIn: 22,
      createdDaysAgo: 9,
    }),
    sample({
      id: 'cmp_maple_garden',
      organizationId: ORG_MAPLE,
      currency: 'INR',
      title: 'Our Kitchen Garden',
      description:
        'Raised beds, child-sized tools and a rain barrel so every class can grow vegetables and learn where food comes from.',
      coverImageId: 'garden',
      organizerName: 'Maple Grove Eco Club',
      goalAmount: 25000,
      fixedAmounts: [100, 250, 500],
      gameType: 'garden',
      opensIn: 10,
      closesIn: 40,
      createdDaysAgo: 2,
    }),
    sample({
      id: 'cmp_harbour_blankets',
      organizationId: ORG_HARBOUR,
      currency: 'INR',
      title: 'Winter Blankets for Shelters',
      description:
        'Thick blankets and winter jackets for our three night shelters. Wrap someone in warmth in the game, or give directly to keep beds warm all season.',
      coverImageId: 'winter',
      organizerName: 'Open Harbour Outreach',
      goalAmount: 75000,
      fixedAmounts: [250, 500, 1000],
      gameType: 'jacket',
      opensIn: -11,
      closesIn: 34,
      createdDaysAgo: 12,
    }),
    sample({
      id: 'cmp_harbour_kitchen',
      organizationId: ORG_HARBOUR,
      currency: 'INR',
      title: 'Community Kitchen Gardens',
      description:
        'Fresh produce for our community kitchens, grown by volunteers and families in two neighbourhood plots. Grow the giving tree to fund seeds, soil and tools.',
      coverImageId: 'garden',
      organizerName: 'Open Harbour Kitchens',
      goalAmount: 60000,
      fixedAmounts: [250, 500, 1000],
      gameType: 'garden',
      opensIn: -6,
      closesIn: 39,
      createdDaysAgo: 7,
    }),
    sample({
      id: 'cmp_harbour_reading',
      organizationId: ORG_HARBOUR,
      currency: 'INR',
      title: 'Reading Corners in Shelters',
      description:
        'Quiet reading corners with books, lamps and beanbags in every family shelter. Thanks to our supporters this goal has been reached.',
      coverImageId: 'reading',
      organizerName: 'Open Harbour Foundation',
      goalAmount: 15000,
      donationMode: 'custom',
      gameType: 'memory',
      participation: { direct: true, game: false },
      opensIn: -30,
      closesIn: 10,
      createdDaysAgo: 31,
    }),
  ]
}

function gifts(prefix: string, campaignId: string, amounts: number[], startRef: number, startDaysAgo: number): Contribution[] {
  return amounts.map((amount, index) =>
    contribution(
      `ctb_${prefix}_${String(index + 1).padStart(2, '0')}`,
      campaignId,
      amount,
      index % 2 === 0 ? 'game' : 'direct',
      `DEMO-${startRef + index}`,
      Math.max(0, startDaysAgo - index),
    ),
  )
}

function organizationContributions(): Contribution[] {
  return [
    ...gifts('lumen_coats', 'cmp_lumen_coats', [250, 50, 100, 25, 50, 500, 25, 10, 100, 50], 1201, 9),
    ...gifts('lumen_laptops', 'cmp_lumen_laptops', [500, 250, 120], 1215, 4),
    ...gifts('lumen_trees', 'cmp_lumen_trees', [50, 25, 25, 10], 1220, 3),
    ...gifts('maple_lab', 'cmp_maple_lab', [5000, 2500, 2500, 1000, 1000, 500, 500, 250, 250], 1301, 13),
    ...gifts('maple_sports', 'cmp_maple_sports', [3000, 1500, 1200, 800, 500], 1315, 7),
    ...gifts('harbour_blankets', 'cmp_harbour_blankets', [10000, 5000, 5000, 2500, 1000, 1000, 500], 1401, 10),
    ...gifts('harbour_kitchen', 'cmp_harbour_kitchen', [4000, 2000, 1000, 1000, 500], 1410, 5),
    ...gifts('harbour_reading', 'cmp_harbour_reading', [5000, 4000, 3000, 2000, 1000], 1420, 25),
  ]
}

export function translateSampleCampaign(campaign: Campaign): Campaign {
  if (!TRANSLATED_SAMPLES.campaigns.includes(campaign.id) || campaign.translations) return campaign
  const story = campaign.story
  return withSeedTranslations(campaign, {
    title: campaign.title,
    description: campaign.description,
    whoItHelps: story?.whoItHelps,
    whatTheyNeed: story?.whatTheyNeed,
    whatItSupports: story?.whatItSupports,
    whatHappensNext: story?.whatHappensNext,
    beneficiary: story?.beneficiary,
  })
}

export function translateSampleUpdate(update: CampaignUpdate): CampaignUpdate {
  if (!TRANSLATED_SAMPLES.updates.includes(update.id) || update.translations) return update
  return withSeedTranslations(update, { title: update.title, body: update.body })
}

export function translateSampleReferral(referral: Referral): Referral {
  if (!TRANSLATED_SAMPLES.referrals.includes(referral.id) || referral.translations) return referral
  return withSeedTranslations(referral, { headline: referral.headline, message: referral.message })
}
