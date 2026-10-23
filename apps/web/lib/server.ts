import { FileRepository, ConflictError } from "@packet/database";
import { ZodError } from "zod";
export const repository = new FileRepository(
  process.env.PACKET_DATA_DIR ?? `${process.cwd()}/.data`,
);
export function assertLocal(request: Request) {
  const url = new URL(request.url);
  const canonical = new URL(
    `${url.protocol}//${request.headers.get("host") ?? url.host}`,
  );
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ENABLE_LOCAL_DEMO !== "1"
  )
    throw Object.assign(
      new Error(
        "Private APIs disabled: production OIDC authorization is not implemented.",
      ),
      { status: 503 },
    );
  if (!["localhost", "127.0.0.1", "[::1]"].includes(canonical.hostname))
    throw Object.assign(new Error("Local demo is loopback-only"), {
      status: 403,
    });
  const origin = request.headers.get("origin");
  if (origin && origin !== canonical.origin)
    throw Object.assign(new Error("Cross-origin request rejected"), {
      status: 403,
    });
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none")
    throw Object.assign(new Error("Cross-site request rejected"), {
      status: 403,
    });
}
export async function readJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Request body required");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    length += part.value.byteLength;
    if (length > 4_000_000) {
      await reader.cancel();
      throw Object.assign(new Error("Document exceeds 4 MB"), { status: 413 });
    }
    chunks.push(part.value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function errorResponse(error: unknown) {
  const e = error as Error & { status?: number; code?: string };
  const status =
    error instanceof ConflictError
      ? 409
      : error instanceof ZodError || error instanceof SyntaxError
        ? 400
        : (e.status ?? (e.code === "ENOENT" ? 404 : 500));
  if (status === 500) console.error(error);
  return Response.json(
    {
      error:
        status === 500
          ? "Storage operation failed. Your edits have not been discarded."
          : e.message,
    },
    { status },
  );
}
