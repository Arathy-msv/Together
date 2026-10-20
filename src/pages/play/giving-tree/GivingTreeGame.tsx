import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Leaderboard } from '../../../components/Leaderboard.tsx'
import { contributionAvailability } from '../../../lib/availability.ts'
import { addContribution, campaignDetailsPath, findContribution } from '../../../lib/campaigns.ts'
import { PAISE_PER_RUPEE, campaignGameSettings, formatPaise } from '../../../lib/gameContribution.ts'
import { readProgress, writeProgress } from '../../../lib/gameLedger.ts'
import {
  CARE_ACTIONS,
  CARE_ORDER,
  campaignPercent,
  canCare,
  chooseAmount,
  clearCart,
  confirmCart,
  formatPercent,
  newGivingTree,
  nextActionId,
  parseGivingTree,
  plantStage,
  recommendedCare,
  recordCare,
  suggestedPaise,
  treeStage,
  type CareKind,
  type GivingTreeState,
} from '../../../lib/givingTree.ts'
import { formatINR, plural } from '../../../lib/format.ts'
import { activeReferral, currentPlayer } from '../../../lib/players.ts'
import { loadStore } from '../../../lib/storage.ts'
import type { CampaignView } from '../../../lib/types.ts'
import { CoinFlight, type Point } from './CoinFlight.tsx'
import { GardenScene, type SceneEffect } from './GardenScene.tsx'
import {
  ArrowLeft,
  ArrowRight,
  BookIcon,
  CareIcon,
  CartIcon,
  CheckIcon,
  CloseIcon,
  CloudCheck,
  LeafPoints,
  SproutMark,
  TogetherLeaf,
} from './icons.tsx'
import { AmountChooser, CartReview, GrowthReference, SuccessBanner, type CampaignSummary } from './Panels.tsx'
import { Sheet } from './Sheet.tsx'
import '../../../styles/giving-tree.css'

const EFFECT_MS: Record<CareKind, number> = { seed: 1500, water: 1800, fertilizer: 1800, sun: 1700 }
const REDUCED_EFFECT_MS = 450

const WORKING: Record<CareKind, string> = {
  seed: 'Planting your seed…',
  water: 'Watering the seedling…',
  fertilizer: 'Adding fertilizer…',
  sun: 'Giving sunlight…',
}

/** Coin start height as a share of the plant frame, per growth stage. */
const PLANT_TOP = [0.18, 0.28, 0.5, 0.68, 0.82]

type Panel = 'cart' | 'amount' | 'growth' | null

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches)
  useEffect(() => {
    const media = window.matchMedia?.(query)
    if (!media) return
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}

function loadState(campaignId: string, preview: boolean): GivingTreeState {
  if (preview) return newGivingTree(campaignId)
  const stored = readProgress(campaignId, 'garden', (value) => parseGivingTree(value, campaignId)) ?? newGivingTree(campaignId)
  if (stored.cart.length > 0) {
    const paid = findContribution(stored.checkoutId)
    if (paid) {
      const settled = confirmCart(stored, stored.checkoutId, Math.round(paid.amount * PAISE_PER_RUPEE))
      writeProgress(campaignId, 'garden', settled)
      return settled
    }
  }
  return stored
}

export function GivingTreeGame({ view, preview = false }: { view: CampaignView; preview?: boolean }) {
  const { campaign } = view
  const campaignId = campaign.id
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const compact = useMediaQuery('(max-width: 760px)')
  const settings = useMemo(() => campaignGameSettings(campaign), [campaign])

  const [state, setState] = useState(() => loadState(campaignId, preview))
  const stateRef = useRef(state)
  const [busy, setBusy] = useState<CareKind | null>(null)
  const [effect, setEffect] = useState<SceneEffect | null>(null)
  const [flying, setFlying] = useState<{ id: string; kind: CareKind } | null>(null)
  const [lastKind, setLastKind] = useState<CareKind | null>(null)
  const [toast, setToast] = useState<{ title: string; detail: string; key: number } | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [success, setSuccess] = useState<number | null>(null)
  const [caption, setCaption] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const plantRef = useRef<HTMLDivElement>(null)
  const cartIconRef = useRef<HTMLSpanElement>(null)
  const cartRef = useRef<HTMLButtonElement>(null)
  const timers = useRef<number[]>([])
  const effectKey = useRef(0)
  const confirming = useRef(false)

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])

  const commit = useCallback(
    (next: GivingTreeState) => {
      stateRef.current = next
      setState(next)
      if (!preview) writeProgress(campaignId, 'garden', next)
    },
    [campaignId, preview],
  )

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const raised = view.raised
  const goal = campaign.goalAmount
  const percent = campaignPercent(raised, goal)
  const sharedStage = treeStage(raised, goal)
  const stage = plantStage(state)
  const recommended = recommendedCare(state)
  const summary: CampaignSummary = { title: campaign.title, raised, goal, percent }

  const shownCart = flying ? state.cart.filter((record) => record.id !== flying.id) : state.cart
  const shownPaise = shownCart.reduce((sum, record) => sum + record.pricePaise, 0)
  const backTo = preview ? undefined : campaignDetailsPath(campaignId)

  const blockedReason = useMemo(() => {
    if (preview) return 'Preview only — publish the campaign to try the demo contribution.'
    const store = loadStore()
    const live = store.campaigns.find((item) => item.id === campaignId)
    if (!live) return 'This campaign is no longer saved in this browser.'
    if (!live.participation.game) return 'Game-based giving is no longer open on this campaign.'
    const availability = contributionAvailability(live, store.contributions)
    return availability.ok ? null : availability.reason
    // Re-check whenever campaign totals or status change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, campaignId, view])

  function land(kind: CareKind) {
    setFlying(null)
    const cart = cartRef.current
    if (cart) {
      cart.classList.remove('is-pulse')
      void cart.offsetWidth
      cart.classList.add('is-pulse')
    }
    setBusy(null)
    setCaption(null)
    const action = CARE_ACTIONS[kind]
    setToast({ title: action.done, detail: `+ ${formatPaise(action.pricePaise)} suggested`, key: Date.now() })
  }

  function care(kind: CareKind) {
    if (busy || panel || !canCare(stateRef.current, kind)) return
    const actionId = nextActionId(stateRef.current, kind)
    setSuccess(null)
    setToast(null)
    setBusy(kind)
    setCaption(WORKING[kind])
    effectKey.current += 1
    setEffect({ kind, key: effectKey.current })
    later(
      () => {
        const result = recordCare(stateRef.current, kind, actionId)
        if (result.outcome !== 'added') {
          setBusy(null)
          setCaption(null)
          setEffect(null)
          return
        }
        commit(result.state)
        setLastKind(kind)
        const action = CARE_ACTIONS[kind]
        setAnnouncement(
          `${action.done}. ${formatPaise(action.pricePaise)} added to your suggested contribution, now ${formatPaise(
            suggestedPaise(result.state),
          )}. You have ${result.state.carePoints} care points.`,
        )
        later(() => setEffect(null), reduced ? 200 : 900)
        if (reduced) {
          land(kind)
          return
        }
        setCaption('Coin to cart')
        setFlying({ id: actionId, kind })
      },
      reduced ? REDUCED_EFFECT_MS : EFFECT_MS[kind],
    )
  }

  const coinStart = useCallback((): Point | null => {
    const box = plantRef.current?.getBoundingClientRect()
    if (!box || box.width === 0) return null
    const ratio = PLANT_TOP[Math.max(0, plantStage(stateRef.current))]
    return { x: box.left + box.width / 2, y: box.bottom - box.height * ratio }
  }, [])

  const coinEnd = useCallback((): Point | null => {
    const box = cartIconRef.current?.getBoundingClientRect()
    if (!box || box.width === 0) return null
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  }, [])

  function openCart() {
    if (busy) return
    setPanel('cart')
  }

  function clearSuggestion() {
    commit(clearCart(stateRef.current))
    setPanel(null)
    setLastKind(null)
    setAnnouncement('Suggestion cleared. Nothing was donated. Your care points are kept.')
  }

  function confirm(amountPaise: number): string | null {
    if (confirming.current) return 'Your contribution is already being confirmed.'
    if (blockedReason) return blockedReason
    const current = stateRef.current
    if (current.cart.length === 0) return 'Care for your plant to start a suggestion first.'
    if (amountPaise % PAISE_PER_RUPEE !== 0 || amountPaise <= 0) return 'Enter a whole rupee amount, like 100.'
    confirming.current = true
    try {
      const giver = currentPlayer(campaignId)
      const suggestion = suggestedPaise(current)
      const saved = addContribution({
        id: current.checkoutId,
        campaignId,
        amount: amountPaise / PAISE_PER_RUPEE,
        method: 'game',
        detail: `Grow a Giving Tree · ${plural(current.cart.length, 'care action')} · suggestion ${formatPaise(suggestion)}${
          amountPaise !== suggestion ? ` · chosen ${formatPaise(amountPaise)}` : ''
        }`,
        playerId: giver?.id,
        playerName: giver?.name,
        referralCode: activeReferral(campaignId, giver?.id),
      })
      commit(confirmCart(current, saved.id, amountPaise))
      setPanel(null)
      setLastKind(null)
      setToast(null)
      setSuccess(amountPaise)
      setAnnouncement(`Demo contribution of ${formatPaise(amountPaise)} confirmed. Your cart is reset and your care points are kept.`)
      return null
    } catch (problem) {
      return problem instanceof Error ? problem.message : 'The contribution could not be saved. Your suggestion is kept.'
    } finally {
      confirming.current = false
    }
  }

  useEffect(() => {
    if (success == null) return
    document.getElementById('gt-success-title')?.focus()
  }, [success])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(id)
  }, [toast])

  const stepCaption =
    panel === 'cart'
      ? 'Review your cart'
      : panel === 'amount'
        ? 'Choose final amount'
        : panel === 'growth'
          ? 'Shared campaign growth'
          : success != null
            ? 'Contribution confirmed'
            : (caption ?? (state.seedPlanted ? `Next: ${CARE_ACTIONS[recommended].next}` : 'Plant a seed'))

  const plantStatus = state.seedPlanted ? `${state.carePoints} care points` : 'Not started'
  const careCount = state.cart.length

  return (
    <>
      <div className={`gt-shell${preview ? ' gt-preview' : ''}`} inert={panel ? true : undefined}>
        <header className="gt-header">
          <div className="gt-header-left">
            {preview ? (
              <span className="gt-brand">
                <TogetherLeaf /> Together
              </span>
            ) : (
              <Link to="/" className="gt-brand" aria-label="Together home">
                <TogetherLeaf /> Together
              </Link>
            )}
            <span className="gt-header-rule" aria-hidden="true" />
            {backTo ? (
              <Link to={backTo} className="gt-back">
                <ArrowLeft /> Back to campaign
              </Link>
            ) : (
              <span className="gt-back">Grow a Giving Tree</span>
            )}
          </div>
          <span className="gt-demo">{preview ? 'Preview' : 'Demo'}</span>
        </header>
        <p className="gt-step" aria-live="polite">
          {stepCaption}
        </p>

        <div className="gt-strip">
          <section className="gt-campaign" aria-label="Campaign progress">
            <span className="gt-campaign-icon">
              <BookIcon />
            </span>
            <h1 className="gt-campaign-title">{campaign.title}</h1>
            <span className="gt-strip-rule" aria-hidden="true" />
            <div className="gt-progress">
              <span className="gt-progress-label">Shared campaign growth</span>
              <div
                className="gt-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-valuetext={`${formatINR(raised)} of ${formatINR(goal)}, ${formatPercent(percent)}`}
                aria-label="Shared campaign growth"
              >
                <span style={{ width: `${percent}%` }} />
              </div>
            </div>
            <p className="gt-progress-figures">
              <strong>{formatINR(raised)}</strong> / {formatINR(goal)} <span aria-hidden="true">•</span> {formatPercent(percent)}
            </p>
          </section>

          <button
            type="button"
            className="gt-cart"
            ref={cartRef}
            onAnimationEnd={(event) => event.target === event.currentTarget && event.currentTarget.classList.remove('is-pulse')}
            onClick={openCart}
            aria-haspopup="dialog"
            aria-label={`Suggested contribution ${formatPaise(shownPaise)}, ${plural(shownCart.length, 'care action')}. Open cart.`}
          >
            <span className="gt-cart-icon" ref={cartIconRef}>
              <CartIcon />
              {shownCart.length > 0 ? <span className="gt-cart-badge">{shownCart.length}</span> : null}
            </span>
            <span className="gt-cart-copy">
              <span className="gt-cart-label">Suggested contribution</span>
              <span className="gt-cart-value">
                <strong>{formatPaise(shownPaise)}</strong>
                <span aria-hidden="true">•</span>
                {shownCart.length === 0 && state.lastConfirmed ? (
                  <span className="gt-cart-new">New suggestion</span>
                ) : (
                  <span>{plural(shownCart.length, 'care action')}</span>
                )}
              </span>
            </span>
          </button>
        </div>

        <GardenScene
          ref={plantRef}
          plantStage={stage}
          treeStage={sharedStage}
          effect={effect}
          plantStatus={plantStatus}
          treeCaption={`${formatPercent(percent)} complete`}
          onTreeSign={() => setPanel('growth')}
          toast={
            toast ? (
              <div className="gt-toast" key={toast.key}>
                <span className="gt-toast-icon">
                  <SproutMark size={20} />
                </span>
                <span>
                  <strong>{toast.title}</strong>
                  <span>{toast.detail}</span>
                </span>
                <button type="button" onClick={() => setToast(null)} aria-label="Dismiss">
                  <CloseIcon size={14} />
                </button>
              </div>
            ) : null
          }
          overlay={
            success != null ? (
              compact ? null : (
                <SuccessBanner amountPaise={success} backTo={backTo} onContinue={() => setSuccess(null)} />
              )
            ) : !state.seedPlanted && !busy ? (
              <div className="gt-intro">
                <h2>Every little action can help us grow.</h2>
                <p>Care for your plant and, together, we can grow a greener, brighter {campaign.title.replace(/^Grow (our )?/i, '').toLowerCase() || 'campaign'}.</p>
              </div>
            ) : null
          }
        />
        {success != null && compact ? (
          <SuccessBanner amountPaise={success} backTo={backTo} onContinue={() => setSuccess(null)} />
        ) : null}

        <div className="gt-toolbar">
          <div className="gt-actions" role="group" aria-label="Care actions">
            {CARE_ORDER.map((kind) => {
              const action = CARE_ACTIONS[kind]
              const allowed = canCare(state, kind)
              const done = kind === 'seed' && state.seedPlanted
              const working = busy === kind
              const just = !busy && lastKind === kind && !done
              const next = !busy && allowed && kind === recommended
              const status = working ? 'working' : done ? 'done' : just ? 'just' : next ? 'next' : allowed ? 'ready' : 'locked'
              return (
                <button
                  key={kind}
                  type="button"
                  className="gt-action"
                  data-status={status}
                  disabled={!allowed || Boolean(busy)}
                  aria-label={
                    done
                      ? `${action.label}: completed`
                      : `${action.label}: add ${formatPaise(action.pricePaise)} to your suggestion and earn ${action.points} care points${
                          allowed ? '' : '. Plant a seed first'
                        }`
                  }
                  onClick={() => care(kind)}
                >
                  <span className="gt-action-icon">
                    <CareIcon kind={kind} size={30} />
                  </span>
                  <span className="gt-action-copy">
                    <span className="gt-action-name">{action.label}</span>
                    <span className="gt-action-price">{formatPaise(action.pricePaise)}</span>
                  </span>
                  {done || just ? (
                    <span className="gt-action-check" aria-hidden="true">
                      <CheckIcon />
                    </span>
                  ) : next ? (
                    <span className="gt-action-next" aria-hidden="true">
                      Next
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
          <span className="gt-toolbar-rule" aria-hidden="true" />
          <div className="gt-points">
            <LeafPoints />
            <span>
              <span className="gt-points-label">Your care points</span>
              <strong className="gt-points-value">{state.carePoints}</strong>
            </span>
          </div>
          <button type="button" className="gt-review" onClick={openCart} disabled={Boolean(busy)} aria-haspopup="dialog">
            Review &amp; contribute <ArrowRight size={22} />
          </button>
        </div>

        <footer className="gt-footer">
          <p>
            <SproutMark /> Playing adds a suggestion, not a payment.
            {careCount > 0 ? ` ${formatPaise(suggestedPaise(state))} suggested so far.` : ''}
          </p>
          <p>
            <CloudCheck /> {preview ? 'Preview — nothing is saved.' : 'Saved on this device.'}
          </p>
        </footer>

        {campaign.access === 'closed' && !preview ? (
          <div className="gt-leaderboard">
            <Leaderboard campaignId={campaignId} compact />
          </div>
        ) : null}

        <p className="gt-visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>
      </div>

      {flying ? (
        <CoinFlight
          key={flying.id}
          from={coinStart}
          to={coinEnd}
          label={`+${formatPaise(CARE_ACTIONS[flying.kind].pricePaise)}`}
          onLand={() => land(flying.kind)}
        />
      ) : null}

      {panel === 'cart' ? (
        <Sheet labelledBy="gt-cart-title" onClose={() => setPanel(null)}>
          <CartReview
            state={state}
            onReview={() => setPanel('amount')}
            onContinue={() => setPanel(null)}
            onClear={clearSuggestion}
          />
        </Sheet>
      ) : null}
      {panel === 'amount' ? (
        <Sheet labelledBy="gt-amount-title" onClose={() => setPanel(null)} initialFocus="#gt-amount">
          <AmountChooser
            state={state}
            campaign={summary}
            allowCustom={settings.allowCustom}
            blockedReason={blockedReason}
            onSave={(paise) => commit(chooseAmount(stateRef.current, paise))}
            onConfirm={confirm}
            onBack={() => setPanel('cart')}
          />
        </Sheet>
      ) : null}
      {panel === 'growth' ? (
        <Sheet labelledBy="gt-growth-title" onClose={() => setPanel(null)} variant="modal">
          <GrowthReference campaign={summary} stage={sharedStage} />
        </Sheet>
      ) : null}
    </>
  )
}
