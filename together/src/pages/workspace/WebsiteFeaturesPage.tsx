import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FeaturePicker } from '../../components/org/FeaturePicker.tsx'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { useVoucherStore } from '../../hooks/useVoucherStore.ts'
import {
  ALWAYS_INCLUDED,
  capabilityName,
  clampFeaturesToPlan,
  disableImpact,
  enabledFeatures,
  featureCard,
  FEATURE_KEYS,
  planEntitles,
  VOUCHER_CAPABILITIES,
  voucherSelectionError,
  type FeatureKey,
  type OrgFeatures,
  type VoucherCapability,
  type VoucherSettings,
} from '../../lib/features.ts'
import { formatDateTime, formatMoney } from '../../lib/format.ts'
import { currentActorId, userName } from '../../lib/identity.ts'
import { saveOrganizationAs } from '../../lib/orgActions.ts'
import { demoPlan, optionalFeatureNames } from '../../lib/plans.ts'
import type { FeatureChange, Organization } from '../../lib/types.ts'
import { pauseOffersForCapabilities, voucherDisableImpact } from '../../lib/vouchers.ts'

type Notice = { tone: 'success' | 'error'; text: string } | null

/** Voucher capabilities that are effectively on (module on and capability selected). */
function activeCapabilities(features: OrgFeatures, settings: VoucherSettings): VoucherCapability[] {
  if (!features.partnerVouchers) return []
  return VOUCHER_CAPABILITIES.map((item) => item.key).filter((key) => settings[key])
}

/** Workspace → Settings → Website features */
export function WebsiteFeaturesPage() {
  const { org } = useOrg()
  const stored = useOrganizations().find((item) => item.id === org.id)!
  return <FeaturesEditor key={`${stored.id}-${stored.updatedAt}`} stored={stored} />
}

function FeaturesEditor({ stored }: { stored: Organization }) {
  const { org, workspace } = useOrg()
  const store = useDemoStore()
  const vouchers = useVoucherStore()
  const [features, setFeatures] = useState<OrgFeatures>(stored.features)
  const [voucherSettings, setVoucherSettings] = useState<VoucherSettings>(stored.voucherSettings)
  const [confirming, setConfirming] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  useEffect(() => {
    document.title = `Website features — ${org.name}`
  }, [org.name])

  const dirty = JSON.stringify(features) !== JSON.stringify(stored.features) || JSON.stringify(voucherSettings) !== JSON.stringify(stored.voucherSettings)
  const voucherError = voucherSelectionError(features, voucherSettings)

  const turnedOff = useMemo(() => FEATURE_KEYS.filter((key) => stored.features[key] && !features[key]), [stored.features, features])
  const capabilitiesOff = useMemo(() => {
    const now = new Set(activeCapabilities(features, voucherSettings))
    return activeCapabilities(stored.features, stored.voucherSettings).filter((key) => !now.has(key))
  }, [stored, features, voucherSettings])

  const featureImpacts = turnedOff.filter((key) => key !== 'partnerVouchers').map((key) => ({ key, ...disableImpact(stored, key, store) }))
  const blocked = featureImpacts.filter((impact) => impact.blocked)
  const voucherImpact = capabilitiesOff.length > 0 ? voucherDisableImpact(stored, vouchers, capabilitiesOff) : null
  const needsConfirmation = featureImpacts.length > 0 || voucherImpact !== null

  function cancel() {
    setFeatures(stored.features)
    setVoucherSettings(stored.voucherSettings)
    setConfirming(false)
    setNotice(null)
  }

  function save() {
    if (voucherError) {
      setNotice({ tone: 'error', text: voucherError })
      return
    }
    if (blocked.length > 0) {
      setNotice({ tone: 'error', text: blocked.flatMap((impact) => impact.summary).join(' ') })
      return
    }
    if (needsConfirmation && !confirming) {
      setConfirming(true)
      return
    }
    const nextFeatures = clampFeaturesToPlan(features, stored.plan.id)
    const at = new Date().toISOString()
    const actorId = currentActorId()
    const history: FeatureChange[] = [
      ...FEATURE_KEYS.filter((key) => stored.features[key] !== nextFeatures[key]).map((key) => ({ key, enabled: nextFeatures[key], at, actorId })),
      ...VOUCHER_CAPABILITIES.map((item) => item.key)
        .filter((key) => stored.voucherSettings[key] !== voucherSettings[key])
        .map((key) => ({ key: `voucher:${key}` as const, enabled: voucherSettings[key], at, actorId })),
    ]
    try {
      const paused = pauseOffersForCapabilities(stored.id, capabilitiesOff)
      saveOrganizationAs('org.manageFeatures', { ...stored, features: nextFeatures, voucherSettings, featureHistory: [...stored.featureHistory, ...history].slice(-100) }, 'features.changed')
      setConfirming(false)
      setNotice({
        tone: 'success',
        text: `Website features saved on this device.${paused ? ` ${paused} partner offer${paused === 1 ? ' was' : 's were'} paused; re-activate them yourself if you turn this back on.` : ''}`,
      })
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'This browser could not save your features.' })
    }
  }

  const included = optionalFeatureNames(stored.plan.id)
  const enabled = enabledFeatures({ ...stored, features }).map((key) => featureCard(key).name)

  return (
    <div className="container page-pad">
      <Link to={`${workspace}/settings`} className="back-link page-back">
        ← Back to settings
      </Link>
      <header className="settings-head">
        <div>
          <p className="settings-kicker">
            <span className="demo-badge">Demo</span> {demoPlan(stored.plan.id).name}
          </p>
          <h1>Website features</h1>
          <p className="muted">Choose optional features for {org.name}. Essentials stay on for every organization.</p>
        </div>
        <div className="inline-actions">
          <button type="button" className="btn btn-outline" disabled={!dirty} onClick={cancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!dirty} onClick={save}>
            {confirming ? 'Confirm and save' : 'Save changes'}
          </button>
        </div>
      </header>

      {notice ? (
        <div className={`notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </div>
      ) : null}

      {dirty && (needsConfirmation || blocked.length > 0) ? (
        <section className="panel ws-card impact-panel" aria-labelledby="impact-title">
          <h2 id="impact-title">{blocked.length > 0 ? 'Resolve this first' : 'Before you turn this off'}</h2>
          <ul className="impact-list">
            {featureImpacts.map((impact) => (
              <li key={impact.key} className={impact.blocked ? 'blocked' : ''}>
                <strong>{featureCard(impact.key as FeatureKey).name}:</strong> {impact.summary.join(' ')}
              </li>
            ))}
          </ul>
          {voucherImpact ? (
            <div className="voucher-impact">
              <h3>Give &amp; Get Local — {turnedOff.includes('partnerVouchers') ? 'whole module' : capabilitiesOff.map(capabilityName).join(', ')}</h3>
              <dl className="detail-list">
                <div>
                  <dt>Active offers affected</dt>
                  <dd>
                    {voucherImpact.activeOffers.length === 0
                      ? 'None'
                      : `${voucherImpact.activeOffers.length} will be paused: ${voucherImpact.activeOffers.map((offer) => offer.title).join(', ')}`}
                  </dd>
                </div>
                <div>
                  <dt>Outstanding issued vouchers</dt>
                  <dd>{voucherImpact.outstandingVouchers} — they stay valid and redeemable.</dd>
                </div>
                <div>
                  <dt>Pending merchant benefits</dt>
                  <dd>
                    {voucherImpact.pendingBenefits === 0
                      ? 'None'
                      : `${voucherImpact.pendingBenefits} (${formatMoney(voucherImpact.pendingBenefitTotal, org.defaults.currency)}) — still settled under Partner offers.`}
                  </dd>
                </div>
                <div>
                  <dt>What stays accessible</dt>
                  <dd>
                    <ul>
                      {voucherImpact.remains.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
              <p className="muted small">New issuance and purchases stop and new offers are hidden from supporters. Nothing issued is cancelled.</p>
            </div>
          ) : null}
          {blocked.length === 0 ? <p className="small">Select “Confirm and save” to apply these changes.</p> : null}
        </section>
      ) : null}

      <section className="panel ws-card" aria-labelledby="plan-features-title">
        <h2 id="plan-features-title">Current plan</h2>
        <dl className="detail-list">
          <div>
            <dt>Demo plan</dt>
            <dd>
              {demoPlan(stored.plan.id).name} · <Link to={`${workspace}/plan`}>View or change plan</Link>
            </dd>
          </div>
          <div>
            <dt>Included optional features</dt>
            <dd>{included.join(' · ')}</dd>
          </div>
          <div>
            <dt>Currently enabled</dt>
            <dd>{enabled.length ? enabled.join(' · ') : 'None — essentials only'}</dd>
          </div>
          <div>
            <dt>Always included</dt>
            <dd>{ALWAYS_INCLUDED.join(' · ')}</dd>
          </div>
        </dl>
        <p className="muted small">
          Features not in your demo plan stay off. Changing plan does not invent prices or collect payment.
          {FEATURE_KEYS.some((key) => !planEntitles(stored.plan.id, key)) ? ' Some cards below are locked until you choose a plan that includes them.' : ''}
        </p>
      </section>

      <section className="panel ws-card" aria-labelledby="choose-features-title">
        <h2 id="choose-features-title">Choose what your fundraising website needs.</h2>
        <p className="muted">Start with the essentials. Enabling a feature exposes its tools the next time you need them — no second setup form.</p>
        <FeaturePicker
          features={features}
          voucherSettings={voucherSettings}
          planId={stored.plan.id}
          orgType={stored.type}
          onChange={(next) => {
            setFeatures(next)
            setConfirming(false)
            setNotice(null)
          }}
          onVoucherSettingsChange={(next) => {
            setVoucherSettings(next)
            setConfirming(false)
            setNotice(null)
          }}
          voucherError={voucherError}
          showRecommendations={false}
        />
      </section>

      <section className="panel ws-card" aria-labelledby="history-title">
        <h2 id="history-title">Feature change history</h2>
        {stored.featureHistory.length === 0 ? (
          <p className="muted small">No changes since setup.</p>
        ) : (
          <ul className="ws-list compact">
            {[...stored.featureHistory].reverse().slice(0, 20).map((change, index) => (
              <li key={`${change.at}-${change.key}-${index}`}>
                <span>
                  <strong>{change.key.startsWith('voucher:') ? capabilityName(change.key.slice(8) as VoucherCapability) : featureCard(change.key as FeatureKey).name}</strong>{' '}
                  {change.enabled ? 'turned on' : 'turned off'}
                </span>
                <span className="muted small">
                  {formatDateTime(change.at)}
                  {change.actorId ? ` · ${userName(change.actorId)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
