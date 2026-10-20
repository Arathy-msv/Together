import type { Campaign, CampaignCategory, CampaignForm, DemoStore, GameType, Organization } from '../types.ts'
import { answerPublicQuestion, type PublicAnswer, type PublicSnapshot } from './answers.ts'
import { checkReadiness, type ReadinessInput, type ReadinessItem } from './readiness.ts'
import { extractSampleReceipt, type ExtractedReceipt } from './receipts.ts'
import { recommendCampaignSetup, type SetupRecommendation } from './setup.ts'
import { previewSampleTranslation, type LanguageCode, type TranslationPreview } from './translations.ts'
import { AiCancelledError, result, type AiResult } from './types.ts'
import {
  draftCampaignUpdate,
  draftImpactReport,
  suggestCampaignDraft,
  suggestReferralMessage,
  type CampaignDraftSuggestion,
  type ImpactReportDraft,
  type ReferralMessageInput,
  type UpdateDraft,
  type UpdateInput,
} from './writers.ts'

/**
 * The only surface UI code uses. A future secure integration would implement this interface on a
 * server (with credentials kept there) and pass campaign content as data, never as instructions.
 */
export interface AssistantService {
  suggestCampaignDraft(input: { form: CampaignForm; org: Organization; allowedGames: GameType[] }, options?: CallOptions): Promise<AiResult<CampaignDraftSuggestion>>
  checkCampaignReadiness(input: ReadinessInput, options?: CallOptions): Promise<AiResult<ReadinessItem[]>>
  draftCampaignUpdate(input: UpdateInput, options?: CallOptions): Promise<AiResult<UpdateDraft>>
  draftImpactReport(input: { campaign: Campaign; store: DemoStore; outcomes: string; plan: string }, options?: CallOptions): Promise<AiResult<ImpactReportDraft>>
  suggestReferralMessage(input: ReferralMessageInput, options?: CallOptions): Promise<AiResult<string[]>>
  answerPublicCampaignQuestion(input: { question: string; snapshot: PublicSnapshot }, options?: CallOptions): Promise<AiResult<PublicAnswer>>
  extractSampleReceipt(input: { sampleId: string }, options?: CallOptions): Promise<AiResult<ExtractedReceipt>>
  previewSampleTranslation(input: { text: string; language: LanguageCode }, options?: CallOptions): Promise<AiResult<TranslationPreview>>
  recommendCampaignSetup(input: { category: CampaignCategory; allowedGames: GameType[] }, options?: CallOptions): Promise<AiResult<SetupRecommendation[]>>
}

export interface CallOptions {
  signal?: AbortSignal
}

/** Modest, deterministic latency so loading states are visible. Tests can set this to 0. */
export const mockSettings = { latencyMs: 450 }

function simulate<T>(work: () => T, options: CallOptions = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) return reject(new AiCancelledError())
    const timer = setTimeout(() => {
      try {
        resolve(work())
      } catch (error) {
        reject(error)
      }
    }, mockSettings.latencyMs)
    options.signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new AiCancelledError())
    })
  })
}

export const mockAssistant: AssistantService = {
  suggestCampaignDraft: ({ form, org, allowedGames }, options) => simulate(() => suggestCampaignDraft(form, org, allowedGames), options),
  checkCampaignReadiness: (input, options) => simulate(() => result(checkReadiness(input)), options),
  draftCampaignUpdate: (input, options) => simulate(() => draftCampaignUpdate(input), options),
  draftImpactReport: ({ campaign, store, outcomes, plan }, options) => simulate(() => draftImpactReport(campaign, store, outcomes, plan), options),
  suggestReferralMessage: (input, options) => simulate(() => suggestReferralMessage(input), options),
  answerPublicCampaignQuestion: ({ question, snapshot }, options) => simulate(() => answerPublicQuestion(question, snapshot), options),
  extractSampleReceipt: ({ sampleId }, options) => simulate(() => extractSampleReceipt(sampleId), options),
  previewSampleTranslation: ({ text, language }, options) => simulate(() => previewSampleTranslation(text, language), options),
  recommendCampaignSetup: ({ category, allowedGames }, options) => simulate(() => recommendCampaignSetup(category, allowedGames), options),
}

/** Swap this for a real implementation later. */
export const assistantService: AssistantService = mockAssistant
