import { describe, expect, test } from "bun:test";
import { runCLI, parseJSON } from "./helpers.js";

interface JobCard {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  date: string | null;
  url: string;
}

interface SearchResult {
  meta: { count: number; page: number };
  results: JobCard[];
}

describe("gupy-cli search", () => {
  test("returns real results for a common query", async () => {
    const result = await runCLI(["search", "-q", "desenvolvedor", "--limit", "5"]);
    const data = parseJSON<SearchResult>(result);
    expect(data.results.length).toBeGreaterThan(0);
    const first = data.results[0];
    expect(first.id).toBeTruthy();
    expect(first.title).toBeTruthy();
    expect(first.url).toContain("gupy.io");
  });

  test("--remote remote returns only remote jobs", async () => {
    const result = await runCLI(["search", "-q", "desenvolvedor", "--remote", "remote"]);
    const data = parseJSON<SearchResult>(result);
    expect(data.results.length).toBeGreaterThan(0);
    // location is "Remoto" exactly when the job's workplaceType is "remote"
    for (const job of data.results) expect(job.location).toBe("Remoto");
  });

  test("--location filters on city", async () => {
    const result = await runCLI(["search", "-q", "analista", "-l", "São Paulo"]);
    const data = parseJSON<SearchResult>(result);
    const onsite = data.results.filter((j) => j.location !== "Remoto");
    expect(onsite.length).toBeGreaterThan(0);
    for (const job of onsite) expect(job.location).toContain("São Paulo");
  });

  test("--jobage keeps only recently published jobs", async () => {
    const days = 30;
    const result = await runCLI(["search", "-q", "analista", "--jobage", String(days)]);
    const data = parseJSON<SearchResult>(result);
    const cutoff = Date.now() - days * 86400 * 1000;
    for (const job of data.results) {
      if (job.date) expect(new Date(job.date).getTime()).toBeGreaterThanOrEqual(cutoff);
    }
  });

  test("--page 2 returns a different page than page 1", async () => {
    const [p1, p2] = await Promise.all([
      runCLI(["search", "-q", "analista", "--page", "1"]),
      runCLI(["search", "-q", "analista", "--page", "2"]),
    ]);
    const ids1 = new Set(parseJSON<SearchResult>(p1).results.map((j) => j.id));
    const page2 = parseJSON<SearchResult>(p2).results;
    expect(ids1.size).toBeGreaterThan(0);
    expect(page2.length).toBeGreaterThan(0);
    expect(page2.some((j) => !ids1.has(j.id))).toBe(true);
  });

  test("exits 1 with a JSON error on a bad flag value", async () => {
    const result = await runCLI(["search", "-q", "desenvolvedor", "--limit", "not-a-number"]);
    expect(result.exitCode).toBe(1);
    const err = JSON.parse(result.stderr);
    expect(err.error).toBeTruthy();
  });
});

describe("gupy-cli detail", () => {
  test("returns full detail for a real job url", async () => {
    const search = await runCLI(["search", "-q", "desenvolvedor", "--limit", "1"]);
    const searchData = parseJSON<SearchResult>(search);
    const { id, url } = searchData.results[0];

    const result = await runCLI(["detail", url]);
    const detail = parseJSON<JobCard & { description: string | null }>(result);
    expect(detail.id).toBe(id);
    expect(detail.title).toBeTruthy();
    expect(detail.description).toBeTruthy();
  });

  test("rejects a bare numeric id with a pointer to the url field", async () => {
    const result = await runCLI(["detail", "11602614"]);
    expect(result.exitCode).toBe(1);
    const err = JSON.parse(result.stderr);
    expect(err.code).toBe("BAD_ID");
  });

  test("refuses to fetch a non-Gupy host", async () => {
    const result = await runCLI(["detail", "https://example.com/job/eyJqb2JJZCI6MX0="]);
    expect(result.exitCode).toBe(1);
    const err = JSON.parse(result.stderr);
    expect(err.code).toBe("BAD_ID");
  });

  test("exits 1 with a JSON error on a missing id", async () => {
    const result = await runCLI(["detail"]);
    expect(result.exitCode).toBe(1);
    const err = JSON.parse(result.stderr);
    expect(err.error).toBeTruthy();
  });
});
