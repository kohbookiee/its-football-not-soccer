const LINES = [
  "Through Premier League data from 1992 to 2026",
  "Discover the stories of underdogs, relegated clubs,",
  "and forgotten teams beyond the winners.",
  "Explore decades of league history through retro",
  "scoreboards, interactive standings, and the",
  "passionate culture of football fandom.",
  "AND ITS FOOTBALL NOT SOCCER!",
]

export default function Intro() {
  return (
    <div className="intro">
      {LINES.map((line) => (
        <p className="intro-line" key={line}>
          <span className="dot" aria-hidden="true" />
          <span>{line}</span>
        </p>
      ))}
    </div>
  )
}
