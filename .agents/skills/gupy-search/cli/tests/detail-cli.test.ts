import { describe, expect, test } from "bun:test";
import { parseJSON, runWithFixture, type FixtureRoute } from "./helpers";

const JOB_URL =
  "https://qualitydigital.gupy.io/job/eyJqb2JJZCI6MTI4OTkxMDUsInNvdXJjZSI6Imd1cHlfcG9ydGFsIn0=?jobBoardSource=gupy_portal";

const DETAIL: FixtureRoute = {
  origin: "https://qualitydigital.gupy.io",
  pathPrefix: "/job/",
  fixture: "detail-qualitydigital-excerpt.html",
  contentType: "text/html",
};

describe("gupy-cli detail (saved career page)", () => {
  test("reads the job from the page's embedded data", async () => {
    const { result, requests } = await runWithFixture(["detail", JOB_URL], DETAIL);
    const job = parseJSON<Record<string, string | null>>(result);
    expect(requests).toHaveLength(1);
    expect(job.id).toBe("12899105");
    expect(job.title).toBe("PESSOA DESENVOLVEDORA SÊNIOR (BACK-END)");
    expect(job.location).toBe("Remoto");
    expect(job.workplaceType).toBe("remote");
    expect(job.description).toContain("Quality Digital");
    expect(job.description).not.toMatch(/<\/?[a-z][^>]*>/i);
    expect(job.url).toBe(JOB_URL);
  });

  test("plain format prints the title and URL", async () => {
    const { result } = await runWithFixture(["detail", JOB_URL, "--format", "plain"], DETAIL);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.split("\n")[0]).toBe("PESSOA DESENVOLVEDORA SÊNIOR (BACK-END)");
    expect(result.stdout).toContain(`URL: ${JOB_URL}`);
  });
});
