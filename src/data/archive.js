import approved from "./archive/approved.json"
import { seasons } from "./seasons"

const LOCAL_FILE = /^\/(?:archive\/[a-z0-9-]+\/[a-z0-9-]+|img\/[a-z0-9-]+)\.(?:jpe?g|png)$/

function publicSrc(src) {
  if (typeof src !== "string" || !src.startsWith("/")) return src
  const base = import.meta.env.BASE_URL || "/"
  if (base === "/") return src
  return `${base.replace(/\/$/, "")}${src}`
}

function isShowable(image, clubId) {
  if (!image || image.clubId !== clubId || !LOCAL_FILE.test(image.src)) return false
  if (image.verification === "supplied") return true
  if (image.verification !== "approved") return false
  return Boolean(image.license && image.licenseUrl && image.pageUrl)
}

function presentImage(image) {
  const year = Number.isInteger(image.captureYear) ? image.captureYear : null
  return {
    id: image.id,
    clubId: image.clubId,
    title: image.title,
    src: publicSrc(image.src),
    card: publicSrc(image.card || image.src),
    pageUrl: image.pageUrl,
    author: image.author || null,
    license: image.license,
    licenseUrl: image.licenseUrl,
    captureYear: year,
    imageType: image.imageType,
    width: image.width,
    height: image.height,
  }
}

function presentVideo(video, clubId) {
  if (!video || video.verification !== "approved" || video.clubId !== clubId) return null
  if (!video.license || !video.licenseUrl || !video.pageUrl) return null
  if (typeof video.src !== "string" || !video.src.startsWith(`/archive/${clubId}/`)) return null
  return {
    title: video.title,
    src: publicSrc(video.src),
    pageUrl: video.pageUrl,
    license: video.license,
    licenseUrl: video.licenseUrl,
    captureYear: Number.isInteger(video.captureYear) ? video.captureYear : null,
  }
}

export function getArchive(clubId) {
  const entry = approved[clubId]
  if (!entry || entry.clubId !== clubId) return null
  return {
    clubId,
    chant: typeof entry.chant === "string" ? entry.chant : null,
    video: presentVideo(entry.video, clubId),
    images: (entry.images ?? []).filter((image) => isShowable(image, clubId)).map(presentImage),
  }
}

export function clubHistory(clubId) {
  return seasons.flatMap((season) => {
    const row = season.table?.find((entry) => entry.clubId === clubId)
    if (!row) return []
    return [
      {
        seasonId: season.id,
        label: season.label,
        startYear: season.startYear,
        pos: row.pos,
        pts: row.pts,
        gd: row.gd,
        w: row.w,
        d: row.d,
        l: row.l,
      },
    ]
  })
}
