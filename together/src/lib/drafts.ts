import { StorageFullError } from './storage.ts'
import type { CampaignForm } from './types.ts'
import { completeForm } from './wizard.ts'

export const DRAFTS_KEY = 'together.campaignDrafts.v1'
const LEGACY_WIZARD_KEY = 'together.wizard.v1'
const LEGACY_ASSISTANT_KEY = 'together.assistantDrafts.v1'

export type DraftKind = 'form' | 'assistant'

export interface CampaignDraft {
  id: string
  organizationId: string
  kind: DraftKind
  form: CampaignForm
  /** Form step (1–3) or assistant question id. */
  step: string
  createdAt: string
  updatedAt: string
}

interface DraftFile {
  version: 1
  drafts: CampaignDraft[]
}

function parseDraft(value: unknown): CampaignDraft | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<CampaignDraft>
  if (typeof raw.id !== 'string' || typeof raw.organizationId !== 'string' || !raw.form || typeof raw.form !== 'object') return null
  const at = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : new Date(0).toISOString())
  return {
    id: raw.id,
    organizationId: raw.organizationId,
    kind: raw.kind === 'assistant' ? 'assistant' : 'form',
    form: completeForm({ ...raw.form, organizationId: raw.organizationId }),
    step: typeof raw.step === 'string' ? raw.step : String(raw.step ?? '1'),
    createdAt: at(raw.createdAt),
    updatedAt: at(raw.updatedAt),
  }
}

function readFile(): CampaignDraft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY)
    if (!raw) return migrateLegacy()
    const parsed: unknown = JSON.parse(raw)
    const list = parsed && typeof parsed === 'object' ? (parsed as Partial<DraftFile>).drafts : undefined
    return Array.isArray(list) ? list.map(parseDraft).filter((draft): draft is CampaignDraft => draft !== null) : []
  } catch {
    return []
  }
}

function writeFile(drafts: CampaignDraft[]): void {
  const file: DraftFile = { version: 1, drafts }
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(file))
}

/** Imports drafts saved by earlier versions (session wizard and one assistant draft per organization). */
function migrateLegacy(): CampaignDraft[] {
  const drafts: CampaignDraft[] = []
  const now = new Date().toISOString()
  try {
    const wizard = sessionStorage.getItem(LEGACY_WIZARD_KEY)
    if (wizard) {
      const snapshot = JSON.parse(wizard) as { form?: CampaignForm; step?: number }
      const draft = snapshot.form && parseDraft({ id: newDraftId(), organizationId: snapshot.form.organizationId, kind: 'form', form: snapshot.form, step: String(snapshot.step ?? 1), createdAt: now, updatedAt: now })
      if (draft) drafts.push(draft)
      sessionStorage.removeItem(LEGACY_WIZARD_KEY)
    }
  } catch {
    // Ignore unreadable legacy data.
  }
  try {
    const assistant = localStorage.getItem(LEGACY_ASSISTANT_KEY)
    if (assistant) {
      const map = JSON.parse(assistant) as Record<string, { form?: CampaignForm; step?: string; savedAt?: string }>
      for (const [organizationId, saved] of Object.entries(map ?? {})) {
        const draft = parseDraft({ id: newDraftId(), organizationId, kind: 'assistant', form: saved?.form, step: saved?.step ?? 'purpose', createdAt: saved?.savedAt ?? now, updatedAt: saved?.savedAt ?? now })
        if (draft) drafts.push(draft)
      }
      localStorage.removeItem(LEGACY_ASSISTANT_KEY)
    }
  } catch {
    // Ignore unreadable legacy data.
  }
  try {
    writeFile(drafts)
  } catch {
    // Keep them in memory for this visit.
  }
  return drafts
}

export function newDraftId(): string {
  return `draft_${crypto.randomUUID()}`
}

/** Drafts for one organization, most recently edited first. */
export function listDrafts(organizationId: string, kind?: DraftKind): CampaignDraft[] {
  return readFile()
    .filter((draft) => draft.organizationId === organizationId && (!kind || draft.kind === kind))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

export function readDraft(id: string, organizationId: string): CampaignDraft | null {
  return readFile().find((draft) => draft.id === id && draft.organizationId === organizationId) ?? null
}

/** Saves one draft without touching the others. Throws StorageFullError when the browser refuses. */
export function saveDraft(draft: Omit<CampaignDraft, 'updatedAt' | 'createdAt'> & { createdAt?: string }): CampaignDraft {
  const drafts = readFile()
  const now = new Date().toISOString()
  const existing = drafts.find((item) => item.id === draft.id)
  const next: CampaignDraft = { ...draft, createdAt: existing?.createdAt ?? draft.createdAt ?? now, updatedAt: now }
  const index = drafts.findIndex((item) => item.id === draft.id)
  if (index >= 0) drafts[index] = next
  else drafts.push(next)
  try {
    writeFile(drafts)
  } catch {
    throw new StorageFullError()
  }
  return next
}

export function deleteDraft(id: string): void {
  try {
    writeFile(readFile().filter((draft) => draft.id !== id))
  } catch {
    // Nothing else to do; the draft stays until storage frees up.
  }
}

export function draftTitle(draft: CampaignDraft): string {
  return draft.form.title.trim() || draft.form.description.trim().slice(0, 50) || 'Untitled campaign'
}
