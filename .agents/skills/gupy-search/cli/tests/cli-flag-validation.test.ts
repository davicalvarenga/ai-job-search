import { describe, expect, test } from "bun:test";
import { runCLI } from "./helpers";

// Every case fails before any request: the default preload throws on fetch.
function expectJsonError(result: { exitCode: number; stderr: string }, code: string) {
  expect(result.exitCode).toBe(1);
  const err = JSON.parse(result.stderr);
  expect(err.error).toBeTruthy();
  expect(err.code).toBe(code);
}

describe("gupy-cli argument validation", () => {
  test("non-numeric --limit, --page and --jobage exit 1 with BAD_ARG", async () => {
    for (const flag of ["--limit", "--page", "--jobage"]) {
      expectJsonError(await runCLI(["search", "-q", "desenvolvedor", flag, "abc"]), "BAD_ARG");
    }
  });

  test("detail without a URL exits 1 with NO_ID", async () => {
    expectJsonError(await runCLI(["detail"]), "NO_ID");
  });

  test("detail rejects a numeric id and a non-Gupy host before fetching", async () => {
    expectJsonError(await runCLI(["detail", "12899105"]), "BAD_ID");
    expectJsonError(await runCLI(["detail", "https://example.com/job/abc"]), "BAD_ID");
    expectJsonError(await runCLI(["detail", "http://qualitydigital.gupy.io/job/abc"]), "BAD_ID");
  });

  test("an unknown command exits 1 with BAD_CMD", async () => {
    expectJsonError(await runCLI(["apply"]), "BAD_CMD");
  });

  test("a network failure is reported as a JSON error, not a crash", async () => {
    expectJsonError(await runCLI(["search", "-q", "desenvolvedor"]), "SEARCH_FAILED");
  });
});
