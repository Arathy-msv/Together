import { useLayoutEffect, useRef } from 'react'
import { ART } from './GardenScene.tsx'

export interface Point {
  x: number
  y: number
}

const COIN = 58

/**
 * A gold coin that rises from the plant and arcs into the cart. Both ends are measured
 * from the rendered elements when the flight starts, so it follows any layout or size.
 */
export function CoinFlight({
  from,
  to,
  label,
  onLand,
}: {
  from: () => Point | null
  to: () => Point | null
  label: string
  onLand: () => void
}) {
  const coinRef = useRef<HTMLImageElement>(null)
  const bubbleRef = useRef<HTMLSpanElement>(null)
  const trailRef = useRef<SVGPathElement>(null)
  const landRef = useRef(onLand)

  useLayoutEffect(() => {
    landRef.current = onLand
  }, [onLand])

  useLayoutEffect(() => {
    const coin = coinRef.current
    const bubble = bubbleRef.current
    const start = from()
    const end = to()
    if (!coin || !bubble || !start || !end || typeof coin.animate !== 'function') {
      landRef.current()
      return
    }
    const lift: Point = { x: start.x, y: start.y - Math.min(90, Math.max(50, (start.y - end.y) * 0.18)) }
    const control: Point = {
      x: lift.x + (end.x - lift.x) * 0.45,
      y: Math.min(lift.y, end.y) - Math.max(60, Math.abs(end.x - lift.x) * 0.12),
    }
    const place = (point: Point, scale: number, rotate: number) =>
      `translate(${point.x - COIN / 2}px, ${point.y - COIN / 2}px) scale(${scale}) rotate(${rotate}deg)`

    const frames: Keyframe[] = [
      { offset: 0, transform: place(start, 0.35, 0), opacity: 0 },
      { offset: 0.08, transform: place(start, 0.75, 0), opacity: 1 },
      { offset: 0.26, transform: place(lift, 1.05, 0), opacity: 1 },
    ]
    const steps = 12
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps
      const point = {
        x: (1 - t) ** 2 * lift.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x,
        y: (1 - t) ** 2 * lift.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y,
      }
      frames.push({
        offset: 0.26 + 0.74 * (t * 0.92 + 0.08 * t * t),
        transform: place(point, 1.05 - 0.6 * t, 24 * t),
        opacity: step === steps ? 0.2 : 1,
      })
    }
    frames[frames.length - 1].offset = 1

    const trail = trailRef.current
    let fade: Animation | null = null
    if (trail) {
      trail.setAttribute('d', `M${start.x} ${start.y} L${lift.x} ${lift.y} Q${control.x} ${control.y} ${end.x} ${end.y}`)
      fade = trail.animate(
        [{ opacity: 0 }, { opacity: 0.9, offset: 0.25 }, { opacity: 0.9, offset: 0.8 }, { opacity: 0 }],
        { duration: 1600, easing: 'ease-out', fill: 'forwards' },
      )
    }
    bubble.style.left = `${lift.x + COIN * 0.55}px`
    bubble.style.top = `${lift.y - 6}px`
    const flight = coin.animate(frames, { duration: 1500, easing: 'cubic-bezier(.35,.1,.45,1)', fill: 'forwards' })
    const pop = bubble.animate(
      [
        { opacity: 0, transform: 'translateY(8px) scale(.9)' },
        { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.2 },
        { opacity: 1, transform: 'translateY(-4px) scale(1)', offset: 0.75 },
        { opacity: 0, transform: 'translateY(-10px) scale(.96)' },
      ],
      { duration: 1700, easing: 'ease-out', fill: 'forwards' },
    )
    flight.finished.then(
      () => landRef.current(),
      () => undefined,
    )
    return () => {
      flight.cancel()
      pop.cancel()
      fade?.cancel()
    }
    // The flight is measured once, when it starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="gt-coin-layer" aria-hidden="true">
      <svg className="gt-coin-trail">
        <path ref={trailRef} />
      </svg>
      <img ref={coinRef} className="gt-coin" src={`${ART}/coin.webp`} alt="" width={COIN} height={COIN} />
      <span ref={bubbleRef} className="gt-coin-bubble">
        <strong>{label}</strong>
        <span>suggested</span>
      </span>
    </div>
  )
}
