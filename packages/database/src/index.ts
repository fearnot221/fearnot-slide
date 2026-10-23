// shortcut: local-disk locks support one host; replace with PostgreSQL transactions before production editing.
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  readdir,
  rm,
} from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
  validateDocument,
  idSchema,
  newId,
  type Presentation,
} from "@packet/document-model";
export class ConflictError extends Error {
  constructor() {
    super(
      "Draft changed in another session. Reload or export your work before continuing.",
    );
  }
}
export type Revision = {
  revisionId: string;
  createdAt: string;
  document: Presentation;
};
export type RecordData = {
  document: Presentation;
  etag: number;
  updatedAt: string;
  revisions: Revision[];
  publishedRevisionId?: string;
};
const recordSchema = z.object({
  document: z.unknown(),
  etag: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  revisions: z.array(
    z.object({
      revisionId: idSchema,
      createdAt: z.string().datetime(),
      document: z.unknown(),
    }),
  ),
  publishedRevisionId: idSchema.optional(),
});
export class FileRepository {
  constructor(readonly directory: string) {}
  private file(id: string) {
    idSchema.parse(id);
    return join(this.directory, `${id}.json`);
  }
  async load(id: string): Promise<RecordData> {
    const raw = recordSchema.parse(
      JSON.parse(await readFile(this.file(id), "utf8")),
    );
    return {
      ...raw,
      document: validateDocument(raw.document),
      revisions: raw.revisions.map((r) => ({
        ...r,
        document: validateDocument(r.document),
      })),
    };
  }
  async list() {
    await mkdir(this.directory, { recursive: true });
    const files = (await readdir(this.directory)).filter((f) =>
      f.endsWith(".json"),
    );
    return Promise.all(
      files.map(async (f) => {
        const r = await this.load(f.slice(0, -5));
        return {
          presentationId: r.document.presentationId,
          title: r.document.title,
          updatedAt: r.updatedAt,
          etag: r.etag,
          published: !!r.publishedRevisionId,
        };
      }),
    );
  }
  private async transaction<T>(id: string, fn: () => Promise<T>): Promise<T> {
    const file = this.file(id);
    await mkdir(this.directory, { recursive: true });
    const lock = `${file}.lock`;
    let acquired = false;
    for (let i = 0; i < 100; i++) {
      try {
        await mkdir(lock);
        acquired = true;
        break;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
        await new Promise((r) => setTimeout(r, 20));
      }
    }
    if (!acquired) throw new Error("Repository busy: retry later");
    try {
      return await fn();
    } finally {
      await rm(lock, { recursive: true, force: true });
    }
  }
  private async write(id: string, record: RecordData) {
    const file = this.file(id),
      tmp = `${file}.${crypto.randomUUID()}.tmp`;
    try {
      await writeFile(tmp, JSON.stringify(record), { mode: 0o600 });
      await rename(tmp, file);
    } catch (e) {
      await rm(tmp, { force: true });
      throw e;
    }
  }
  async create(doc: Presentation) {
    const document = validateDocument(doc);
    return this.transaction(document.presentationId, async () => {
      try {
        await this.load(document.presentationId);
        throw new ConflictError();
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
      const record = {
        document,
        etag: 1,
        updatedAt: new Date().toISOString(),
        revisions: [],
      };
      await this.write(document.presentationId, record);
      return record;
    });
  }
  async save(id: string, doc: Presentation, etag: number) {
    const document = validateDocument(doc);
    if (id !== document.presentationId)
      throw new Error("Presentation identity mismatch");
    return this.transaction(id, async () => {
      const record = await this.load(id);
      if (record.etag !== etag) throw new ConflictError();
      const next = {
        ...record,
        document,
        etag: etag + 1,
        updatedAt: new Date().toISOString(),
      };
      await this.write(id, next);
      return next;
    });
  }
  async revision(id: string, etag: number, publish = false) {
    return this.transaction(id, async () => {
      const record = await this.load(id);
      if (record.etag !== etag) throw new ConflictError();
      const revision = {
        revisionId: newId("revision"),
        createdAt: new Date().toISOString(),
        document: structuredClone(record.document),
      };
      record.revisions.push(revision);
      if (publish) record.publishedRevisionId = revision.revisionId;
      record.etag++;
      record.updatedAt = new Date().toISOString();
      await this.write(id, record);
      return { record, revision };
    });
  }
  async published(id: string) {
    const r = await this.load(id);
    const revision = r.revisions.find(
      (v) => v.revisionId === r.publishedRevisionId,
    );
    if (!revision)
      throw Object.assign(new Error("Not published"), { code: "ENOENT" });
    return structuredClone(revision);
  }
}
