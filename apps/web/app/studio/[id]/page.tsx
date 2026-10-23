import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { repository, assertLocal } from "../../../lib/server";
import { Studio } from "@studio/Studio";
export const dynamic = "force-dynamic";
export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const h = await headers();
  try {
    assertLocal(
      new Request(`http://${h.get("host") ?? "localhost"}`, { headers: h }),
    );
  } catch {
    return (
      <main className="notice">
        <h1>Studio unavailable</h1>
        <p>
          Local Studio requires development mode and ENABLE_LOCAL_DEMO=1.
          Production editing requires OIDC authorization.
        </p>
        <Link href="/">Library</Link>
      </main>
    );
  }
  let record;
  try {
    record = await repository.load((await params).id);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") notFound();
    throw e;
  }
  return <Studio initial={record} />;
}
