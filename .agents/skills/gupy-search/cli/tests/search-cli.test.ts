import { describe, expect, test } from "bun:test";
import { parseJSON, runWithFixture, type FixtureRoute } from "./helpers";

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

const SEARCH: FixtureRoute = {
  origin: "https://portal.gupy.io",
  pathPrefix: "/api/job-search/jobs",
  fixture: "search-desenvolvedor.json",
  contentType: "application/json",
};

describe("gupy-cli search (saved response)", () => {
  test("maps the saved API response to cards", async () => {
    const { result, requests } = await runWithFixture(["search", "-q", "desenvolvedor"], SEARCH);
    const data = parseJSON<SearchResult>(result);
    expect(requests).toHaveLength(1);
    expect(data.results.map((j) => j.id)).toEqual(["12899105", "12908474", "12908244"]);
    expect(data.results[0]).toMatchObject({
      title: "PESSOA DESENVOLVEDORA SÊNIOR (BACK-END)",
      company: "Quality Digital",
      location: "Remoto",
    });
    expect(data.results[1].location).toBe("Teresina, Piauí");
    for (const job of data.results) expect(new URL(job.url).hostname).toMatch(/\.gupy\.io$/);
  });

  test("sends the query, page offset and workplace filter as API parameters", async () => {
    const { result, requests } = await runWithFixture(
      ["search", "-q", "desenvolvedor", "-l", "Goiânia", "--remote", "remote", "--page", "3"],
      SEARCH,
    );
    expect(result.exitCode).toBe(0);
    const params = requests[0].searchParams;
    expect(params.get("jobName")).toBe("desenvolvedor");
    expect(params.get("city")).toBe("Goiânia");
    expect(params.get("workplaceType")).toBe("remote");
    expect(params.get("limit")).toBe("10");
    expect(params.get("offset")).toBe("20");
  });

  test("--limit trims the results client-side", async () => {
    const { result } = await runWithFixture(["search", "-q", "desenvolvedor", "--limit", "1"], SEARCH);
    const data = parseJSON<SearchResult>(result);
    expect(data.results).toHaveLength(1);
    expect(data.meta.count).toBe(1);
  });

  test("table and plain formats render the saved cards", async () => {
    const table = await runWithFixture(["search", "-q", "desenvolvedor", "--format", "table"], SEARCH);
    expect(table.result.exitCode).toBe(0);
    expect(table.result.stdout).toContain("12899105");
    const plain = await runWithFixture(["search", "-q", "desenvolvedor", "--format", "plain"], SEARCH);
    expect(plain.result.exitCode).toBe(0);
    expect(plain.result.stdout).toContain("id: 12908474");
  });
});
