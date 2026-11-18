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
  origin: "https://www.vagas.com.br",
  pathPrefix: "/vagas-de-",
  fixture: "search-desenvolvedor-excerpt.html",
  contentType: "text/html",
};

describe("vagas-com-cli search (saved results page)", () => {
  test("parses the saved result cards", async () => {
    const { result, requests } = await runWithFixture(["search", "-q", "desenvolvedor"], SEARCH);
    const data = parseJSON<SearchResult>(result);
    expect(requests).toHaveLength(1);
    expect(data.results.map((j) => j.id)).toEqual(["2841827", "2840867", "2843491"]);
    expect(data.results[0]).toMatchObject({
      title: "Desenvolvedor de Software Jr",
      company: "HStern",
      location: "Rio de Janeiro / RJ",
      date: "04/11/2026",
    });
    for (const job of data.results) expect(job.url.startsWith("https://www.vagas.com.br/vagas/v")).toBe(true);
  });

  test("builds the slug URL from the query, city and page", async () => {
    const { result, requests } = await runWithFixture(
      ["search", "-q", "Desenvolvedor Júnior", "-l", "Goiânia", "--page", "2"],
      SEARCH,
    );
    expect(result.exitCode).toBe(0);
    expect(requests[0].pathname).toBe("/vagas-de-desenvolvedor-junior-em-goiania");
    expect(requests[0].searchParams.get("pagina")).toBe("2");
  });

  test("--limit trims the results client-side", async () => {
    const { result } = await runWithFixture(["search", "-q", "desenvolvedor", "--limit", "2"], SEARCH);
    expect(parseJSON<SearchResult>(result).results).toHaveLength(2);
  });

  test("table and plain formats render the saved cards", async () => {
    const table = await runWithFixture(["search", "-q", "desenvolvedor", "--format", "table"], SEARCH);
    expect(table.result.exitCode).toBe(0);
    expect(table.result.stdout).toContain("2841827");
    const plain = await runWithFixture(["search", "-q", "desenvolvedor", "--format", "plain"], SEARCH);
    expect(plain.result.exitCode).toBe(0);
    expect(plain.result.stdout).toContain("id: 2840867");
  });
});
