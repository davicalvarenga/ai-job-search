# Gupy fixtures

Both files were captured on 2026-11-18 through this CLI's own request path
(`User-Agent: Mozilla/5.0 (compatible; gupy-cli/1.0)`), one request each.

## `search-desenvolvedor.json`

Response of `GET https://portal.gupy.io/api/job-search/jobs?jobName=desenvolvedor&limit=10&offset=0`.
Full response SHA-256: `a7514c9899f4237e1d7d521e79625dee1242b9ece023b066809154a820b8e206`.

Only the first three objects of `data` are kept, unchanged, together with the
original `pagination` object; the JSON is re-serialized with two-space indentation.

## `detail-qualitydigital-excerpt.html`

Career page for job `12899105`, the first result above:
`https://qualitydigital.gupy.io/job/eyJqb2JJZCI6MTI4OTkxMDUsInNvdXJjZSI6Imd1cHlfcG9ydGFsIn0=?jobBoardSource=gupy_portal`.
Full page SHA-256: `cd70f915d22a78b5bb1a751294e0c617b31ea738fc93827181e85e44e15c75e6`.

Only the two blocks `detail` reads are kept, byte for byte, inside a minimal
HTML shell: the schema.org `<script type="application/ld+json">` block
(SHA-256 `730d287742ebf1e372c46ff4648a04ce06edfb981ccb1ec71e39fc4f61aba92c`) and the
Next.js `<script id="__NEXT_DATA__">` block
(SHA-256 `5528be88dea0e10dc217b8a6c6bc288ee92df31a87ebd47cf012fe30767947c6`).
Neither holds keys, tokens or personal data: the page data is the public job
posting plus interface strings.

## How the tests use them

The CLI tests run the real CLI in a child process. A preload redirects only the
expected Gupy endpoint to a loopback server that returns the saved file; any other
request throws. `tests/no-network.ts` blocks `fetch` entirely for the argument
validation tests. No test contacts Gupy, and no test regenerates a fixture.
