import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  actionBreakdown,
  beginCheckout,
  cancelSession,
  defaultGameSettings,
  emptyLedger,
  formatPaise,
  gameConfig,
  gameIntroSentence,
  normalizeGameSettings,
  parseLedger,
  parseRupeesToPaise,
  recordAction,
  returnToPending,
  selectedPaise,
  setCustomAmount,
  settleConfirmed,
  type GameLedger,
} from '../src/lib/gameContribution.ts'
import type { GameType } from '../src/lib/types.ts'

const now = new Date('2026-10-20T10:00:00Z')
let counter = 0
const makeId = () => `session-${++counter}`

function play(ledger: GameLedger, game: GameType, ids: string[], roundId = 'round-1') {
  const settings = defaultGameSettings(game)
  let current = ledger
  const outcomes: string[] = []
  for (const id of ids) {
    const result = recordAction(current, { actionId: id, roundId, label: id }, settings, now, makeId)
    current = result.ledger
    outcomes.push(result.outcome)
  }
  return { ledger: current, outcomes }
}

describe('default rates', () => {
  const cases: Array<[GameType, number, number, number]> = [
    ['garden', 50, 3, 150],
    ['puzzle', 25, 4, 100],
    ['memory', 50, 2, 100],
    ['jacket', 50, 4, 200],
  ]
  for (const [game, rate, actions, total] of cases) {
    test(`${game}: ${actions} actions × ₹${rate} = ₹${total}`, () => {
      assert.equal(defaultGameSettings(game).ratePaise, rate * 100)
      const ids = Array.from({ length: actions }, (_, index) => `${game}-${index}`)
      const { ledger } = play(emptyLedger('cmp', game), game, ids)
      assert.equal(ledger.session?.suggestedPaise, total * 100)
      assert.equal(selectedPaise(ledger.session), total * 100)
    })
  }

  test('jacket stages add ₹50, ₹100, ₹150, ₹200 in turn', () => {
    let ledger = emptyLedger('cmp', 'jacket')
    const totals: number[] = []
    for (const stage of [1, 2, 3, 4]) {
      ledger = play(ledger, 'jacket', [`round-1:stage-${stage}`]).ledger
      totals.push(ledger.session!.suggestedPaise / 100)
    }
    assert.deepEqual(totals, [50, 100, 150, 200])
  })

  test('breakdown and intro copy use the configured rate', () => {
    const { ledger } = play(emptyLedger('cmp', 'garden'), 'garden', ['a', 'b', 'c'])
    assert.equal(actionBreakdown(ledger.session!, gameConfig('garden')), '3 plants × ₹50')
    assert.match(gameIntroSentence('garden', 5000), /^Each completed plant adds ₹50 to your suggested contribution\./)
  })
})

describe('idempotent recording', () => {
  test('recording the same action twice leaves totals unchanged', () => {
    const { ledger, outcomes } = play(emptyLedger('cmp', 'garden'), 'garden', ['bed-1:plot-1', 'bed-1:plot-1', 'bed-1:plot-2'])
    assert.deepEqual(outcomes, ['added', 'duplicate', 'added'])
    assert.equal(ledger.session?.suggestedPaise, 10000)
    assert.equal(ledger.session?.actions.length, 2)
  })

  test('back-and-forth zip or fold gestures replay the same stage IDs and add nothing', () => {
    const ids = ['r:stage-1', 'r:stage-1', 'r:stage-2', 'r:stage-1', 'r:stage-2']
    const { ledger } = play(emptyLedger('cmp', 'jacket'), 'jacket', ids)
    assert.equal(ledger.session?.suggestedPaise, 10000)
  })

  test('pending totals stay scoped to their campaign and game', () => {
    const garden = play(emptyLedger('cmp-a', 'garden'), 'garden', ['x']).ledger
    const memory = play(emptyLedger('cmp-a', 'memory'), 'memory', ['x']).ledger
    const other = play(emptyLedger('cmp-b', 'garden'), 'garden', ['x']).ledger
    assert.equal(garden.session?.campaignId, 'cmp-a')
    assert.equal(memory.session?.gameId, 'memory')
    assert.equal(other.session?.campaignId, 'cmp-b')
    assert.equal(garden.session?.suggestedPaise, 5000)
  })

  test('the session keeps its rate snapshot when campaign settings change', () => {
    let { ledger } = play(emptyLedger('cmp', 'garden'), 'garden', ['a'])
    ledger = recordAction(ledger, { actionId: 'b', roundId: 'r', label: 'b' }, { ...defaultGameSettings('garden'), ratePaise: 9900 }, now)
      .ledger
    assert.deepEqual(
      ledger.session?.actions.map((action) => action.amountPaise),
      [5000, 5000],
    )
  })
})

describe('custom totals', () => {
  test('a custom amount stays fixed while the suggestion grows', () => {
    let { ledger } = play(emptyLedger('cmp', 'garden'), 'garden', ['a', 'b'])
    ledger = setCustomAmount(ledger, 12000)
    ledger = play(ledger, 'garden', ['c', 'd']).ledger
    assert.equal(ledger.session?.suggestedPaise, 20000)
    assert.equal(selectedPaise(ledger.session), 12000)
  })

  test('reset to game total returns to automatic mode', () => {
    let { ledger } = play(emptyLedger('cmp', 'garden'), 'garden', ['a', 'b'])
    ledger = setCustomAmount(ledger, 12000)
    ledger = setCustomAmount(ledger, null)
    ledger = play(ledger, 'garden', ['c']).ledger
    assert.equal(selectedPaise(ledger.session), 15000)
  })

  test('custom totals are refused when the campaign does not allow them', () => {
    const settings = { ...defaultGameSettings('garden'), allowCustom: false }
    let ledger = recordAction(emptyLedger('cmp', 'garden'), { actionId: 'a', roundId: 'r', label: 'a' }, settings, now).ledger
    ledger = setCustomAmount(ledger, 100)
    assert.equal(ledger.session?.customPaise, null)
  })
})

describe('suggestion cap', () => {
  test('stops increasing at the cap without touching a chosen amount', () => {
    const settings = { ...defaultGameSettings('garden'), capPaise: 12000 }
    let ledger = emptyLedger('cmp', 'garden')
    const outcomes: string[] = []
    for (const id of ['a', 'b', 'c', 'd']) {
      const result = recordAction(ledger, { actionId: id, roundId: 'r', label: id }, settings, now)
      ledger = result.ledger
      outcomes.push(`${result.outcome}:${result.addedPaise}`)
    }
    assert.deepEqual(outcomes, ['added:5000', 'added:5000', 'capped:2000', 'capped:0'])
    assert.equal(ledger.session?.suggestedPaise, 12000)
    assert.equal(ledger.session?.capReached, true)
  })
})

describe('cancellation, checkout and settlement', () => {
  test('cancel discards the suggestion and its actions never return', () => {
    let { ledger } = play(emptyLedger('cmp', 'garden'), 'garden', ['a', 'b'])
    ledger = cancelSession(ledger, now)
    assert.equal(ledger.session, null)
    assert.equal(ledger.closed[0].status, 'cancelled')
    const replay = play(ledger, 'garden', ['a', 'b'])
    assert.deepEqual(replay.outcomes, ['duplicate', 'duplicate'])
    assert.equal(replay.ledger.session, null)
    const fresh = play(ledger, 'garden', ['c']).ledger
    assert.equal(fresh.session?.suggestedPaise, 5000)
  })

  test('a failed or cancelled checkout keeps the pending amount', () => {
    let { ledger } = play(emptyLedger('cmp', 'puzzle'), 'puzzle', ['p1', 'p2'])
    const id = ledger.session!.id
    ledger = beginCheckout(ledger, id, now)
    assert.equal(ledger.session?.status, 'checkout')
    ledger = returnToPending(ledger, id, now)
    assert.equal(ledger.session?.status, 'pending')
    assert.equal(ledger.session?.suggestedPaise, 5000)
  })

  test('paid actions are settled and only new actions start a new suggestion', () => {
    let { ledger } = play(emptyLedger('cmp', 'memory'), 'memory', ['pair-fox', 'pair-bird'])
    const paidId = ledger.session!.id
    ledger = settleConfirmed(beginCheckout(ledger, paidId), paidId, now)
    assert.equal(ledger.session, null)
    assert.equal(ledger.closed[0].status, 'confirmed')
    const after = play(ledger, 'memory', ['pair-fox', 'pair-sun'])
    assert.deepEqual(after.outcomes, ['duplicate', 'added'])
    assert.notEqual(after.ledger.session?.id, paidId)
    assert.equal(after.ledger.session?.suggestedPaise, 5000)
  })
})

describe('stored data', () => {
  test('a stored ledger round-trips through JSON, so a refresh never adds again', () => {
    const { ledger } = play(emptyLedger('cmp', 'garden'), 'garden', ['a', 'b'])
    const restored = parseLedger(JSON.parse(JSON.stringify(ledger)), 'cmp', 'garden')
    assert.equal(restored.session?.suggestedPaise, 10000)
    assert.equal(play(restored, 'garden', ['a']).outcomes[0], 'duplicate')
  })

  test('corrupt or tampered storage is handled safely', () => {
    assert.equal(parseLedger('nonsense', 'cmp', 'garden').session, null)
    assert.equal(parseLedger({ session: { id: 1 } }, 'cmp', 'garden').session, null)
    const { ledger } = play(emptyLedger('cmp', 'garden'), 'garden', ['a'])
    const tampered = JSON.parse(JSON.stringify(ledger))
    tampered.session.suggestedPaise = 999999
    assert.equal(parseLedger(tampered, 'cmp', 'garden').session?.suggestedPaise, 5000)
    assert.equal(parseLedger(ledger, 'other', 'garden').session, null)
  })

  test('settings are validated against each game', () => {
    assert.deepEqual(normalizeGameSettings('puzzle', { ratePaise: -5, actionsPerRound: 40, capPaise: 1 }), {
      ratePaise: 2500,
      actionsPerRound: 8,
      allowCustom: true,
      capPaise: null,
    })
  })
})

describe('money', () => {
  test('parses rupees into integer paise', () => {
    assert.equal(parseRupeesToPaise('150'), 15000)
    assert.equal(parseRupeesToPaise('₹1,250.5'), 125050)
    assert.equal(parseRupeesToPaise('0'), null)
    assert.equal(parseRupeesToPaise('12.345'), null)
    assert.equal(parseRupeesToPaise('abc'), null)
  })

  test('formats paise as INR', () => {
    assert.equal(formatPaise(15000), '₹150')
    assert.equal(formatPaise(12050), '₹120.50')
  })
})
