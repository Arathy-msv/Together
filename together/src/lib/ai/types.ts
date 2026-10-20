/*
 * Shared shapes for AI-assisted features.
 *
 * Every suggestion in this prototype comes from a deterministic mock (see mock.ts). Results are
 * suggestions only: callers keep them separate from saved data until the organizer applies them.
 *
 * Boundary for a future real model: campaign text, updates and documents are *source data*. They
 * are passed as data fields, never concatenated into instructions, and nothing in them can change
 * readiness rules, financial calculations, validation or permissions — those stay in app code.
 */

export const SIMULATION_LABEL = 'AI preview · Simulated' as const

export type SourceKind = 'campaign' | 'milestone' | 'expense' | 'update' | 'document' | 'referral' | 'organization' | 'sample' | 'answer'

export interface SourceRef {
  kind: SourceKind
  id: string
  label: string
}

export interface AiResult<T> {
  content: T
  /** Information the organizer still needs to supply. Never filled in by the assistant. */
  missing: string[]
  sources: SourceRef[]
  label: typeof SIMULATION_LABEL
}

export class AiError extends Error {}

export class AiCancelledError extends Error {
  constructor() {
    super('Request cancelled')
  }
}

export function result<T>(content: T, extras: { missing?: string[]; sources?: SourceRef[] } = {}): AiResult<T> {
  return { content, missing: extras.missing ?? [], sources: extras.sources ?? [], label: SIMULATION_LABEL }
}

/** Placeholder the organizer must replace before the text is usable. */
export function placeholder(text: string): string {
  return `[${text}]`
}

export function hasPlaceholder(text: string): boolean {
  return /\[[^\]]+\]/.test(text)
}
