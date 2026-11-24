import seasons from "./seasons.json"
import clubs from "./clubs.json"

// One record per Premier League season, 1992–93 through 2025–26.
// `sourceUrl` is the Premier League table for that season. Swap `table`
// for that feed when it is connected. Approved photographs live in
// src/data/archive/approved.json, keyed by the existing club id.

export const YEAR_START = 1992
export const YEAR_END = 2026
export const TICKS = [1992, 2026]

const byStartYear = new Map(seasons.map((season) => [season.startYear, season]))

export function seasonForYear(year) {
  const clamped = Math.min(YEAR_END, Math.max(YEAR_START, year))
  const startYear = clamped >= YEAR_END ? YEAR_END - 1 : Math.floor(clamped)
  return byStartYear.get(startYear) ?? seasons[0]
}

export function getClub(clubId) {
  return clubs.find((club) => club.id === clubId) ?? null
}

export { seasons, clubs }
