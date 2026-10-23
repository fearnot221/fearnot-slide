import { notFound } from "next/navigation";
import { repository } from "../../../lib/server";
import { Viewer } from "@packet/presentation-runtime";
export const dynamic = "force-dynamic";
export default async function Published({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let revision;
  try {
    revision = await repository.published((await params).id);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") notFound();
    throw e;
  }
  const publicDocument = {
    ...revision.document,
    scenes: revision.document.scenes.map((scene) => ({ ...scene, notes: "" })),
  };
  return <Viewer document={publicDocument} />;
}
