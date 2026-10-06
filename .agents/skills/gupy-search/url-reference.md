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

`employability-portal.gupy.io` was the production API host reachable from outside the
cluster until early October 2026, when `/api/v1/jobs` started answering a generic
nginx 404. The portal now serves the same search from its own host at
`https://portal.gupy.io/api/job-search/jobs`, with the same query parameters and the
same `data`/`pagination` response wrapper. It is an internal portal address, not a
documented API, so it may move again — see "Maintenance" below.

## Endpoints

### Search

```
GET https://portal.gupy.io/api/job-search/jobs
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

The example above was captured on the old `employability-portal` host. On the
current host, `country` and `companyId` are no longer returned and `isRemoteWork`
may be absent — use `workplaceType` instead. The CLI treats all three as optional.

Notes on fields:
- `city`/`state` are often empty strings for remote roles — derive display location
  from `workplaceType === "remote"` first, falling back to `city, state`, falling back
  to `country` when present.
- `description` contains raw text with embedded HTML-ish fragments and unescaped
  entities in places; strip tags and decode entities before display.
- `jobUrl` points to the *company's own* Gupy subdomain (`<company>.gupy.io`), not
  the aggregator — this is the canonical apply link.

### Detail

The old `GET https://employability-portal.gupy.io/api/v1/jobs/<id>` went away with the
search endpoint, and `portal.gupy.io/api/job-search/jobs/<id>` returns an HTML page,
not JSON. Clicking a result on the portal opens the employer's career page instead:

```
https://<empresa>.gupy.io/job/<base64>?jobBoardSource=gupy_portal
```

`<base64>` decodes to `{"jobId":<id>,"source":"gupy_portal"}` — this is the `jobUrl`
of each search result. A browser session on that page makes no JSON request for the
job itself (only feature flags, cookie banner, analytics and auth calls), so the job
data is server-rendered into the HTML. `detail` fetches the page and reads, in order:

1. the Next.js `<script id="__NEXT_DATA__">` payload (job object with `description`,
   plus `responsibilities` / `prerequisites` when present);
2. a schema.org `JobPosting` in `<script type="application/ld+json">`.

`detail` only fetches `https://*.gupy.io` URLs and rejects any other host.

## Access rules

- `https://portal.gupy.io/robots.txt` — `Disallow:` is empty (nothing blocked).
- The API now lives on `portal.gupy.io` itself, so the rule above covers it; this
  integration only calls the same JSON endpoint the portal's own frontend calls.
- `https://www.gupy.io/robots.txt` (the marketing site, different host) disallows
  only blog pagination/preview paths — irrelevant here since we never hit that host.

## Maintenance

If Gupy changes their frontend build and this API disappears or moves (symptom: the
CLI's `search` exits 1 with "Search endpoint returned 404"), re-derive the host by:
1. Fetching `https://portal.gupy.io/job-search/term=x` and extracting `buildId` from
   the HTML.
2. Fetching `/_next/static/chunks/*.js` referenced in that page.
3. Grepping the concatenated chunk source for `baseURL` near an `axios`/`create(` call.
