import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileRepository, ConflictError } from "@packet/database";
import { packetDemo } from "@packet/fixture";
import { validateDocument, makeElement } from "@packet/document-model";
let directory: string, repo: FileRepository;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "packet-test-"));
  repo = new FileRepository(directory);
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});
describe("Durable draft / revision / publication", () => {
  it("creates, saves and reloads a document from a new repository instance", async () => {
    const record = await repo.create(packetDemo());
    record.document.title = "Saved from Studio";
    const saved = await repo.save(
      record.document.presentationId,
      record.document,
      record.etag,
    );
    expect(saved.etag).toBe(2);
    const disk = await new FileRepository(directory).load(
      record.document.presentationId,
    );
    expect(disk.document.title).toBe("Saved from Studio");
    expect(await repo.list()).toHaveLength(1);
  });
  it("prevents lost updates with optimistic concurrency", async () => {
    const a = await repo.create(packetDemo()),
      b = structuredClone(a);
    a.document.title = "Writer A";
    await repo.save(a.document.presentationId, a.document, a.etag);
    b.document.title = "Writer B";
    await expect(
      repo.save(b.document.presentationId, b.document, b.etag),
    ).rejects.toBeInstanceOf(ConflictError);
    expect((await repo.load(a.document.presentationId)).document.title).toBe(
      "Writer A",
    );
  });
  it("serializes writes from separate repository instances", async () => {
    const r = await repo.create(packetDemo());
    const results = await Promise.allSettled([
      repo.save(r.document.presentationId, { ...r.document, title: "A" }, 1),
      new FileRepository(directory).save(
        r.document.presentationId,
        { ...r.document, title: "B" },
        1,
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });
  it("keeps revisions immutable and separates published from draft", async () => {
    const r = await repo.create(packetDemo());
    const first = await repo.revision(r.document.presentationId, r.etag);
    expect(first.record.revisions).toHaveLength(1);
    const published = await repo.revision(
      r.document.presentationId,
      first.record.etag,
      true,
    );
    const draft = { ...r.document, title: "Unpublished title" };
    await repo.save(r.document.presentationId, draft, published.record.etag);
    expect(
      (await repo.published(r.document.presentationId)).document.title,
    ).toBe(r.document.title);
    expect((await repo.load(r.document.presentationId)).document.title).toBe(
      "Unpublished title",
    );
    expect(
      (await repo.load(r.document.presentationId)).revisions[0].document,
    ).toEqual(r.document);
  });
  it("does not expose drafts as published presentations", async () => {
    const r = await repo.create(packetDemo());
    await expect(
      repo.published(r.document.presentationId),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("preserves referenced assets and rejects invalid references", async () => {
    const d = packetDemo();
    d.assets.push({
      assetId: "asset-test",
      name: "Pixel",
      url: "data:image/png;base64,aGVsbG8=",
    });
    d.scenes[0].elements.push(makeElement("image", { assetId: "asset-test" }));
    await repo.create(validateDocument(d));
    expect((await repo.load(d.presentationId)).document.assets).toEqual(
      d.assets,
    );
    d.assets = [];
    await expect(repo.save(d.presentationId, d, 1)).rejects.toThrow(
      "Missing asset",
    );
  });
  it("rejects path traversal and duplicate create", async () => {
    await expect(repo.load("../outside")).rejects.toThrow();
    const d = packetDemo();
    await repo.create(d);
    await expect(repo.create(d)).rejects.toBeInstanceOf(ConflictError);
  });
  it("rejects saving under a different presentation identity", async () => {
    const d = packetDemo();
    await repo.create(d);
    await expect(
      repo.save(d.presentationId, { ...d, presentationId: "different" }, 1),
    ).rejects.toThrow("identity mismatch");
  });
});
