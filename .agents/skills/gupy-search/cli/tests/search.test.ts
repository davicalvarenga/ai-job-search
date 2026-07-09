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
  test("returns full detail for a real job id", async () => {
    const search = await runCLI(["search", "-q", "desenvolvedor", "--limit", "1"]);
    const searchData = parseJSON<SearchResult>(search);
    const id = searchData.results[0].id;

    const result = await runCLI(["detail", id]);
    const detail = parseJSON<JobCard & { description: string | null }>(result);
    expect(detail.id).toBe(id);
    expect(detail.description).toBeTruthy();
  });

  test("exits 1 with a JSON error on a missing id", async () => {
    const result = await runCLI(["detail"]);
    expect(result.exitCode).toBe(1);
    const err = JSON.parse(result.stderr);
    expect(err.error).toBeTruthy();
  });
});
