# Vagas.com fixtures

Both files were captured on 2026-11-18 through this CLI's own request path
(`User-Agent: Mozilla/5.0 (compatible; vagas-com-cli/1.0)`), one request each.

## `search-desenvolvedor-excerpt.html`

Results page `https://www.vagas.com.br/vagas-de-desenvolvedor`.
Full page SHA-256: `379132fb215a7742392543b504a65d9422bcdae9e6ec3e5772d7331e7121ffaf`.

Kept: the first three `<li class="vaga ...">` cards (jobs `2841827`, `2840867`,
`2843491`) as one contiguous, unmodified slice (SHA-256
`12c18ea32218e92f63158905d23cc871b49956d211ea734dc7a60c94273c5e99`), inside a minimal
HTML shell. Navigation, scripts, ads and the remaining cards are dropped.

## `detail-v2841827-excerpt.html`

Posting page `https://www.vagas.com.br/vagas/v2841827`.
Full page SHA-256: `ffb51491eee562c7f5f2d1c4c8e8c85bcb78bdc1dcaed3abd867dadec75d676f`.

Kept: one contiguous, unmodified slice from `<div class="job-shortdescription"` to the
end of the `job-description__text` block (SHA-256
`f6f35dd4a0f02eb535051e21467f75b15421fbace924d6ec48b4b2bc2ed39ff9`), inside a minimal
HTML shell. It holds the fields `detail` parses; it has no scripts, e-mail
addresses or phone numbers.

## How the tests use them

The CLI tests run the real CLI in a child process. A preload redirects only the
expected Vagas.com path to a loopback server that returns the saved file; any other
request throws. `tests/no-network.ts` blocks `fetch` entirely for the argument
validation tests. The delisted-posting test serves the search excerpt in place of
the posting, as the site does when it redirects a removed job. No test contacts
Vagas.com, and no test regenerates a fixture.
