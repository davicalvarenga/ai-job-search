// Data source: Vagas.com's public search results pages (server-rendered HTML,
// no client-side app, no API found). Search URL is /vagas-de-<query-slug>[-em-<city-slug>]
// with a `pagina` query param for pagination. Detail pages are /vagas/v<id>/<slug>.

export const BASE_URL = "https://www.vagas.com.br"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (compatible; vagas-com-cli/1.0)"

/** Fetch HTML with exponential backoff on 429/5xx. Returns "" on a 404. */
export async function htmlFetch(url: string): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
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
    if (response.status === 404) return ""
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.text()
  }
  throw new Error("Request failed after max retries")
}

/** Turn free text into the hyphenated slug Vagas.com uses in its search URLs. */
const COMBINING_DIACRITICS = new RegExp("[̀-ͯ]", "g")

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
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
  contractType: string | null
  salary: string | null
}

/**
 * Convert a Unicode code point to a string. Uses `fromCodePoint` (not
 * `fromCharCode`) so supplementary-plane code points (e.g. emoji, U+1F600)
 * decode correctly, and drops out-of-range values instead of throwing.
 */
function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Numeric character references: decimal (&#233;) and hexadecimal (&#xE9;).
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
}

/**
 * Characters a reader of the posting never sees but a model reading this
 * output does: C0/C1 controls other than tab, newline and carriage return, the
 * soft hyphen, bidi marks/embeddings/overrides/isolates, zero-width characters
 * and invisible operators, the BOM, variation selectors, and Unicode tag
 * characters (U+E0000-E007F), which can spell out a whole hidden instruction.
 * Listing text is third-party data, and these arrive raw in a portal's JSON or
 * markup as easily as through a numeric entity.
 */
const INVISIBLE_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F­؜᠎​-‏‪-‮⁠-⁯︀-️﻿\u{E0000}-\u{E007F}\u{E0100}-\u{E01EF}]/gu

/** Strip INVISIBLE_CHARS from every string in a result, recursively: the CLI's output boundary. */
export function stripInvisible<T>(value: T): T {
  if (typeof value === "string") return value.replace(INVISIBLE_CHARS, "") as T
  if (Array.isArray(value)) return value.map(stripInvisible) as T
  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripInvisible(v)])) as T
  }
  return value
}

// Quoted attribute values may hold `>` or a close-tag string; neither ends the tag.
const ATTRS = String.raw`(?:[^>"']|"[^"]*"|'[^']*')*`

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"])

/** Whether an opening tag's attributes keep it from rendering: `hidden`, or an inline style that hides it. */
function isHiddenTag(attrs: string): boolean {
  for (const m of attrs.matchAll(/([^\s"'=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    const name = m[1].toLowerCase()
    const value = m[2] ?? m[3] ?? m[4] ?? ""
    if (name === "hidden") return true
    if (name === "style" && /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden|mso-hide\s*:\s*all)\b/i.test(value)) {
      return true
    }
  }
  return false
}

/**
 * Drop markup a browser never renders - comments (including Word's
 * conditional ones), <script>/<style>/<template> blocks, and elements marked
 * hidden - before tags are stripped. A plain tag strip keeps their text, which
 * hands the model words the posting's reader never saw. CSS-only tricks
 * (off-screen, zero font size) need a renderer and are not caught here.
 */
export function visibleHtml(html: string): string {
  const src = html
    .replace(/<!--[\s\S]*?(?:-->|$)/g, "")
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, "")
  // One pass, collecting what is kept: slicing the string per hidden element
  // would make a page full of them quadratic.
  const open = new RegExp(`<([a-zA-Z][a-zA-Z0-9-]*)(\\s${ATTRS})?>`, "g")
  const kept: string[] = []
  let from = 0
  let m: RegExpExecArray | null
  while ((m = open.exec(src)) !== null) {
    if (!m[2] || !isHiddenTag(m[2])) continue
    const tag = m[1].toLowerCase()
    let end = open.lastIndex
    if (!VOID_TAGS.has(tag)) {
      // Skip to the matching close tag, counting nested same-name elements. An
      // unclosed hidden element runs to the end: failing closed drops visible
      // text, failing open would leak the hidden text.
      // Every tag is matched whole, so a close tag inside a quoted attribute is skipped.
      const same = new RegExp(`<(/?)([a-zA-Z][a-zA-Z0-9-]*)${ATTRS}>`, "g")
      same.lastIndex = end
      end = src.length
      let depth = 1
      let s: RegExpExecArray | null
      while ((s = same.exec(src)) !== null) {
        if (s[2].toLowerCase() !== tag) continue
        if (s[1]) depth--
        else depth++
        if (depth === 0) {
          end = same.lastIndex
          break
        }
      }
    }
    kept.push(src.slice(from, m.index))
    from = end
    open.lastIndex = end
  }
  kept.push(src.slice(from))
  return kept.join("")
}

function stripTags(html: string): string {
  return visibleHtml(html).replace(new RegExp(`<${ATTRS}>`, "g"), " ").replace(/\s+/g, " ").trim()
}

function clean(html: string): string {
  return decodeHtmlEntities(stripTags(html))
}

/**
 * Find the div matching `openTagPattern` and return its inner HTML, scanning
 * forward and counting nested <div>/</div> tags until the opening div's own
 * closer is reached. A plain non-greedy regex to "next </div>" breaks here
 * because the description block itself contains nested divs.
 */
function extractBalancedDiv(html: string, openTagPattern: RegExp): string | null {
  const openMatch = html.match(openTagPattern)
  if (!openMatch || openMatch.index === undefined) return null
  const contentStart = openMatch.index + openMatch[0].length
  const tagRe = /<div\b[^>]*>|<\/div>/gi
  tagRe.lastIndex = contentStart
  let depth = 1
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(html)) !== null) {
    if (m[0].toLowerCase().startsWith("</div")) {
      depth--
      if (depth === 0) return html.slice(contentStart, m.index)
    } else {
      depth++
    }
  }
  return null
}

/**
 * Parse the search results page: a flat list of <li class="vaga ..."> cards.
 * Split on the card boundary and parse each chunk independently so one
 * malformed card cannot break the rest.
 */
export function parseJobCards(html: string): JobCard[] {
  const results: JobCard[] = []
  const chunks = html.split(/<li class="vaga /).slice(1)

  for (const chunk of chunks) {
    const linkMatch = chunk.match(
      /class="link-detalhes-vaga"[^>]*data-id-vaga="(\d+)"[^>]*title="([^"]*)"[^>]*href="([^"]+)"/i,
    )
    if (!linkMatch) continue
    const id = linkMatch[1]
    const title = decodeHtmlEntities(linkMatch[2]).trim()
    const url = `${BASE_URL}${linkMatch[3]}`

    const companyMatch = chunk.match(/class="emprVaga"[^>]*>([\s\S]*?)<\/span>/i)
    const company = companyMatch ? clean(companyMatch[1]) || null : null

    // Non-greedy match to </div> would stop at the tooltip's own inner </div>, so
    // instead take everything up to the first nested <div> (the tooltip block).
    const locMatch = chunk.match(/class="vaga-local"[^>]*>([\s\S]*?)(?:<div|<\/div>)/i)
    const location = locMatch ? clean(locMatch[1]) || null : null

    const dateMatch = chunk.match(/class="data-publicacao"[^>]*>[\s\S]*?<\/i>([\d/]+)/i)
    const date = dateMatch ? dateMatch[1] : null

    results.push({ id, title, company, location, date, url })
  }

  return results
}

/** Parse the single-job detail page. */
export function parseJobDetail(html: string, id: string): JobDetail {
  const titleMatch = html.match(/class="job-shortdescription__title"[^>]*>([\s\S]*?)<\/h1>/i)
  const title = titleMatch ? clean(titleMatch[1]) : "(untitled)"

  const companyMatch = html.match(/class="job-shortdescription__company"[^>]*>([\s\S]*?)<\/h2>/i)
  const company = companyMatch ? clean(companyMatch[1]) || null : null

  const locMatch = html.match(/class="info-localizacao"[^>]*>([\s\S]*?)(?:<div|<\/span>)/i)
  const location = locMatch ? clean(locMatch[1]) || null : null

  const salaryMatch = html.match(/icone-salario[\s\S]*?<b>([\s\S]*?)<\/b>\s*a\s*<b>([\s\S]*?)<\/b>/i)
  const salary = salaryMatch ? `${clean(salaryMatch[1])} a ${clean(salaryMatch[2])}` : null

  const contractMatch = html.match(/class="info-modelo-contratual"[^>]*>([\s\S]*?)<\/span>/i)
  const contractType = contractMatch ? clean(contractMatch[1]) || null : null

  let description: string | null = null
  const descInner = extractBalancedDiv(html, /<div class="job-tab-content job-description__text[^"]*"[^>]*>/i)
  if (descInner) {
    const withBreaks = visibleHtml(descInner).replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
    description = decodeHtmlEntities(stripTags(withBreaks)).replace(/\n{3,}/g, "\n\n").trim() || null
  }

  return {
    id,
    title,
    company,
    location,
    date: null,
    url: `${BASE_URL}/vagas/v${id}`,
    description,
    contractType,
    salary,
  }
}
