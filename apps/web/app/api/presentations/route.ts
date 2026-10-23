import {
  assertLocal,
  repository,
  errorResponse,
  readJson,
} from "../../../lib/server";
import { packetDemo } from "@packet/fixture";
import { newId, makeScene, validateDocument } from "@packet/document-model";
import { z } from "zod";
export async function GET(request: Request) {
  try {
    assertLocal(request);
    return Response.json(await repository.list());
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    assertLocal(request);
    const body = z
      .object({
        document: z.unknown().optional(),
        blank: z.boolean().optional(),
      })
      .parse(await readJson(request));
    const doc = body.document ? validateDocument(body.document) : packetDemo();
    doc.presentationId = newId("presentation");
    doc.version = {
      versionId: newId("version"),
      createdAt: new Date().toISOString(),
    };
    if (body.blank) {
      doc.title = "Untitled presentation";
      const scene = makeScene("Scene 1"),
        logicalSlideId = newId("slide"),
        stepId = newId("step");
      doc.scenes = [scene];
      doc.steps = [{ stepId, sceneId: scene.sceneId, name: "Start", time: 0 }];
      doc.logicalSlides = [
        {
          logicalSlideId,
          name: "Slide 1",
          sceneIds: [scene.sceneId],
          stepIds: [stepId],
        },
      ];
      doc.sections = [
        {
          sectionId: newId("section"),
          name: "Presentation",
          logicalSlideIds: [logicalSlideId],
        },
      ];
      doc.assets = [];
      doc.actors = [];
    }
    return Response.json(await repository.create(doc), { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
