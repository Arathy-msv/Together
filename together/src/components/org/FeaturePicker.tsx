import { useState } from 'react'
import {
  FEATURE_CARDS,
  FEATURE_KEYS,
  planEntitles,
  recommendationReasons,
  recommendedFeatures,
  VOUCHER_CAPABILITIES,
  VOUCHER_SETUP_NOTE,
  type FeatureKey,
  type OrgFeatures,
  type VoucherSettings,
} from '../../lib/features.ts'
import { DEMO_PLANS } from '../../lib/plans.ts'
import type { OrgType, PlanId } from '../../lib/types.ts'

function sameFeatures(a: OrgFeatures, b: OrgFeatures): boolean {
  return FEATURE_KEYS.every((key) => Boolean(a[key]) === Boolean(b[key]))
}

/** Plans that include a feature, for a clear “not included” explanation. */
function plansWith(key: FeatureKey): string {
  return DEMO_PLANS.filter((plan) => plan.optionalFeatures.includes(key))
    .map((plan) => plan.name)
    .join(' or ')
}

/** Friendly cards for choosing optional website features during setup or in Settings. */
export function FeaturePicker({
  features,
  voucherSettings,
  planId,
  orgType,
  onChange,
  onVoucherSettingsChange,
  voucherError,
  showRecommendations = true,
}: {
  features: OrgFeatures
  voucherSettings: VoucherSettings
  planId: PlanId
  orgType: OrgType
  onChange: (next: OrgFeatures) => void
  onVoucherSettingsChange: (next: VoucherSettings) => void
  voucherError?: string
  showRecommendations?: boolean
}) {
  function setKey(key: FeatureKey, enabled: boolean) {
    if (!planEntitles(planId, key) && enabled) return
    onChange({ ...features, [key]: enabled })
  }

  const recommended = recommendedFeatures(orgType, planId)
  const [mode, setMode] = useState<'recommended' | 'individual'>(() => (showRecommendations && sameFeatures(features, recommended) ? 'recommended' : 'individual'))
  const showCards = !showRecommendations || mode === 'individual'

  const voucherFields = (
    <fieldset className="voucher-capabilities" aria-describedby="voucher-note">
      <legend>Choose one or more partner voucher capabilities</legend>
      {VOUCHER_CAPABILITIES.map((capability) => (
        <label key={capability.key} className="voucher-capability">
          <input
            type="checkbox"
            checked={voucherSettings[capability.key]}
            onChange={(event) => onVoucherSettingsChange({ ...voucherSettings, [capability.key]: event.target.checked })}
          />
          <span>
            <strong>{capability.name}</strong>
            <em>{capability.explanation}</em>
          </span>
        </label>
      ))}
      <p id="voucher-note" className="muted small">
        {VOUCHER_SETUP_NOTE}
      </p>
      {voucherError ? (
        <p className="error-text" role="alert">
          {voucherError}
        </p>
      ) : null}
    </fieldset>
  )

  return (
    <div className="feature-picker">
      {showRecommendations ? (
        <fieldset className="feature-mode">
          <legend className="sr-only">How do you want to choose features?</legend>
          <label className={mode === 'recommended' ? 'feature-mode-option selected' : 'feature-mode-option'}>
            <input
              type="radio"
              name="feature-mode"
              checked={mode === 'recommended'}
              onChange={() => {
                setMode('recommended')
                onChange(recommended)
              }}
            />
            <span>
              <strong>Use recommended settings</strong>
              <em>A starting set for your type of organization and plan. You can change it later in Settings.</em>
            </span>
          </label>
          <label className={mode === 'individual' ? 'feature-mode-option selected' : 'feature-mode-option'}>
            <input type="radio" name="feature-mode" checked={mode === 'individual'} onChange={() => setMode('individual')} />
            <span>
              <strong>Choose individually</strong>
              <em>See every optional feature and switch each one on or off.</em>
            </span>
          </label>
        </fieldset>
      ) : null}

      {showRecommendations && mode === 'recommended' ? (
        <div className="feature-reco">
          <strong>Included with the recommended settings</strong>
          <ul className="feature-reasons">
            {FEATURE_KEYS.filter((key) => features[key] && planEntitles(planId, key)).map((key) => (
              <li key={key}>{FEATURE_CARDS.find((item) => item.key === key)!.name}</li>
            ))}
          </ul>
          <span className="muted small">Why these:</span>
          <ul className="feature-reasons">
            {recommendationReasons(orgType, planId).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {features.partnerVouchers ? voucherFields : null}
        </div>
      ) : null}

      {showCards ? (
      <ul className="feature-cards">
        {FEATURE_KEYS.map((key) => {
          const card = FEATURE_CARDS.find((item) => item.key === key)!
          const entitled = planEntitles(planId, key)
          const checked = Boolean(features[key]) && entitled
          return (
            <li key={key} className={entitled ? (checked ? 'feature-card on' : 'feature-card') : 'feature-card locked'}>
              <div className="feature-card-main">
                <div className="feature-card-text">
                  <strong id={`feature-label-${key}`}>{card.name}</strong>
                  <p>{card.explanation}</p>
                  <p className="muted small">Example: {card.benefit}</p>
                  {!entitled ? (
                    <p className="help">
                      Not included in this demo plan. Available on the {plansWith(key)}. No price is charged in this demo.
                    </p>
                  ) : null}
                </div>
                <label className="feature-toggle">
                  <span className="sr-only">
                    {checked ? 'Disable' : 'Enable'} {card.name}
                  </span>
                  <input
                    id={`feature-${key}`}
                    type="checkbox"
                    role="switch"
                    aria-labelledby={`feature-label-${key}`}
                    checked={checked}
                    disabled={!entitled}
                    onChange={(event) => setKey(key, event.target.checked)}
                  />
                  <span aria-hidden="true">{checked ? 'On' : 'Off'}</span>
                </label>
              </div>
              {key === 'partnerVouchers' && checked ? voucherFields : null}
            </li>
          )
        })}
      </ul>
      ) : null}
    </div>
  )
}
