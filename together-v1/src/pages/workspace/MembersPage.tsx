import { useEffect, useState } from 'react'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { useCampaignViews } from '../../hooks/useDemoStore.ts'
import { useCurrentUser } from '../../hooks/useIdentity.ts'
import { formatDateTime } from '../../lib/format.ts'
import { auditFor, createDemoUser, listUsers, orgAdmins, orgMembers, ROLE_LABEL, userName, type OrgRole } from '../../lib/identity.ts'
import { addMember, removeMember, updateMember } from '../../lib/members.ts'

type Notice = { tone: 'success' | 'error'; text: string } | null

const AUDIT_LABEL: Record<string, string> = {
  'member.added': 'added a member',
  'member.removed': 'removed a member',
  'member.role.changed': 'changed a role',
  'member.campaigns.changed': 'changed campaign assignments',
  'merchant.access.granted': 'gave store access',
  'merchant.access.revoked': 'removed store access',
  'campaign.revision.submitted': 'submitted a campaign revision',
  'campaign.revision.approved': 'approved a campaign revision',
  'campaign.revision.rejected': 'sent a revision back',
  'campaign.published': 'published a campaign',
  'campaign.closed': 'closed fundraising',
  'campaign.deleted': 'deleted a campaign',
  'campaign.draft.discarded': 'discarded a draft',
  'campaign.duplicated': 'reused a campaign',
  'records.exported': 'exported records',
  'organization.created': 'created the organization',
  'platform.plan.changed': 'changed the demo plan (Platform Admin)',
}

/** /workspace/:id/members — Organization Admins manage members and campaign assignments. */
export function MembersPage() {
  const { org } = useOrg()
  const user = useCurrentUser()
  const campaigns = useCampaignViews().map((view) => view.campaign)
  const members = orgMembers(org.id)
  const admins = orgAdmins(org.id)
  const [notice, setNotice] = useState<Notice>(null)
  const [newUserId, setNewUserId] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<OrgRole>('campaign_organizer')

  useEffect(() => {
    document.title = `Members — ${org.name}`
  }, [org.name])

  function run(action: () => void, success: string) {
    try {
      action()
      setNotice({ tone: 'success', text: success })
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'That change could not be saved.' })
    }
  }

  const candidates = listUsers().filter((item) => !members.some((member) => member.userId === item.id) && item.id !== user?.id)

  return (
    <div className="container page-pad members-page">
      <header className="page-head">
        <div>
          <h1>Members</h1>
          <p className="muted">
            Organization Admins manage everything in this organization. Campaign Organizers work only on the campaigns assigned to them. Demo identities are simulated —
            this is not real sign-in.
          </p>
        </div>
      </header>
      {notice ? (
        <div className={`notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </div>
      ) : null}

      <section className="panel ws-card" aria-labelledby="members-title">
        <h2 id="members-title">People in this organization</h2>
        {admins.length < 2 ? (
          <p className="notice warn compact">
            Only one Organization Admin. If you turn on campaign review, a second admin is needed to approve revisions that admin authors.
          </p>
        ) : null}
        <ul className="member-list">
          {members.map((member) => {
            const self = member.userId === user?.id
            const lastAdmin = member.role === 'org_admin' && admins.length === 1
            return (
              <li key={member.userId} className="member">
                <div className="member-head">
                  <div>
                    <strong>
                      {userName(member.userId)}
                      {self ? ' (you)' : ''}
                    </strong>
                    <span className="muted small">
                      {ROLE_LABEL[member.role]} · added {formatDateTime(member.addedAt)} by {userName(member.addedBy)}
                    </span>
                  </div>
                  {self ? (
                    <span className="muted small">You can’t change your own role.</span>
                  ) : (
                    <div className="inline-actions">
                      <label className="sr-only" htmlFor={`role-${member.userId}`}>
                        Role for {userName(member.userId)}
                      </label>
                      <select
                        id={`role-${member.userId}`}
                        value={member.role}
                        disabled={lastAdmin}
                        onChange={(event) => run(() => updateMember(org.id, member.userId, { role: event.target.value as OrgRole }), 'Role updated.')}
                      >
                        <option value="org_admin">{ROLE_LABEL.org_admin}</option>
                        <option value="campaign_organizer">{ROLE_LABEL.campaign_organizer}</option>
                      </select>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={lastAdmin}
                        title={lastAdmin ? 'The last Organization Admin can’t be removed.' : undefined}
                        onClick={() => run(() => removeMember(org.id, member.userId), `${userName(member.userId)} was removed. Their campaigns and history are kept.`)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                {lastAdmin && !self ? <p className="muted small">The last Organization Admin can’t be removed or changed.</p> : null}
                {member.role === 'campaign_organizer' ? (
                  <fieldset className="set-fieldset" disabled={self}>
                    <legend className="field-label">Assigned campaigns</legend>
                    {campaigns.length === 0 ? <p className="muted small">No campaigns yet.</p> : null}
                    {campaigns.map((campaign) => {
                      const on = member.campaignIds.includes(campaign.id)
                      return (
                        <label key={campaign.id} className="check-row">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() =>
                              run(
                                () => updateMember(org.id, member.userId, { campaignIds: on ? member.campaignIds.filter((id) => id !== campaign.id) : [...member.campaignIds, campaign.id] }),
                                'Campaign assignments updated.',
                              )
                            }
                          />
                          <span>
                            {campaign.title}
                            {campaign.isDraft ? ' (draft)' : ''}
                          </span>
                        </label>
                      )
                    })}
                  </fieldset>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="panel ws-card" aria-labelledby="add-member-title">
        <h2 id="add-member-title">Add a member</h2>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault()
            run(() => {
              const id = newUserId === 'new' ? createDemoUser(newName).id : newUserId
              if (!id) throw new Error('Choose a demo identity.')
              addMember(org.id, id, newRole)
              setNewUserId('')
              setNewName('')
            }, 'Member added.')
          }}
        >
          <label className="field">
            <span className="field-label">Demo identity</span>
            <select value={newUserId} onChange={(event) => setNewUserId(event.target.value)}>
              <option value="">Choose…</option>
              {candidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
              <option value="new">Create a new demo identity…</option>
            </select>
          </label>
          {newUserId === 'new' ? (
            <label className="field">
              <span className="field-label">Name</span>
              <input value={newName} maxLength={60} onChange={(event) => setNewName(event.target.value)} />
            </label>
          ) : null}
          <label className="field">
            <span className="field-label">Role</span>
            <select value={newRole} onChange={(event) => setNewRole(event.target.value as OrgRole)}>
              <option value="campaign_organizer">{ROLE_LABEL.campaign_organizer}</option>
              <option value="org_admin">{ROLE_LABEL.org_admin}</option>
            </select>
          </label>
          <p className="muted small">New organizers start with no campaigns. Assign campaigns after adding them.</p>
          <button type="submit" className="btn btn-primary">
            Add member
          </button>
        </form>
      </section>

      <section className="panel ws-card" aria-labelledby="activity-title">
        <h2 id="activity-title">Recent activity</h2>
        <ul className="ws-list compact">
          {auditFor(org.id)
            .slice(0, 30)
            .map((item) => (
              <li key={item.id}>
                <span>
                  <strong>{userName(item.actorId)}</strong> {AUDIT_LABEL[item.action] ?? item.action}
                  {item.targetId && item.action.startsWith('member') ? ` · ${userName(item.targetId)}` : ''}
                </span>
                <span className="muted small">{formatDateTime(item.at)}</span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  )
}
