const COLUMNS = [
  ["p", "P"],
  ["w", "W"],
  ["d", "D"],
  ["l", "L"],
  ["gd", "GD"],
  ["pts", "PTS"],
]

function formatGd(value) {
  if (value > 0) return `+${value}`
  return String(value)
}

export default function LeagueTable({ season, selectedClubId, onSelectClub }) {
  const rows = season.table

  return (
    <div className="table-view">
      <p className="table-date">{season.finalDateLabel || season.label}</p>
      <p className="table-kicker">
        <a href={season.sourceUrl} target="_blank" rel="noreferrer noopener">
          {season.complete ? "FINAL TABLE" : "LATEST TABLE"} · {season.label}
        </a>
      </p>
      {rows ? (
        <div className="table-scroll" key={season.id}>
          <div className="board-head" aria-hidden="true">
            <span />
            <span />
            {COLUMNS.map(([, label]) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <ol className="board">
            {rows.map((row) => {
              const selected = row.clubId === selectedClubId
              return (
                <li key={row.clubId}>
                  <button
                    type="button"
                    className={selected ? "is-selected" : undefined}
                    aria-pressed={selected}
                    aria-label={`Open the ${row.club} archive, ${row.pos}, ${row.pts} points`}
                    onClick={() => onSelectClub(row)}
                  >
                    <span className="pos">{row.pos}</span>
                    <span className="club">{row.club}</span>
                    {COLUMNS.map(([key]) => (
                      <span key={key} className={key === "pts" ? "stat pts" : "stat"}>
                        {key === "gd" ? formatGd(row[key]) : row[key]}
                      </span>
                    ))}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      ) : (
        <p className="table-pending">
          {season.label} standings connect from the Premier League table.
        </p>
      )}
    </div>
  )
}
