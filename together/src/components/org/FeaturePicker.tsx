import {
  FEATURE_CARDS,
  FEATURE_KEYS,
  planEntitles,
  recommendationReasons,
  recommendedFeatures,
  type FeatureKey,
  type OrgFeatures,
} from '../../lib/features.ts'
import type { OrgType, PlanId } from '../../lib/types.ts'

/** Friendly cards for choosing optional website features during setup or in Settings. */
export function FeaturePicker({
  features,
  planId,
  orgType,
  onChange,
  showRecommendations = true,
}: {
  features: OrgFeatures
  planId: PlanId
  orgType: OrgType
  onChange: (next: OrgFeatures) => void
  showRecommendations?: boolean
}) {
  function setKey(key: FeatureKey, enabled: boolean) {
    if (!planEntitles(planId, key) && enabled) return
    onChange({ ...features, [key]: enabled })
  }

  return (
    <div className="feature-picker">
      {showRecommendations ? (
        <div className="feature-reco">
          <div className="inline-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onChange(recommendedFeatures(orgType, planId))}
            >
              Use recommended settings
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                /* Stay on individual toggles — focus the first available card. */
                document.getElementById('feature-sponsorPlay')?.focus()
              }}
            >
              Choose individually
            </button>
          </div>
          <ul className="feature-reasons">
            {recommendationReasons(orgType, planId).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="feature-cards">
        {FEATURE_KEYS.map((key) => {
          const card = FEATURE_CARDS.find((item) => item.key === key)!
          const entitled = planEntitles(planId, key)
          const checked = Boolean(features[key]) && entitled
          return (
            <li key={key} className={entitled ? (checked ? 'feature-card on' : 'feature-card') : 'feature-card locked'}>
              <div className="feature-card-text">
                <strong id={`feature-label-${key}`}>{card.name}</strong>
                <p>{card.explanation}</p>
                <p className="muted small">Example: {card.benefit}</p>
                {!entitled ? (
                  <p className="help">Not included in this demo plan. Change plan under Settings to unlock it in this prototype.</p>
                ) : null}
              </div>
              <label className="feature-toggle">
                <span className="sr-only">{checked ? 'Disable' : 'Enable'} {card.name}</span>
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
            </li>
          )
        })}
      </ul>
    </div>
  )
}
