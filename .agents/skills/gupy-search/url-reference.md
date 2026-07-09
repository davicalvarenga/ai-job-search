# Gupy Portal de Vagas — URL Reference

## Discovery notes

The public portal at `https://portal.gupy.io/job-search/term=<query>` is a Next.js
SPA — the rendered HTML/`_next/data` payload does not contain job results, only
search-form state (`searchFilters`, `toggles`, etc.). Job data is fetched client-side
by the page's JS bundle against a separate API host.

The API host was found by downloading the page's JS chunks
(`/_next/static/chunks/*.js`) and grepping for `baseURL`:

```
c=()=>o().create({baseURL:r((0,n.nS)()?"http://portal-production-application.portal-prod.svc.cluster.local":"https://employability-portal.gupy.io")})
```

`employability-portal.gupy.io` is the production API host reachable from outside the
cluster.

## Endpoints

### Search

```
GET https://employability-portal.gupy.io/api/v1/jobs
```

Query parameters (found via chunk source + live probing):

| Param | Type | Notes |
|---|---|---|
| `jobName` | string | Keyword search against job title/description. |
| `city` | string | Exact-ish city match, e.g. `Goiânia`. URL-encode accented characters. |
| `workplaceTypes` | string | One of `remote`, `hybrid`, `on-site`. **Singular param name despite the plural** — `workplaceTypes[]=remote` (array-bracket form) returns HTTP 400. |
| `limit` | number | Page size. Portal UI uses 10; API accepts higher (tested up to 100 without error). |
| `offset` | number | 0-indexed result offset for pagination. |

No parameter was found for posting age / date filtering — apply this client-side
against each result's `publishedDate` (ISO 8601 string).

Response shape:

```json
{
  "data": [
    {
      "id": 11602614,
      "companyId": 6670,
      "name": "Pessoa Desenvolvedora Java Backend - Júnior",
      "description": "<html-ish string, entities need decoding>",
      "careerPageId": 123,
      "careerPageName": "Unicred",
      "careerPageLogo": "https://...",
      "careerPageUrl": "https://unicredbr.gupy.io/...",
      "type": "vacancy_type_effective",
      "publishedDate": "2026-07-08T21:14:04.239Z",
      "applicationDeadline": "2026-07-19T00:00:00.000Z",
      "isRemoteWork": true,
      "city": "",
      "state": "",
      "country": "Brasil",
      "jobUrl": "https://unicredbr.gupy.io/job/<base64>?jobBoardSource=gupy_portal",
      "badges": [],
      "workplaceType": "remote",
      "disabilities": false,
      "skills": []
    }
  ],
  "pagination": { "total": 653, "limit": 5, "offset": 0 }
}
```

Notes on fields:
- `city`/`state` are often empty strings for remote roles — derive display location
  from `workplaceType === "remote"` first, falling back to `city, state`, falling back
  to `country`.
- `description` contains raw text with embedded HTML-ish fragments and unescaped
  entities in places; strip tags and decode entities before display.
- `jobUrl` points to the *company's own* Gupy subdomain (`<company>.gupy.io`), not
  the aggregator — this is the canonical apply link.

### Detail

```
GET https://employability-portal.gupy.io/api/v1/jobs/<id>
```

Returns the same object shape as a single search result (no `data`/`pagination`
wrapper — the job object directly). 404 on unknown/expired IDs.

## Access rules

- `https://portal.gupy.io/robots.txt` — `Disallow:` is empty (nothing blocked).
- `https://employability-portal.gupy.io/robots.txt` was not separately checked (it's
  an API host, not indexed content), but the portal itself imposes no crawl
  restriction and this integration only calls the same JSON endpoint the portal's
  own frontend calls.
- `https://www.gupy.io/robots.txt` (the marketing site, different host) disallows
  only blog pagination/preview paths — irrelevant here since we never hit that host.

## Maintenance

If Gupy changes their frontend build and this API disappears or moves, re-derive the
host by:
1. Fetching `https://portal.gupy.io/job-search/term=x` and extracting `buildId` from
   the HTML.
2. Fetching `/_next/static/chunks/*.js` referenced in that page.
3. Grepping the concatenated chunk source for `baseURL` near an `axios`/`create(` call.
