import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

class MemoryStorage {
  private map = new Map<string, string>()
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value))
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  clear() {
    this.map.clear()
  }
}

const storage = new MemoryStorage()
Object.assign(globalThis, { localStorage: storage })

const { joinPlayer, leaderboard, listPlayers, activeReferral, rememberReferral, standing } = await import('../src/lib/players.ts')
import type { Contribution } from '../src/lib/types.ts'

function gift(partial: Partial<Contribution> & Pick<Contribution, 'id' | 'amount'>): Contribution {
  return {
    campaignId: 'cmp',
    method: 'direct',
    reference: partial.id,
    createdAt: '2026-10-20T00:00:00.000Z',
    status: 'success',
    ...partial,
  }
}

beforeEach(() => storage.clear())

test('a private group keeps each player name once and gives them a referral', () => {
  const asha = joinPlayer('cmp', 'Asha Menon')
  const again = joinPlayer('cmp', '  asha   menon ')
  const rohan = joinPlayer('cmp', 'Rohan Iyer')
  assert.ok(asha && again && rohan)
  assert.equal(asha.id, again.id)
  assert.equal(listPlayers('cmp').length, 2)
  assert.notEqual(asha.referralCode, rohan.referralCode)
  assert.equal(asha.referralCode.length >= 4, true)
})

test('points come from your own gifts and from gifts made through your referral', () => {
  const players = [
    { id: 'asha', campaignId: 'cmp', name: 'Asha Menon', referralCode: 'ASHA01', createdAt: '2026-10-01T00:00:00.000Z' },
    { id: 'rohan', campaignId: 'cmp', name: 'Rohan Iyer', referralCode: 'ROHAN1', createdAt: '2026-10-02T00:00:00.000Z' },
    { id: 'meera', campaignId: 'cmp', name: 'Meera Shah', referralCode: 'MEERA1', createdAt: '2026-10-03T00:00:00.000Z' },
  ]
  const rows = leaderboard(players, [
    gift({ id: '1', amount: 250, playerId: 'rohan', playerName: 'Rohan Iyer', referralCode: 'ASHA01' }),
    gift({ id: '2', amount: 100, playerId: 'meera', playerName: 'Meera Shah' }),
    gift({ id: '3', amount: 40, playerId: 'asha', referralCode: 'ASHA01', status: 'success' }),
  ])
  const byName = Object.fromEntries(rows.map((row) => [row.player.name, row]))
  assert.equal(byName['Asha Menon'].points, 290)
  assert.equal(byName['Asha Menon'].referralCount, 1)
  assert.equal(byName['Rohan Iyer'].points, 250)
  assert.equal(byName['Meera Shah'].points, 100)
  assert.deepEqual(
    rows.map((row) => row.player.name),
    ['Asha Menon', 'Rohan Iyer', 'Meera Shah'],
  )
})

test('using your own referral does not award referral points twice', () => {
  const asha = joinPlayer('cmp', 'Asha Menon')
  assert.ok(asha)
  rememberReferral('cmp', asha.referralCode)
  assert.equal(activeReferral('cmp', asha.id), undefined)
  const rows = leaderboard(listPlayers('cmp'), [
    gift({ id: '1', amount: 80, playerId: asha.id, referralCode: asha.referralCode }),
  ])
  assert.equal(rows[0].points, 80)
  assert.equal(rows[0].referralCount, 0)
})

test('standing measures rank against the current leader', () => {
  const players = [
    { id: 'asha', campaignId: 'cmp', name: 'Asha Menon', referralCode: 'ASHA01', createdAt: '2026-10-01T00:00:00.000Z' },
    { id: 'rohan', campaignId: 'cmp', name: 'Rohan Iyer', referralCode: 'ROHAN1', createdAt: '2026-10-02T00:00:00.000Z' },
    { id: 'meera', campaignId: 'cmp', name: 'Meera Shah', referralCode: 'MEERA1', createdAt: '2026-10-03T00:00:00.000Z' },
  ]
  const rows = leaderboard(players, [
    gift({ id: '1', amount: 250, playerId: 'rohan' }),
    gift({ id: '2', amount: 250, playerId: 'asha' }),
    gift({ id: '3', amount: 100, playerId: 'meera' }),
  ])
  const asha = standing(rows, 'asha')
  const meera = standing(rows, 'meera')
  assert.equal(asha?.rank, 1)
  assert.equal(asha?.behindLeader, 0)
  assert.equal(meera?.rank, 3)
  assert.equal(meera?.behindLeader, 150)
  assert.equal(meera?.leader.player.name, 'Asha Menon')
  assert.equal(standing(rows, 'missing'), null)
  assert.equal(standing([], 'asha'), null)
})
