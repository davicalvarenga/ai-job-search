import { join } from "path";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const CLI_PATH = join(import.meta.dir, "../src/cli.ts");
const NO_NETWORK = join(import.meta.dir, "no-network.ts");

export interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runCLI(args: string[], preload = NO_NETWORK): Promise<CLIResult> {
  const proc = Bun.spawn([process.execPath, "run", "--preload", preload, CLI_PATH, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

export interface FixtureRoute {
  /** Origin the CLI is expected to call, e.g. "https://portal.gupy.io". */
  origin: string;
  /** The request path must start with this. */
  pathPrefix: string;
  /** Saved response, relative to tests/fixtures/. */
  fixture: string;
  /** Response body to serve instead of the saved file (a modified copy of it). */
  body?: string;
  contentType: string;
}

/**
 * Run the real CLI in a child process against a saved response served over
 * loopback. The preload redirects only the expected portal endpoint to the
 * local server; any other request throws before it reaches the network.
 */
export async function runWithFixture(args: string[], route: FixtureRoute): Promise<{ result: CLIResult; requests: URL[] }> {
  const requests: URL[] = [];
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      requests.push(new URL(request.url));
      return new Response(route.body ?? Bun.file(join(import.meta.dir, "fixtures", route.fixture)), {
        headers: { "Content-Type": route.contentType },
      });
    },
  });
  const dir = mkdtempSync(join(tmpdir(), "gupy-fixture-"));
  const preload = join(dir, "fetch.ts");
  writeFileSync(preload, `
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.origin !== ${JSON.stringify(route.origin)} || !url.pathname.startsWith(${JSON.stringify(route.pathPrefix)})) {
        throw new Error("Unexpected fixture request: " + url.href);
      }
      return originalFetch(${JSON.stringify(server.url.origin)} + url.pathname + url.search, init);
    };
  `);
  try {
    return { result: await runCLI(args, preload), requests };
  } finally {
    server.stop(true);
    rmSync(dir, { recursive: true, force: true });
  }
}

export function parseJSON<T = unknown>(result: CLIResult): T {
  if (result.exitCode !== 0) {
    throw new Error(`CLI exited with code ${result.exitCode}. stderr: ${result.stderr}`);
  }
  try {
    return JSON.parse(result.stdout) as T;
  } catch {
    throw new Error(`Failed to parse JSON. stdout: ${result.stdout}\nstderr: ${result.stderr}`);
  }
}
