import { useEffect, useState } from "react"
import Intro from "./components/Intro"
import LeagueTable from "./components/LeagueTable"
import Timeline from "./components/Timeline"
import { clubHistory, getArchive } from "./data/archive"
import { YEAR_END, YEAR_START, getClub, seasonForYear } from "./data/seasons"
import ClubTerrace from "./three/ClubTerrace"

const THEME_BACKGROUND = {
  green: "#128516",
  gray: "#C6C6C7",
  blue: "#002DF4",
}

function tableTheme(startYear) {
  const span = (startYear - YEAR_START) / (YEAR_END - YEAR_START)
  if (span < 1 / 3) return "green"
  if (span < 2 / 3) return "gray"
  return "blue"
}

export default function App() {
  const [engaged, setEngaged] = useState(false)
  const [year, setYear] = useState(YEAR_START)
  const [selection, setSelection] = useState(null)
  const [archiveClubId, setArchiveClubId] = useState(null)

  const season = seasonForYear(year)
  const selectedClubId =
    selection && selection.seasonId === season.id ? selection.clubId : null

  function scrub(nextYear) {
    setEngaged(true)
    setYear(Math.min(YEAR_END, Math.max(YEAR_START, nextYear)))
  }

  function step(direction) {
    const anchor = year >= YEAR_END ? YEAR_END : season.startYear
    if (!engaged) {
      if (direction > 0) setEngaged(true)
      return
    }
    const next = anchor + direction
    if (next < YEAR_START) {
      setEngaged(false)
      setYear(YEAR_START)
      setSelection(null)
      setArchiveClubId(null)
      return
    }
    setYear(Math.min(YEAR_END, next))
  }

  function returnToIntro() {
    setEngaged(false)
    setYear(YEAR_START)
    setSelection(null)
    setArchiveClubId(null)
  }

  function selectClub(row) {
    setSelection({ seasonId: season.id, clubId: row.clubId })
    setArchiveClubId(row.clubId)
  }

  function closeArchive() {
    setArchiveClubId(null)
  }

  const inArchive = Boolean(archiveClubId)
  const view = inArchive ? "archive" : engaged ? "table" : "intro"
  const theme = tableTheme(season.startYear)

  useEffect(() => {
    const color = inArchive ? "#07080b" : !engaged ? "#cbff00" : THEME_BACKGROUND[theme]
    document.documentElement.style.background = color
    document.body.style.background = color
  }, [engaged, inArchive, theme])

  return (
    <div
      className="app"
      data-view={view}
      data-theme={engaged ? theme : "intro"}
      data-season={engaged ? season.id : "intro"}
    >
      {!inArchive && (
        <header className="top">
          {engaged ? (
            <button type="button" className="title title-button" onClick={returnToIntro}>
              ITS FOOTBALL NOT SOCCER!
            </button>
          ) : (
            <h1 className="title">ITS FOOTBALL NOT SOCCER!</h1>
          )}
        </header>
      )}
      <main className={inArchive ? "stage stage-archive" : "stage"} key={view}>
        {inArchive ? (
          <ClubTerrace
            key={archiveClubId}
            club={getClub(archiveClubId)}
            archive={getArchive(archiveClubId)}
            history={clubHistory(archiveClubId)}
            seasonRow={season.table?.find((row) => row.clubId === archiveClubId) ?? null}
            seasonLabel={season.label}
            onBack={closeArchive}
          />
        ) : engaged ? (
          <LeagueTable
            season={season}
            selectedClubId={selectedClubId}
            onSelectClub={selectClub}
          />
        ) : (
          <Intro />
        )}
      </main>
      {!inArchive && (
        <Timeline
          year={year}
          engaged={engaged}
          onYear={scrub}
          onStep={step}
          onHome={returnToIntro}
        />
      )}
    </div>
  )
}
