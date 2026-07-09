import { API_BASE, jsonFetch, toCard, writeError, type GupySearchResponse, type JobCard } from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  remote?: string // "remote" | "hybrid" | "onsite"
  jobage?: number
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

const RESULTS_PER_PAGE = 10

function workplaceTypeParam(mode: string | undefined): string | null {
  switch ((mode || "").toLowerCase()) {
    case "remote":
      return "remote"
    case "hybrid":
      return "hybrid"
    case "onsite":
    case "on-site":
      return "on-site"
    default:
      return null
  }
}

function buildUrl(opts: SearchOpts): string {
  const params = new URLSearchParams()
  if (opts.query) params.set("jobName", opts.query)
  if (opts.location) params.set("city", opts.location)
  const wt = workplaceTypeParam(opts.remote)
  if (wt) params.set("workplaceTypes", wt)
  params.set("limit", String(RESULTS_PER_PAGE))
  params.set("offset", String((opts.page - 1) * RESULTS_PER_PAGE))
  return `${API_BASE}?${params.toString()}`
}

/** Gupy's API has no posting-age parameter, so jobage is applied client-side against publishedDate. */
function withinJobage(card: JobCard, days: number | undefined): boolean {
  if (!days || days <= 0 || days >= 9999) return true
  if (!card.date) return true
  const posted = new Date(card.date).getTime()
  if (isNaN(posted)) return true
  const cutoff = Date.now() - days * 86400 * 1000
  return posted >= cutoff
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 42).padEnd(42)
    const company = (c.company || "—").slice(0, 26).padEnd(26)
    const loc = (c.location || "—").slice(0, 24).padEnd(24)
    const date = (c.date || "—").slice(0, 10)
    return `${c.id.padEnd(11)} ${title} ${company} ${loc} ${date}`
  })
  const header =
    "ID".padEnd(11) + " " + "TITLE".padEnd(42) + " " + "COMPANY".padEnd(26) + " " + "LOCATION".padEnd(24) + " DATE"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const data = await jsonFetch<GupySearchResponse>(buildUrl(opts))
    let cards = (data?.data ?? []).map(toCard).filter((c) => withinJobage(c, opts.jobage))
    if (opts.limit !== undefined && opts.limit >= 0) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map((c) => `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${c.date || "—"}\n  id: ${c.id}\n  ${c.url}`)
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(JSON.stringify({ meta: { count: cards.length, page: opts.page }, results: cards }, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
