import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FeaturePicker } from '../../components/org/FeaturePicker.tsx'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import {
  ALWAYS_INCLUDED,
  clampFeaturesToPlan,
  disableImpact,
  enabledFeatures,
  featureCard,
  FEATURE_KEYS,
  planEntitles,
  type FeatureKey,
  type OrgFeatures,
} from '../../lib/features.ts'
import { saveOrganization } from '../../lib/orgStorage.ts'
import { demoPlan, optionalFeatureNames } from '../../lib/plans.ts'
import { StorageFullError } from '../../lib/storage.ts'

/** Workspace → Settings → Website features */
export function WebsiteFeaturesPage() {
  const { org, workspace } = useOrg()
  const stored = useOrganizations().find((item) => item.id === org.id)!
  const store = useDemoStore()
  const [features, setFeatures] = useState<OrgFeatures>(() => stored.features)
  const [pendingOff, setPendingOff] = useState<FeatureKey | null>(null)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error' | 'warn'; text: string } | null>(null)
  const dirty = useMemo(() => JSON.stringify(features) !== JSON.stringify(stored.features), [features, stored.features])

  useEffect(() => {
    document.title = `Website features — ${org.name}`
  }, [org.name])

  useEffect(() => {
    setFeatures(stored.features)
  }, [stored.features, stored.updatedAt])

  function requestChange(next: OrgFeatures) {
    setNotice(null)
    for (const key of FEATURE_KEYS) {
      if (stored.features[key] && !next[key]) {
        const impact = disableImpact(stored, key, store)
        if (impact.blocked) {
          setNotice({ tone: 'error', text: impact.summary.join(' ') })
          setPendingOff(null)
          return
        }
        setPendingOff(key)
        setFeatures(next)
        setNotice({ tone: 'warn', text: impact.summary.join(' ') })
        return
      }
    }
    setPendingOff(null)
    setFeatures(clampFeaturesToPlan(next, stored.plan.id))
  }

  function save() {
    if (pendingOff) {
      const impact = disableImpact({ ...stored, features }, pendingOff, store)
      if (impact.blocked) {
        setNotice({ tone: 'error', text: impact.summary.join(' ') })
        return
      }
    }
    try {
      saveOrganization({ ...stored, features: clampFeaturesToPlan(features, stored.plan.id) })
      setPendingOff(null)
      setNotice({ tone: 'success', text: 'Website features saved on this device.' })
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof StorageFullError ? error.message : 'This browser could not save your features.',
      })
    }
  }

  function cancel() {
    setFeatures(stored.features)
    setPendingOff(null)
    setNotice(null)
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
            Save changes
          </button>
        </div>
      </header>

      {notice ? (
        <div className={`notice ${notice.tone === 'warn' ? 'warn' : notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </div>
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
          {FEATURE_KEYS.some((key) => !planEntitles(stored.plan.id, key))
            ? ' Some cards below are locked until you choose a plan that includes them.'
            : ''}
        </p>
      </section>

      <section className="panel ws-card" aria-labelledby="choose-features-title">
        <h2 id="choose-features-title">Choose what your fundraising website needs.</h2>
        <p className="muted">Start with the essentials. Enabling a feature exposes its tools the next time you need them — no second setup form.</p>
        <FeaturePicker
          features={features}
          planId={stored.plan.id}
          orgType={stored.type}
          onChange={requestChange}
          showRecommendations={false}
        />
      </section>
    </div>
  )
}
