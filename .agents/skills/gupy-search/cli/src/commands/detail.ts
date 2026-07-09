import { API_BASE, jsonFetch, toDetail, writeError, type GupyRawJob } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/** Accept a raw numeric job ID or a jobUrl containing /job/<base64> (id is looked up via the API instead). */
function normalizeId(input: string): string | null {
  const bare = input.match(/^\d+$/)
  if (bare) return input
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a numeric job ID from "${opts.id}". Pass the id field from a search result.`, "BAD_ID")
    return 1
  }
  try {
    const job = await jsonFetch<GupyRawJob>(`${API_BASE}/${id}`)
    if (!job) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    const detail = toDetail(job)

    if (opts.format === "plain") {
      const lines = [
        detail.title,
        `${detail.company || "—"} · ${detail.location || "—"}`,
        "",
        detail.workplaceType ? `Workplace type: ${detail.workplaceType}` : "",
        detail.applicationDeadline ? `Deadline: ${detail.applicationDeadline}` : "",
        "",
        detail.description || "(no description)",
        "",
        `URL: ${detail.url}`,
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(detail, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
