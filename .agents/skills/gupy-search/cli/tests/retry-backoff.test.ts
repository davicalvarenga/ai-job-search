import { afterEach, describe, expect, test } from "bun:test";
import { htmlFetch, jsonFetch } from "../src/helpers";

// The portal contract requires backoff on 429/5xx. These tests pin the retry
// loop offline: a stubbed fetch counts attempts, and a stubbed setTimeout
// fires immediately so the exhaustion case does not sleep through the real
// 500ms -> 8s backoff schedule.

const originalFetch = globalThis.fetch;
const originalSetTimeout = globalThis.setTimeout;

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalSetTimeout;
});

function instantTimers() {
  globalThis.setTimeout = ((fn: () => void) => originalSetTimeout(fn, 0)) as unknown as typeof setTimeout;
}

function stubFetch(responses: Array<() => Response>): { calls: number; userAgents: string[] } {
  const state = { calls: 0, userAgents: [] as string[] };
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    state.userAgents.push(new Headers(init?.headers).get("User-Agent") ?? "");
    const i = Math.min(state.calls, responses.length - 1);
    state.calls++;
    return responses[i]();
  }) as unknown as typeof fetch;
  return state;
}

describe("jsonFetch / htmlFetch retry/backoff", () => {
  test("retries a 429 and succeeds on the next attempt", async () => {
    instantTimers();
    const state = stubFetch([
      () => new Response("", { status: 429 }),
      () => Response.json({ data: [], pagination: { total: 0, limit: 10, offset: 0 } }),
    ]);

    const data = await jsonFetch<{ data: unknown[] }>("https://portal.gupy.io/api/job-search/jobs");
    expect(data?.data).toEqual([]);
    expect(state.calls).toBe(2);
  });

  test("returns null on 404 without retrying", async () => {
    const state = stubFetch([() => new Response("", { status: 404 })]);

    expect(await htmlFetch("https://example.gupy.io/job/x")).toBeNull();
    expect(state.calls).toBe(1);
  });

  test("gives up after the initial attempt plus six retries on persistent 5xx", async () => {
    instantTimers();
    const state = stubFetch([() => new Response("", { status: 503 })]);

    await expect(jsonFetch("https://portal.gupy.io/api/job-search/jobs")).rejects.toThrow(/503/);
    expect(state.calls).toBe(7);
  });

  test("identifies itself with the tool's own User-Agent", async () => {
    const state = stubFetch([() => new Response("<html></html>")]);

    await htmlFetch("https://example.gupy.io/job/x");
    expect(state.userAgents[0]).toBe("Mozilla/5.0 (compatible; gupy-cli/1.0)");
  });
});
