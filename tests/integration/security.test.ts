import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { assertLocal, readJson } from "../../apps/web/lib/server";
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("ENABLE_LOCAL_DEMO", "1");
});
afterEach(() => vi.unstubAllEnvs());
it("accepts browser loopback Host even when Next internal URL uses localhost", () => {
  expect(() =>
    assertLocal(
      new Request("http://localhost:3100/api/presentations", {
        headers: {
          Host: "127.0.0.1:3100",
          Origin: "http://127.0.0.1:3100",
          "Sec-Fetch-Site": "same-origin",
        },
      }),
    ),
  ).not.toThrow();
});
it("rejects production even with the demo flag enabled", () => {
  vi.stubEnv("NODE_ENV", "production");
  expect(() =>
    assertLocal(new Request("http://127.0.0.1:3000/api/presentations")),
  ).toThrow("Private APIs disabled");
});
it("requires explicit development flag", () => {
  vi.stubEnv("ENABLE_LOCAL_DEMO", "0");
  expect(() => assertLocal(new Request("http://localhost:3000"))).toThrow();
});
it("rejects DNS rebinding hosts, foreign origins and cross-site metadata", () => {
  const cases: Record<string, string>[] = [
    { Host: "attacker.example" },
    { Host: "localhost:3000", Origin: "https://attacker.example" },
    { Host: "localhost:3000", "Sec-Fetch-Site": "cross-site" },
  ];
  for (const headers of cases)
    expect(() =>
      assertLocal(new Request("http://localhost:3000", { headers })),
    ).toThrow();
});
it("reads valid JSON and rejects oversized streamed bodies", async () => {
  expect(
    await readJson(
      new Request("http://localhost", { method: "POST", body: '{"ok":true}' }),
    ),
  ).toEqual({ ok: true });
  await expect(
    readJson(
      new Request("http://localhost", {
        method: "POST",
        body: "x".repeat(4_000_001),
      }),
    ),
  ).rejects.toMatchObject({ status: 413 });
});
