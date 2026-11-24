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
    <svg
      className="archive-spark"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`League place from ${first.label} ${ordinal(first.pos)} to ${last.label} ${ordinal(last.pos)}`}
    >
      <polyline points={points} />
    </svg>
  )
}

function SourceLine({ image }) {
  return (
    <p className="archive-caption">
      <span>{image.imageType}</span>
      <span>{image.title}</span>
      <span>{image.author || "Author unconfirmed"}</span>
      <a href={image.licenseUrl} target="_blank" rel="noreferrer noopener">
        {image.license}
      </a>
      <a href={image.pageUrl} target="_blank" rel="noreferrer noopener">
        Wikimedia Commons
      </a>
    </p>
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
  onPrev,
  onNext,
  onEnlarge,
}) {
  const images = archive?.images ?? []
  const video = archive?.video ?? null

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
        {images.length > 1 ? (
          <button type="button" className="archive-switch" onClick={onPrev}>
            PREV
          </button>
        ) : (
          <span />
        )}
        <div className="archive-center">
          {image ? (
            <>
              <button
                type="button"
                className="archive-feature"
                onClick={onEnlarge}
                aria-label={`Enlarge ${image.title}`}
              >
                <img src={image.src} alt="" />
                <span className="archive-year">{image.captureYear ?? "Year unconfirmed"}</span>
              </button>
              <SourceLine image={image} />
              {video ? (
                <a className="archive-video" href={video.src} target="_blank" rel="noreferrer noopener">
                  Licensed match clip
                </a>
              ) : null}
            </>
          ) : (
            <p className="archive-empty">No approved photographs for this club yet.</p>
          )}
        </div>
        {images.length > 1 ? (
          <button type="button" className="archive-switch" onClick={onNext}>
            NEXT
          </button>
        ) : (
          <span />
        )}
      </div>

      <footer className="archive-bar">
        <div className="archive-stat">
          <strong>{seasonRow ? ordinal(seasonRow.pos) : "—"}</strong>
          <span>PLACE · {seasonLabel}</span>
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
        {images.length > 0 ? (
          <span className="archive-count">
            {index + 1} / {images.length}
          </span>
        ) : null}
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
          <span>{image.title}</span>
          <span>{image.author || "Author unconfirmed"}</span>
          <a href={image.licenseUrl} target="_blank" rel="noreferrer noopener">
            {image.license}
          </a>
          <a href={image.pageUrl} target="_blank" rel="noreferrer noopener">
            Wikimedia Commons
          </a>
        </figcaption>
      </figure>
    </div>
  )
}
