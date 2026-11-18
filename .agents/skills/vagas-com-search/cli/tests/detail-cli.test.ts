import { describe, expect, test } from "bun:test";
import { parseJSON, runWithFixture, type FixtureRoute } from "./helpers";

const DETAIL: FixtureRoute = {
  origin: "https://www.vagas.com.br",
  pathPrefix: "/vagas/v2841827",
  fixture: "detail-v2841827-excerpt.html",
  contentType: "text/html",
};

describe("vagas-com-cli detail (saved posting page)", () => {
  test("parses title, company, location, contract and description", async () => {
    const { result, requests } = await runWithFixture(["detail", "2841827"], DETAIL);
    const job = parseJSON<Record<string, string | null>>(result);
    expect(requests).toHaveLength(1);
    expect(job).toMatchObject({
      id: "2841827",
      title: "Desenvolvedor de Software Jr",
      company: "HStern",
      location: "Rio de Janeiro",
      contractType: "Regime CLT",
      url: "https://www.vagas.com.br/vagas/v2841827",
    });
    expect(job.description).toContain("HStern");
    expect(job.description).not.toMatch(/<\/?[a-z][^>]*>/i);
  });

  test("accepts a full posting URL as the id", async () => {
    const { result } = await runWithFixture(
      ["detail", "https://www.vagas.com.br/vagas/v2841827/desenvolvedor-de-software-jr"],
      DETAIL,
    );
    expect(parseJSON<{ id: string }>(result).id).toBe("2841827");
  });

  test("plain format prints the title and URL", async () => {
    const { result } = await runWithFixture(["detail", "2841827", "--format", "plain"], DETAIL);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.split("\n")[0]).toBe("Desenvolvedor de Software Jr");
    expect(result.stdout).toContain("URL: https://www.vagas.com.br/vagas/v2841827");
  });

  test("a delisted posting (redirected to a search page) exits 1 with NOT_FOUND", async () => {
    const { result } = await runWithFixture(["detail", "2841827"], {
      ...DETAIL,
      fixture: "search-desenvolvedor-excerpt.html",
    });
    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stderr).code).toBe("NOT_FOUND");
  });
});
