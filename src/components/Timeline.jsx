import { useRef } from "react"
import Football from "./Football"
import { TICKS, YEAR_END, YEAR_START, seasonForYear } from "../data/seasons"

export default function Timeline({ year, engaged, onYear, onStep, onHome }) {
  const trackRef = useRef(null)
  const season = seasonForYear(year)
  const ratio = (year - YEAR_START) / (YEAR_END - YEAR_START)

  function yearFromPointer(event) {
    const rect = trackRef.current.getBoundingClientRect()
    if (rect.width <= 0) return YEAR_START
    const next = (event.clientX - rect.left) / rect.width
    const clamped = Math.min(1, Math.max(0, next))
    return YEAR_START + clamped * (YEAR_END - YEAR_START)
  }

  function onPointerDown(event) {
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    onYear(yearFromPointer(event))
  }

  function onPointerMove(event) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    onYear(yearFromPointer(event))
  }

  function onKeyDown(event) {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault()
      onStep(1)
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault()
      onStep(-1)
    } else if (event.key === "Home") {
      event.preventDefault()
      onHome()
    } else if (event.key === "End") {
      event.preventDefault()
      onYear(YEAR_END)
    }
  }

  return (
    <footer className="timeline">
      <div
        ref={trackRef}
        className="timeline-track"
        role="slider"
        tabIndex={0}
        aria-label="Premier League seasons from 1992 to 2026"
        aria-orientation="horizontal"
        aria-valuemin={YEAR_START}
        aria-valuemax={YEAR_END}
        aria-valuenow={Math.round(year)}
        aria-valuetext={engaged ? `${season.label} final table` : "Introduction"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
      >
        <div className="timeline-line" />
        <div className="timeline-ball" style={{ left: `${ratio * 100}%` }}>
          <Football />
        </div>
        {TICKS.map((tick) => (
          <span
            key={tick}
            className="timeline-year"
            style={{ left: `${((tick - YEAR_START) / (YEAR_END - YEAR_START)) * 100}%` }}
            aria-hidden="true"
          >
            {tick}
          </span>
        ))}
      </div>
    </footer>
  )
}
