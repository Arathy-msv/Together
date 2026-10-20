import { useEffect, useRef, type ReactNode } from 'react'
import { CloseIcon } from './icons.tsx'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Modal side sheet or centred dialog with focus trap, Escape to close and focus return. */
export function Sheet({
  labelledBy,
  onClose,
  variant = 'drawer',
  children,
  initialFocus,
}: {
  labelledBy: string
  onClose: () => void
  variant?: 'drawer' | 'modal'
  children: ReactNode
  initialFocus?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const node = ref.current
    const first = (initialFocus && node?.querySelector<HTMLElement>(initialFocus)) || node?.querySelector<HTMLElement>('h2')
    first?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !node) return
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.offsetParent !== null)
      if (items.length === 0) return
      const head = items[0]
      const tail = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === head || !node.contains(document.activeElement))) {
        event.preventDefault()
        tail.focus()
      } else if (!event.shiftKey && document.activeElement === tail) {
        event.preventDefault()
        head.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (previous && document.contains(previous)) previous.focus()
    }
    // Focus is placed once when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`gt-backdrop gt-backdrop-${variant}`} onClick={onClose} role="presentation">
      <div
        ref={ref}
        className={`gt-sheet gt-sheet-${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="gt-sheet-close" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
        {children}
      </div>
    </div>
  )
}
