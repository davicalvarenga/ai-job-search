---
name: vagas-com-search
version: 1.0.0
description: >
  Search job listings on Vagas.com, one of Brazil's largest generalist job boards,
  strong in internship (estágio) and trainee openings. Trigger phrases: vagas.com,
  buscar vagas, procurar emprego, vaga de emprego, estágio, trainee, programa de
  trainee, desenvolvedor, job search Brazil, oportunidades de trabalho.
context: fork
allowed-tools: Bash(bun run .agents/skills/vagas-com-search/cli/src/cli.ts *)
---

# Vagas.com Search Skill

Search live job listings from Vagas.com's public, server-rendered search results
pages — one of Brazil's largest generalist job boards. No authentication, no API
key, and **zero runtime dependencies** — it runs with just `bun`.

## ⚠️ Personal use only

Vagas.com's `robots.txt` carries a **named block on Anthropic crawlers**
(`User-agent: ClaudeBot` / `Claude-Web` / `anthropic-ai` → `Disallow: /`), separate
from its general policy (which only restricts `/vagas/pesquisas` and account paths,
and does not cover the search/detail paths this skill uses). The candidate chose to
proceed anyway for personal job-search use. **Keep volume low, do not use this
commercially or for bulk data collection, and re-evaluate if Vagas.com's terms or
robots.txt tighten further.** Run it on your own responsibility.

## Commands

### Search job listings

```bash
bun run .agents/skills/vagas-com-search/cli/src/cli.ts search --query "<text>" [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — **required.** Job title or keyword. Vagas.com's
  search URLs are keyword-slug based (`/vagas-de-<slug>`), so this drives the URL
  directly rather than being a filter on a broader listing.
- `--location <text>` / `-l <text>` — city name filter, e.g. `"Goiânia"`. Appended
  to the URL as `-em-<city-slug>`. Omit for nationwide/remote results — the keyword
  slug and location slug are combined into one exact search term, so an overly
  specific combination of both can return zero results even when each works alone
  (see Notes).
- `--jobage <days>` — posted within N days. Applied **client-side** (Vagas.com's
  search pages have no posting-age parameter) against each card's publication date.
- `--page <n>` — page number (1-indexed). Vagas.com paginates via a `pagina` query param.
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/vagas-com-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the numeric job ID from `search` results (e.g. `2814044`). You may also pass
a full `/vagas/v<id>/...` URL. Returns the full description, contract type, salary
range (when disclosed), and the canonical job URL.

## Usage examples

```bash
# Developer roles in Goiânia
bun run .agents/skills/vagas-com-search/cli/src/cli.ts search -q "desenvolvedor" -l "Goiânia" --format table

# Trainee programs in Goiânia
bun run .agents/skills/vagas-com-search/cli/src/cli.ts search -q "programador trainee" -l "Goiânia" --format table

# Any tech internship nationwide, posted in the last 14 days
bun run .agents/skills/vagas-com-search/cli/src/cli.ts search -q "estágio TI" --jobage 14 --format table

# Second page of results
bun run .agents/skills/vagas-com-search/cli/src/cli.ts search -q "desenvolvedor" --page 2 --format table

# Full details for a specific job
bun run .agents/skills/vagas-com-search/cli/src/cli.ts detail 2814044 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing IDs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- Data source is Vagas.com's public, server-rendered search pages
  (`/vagas-de-<query-slug>[-em-<city-slug>]`) — plain HTML, no JS execution needed,
  parsed with regex chunked per `<li class="vaga">` card.
- `robots.txt` disallows `/vagas/pesquisas`, `/api/`, `/v1/`, and a handful of
  account/auth paths — none of those overlap with the search (`/vagas-de-...`) or
  detail (`/vagas/v<id>/...`) paths this integration uses.
- Combining a specific `--query` with a specific `--location` can legitimately
  return zero results if no current posting matches that exact slug combination —
  this mirrors the site's own keyword-slug search behavior, not a parsing bug. Try
  the query alone, or the location alone, to sanity-check before assuming a broken
  parser.
- Job IDs are numeric (e.g. `2814044`) — pass them as-is to `detail`.
