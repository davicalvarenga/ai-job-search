# Vagas.com — URL Reference

## Discovery notes

Unlike Gupy (a Next.js SPA backed by a separate JSON API) or Indeed (aggressive
bot-blocking WAF), Vagas.com serves plain server-rendered HTML for both search and
detail pages, with no client-side data fetching involved. Found by fetching real
search-result URLs surfaced via web search (`site:vagas.com.br ...`) and inspecting
the returned markup directly.

## Endpoints

### Search

```
GET https://www.vagas.com.br/vagas-de-<query-slug>[-em-<city-slug>][?pagina=<n>]
```

- `<query-slug>`: the search keyword, lowercased, accents stripped, spaces to
  hyphens (e.g. `desenvolvedor júnior` -> `desenvolvedor-junior`). Confirmed
  working examples: `/vagas-de-programador-junior/`, `/vagas-de-desenvolvedor`,
  `/vagas-de-programador-trainee-em-goiania`.
- `-em-<city-slug>` is optional; same slugification applied to the city name.
- `pagina=<n>` (1-indexed... actually the site's own "load more" button targets
  `pagina=2` for the second batch) paginates further results. Confirmed via the
  `data-url="/vagas-de-programador?pagina=2&q=programador"` attribute on the
  "load more" button, and by fetching `?pagina=2` directly (returns a distinct
  results page, HTTP 200).
- No parameter was found for posting-age filtering — apply this client-side
  against each card's `data-publicacao` date (format `DD/MM/YYYY`).
- A specific `query`+`city` combination can legitimately return zero results
  (the site tracks this itself: a `dataLayer.push` event
  `eventAction: "erro:nao-encontramos-vagas"` fires on empty result pages) — this
  is normal search behavior, not a sign of a broken parser.

### Result card markup

Each result is an `<li class="vaga odd|even">`:

```html
<li class="vaga odd ">
  <header class="clearfix">
    ...
    <h2 class="cargo">
      <a class="link-detalhes-vaga" data-id-vaga="2814044"
         title="Programa Trainee 2026 | Auditoria Contábil" id="v2814044"
         href="/vagas/v2814044/programa-trainee-2026-auditoria-contabil">
        <mark>Programa</mark> <mark>Trainee</mark> 2026 | Auditoria Contábil
      </a>
    </h2>
    <span class="emprVaga"> BDO </span>
    <div class="nivelQtdVagas">
      <span class="nivelVaga"> Júnior/Trainee </span>
      <span class="qtdPosicoes"> - 8 vagas </span>
    </div>
  </header>
  <div class="detalhes"><p>...</p></div>
  <footer>
    <div class="vaga-local">
      <i class="bx bx-map"></i>
      <mark>Goiânia</mark> / GO
      <div class="tooltip-place">...</div>
    </div>
    <span class="data-publicacao"><i class="bx bx-time-five"></i>12/05/2026</span>
  </footer>
</li>
```

Notes for the parser:
- Title text may contain `<mark>` tags (search-term highlighting) — the
  `title="..."` attribute on the same anchor gives the clean, unhighlighted title,
  so we read from there instead of the inner text.
- `class="vaga-local"` has a nested `<div class="tooltip-place">` sibling
  ("A empresa aceita candidaturas de qualquer cidade do Brasil") directly inside
  it — a naive non-greedy match to the first `</div>` grabs the *inner* tooltip
  div's close tag, not the outer one, and picks up the tooltip text. The parser
  instead matches up to the first `<div` **or** `</div>`, whichever comes first,
  since the location text always precedes any nested tag.
- Job ID is available directly as `data-id-vaga="<id>"` — no need to parse it out
  of the URL.

### Detail

```
GET https://www.vagas.com.br/vagas/v<id>[/<any-slug>]
```

The slug suffix is cosmetic; `/vagas/v<id>` alone resolves correctly.

Key markup:
- Title: `<h1 class="job-shortdescription__title">`
- Company: `<h2 class="job-shortdescription__company">`
- Location: `<span class="info-localizacao">` — same nested-tooltip-div issue as
  the search card; same fix applied (stop at first `<div` or `</span>`).
- Salary (when disclosed): inside a `<figure class="icone-salario">` sibling block,
  as `<b>R$ X</b> a <b>R$ Y</b>`.
- Contract type: `<span class="info-modelo-contratual">` (e.g. "Regime CLT").
- Description: `<div class="job-tab-content job-description__text ..." data-testid="JobDescription">`.
  **This block contains nested `<div>`s of its own** (paragraphs, formatting
  wrappers), so a non-greedy regex to "next `</div>`" truncates early and a greedy
  one overshoots into the following "Empresa" tab section. The parser instead
  scans forward from the opening tag counting nested `<div>`/`</div>` pairs to find
  the true matching close tag (see `extractBalancedDiv` in `helpers.ts`).

## Access rules

`https://www.vagas.com.br/robots.txt` disallows:

```
/auth/ /move_to /servicos/ /v1/ /api/ /social/ /users/ /token/
/vagas/pesquisas /suporte /suporte-flix /mapa-de-carreiras/cargo/
```

None of these overlap with `/vagas-de-...` (search) or `/vagas/v<id>` (detail).
`/vagas/pesquisas` is a **different, specific path** from `/vagas/v<id>` — worth
double-checking on any future robots.txt change since the prefix looks similar.

The file **separately** names a block of AI crawlers — including `ClaudeBot`,
`Claude-Web`, and `anthropic-ai` — with `Disallow: /` (the entire site), listed
under a section commented "Crawlers de IA / LLM training". This is a specific,
named restriction on Anthropic-affiliated agents, distinct from the general
`User-agent: *` policy above (which only restricts `/vagas/pesquisas` and
account/auth paths). The candidate was informed of this explicitly and chose to
proceed for personal job-search use only — see the SKILL.md personal-use warning.
Do not scale this integration up (higher volume, other users, commercial use)
without re-reading that restriction.
