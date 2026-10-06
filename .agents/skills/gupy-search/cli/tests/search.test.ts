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
