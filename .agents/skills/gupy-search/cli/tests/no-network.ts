globalThis.fetch = (() => {
  throw new Error("network access is blocked in tests");
}) as unknown as typeof fetch;
