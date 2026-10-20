import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrgBase } from '../components/org/OrgContext.tsx'
import { snapshotReferral } from '../lib/attribution.ts'
import { contributionAvailability } from '../lib/availability.ts'
import { findContribution } from '../lib/campaigns.ts'
import {
  beginCheckout,
  campaignGameSettings,
  cancelSession,
  contributionRuleMessage,
  emptyLedger,
  formatPaise,
  gameConfig,
  hasAction,
  recordAction,
  returnToPending,
  selectedPaise,
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
  /** Overrides the campaign rate for this one action, in paise. */
  amountPaise?: number
  /** Records the suggestion without opening the checkpoint dialog. */
  quiet?: boolean
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
  const base = useOrgBase()
  const settings = useMemo(() => campaignGameSettings(view.campaign), [view.campaign])
  const config = gameConfig(game)
  const [ledger, setLedger] = useState(() => initialLedger(campaignId, game, preview))
  const ledgerRef = useRef(ledger)
  const [dialog, setDialog] = useState<CheckpointInfo | null>(null)
  const [newSessionOpen, setNewSessionOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ id: number; text: string } | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback((current) => (current?.id === feedback.id ? null : current)), 5000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const notify = useCallback((text: string) => setFeedback({ id: Date.now() + Math.random(), text }), [])

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

  /**
   * Records a completed action exactly once. Ordinary actions get a short status message so play is
   * never interrupted; finishing a round opens the checkpoint. Returns false for repeats.
   */
  const record = useCallback(
    (input: RecordInput): boolean => {
      const result = recordAction(
        ledgerRef.current,
        { actionId: input.actionId, roundId: input.roundId, label: input.label, amountPaise: input.amountPaise },
        settings,
      )
      if (result.outcome === 'duplicate') return false
      commit(result.ledger)
      if (input.quiet) return true
      if (!input.roundComplete) {
        const total = result.ledger.session?.suggestedPaise ?? 0
        notify(
          result.outcome === 'capped' && result.addedPaise === 0
            ? `${input.heading} Giving limit reached, so the suggestion stays at ${formatPaise(total)}.`
            : `${input.heading} +${formatPaise(result.addedPaise)} · suggestion now ${formatPaise(total)}.`,
        )
        return true
      }
      rememberFocus()
      setDialog({
        mode: 'checkpoint',
        heading: input.heading,
        latestPaise: result.addedPaise,
        outcome: result.outcome,
        roundComplete: true,
      })
      return true
    },
    [commit, settings, notify],
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
    snapshotReferral(session.id, campaignId)
    commit(next)
    setDialog(null)
    navigate(`${base}/campaigns/${campaignId}/confirm?session=${encodeURIComponent(session.id)}`)
    return null
  }

  /** A fresh board keeps the pending suggestion; only starting a new session clears it. */
  function requestRestart(run: () => void) {
    run()
    const session = ledgerRef.current.session
    if (session) notify(`New board. Your ${formatPaise(selectedPaise(session))} suggestion is kept.`)
  }

  function requestNewSession() {
    if (!ledgerRef.current.session) return
    rememberFocus()
    setNewSessionOpen(true)
  }

  /** Clears only the pending suggestion. Confirmed contributions live in the store and are never touched. */
  function resolveNewSession(confirmed: boolean) {
    setNewSessionOpen(false)
    if (!confirmed) return
    commit(cancelSession(ledgerRef.current))
    notify('New session started. Your suggestion is back to zero. Confirmed contributions are not affected.')
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
    newSessionOpen,
    feedback,
    paused: dialog !== null || newSessionOpen,
    returnFocus,
    record,
    alreadyCounted,
    openReview,
    closeDialog,
    saveChoice,
    cancel,
    donate,
    requestRestart,
    requestNewSession,
    resolveNewSession,
  }
}

export type GameContribution = ReturnType<typeof useGameContribution>
