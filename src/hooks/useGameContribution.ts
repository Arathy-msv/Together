import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { contributionAvailability } from '../lib/availability.ts'
import { findContribution } from '../lib/campaigns.ts'
import {
  beginCheckout,
  campaignGameSettings,
  cancelSession,
  contributionRuleMessage,
  emptyLedger,
  gameConfig,
  hasAction,
  recordAction,
  returnToPending,
  setCustomAmount,
  settleConfirmed,
  type GameLedger,
  type RecordOutcome,
} from '../lib/gameContribution.ts'
import { readLedger, writeLedger } from '../lib/gameLedger.ts'
import { loadStore } from '../lib/storage.ts'
import type { CampaignView, GameType } from '../lib/types.ts'

export interface CheckpointInfo {
  mode: 'checkpoint' | 'review'
  heading: string
  latestPaise: number
  outcome: RecordOutcome | null
  roundComplete: boolean
}

export interface RecordInput {
  actionId: string
  roundId: string
  /** Short description saved with the action, e.g. "Sunflower in plot 2". */
  label: string
  /** Dialog heading, e.g. "You planted a sunflower!". */
  heading: string
  roundComplete?: boolean
}

function initialLedger(campaignId: string, game: GameType, preview: boolean): GameLedger {
  if (preview) return emptyLedger(campaignId, game)
  const stored = readLedger(campaignId, game)
  const paid = stored.session && findContribution(stored.session.id)
  const resumed = paid ? settleConfirmed(stored, stored.session!.id) : returnToPending(stored)
  if (resumed !== stored) writeLedger(resumed)
  return resumed
}

export function useGameContribution({
  view,
  game,
  preview = false,
}: {
  view: CampaignView
  game: GameType
  preview?: boolean
}) {
  const campaignId = view.campaign.id
  const navigate = useNavigate()
  const settings = useMemo(() => campaignGameSettings(view.campaign), [view.campaign])
  const config = gameConfig(game)
  const [ledger, setLedger] = useState(() => initialLedger(campaignId, game, preview))
  const ledgerRef = useRef(ledger)
  const [dialog, setDialog] = useState<CheckpointInfo | null>(null)
  const [restartOpen, setRestartOpen] = useState(false)
  const restartAction = useRef<(() => void) | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    ledgerRef.current = ledger
  }, [ledger])

  const commit = useCallback(
    (next: GameLedger) => {
      ledgerRef.current = next
      setLedger(next)
      if (!preview) writeLedger(next)
    },
    [preview],
  )

  const rememberFocus = () => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }

  /** Records a completed action exactly once and opens the checkpoint. Returns false for repeats. */
  const record = useCallback(
    (input: RecordInput): boolean => {
      const result = recordAction(
        ledgerRef.current,
        { actionId: input.actionId, roundId: input.roundId, label: input.label },
        settings,
      )
      if (result.outcome === 'duplicate') return false
      commit(result.ledger)
      rememberFocus()
      setDialog({
        mode: 'checkpoint',
        heading: input.heading,
        latestPaise: result.addedPaise,
        outcome: result.outcome,
        roundComplete: Boolean(input.roundComplete),
      })
      return true
    },
    [commit, settings],
  )

  const alreadyCounted = useCallback((actionId: string) => hasAction(ledgerRef.current, actionId), [])

  function openReview(roundComplete = false) {
    rememberFocus()
    setDialog({ mode: 'review', heading: 'Your contribution so far', latestPaise: 0, outcome: null, roundComplete })
  }

  function closeDialog() {
    setDialog(null)
  }

  /** Null keeps automatic mode, where the chosen total follows the game suggestion. */
  function saveChoice(choice: number | null) {
    commit(setCustomAmount(ledgerRef.current, choice))
  }

  function cancel() {
    commit(cancelSession(ledgerRef.current))
    setDialog(null)
  }

  /** Validates and opens the demo payment review. Returns a message when the supporter cannot continue. */
  function donate(choice: number | null): string | null {
    if (preview) return 'Preview only. Publish the campaign to try the demo payment.'
    const session = ledgerRef.current.session
    if (!session) return 'Complete an action in the game to start a suggestion.'
    const chosen = choice ?? session.suggestedPaise
    const rule = contributionRuleMessage(chosen)
    if (rule) return rule
    const store = loadStore()
    const campaign = store.campaigns.find((item) => item.id === campaignId)
    if (!campaign) return 'This campaign is no longer saved in this browser.'
    if (!campaign.participation.game) return 'Game-based giving is no longer open on this campaign.'
    const live = campaignGameSettings(campaign)
    if (choice != null && (!live.allowCustom || !session.allowCustom)) {
      return 'This campaign accepts the game-calculated amount only. Use Reset to game total.'
    }
    const availability = contributionAvailability(campaign, store.contributions)
    if (!availability.ok) return availability.reason
    let next = setCustomAmount(ledgerRef.current, choice)
    next = beginCheckout(next, session.id)
    commit(next)
    setDialog(null)
    navigate(`/campaigns/${campaignId}/confirm?session=${encodeURIComponent(session.id)}`)
    return null
  }

  /** Restarting with a pending total asks whether to keep or discard it first. */
  function requestRestart(run: () => void) {
    if (!ledgerRef.current.session) {
      run()
      return
    }
    restartAction.current = run
    rememberFocus()
    setRestartOpen(true)
  }

  function resolveRestart(choice: 'keep' | 'discard' | 'back') {
    const run = restartAction.current
    restartAction.current = null
    setRestartOpen(false)
    if (choice === 'back' || !run) return
    if (choice === 'discard') commit(cancelSession(ledgerRef.current))
    run()
  }

  return {
    game,
    preview,
    view,
    settings,
    config,
    ledger,
    session: ledger.session,
    dialog,
    restartOpen,
    paused: dialog !== null || restartOpen,
    returnFocus,
    record,
    alreadyCounted,
    openReview,
    closeDialog,
    saveChoice,
    cancel,
    donate,
    requestRestart,
    resolveRestart,
  }
}

export type GameContribution = ReturnType<typeof useGameContribution>
