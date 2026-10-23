import {
  assertLocal,
  repository,
  errorResponse,
  readJson,
} from "../../../../lib/server";
import { validateDocument } from "@packet/document-model";
import { z } from "zod";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    assertLocal(request);
    return Response.json(await repository.load((await params).id));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PUT(request: Request, { params }: Context) {
  try {
    assertLocal(request);
    const body = z
      .object({ document: z.unknown(), etag: z.number().int().positive() })
      .parse(await readJson(request));
    return Response.json(
      await repository.save(
        (await params).id,
        validateDocument(body.document),
        body.etag,
      ),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
