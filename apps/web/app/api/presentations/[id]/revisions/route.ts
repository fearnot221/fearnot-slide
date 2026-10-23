import {
  assertLocal,
  repository,
  errorResponse,
  readJson,
} from "../../../../../lib/server";
import { z } from "zod";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertLocal(request);
    const body = z
      .object({ etag: z.number().int().positive() })
      .parse(await readJson(request));
    return Response.json(
      await repository.revision((await params).id, body.etag, false),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
