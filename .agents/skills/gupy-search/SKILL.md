---
name: gupy-search
version: 1.0.0
description: >
  Search job listings on Gupy's public "Portal de Vagas" — the largest recruitment
  ATS platform in Brazil, used by thousands of Brazilian companies (Unicred, Cyrela,
  InBetta, and many more) to publish openings. Trigger phrases: gupy, vagas gupy,
  buscar vagas, procurar emprego, job search Brazil, estágio, vaga de emprego,
  desenvolvedor júnior, trainee, oportunidades de trabalho.
context: fork
allowed-tools: Bash(bun run .agents/skills/gupy-search/cli/src/cli.ts *)
---

# Gupy Search Skill

Search live job listings from Gupy's public Portal de Vagas (portal.gupy.io) — a
Brazil-wide aggregator that indexes openings from every company using Gupy as their
recruitment ATS. No authentication, no API key, and **zero runtime dependencies** —
it runs with just `bun`.

## Commands

### Search job listings

```bash
bun run .agents/skills/gupy-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keyword search (title, skill, or role). Recommended.
- `--location <text>` / `-l <text>` — city name filter, e.g. `"Goiânia"`. Matches Gupy's
  `city` field exactly, so combine with `--remote` instead when the location constraint
  is really "or remote" — passing both a narrow city and a narrow query can over-filter
  to zero results (see Notes).
- `--remote <mode>` — `remote`, `hybrid`, or `onsite` (workplace-type filter).
- `--jobage <days>` — posted within N days. Applied **client-side** (Gupy's API has no
  posting-age parameter) against each job's `publishedDate`.
- `--page <n>` — page number (1-indexed, 10 results per page).
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/gupy-search/cli/src/cli.ts detail <id> [--format json|plain]
```

`id` is the numeric job ID from `search` results (e.g. `11602614`). Returns the full
description, workplace type, application deadline, and apply URL.

## Usage examples

```bash
# Developer/junior roles, remote
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "desenvolvedor júnior" --remote remote --format table

# Any tech internship, remote, posted in the last 14 days
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "estágio TI" --remote remote --jobage 14 --format table

# Roles physically based in Goiânia (any function)
bun run .agents/skills/gupy-search/cli/src/cli.ts search -l "Goiânia" --format table

# Automation / n8n roles nationwide
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "automação n8n" --format table

# Full details for a specific job
bun run .agents/skills/gupy-search/cli/src/cli.ts detail 11602614 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing IDs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- Data source is `employability-portal.gupy.io`'s JSON API — the same backend the
  Next.js portal app calls client-side. It is a real, paginated REST API (not scraped
  HTML), so results are clean and structured.
- `--location` filters on Gupy's `city` field with what appears to be an exact/near-exact
  match — it will not catch remote roles headquartered elsewhere. For "my city or
  remote" searches, run two separate searches: one with `-l "<your city>"`
  and one with `--remote remote`, rather than combining both flags in one call.
- `robots.txt` for `portal.gupy.io` and `employability-portal.gupy.io` has no
  disallow rules — this integration only reads public data, no ToS restriction found.
- Job IDs are numeric (e.g. `11602614`) — pass them as-is to `detail`.
