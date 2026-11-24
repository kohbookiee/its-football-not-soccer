import approved from "./archive/approved.json"
import { seasons } from "./seasons"

const LOCAL_IMAGE = /^\/archive\/[a-z0-9-]+\/[a-z0-9-]+\.jpe?g$/

function isApprovedImage(image, clubId) {
  if (!image || image.verification !== "approved" || image.clubId !== clubId) return false
  if (!image.license || !image.licenseUrl || !image.pageUrl) return false
  if (!LOCAL_IMAGE.test(image.src) || !LOCAL_IMAGE.test(image.card)) return false
  return true
}

function presentImage(image) {
  const year = Number.isInteger(image.captureYear) ? image.captureYear : null
  return {
    id: image.id,
    clubId: image.clubId,
    title: image.title,
    src: image.src,
    card: image.card,
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
    src: video.src,
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
    images: (entry.images ?? []).filter((image) => isApprovedImage(image, clubId)).map(presentImage),
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
