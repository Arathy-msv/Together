import { useId, useState, type FormEvent } from 'react'
import { useAiRequest } from '../../hooks/useAiRequest.ts'
import { buildPublicSnapshot, SUGGESTED_QUESTIONS, type PublicAnswer } from '../../lib/ai/answers.ts'
import { assistantService } from '../../lib/ai/service.ts'
import type { AiResult } from '../../lib/ai/types.ts'
import { formatDate } from '../../lib/format.ts'
import type { Campaign, DemoStore } from '../../lib/types.ts'
import { AiBadge, SparkIcon } from './AiUI.tsx'

type Tab = NonNullable<PublicAnswer['tab']>
const TAB_LABEL: Record<Tab, string> = { story: 'Story', updates: 'Updates', fund: 'How funds are used', trust: 'How funds are used' }

interface Exchange {
  id: number
  question: string
  answer: AiResult<PublicAnswer>
}

/**
 * "Ask about this campaign" for supporters. Answers come only from this campaign's public
 * information and never guarantee legitimacy, delivery or financial accuracy. This is separate from
 * the organizer's campaign creation assistant.
 */
export function CampaignQuestions({ campaign, store, onOpenTab }: { campaign: Campaign; store: DemoStore; onOpenTab: (tab: Tab) => void }) {
  const inputId = useId()
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState<Exchange[]>([])
  const request = useAiRequest<AiResult<PublicAnswer>>()

  function ask(text: string) {
    const asked = text.trim()
    if (!asked) return
    const snapshot = buildPublicSnapshot(campaign, store)
    void request.run((signal) => assistantService.answerPublicCampaignQuestion({ question: asked, snapshot }, { signal })).then((answer) => {
      if (!answer) return
      setHistory((current) => [{ id: Date.now(), question: asked, answer }, ...current].slice(0, 5))
      setQuestion('')
    })
  }

  return (
    <section className="panel ask-card" aria-labelledby="ask-title">
      <div className="ask-head">
        <h2 id="ask-title">
          <SparkIcon /> Ask about this campaign
        </h2>
        <AiBadge />
      </div>
      <p className="muted small">Answers use only this campaign’s published information. They are not a guarantee of delivery or financial accuracy.</p>
      <div className="chat-chips" role="group" aria-label="Suggested questions">
        {SUGGESTED_QUESTIONS.map((item) => (
          <button key={item.intent} type="button" className="chip" onClick={() => ask(item.text)} disabled={request.status === 'loading'}>
            {item.text}
          </button>
        ))}
      </div>
      <form
        className="ask-form"
        onSubmit={(event: FormEvent) => {
          event.preventDefault()
          ask(question)
        }}
      >
        <label className="sr-only" htmlFor={inputId}>
          Your question
        </label>
        <input id={inputId} value={question} maxLength={200} placeholder="Ask a question" onChange={(event) => setQuestion(event.target.value)} />
        <button type="submit" className="btn btn-outline btn-sm" disabled={!question.trim() || request.status === 'loading'}>
          Ask
        </button>
      </form>
      <div role="status" aria-live="polite">
        {request.status === 'loading' ? <p className="ai-loading small">Looking through published information…</p> : null}
        {request.status === 'error' ? <p className="error-text">{request.error}</p> : null}
      </div>
      {history.length > 0 ? (
        <ol className="ask-history">
          {history.map((item) => {
            const answer = item.answer.content
            return (
              <li key={item.id}>
                <p className="ask-q">{item.question}</p>
                <div className={answer.known ? 'ask-a' : 'ask-a unknown'}>
                  <p>{answer.text}</p>
                  <div className="inline-actions">
                    {answer.organizerReported ? <span className="trust-pill tone-neutral">Organizer-reported</span> : null}
                    {answer.latestDate ? <span className="muted small">Latest update {formatDate(answer.latestDate)}</span> : null}
                    {answer.tab ? (
                      <button type="button" className="link-button small" onClick={() => onOpenTab(answer.tab!)}>
                        Source: {TAB_LABEL[answer.tab]}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      ) : null}
    </section>
  )
}
