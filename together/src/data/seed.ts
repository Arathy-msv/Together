import { shiftLocal } from '../lib/format.ts'
import type { Campaign, Contribution, DemoStore } from '../lib/types.ts'

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
    },
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
  ]

  return { version: 1, campaigns, contributions }
}
