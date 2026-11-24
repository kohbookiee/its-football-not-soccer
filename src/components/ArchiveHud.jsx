import { homeFor } from "../data/homes"

function ordinal(value) {
  const mod = value % 100
  if (mod >= 11 && mod <= 13) return `${value}TH`
  const suffix = { 1: "ST", 2: "ND", 3: "RD" }[value % 10] ?? "TH"
  return `${value}${suffix}`
}

function signed(value) {
  if (value > 0) return `+${value}`
  return String(value)
}

function Sparkline({ history }) {
  if (history.length < 2) return null
  const maxPos = Math.max(...history.map((item) => item.pos), 20)
  const width = 220
  const height = 36
  const step = width / (history.length - 1)
  const points = history
    .map((item, index) => {
      const x = index * step
      const y = (item.pos / maxPos) * (height - 4) + 2
      return `${x},${y}`
    })
    .join(" ")
  const first = history[0]
  const last = history[history.length - 1]
  return (
    <div className="archive-spark">
      <span>{first.startYear}</span>
      <svg
        className="archive-spark-line"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`League place from ${first.label} ${ordinal(first.pos)} to ${last.label} ${ordinal(last.pos)}`}
      >
        <polyline points={points} />
      </svg>
      <span>{last.startYear}</span>
    </div>
  )
}

function sourceLabel(url) {
  try {
    const host = new URL(url).hostname
    if (host.endsWith("wikimedia.org")) return "Wikimedia Commons"
    if (host === "are.na" || host.endsWith(".are.na")) return "Are.na"
  } catch {
    return "Source"
  }
  return "Source"
}

function SourceBits({ image }) {
  return (
    <>
      <span>{image.imageType}</span>
      <span>{image.title}</span>
      {image.author ? <span>{image.author}</span> : null}
      {image.licenseUrl ? (
        <a href={image.licenseUrl} target="_blank" rel="noreferrer noopener">
          {image.license}
        </a>
      ) : (
        <span>Added for this archive</span>
      )}
      {image.pageUrl ? (
        <a href={image.pageUrl} target="_blank" rel="noreferrer noopener">
          {sourceLabel(image.pageUrl)}
        </a>
      ) : null}
    </>
  )
}

export default function ArchiveHud({
  club,
  archive,
  image,
  index,
  history,
  seasonRow,
  seasonLabel,
  onBack,
  onEnlarge,
}) {
  const images = archive?.images ?? []
  const video = archive?.video ?? null
  const home = homeFor(club?.id)

  return (
    <div className="archive-frame">
      <div className="archive-top">
        <button type="button" className="archive-back" onClick={onBack}>
          TABLE
        </button>
        {archive?.chant ? <p className="archive-chant">{archive.chant}</p> : <span />}
        <p className="archive-club">{club?.name}</p>
      </div>

      <div className="archive-stage">
        {image ? (
          <aside className="archive-note">
            <p>{image.captureYear ?? "Year unconfirmed"}</p>
            <p className="archive-note-copy">
              <SourceBits image={image} />
            </p>
            <button type="button" className="archive-switch" onClick={onEnlarge}>
              ENLARGE
            </button>
            {video ? (
              <a className="archive-video" href={video.src} target="_blank" rel="noreferrer noopener">
                Licensed match clip
              </a>
            ) : null}
          </aside>
        ) : (
          <p className="archive-empty">No photographs for this club yet.</p>
        )}
      </div>

      <footer className="archive-bar">
        <div className="archive-stat">
          <strong>{seasonRow ? ordinal(seasonRow.pos) : "—"}</strong>
          <span>PLACE · {seasonLabel}</span>
        </div>
        <div className="archive-stat archive-home">
          <strong>{home ?? "—"}</strong>
          <span>HOME</span>
        </div>
        <Sparkline history={history} />
        <div className="archive-stat">
          <strong>{seasonRow ? seasonRow.pts : "—"}</strong>
          <span>POINTS</span>
        </div>
        <p className="archive-record">
          {seasonRow
            ? `${seasonRow.w} W   ${seasonRow.d} D   ${seasonRow.l} L   ${signed(seasonRow.gd)} GD`
            : "No table row this season"}
        </p>
        <span className="archive-count">{images.length > 0 ? `${index + 1} / ${images.length}` : "—"}</span>
      </footer>
    </div>
  )
}

export function ArchiveEnlarge({ image, onClose }) {
  return (
    <div className="archive-enlarge" role="dialog" aria-modal="true" aria-label={image.title}>
      <button type="button" className="archive-enlarge-backdrop" aria-label="Close photograph" onClick={onClose} />
      <button type="button" className="archive-enlarge-close" onClick={onClose}>
        CLOSE
      </button>
      <figure
        className="archive-enlarge-figure"
        onClick={(event) => event.stopPropagation()}
      >
        <img src={image.src} alt={image.title} />
        <figcaption>
          <span>{image.captureYear ?? "Year unconfirmed"}</span>
          <SourceBits image={image} />
        </figcaption>
      </figure>
    </div>
  )
}
