// Data source: Gupy's public "Portal de Vagas" job-search API at portal.gupy.io.
// This is the JSON backend the Next.js portal app itself calls client-side —
// no authentication required, real pagination, real filters. No HTML parsing needed.
// The previous host (employability-portal.gupy.io/api/v1/jobs) started answering
// 404 in early October 2026; this is an internal portal address, not a documented
// API, so it may move again (see url-reference.md "Maintenance").

export const API_BASE = "https://portal.gupy.io/api/job-search/jobs"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/** GET with exponential backoff on 429/5xx. Returns null on a 404. */
async function fetchWithRetry(url: string, accept: string): Promise<Response | null> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: accept,
      },
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response
  }
  throw new Error("Request failed after max retries")
}

/** Fetch JSON with exponential backoff on 429/5xx. Returns null on a 404. */
export async function jsonFetch<T>(url: string): Promise<T | null> {
  const response = await fetchWithRetry(url, "application/json")
  return response ? ((await response.json()) as T) : null
}

/** Fetch an HTML page with exponential backoff on 429/5xx. Returns null on a 404. */
export async function htmlFetch(url: string): Promise<string | null> {
  const response = await fetchWithRetry(url, "text/html")
  return response ? await response.text() : null
}

export interface GupyRawJob {
  id: number
  companyId?: number
  name: string
  description: string
  careerPageName: string
  careerPageUrl: string
  type: string
  publishedDate: string | null
  applicationDeadline: string | null
  isRemoteWork?: boolean
  city: string | null
  state: string | null
  country?: string | null
  jobUrl: string
  workplaceType: string | null
}

export interface GupySearchResponse {
  data: GupyRawJob[]
  pagination: { total: number; limit: number; offset: number }
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
}

export interface JobDetail extends JobCard {
  description: string | null
  workplaceType: string | null
  applicationDeadline: string | null
  applyUrl: string | null
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function locationOf(job: GupyRawJob): string | null {
  if (job.workplaceType === "remote") return "Remoto"
  const parts = [job.city, job.state].filter(Boolean)
  return parts.length ? parts.join(", ") : job.country || null
}

/** Turn an HTML-ish description fragment into plain text. */
export function htmlToText(html: string): string {
  return decodeHtmlEntities(stripTags(html))
}

export function toCard(job: GupyRawJob): JobCard {
  return {
    id: String(job.id),
    title: job.name,
    company: job.careerPageName || null,
    location: locationOf(job),
    date: job.publishedDate,
    url: job.jobUrl,
  }
}

export function toDetail(job: GupyRawJob): JobDetail {
  return {
    ...toCard(job),
    description: htmlToText(job.description) || null,
    workplaceType: job.workplaceType,
    applicationDeadline: job.applicationDeadline,
    applyUrl: job.jobUrl,
  }
}
