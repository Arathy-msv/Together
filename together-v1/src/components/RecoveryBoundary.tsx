import { Component, type ErrorInfo, type ReactNode } from 'react'
import { appBase } from '../lib/publicUrl.ts'

interface State {
  error: Error | null
}

/**
 * Last-resort recovery screen. Saved demo data is left alone: the visitor can retry the page or go
 * home, and nothing is reset unless they choose to.
 */
export class RecoveryBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Together hit an unexpected error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main id="main" className="recovery-screen" role="alert" aria-labelledby="recovery-title">
        <div className="recovery-card">
          <h1 id="recovery-title" tabIndex={-1}>
            This page couldn’t load
          </h1>
          <p>Something unexpected went wrong. Your saved demo data on this device has not been changed.</p>
          <div className="recovery-actions">
            <button type="button" className="btn btn-primary" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
            <button type="button" className="btn btn-outline" onClick={() => window.location.reload()}>
              Reload the page
            </button>
            <a className="btn btn-outline" href={appBase() || '/'}>
              Go to the home page
            </a>
          </div>
          <details>
            <summary>Technical details</summary>
            <pre>{this.state.error.message}</pre>
          </details>
        </div>
      </main>
    )
  }
}
