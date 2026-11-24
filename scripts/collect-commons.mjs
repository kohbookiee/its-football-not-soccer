import { execFile } from "node:child_process"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const UA = "ItsFootballNotSoccer/0.1 (local club-archive collection; not a browser)"
const API = "https://commons.wikimedia.org/w/api.php"

const SKIP_TITLE =
  /\b(logo|crest|badge|wordmark|icon|diagram|locator map|kit template|autograph|signature|flag of)\b/i

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function meta(info, key) {
  const raw = info?.extmetadata?.[key]?.value
  const text = stripHtml(raw)
  return text || null
}

export function licenseOk(name, url) {
  if (!url || !/^https?:\/\//i.test(url)) return false
  const normalized = stripHtml(name).toLowerCase()
  if (!normalized) return false
  if (
    /non-?commercial|\bnc\b|no ?derivatives|\bnd\b|fair use|all rights reserved|copyrighted|non-free/.test(
      normalized,
    )
  ) {
    return false
  }
  if (/public domain|\bcc0\b|cc0|no restrictions|\bpd\b|gfdl|gnu free documentation/.test(normalized)) {
    return true
  }
  return /cc[-\s]?by([-\s]?sa)?\b/.test(normalized)
}

function yearIn(text) {
  const match = String(text ?? "").match(/\b(18|19|20)\d{2}\b/)
  if (!match) return null
  const year = Number(match[0])
  if (year < 1860 || year > new Date().getFullYear() + 1) return null
  return year
}

function dayKey(text) {
  const match = String(text ?? "").match(/(\d{4})[:/-](\d{2})[:/-](\d{2})/)
  if (!match) return null
  return `${match[1]}-${match[2]}-${match[3]}`
}

// Upload time is imageinfo.timestamp. It is never a capture year.
// EXIF DateTimeOriginal counts only when it is not the same instant as the upload.
// The Commons date field counts only when its year is different from the upload year.
export function resolveCapture({ dateTimeOriginal, dateTime, uploadTimestamp }) {
  const uploadDay = dayKey(uploadTimestamp)
  const uploadYear = uploadDay ? Number(uploadDay.slice(0, 4)) : yearIn(uploadTimestamp)
  const exifDay = dayKey(dateTimeOriginal)
  const exifYear = yearIn(dateTimeOriginal)

  if (exifYear && !(exifDay && uploadDay && exifDay === uploadDay)) {
    return { captureYear: exifYear, captureYearSource: "exif" }
  }

  const statedYear = yearIn(dateTime)
  const statedDay = dayKey(dateTime)
  if (!statedYear) return { captureYear: null, captureYearSource: null }
  if (statedDay && uploadDay && statedDay === uploadDay) {
    return { captureYear: null, captureYearSource: null }
  }
  if (uploadYear && statedYear === uploadYear) {
    return { captureYear: null, captureYearSource: null }
  }
  return { captureYear: statedYear, captureYearSource: "commons-date" }
}

function assertEqual(actual, expected, label) {
  if (actual.captureYear !== expected.captureYear || actual.captureYearSource !== expected.captureYearSource) {
    throw new Error(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`)
  }
}

function selfTest() {
  assertEqual(
    resolveCapture({
      dateTimeOriginal: "2004:05:11 15:02:00",
      dateTime: "2004-05-11",
      uploadTimestamp: "2016-08-01T12:00:00Z",
    }),
    { captureYear: 2004, captureYearSource: "exif" },
    "exif beats a later upload",
  )
  assertEqual(
    resolveCapture({
      dateTimeOriginal: "2016:08:01 12:00:00",
      dateTime: "2016-08-01",
      uploadTimestamp: "2016-08-01T12:00:00Z",
    }),
    { captureYear: null, captureYearSource: null },
    "exif on the upload day is not a capture year",
  )
  assertEqual(
    resolveCapture({
      dateTimeOriginal: null,
      dateTime: "1998",
      uploadTimestamp: "2012-04-03T09:00:00Z",
    }),
    { captureYear: 1998, captureYearSource: "commons-date" },
    "stated year distinct from upload",
  )
  assertEqual(
    resolveCapture({
      dateTimeOriginal: null,
      dateTime: "2012-04-03 09:00:00",
      uploadTimestamp: "2012-04-03T09:00:00Z",
    }),
    { captureYear: null, captureYearSource: null },
    "commons date copied from the upload timestamp",
  )
  assertEqual(
    resolveCapture({
      dateTimeOriginal: null,
      dateTime: "4 April 2012",
      uploadTimestamp: "2012-11-02T09:00:00Z",
    }),
    { captureYear: null, captureYearSource: null },
    "same year as the upload is not confirmation",
  )
  assertEqual(
    resolveCapture({ dateTimeOriginal: null, dateTime: null, uploadTimestamp: "2019-01-01T00:00:00Z" }),
    { captureYear: null, captureYearSource: null },
    "upload timestamp alone",
  )
  if (!licenseOk("CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0")) {
    throw new Error("cc by-sa should pass")
  }
  if (licenseOk("CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0")) {
    throw new Error("non-commercial should fail")
  }
  if (licenseOk("CC BY 4.0", "")) throw new Error("missing license url should fail")
  if (licenseOk("Fair use", "https://example.com/fair")) throw new Error("fair use should fail")
  if (!licenseOk("Public domain", "https://creativecommons.org/publicdomain/mark/1.0/")) {
    throw new Error("public domain should pass")
  }
  console.log("self-test ok")
}

async function commonsSearch(q) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: `${q} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "40",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata|timestamp",
    iiextmetadatafilter:
      "LicenseShortName|LicenseUrl|Artist|Credit|DateTimeOriginal|DateTime|ImageDescription|ObjectName",
    iiurlwidth: "1600",
  })
  const response = await fetch(`${API}?${params}`, {
    headers: { "User-Agent": UA, "Api-User-Agent": UA },
  })
  if (!response.ok) throw new Error(`Commons ${response.status} for ${q}`)
  const payload = await response.json()
  return payload?.query?.pages ?? []
}

function toCandidate(page, search) {
  const info = page.imageinfo?.[0]
  if (!info) return null
  if (!info.mime || !/^image\/(jpeg|png|webp)$/.test(info.mime)) return null
  if ((info.width ?? 0) < 640) return null
  if (SKIP_TITLE.test(page.title)) return null

  const license = meta(info, "LicenseShortName")
  const licenseUrl = meta(info, "LicenseUrl")
  if (!licenseOk(license, licenseUrl)) return null

  const dateTimeOriginal = meta(info, "DateTimeOriginal")
  const dateTime = meta(info, "DateTime")
  const capture = resolveCapture({
    dateTimeOriginal,
    dateTime,
    uploadTimestamp: info.timestamp,
  })
  if (search.decade) {
    const start = search.decade
    const year = capture.captureYear
    if (!year || year < start || year > start + 9) return null
  }

  const author = tidyAuthor(meta(info, "Artist") || meta(info, "Credit"))
  return {
    title: page.title,
    imageUrl: info.url,
    thumbUrl: info.thumburl || info.url,
    pageUrl: info.descriptionurl,
    author,
    license,
    licenseUrl,
    captureYear: capture.captureYear,
    captureYearSource: capture.captureYearSource,
    statedDate: dateTime,
    uploadTimestamp: info.timestamp,
    clubId: search.clubId,
    imageType: search.imageType,
    verification: "unreviewed",
    mime: info.mime,
    width: info.width ?? null,
    height: info.height ?? null,
  }
}

async function collectClub(profile) {
  const seen = new Map()
  for (const search of profile.searches) {
    const pages = await commonsSearch(search.q)
    for (const page of pages) {
      if (seen.has(page.title)) continue
      const candidate = toCandidate(page, { ...search, clubId: profile.clubId })
      if (!candidate) continue
      seen.set(page.title, candidate)
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  const images = [...seen.values()]
  const dir = path.join(root, "collection", "candidates")
  await mkdir(dir, { recursive: true })
  const file = path.join(dir, `${profile.clubId}.json`)
  await writeFile(
    file,
    JSON.stringify(
      {
        clubId: profile.clubId,
        collectedAt: new Date().toISOString(),
        published: false,
        note: "Unreviewed search results. The site does not load this file.",
        images,
      },
      null,
      2,
    ),
  )
  const dated = images.filter((image) => image.captureYear).length
  console.log(`${profile.clubId}: ${images.length} licensed candidates, ${dated} with a capture year`)
  console.log(file)
}

function slug(title) {
  return title
    .replace(/^File:/, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 72)
}

function displayTitle(title) {
  return title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ").trim()
}

function tidyAuthor(author) {
  if (!author) return null
  const assumed = author.match(/([\w.~-]+)\s+assumed \(based on copyright claims\)/i)
  if (assumed) return assumed[1].replace(/~commonswiki$/i, "")
  return author
}

const IMAGE_TYPES = new Set(["stadium", "terrace", "supporters", "place", "match"])

async function fetchFile(url) {
  let response
  for (let attempt = 0; attempt < 4; attempt += 1) {
    response = await fetch(url, { headers: { "User-Agent": UA } })
    if (response.status !== 429) return response
    const retryAfter = Number(response.headers.get("retry-after"))
    const waitMs = (Number.isFinite(retryAfter) ? retryAfter : 30) * 1000 + 2000
    console.log(`Wikimedia asked us to wait ${Math.round(waitMs / 1000)}s`)
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }
  return response
}

async function sips(args) {
  await execFileAsync("sips", args)
}

async function writeJpeg(source, dest, maxEdge, quality) {
  const size = await imageSize(source)
  const args = ["-s", "format", "jpeg", "-s", "formatOptions", String(quality)]
  if (Math.max(size.width, size.height) > maxEdge) args.push("-Z", String(maxEdge))
  args.push(source, "--out", dest)
  await sips(args)
}

async function imageSize(file) {
  const { stdout } = await execFileAsync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file])
  const width = Number(stdout.match(/pixelWidth:\s+(\d+)/)?.[1])
  const height = Number(stdout.match(/pixelHeight:\s+(\d+)/)?.[1])
  if (!width || !height) throw new Error(`Could not read the size of ${file}`)
  return { width, height }
}

async function materialize(picksPath) {
  const picks = JSON.parse(await readFile(path.resolve(picksPath), "utf8"))
  const clubId = picks.clubId
  if (!clubId || !/^[a-z0-9-]+$/.test(clubId)) throw new Error("picks.clubId is missing")
  const candidateFile = path.join(root, "collection", "candidates", `${clubId}.json`)
  const candidates = JSON.parse(await readFile(candidateFile, "utf8"))
  const byTitle = new Map(candidates.images.map((image) => [image.title, image]))
  const outDir = path.join(root, "public", "archive", clubId)
  await mkdir(outDir, { recursive: true })

  const list = picks.picks ?? (picks.titles ?? []).map((title) => ({ title }))
  if (list.length === 0) throw new Error("No picks to publish")
  const images = []
  for (const pick of list) {
    const title = pick.title
    const candidate = byTitle.get(title)
    if (!candidate) throw new Error(`Not a licensed candidate, left unpublished: ${title}`)
    if (!licenseOk(candidate.license, candidate.licenseUrl) || !candidate.pageUrl) {
      throw new Error(`License is not confirmable, left unpublished: ${title}`)
    }
    const imageType = pick.imageType || candidate.imageType
    if (!IMAGE_TYPES.has(imageType)) throw new Error(`Unknown image type for ${title}`)
    const id = slug(title)
    const srcName = `${id}.jpg`
    const cardName = `${id}-card.jpg`
    const rawPath = path.join(os.tmpdir(), `fussball-${id}.source`)
    const fileName = title.replace(/^File:/, "").replace(/ /g, "_")
    const edge = Math.min(1600, candidate.width || 1600)
    const downloadUrl = `https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(fileName)}&w=${edge}`
    const response = await fetchFile(downloadUrl)
    const contentType = response.headers.get("content-type") ?? ""
    if (!response.ok || !contentType.startsWith("image/")) {
      throw new Error(`Download failed ${response.status} for ${title}`)
    }
    await writeFile(rawPath, Buffer.from(await response.arrayBuffer()))
    const srcPath = path.join(outDir, srcName)
    const cardPath = path.join(outDir, cardName)
    await writeJpeg(rawPath, srcPath, 1600, 72)
    await writeJpeg(rawPath, cardPath, 720, 68)
    await rm(rawPath, { force: true })
    const size = await imageSize(srcPath)
    images.push({
      id,
      clubId,
      title: displayTitle(title),
      src: `/archive/${clubId}/${srcName}`,
      card: `/archive/${clubId}/${cardName}`,
      pageUrl: candidate.pageUrl,
      author: tidyAuthor(candidate.author),
      license: candidate.license,
      licenseUrl: candidate.licenseUrl,
      captureYear: candidate.captureYear,
      captureYearSource: candidate.captureYearSource,
      imageType,
      verification: "approved",
      width: size.width,
      height: size.height,
    })
    console.log(`saved ${srcName} (${candidate.captureYear ?? "year unconfirmed"})`)
    await new Promise((resolve) => setTimeout(resolve, 900))
  }

  const approvedPath = path.join(root, "src", "data", "archive", "approved.json")
  await mkdir(path.dirname(approvedPath), { recursive: true })
  let approved = {}
  try {
    approved = JSON.parse(await readFile(approvedPath, "utf8"))
  } catch {
    approved = {}
  }
  approved[clubId] = {
    clubId,
    chant: picks.chant ?? null,
    video: null,
    images,
  }
  await writeFile(approvedPath, JSON.stringify(approved, null, 2))
  console.log(approvedPath)
}

const args = process.argv.slice(2)
if (args.includes("--self-test")) {
  selfTest()
} else if (args[0] === "--materialize") {
  await materialize(args[1])
} else {
  const only = args[0]
  const profiles = JSON.parse(await readFile(path.join(root, "collection", "queries.json"), "utf8"))
  const selected = only ? profiles.filter((profile) => profile.clubId === only) : profiles
  if (selected.length === 0) throw new Error(`No queries for ${only}`)
  for (const profile of selected) await collectClub(profile)
}
