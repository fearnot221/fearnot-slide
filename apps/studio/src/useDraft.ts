import { useCallback, useEffect, useRef, useState } from "react";
import type { Presentation } from "@packet/document-model";
import type { RecordData } from "@packet/database";
import { request } from "./api";
export function useDraft(document: Presentation, initial: RecordData) {
  const etag = useRef(initial.etag),
    saved = useRef(document),
    latest = useRef(document),
    inFlight = useRef<Promise<void> | null>(null),
    conflict = useRef(false),
    mounted = useRef(true);
  const [status, setStatus] = useState("Saved to disk"),
    [error, setError] = useState(""),
    [revisions, setRevisions] = useState(
      initial.revisions.map((r) => ({
        revisionId: r.revisionId,
        createdAt: r.createdAt,
      })),
    ),
    [published, setPublished] = useState(!!initial.publishedRevisionId);
  latest.current = document;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const save = useCallback(async () => {
    if (conflict.current)
      throw new Error(
        "Revision conflict. Export your project before reloading.",
      );
    if (inFlight.current) await inFlight.current;
    if (saved.current === latest.current) return;
    const snapshot = latest.current;
    setStatus("Saving…");
    const pending = (async () => {
      try {
        const record = await request<RecordData>(
          `/api/presentations/${snapshot.presentationId}`,
          {
            method: "PUT",
            body: JSON.stringify({ document: snapshot, etag: etag.current }),
          },
        );
        etag.current = record.etag;
        saved.current = snapshot;
        if (mounted.current) {
          setStatus(
            snapshot === latest.current ? "Saved to disk" : "Unsaved changes",
          );
          setError("");
        }
      } catch (e) {
        const message = (e as Error).message;
        if (message.includes("another session")) conflict.current = true;
        if (mounted.current) {
          setError(message);
          setStatus("Not saved");
        }
        throw e;
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = pending;
    await pending;
  }, []);
  useEffect(() => {
    if (document === saved.current) return;
    setStatus("Unsaved changes");
    const timeout = setTimeout(() => {
      void save().catch(() => {});
    }, 700);
    return () => clearTimeout(timeout);
  }, [document, save]);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => {
      if (saved.current !== latest.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, []);
  const snapshot = useCallback(
    async (publish = false) => {
      try {
        await save();
        if (saved.current !== latest.current) await save();
        const result = await request<{ record: RecordData }>(
          `/api/presentations/${latest.current.presentationId}/${publish ? "publish" : "revisions"}`,
          { method: "POST", body: JSON.stringify({ etag: etag.current }) },
        );
        etag.current = result.record.etag;
        setRevisions(
          result.record.revisions.map((r) => ({
            revisionId: r.revisionId,
            createdAt: r.createdAt,
          })),
        );
        setPublished(!!result.record.publishedRevisionId);
        setStatus(publish ? "Published snapshot saved" : "Revision created");
        setError("");
        return true;
      } catch (e) {
        setError((e as Error).message);
        return false;
      }
    },
    [save],
  );
  return { status, error, revisions, published, save, snapshot };
}
