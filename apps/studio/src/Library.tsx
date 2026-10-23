"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowUpRight, Layers, Import } from "lucide-react";
import { deserialize } from "@packet/document-model";
import { request } from "./api";
type Item = {
  presentationId: string;
  title: string;
  updatedAt: string;
  published: boolean;
};
export function Library() {
  const router = useRouter();
  const importInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [query, setQuery] = useState("");
  useEffect(() => {
    request<Item[]>("/api/presentations")
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, []);
  async function create(blank = false, document?: unknown) {
    setBusy(true);
    setError("");
    try {
      const record = await request<{ document: { presentationId: string } }>(
        "/api/presentations",
        { method: "POST", body: JSON.stringify({ blank, document }) },
      );
      router.push(`/studio/${record.document.presentationId}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="library">
      <nav>
        <Link className="brand" href="/">
          <span className="brand-mark">P</span> PACKET{" "}
          <span className="muted">SLIDES</span>
        </Link>
        <span className="local-badge">LOCAL DEVELOPMENT</span>
      </nav>
      <header className="library-heading">
        <div>
          <span className="eyebrow">YOUR WORKSPACE / PRESENTATIONS</span>
          <h1>Your presentations.</h1>
          <p>Create slides, shape your story, and present at your own pace.</p>
        </div>
        <button
          className="primary"
          disabled={busy}
          onClick={() => create(true)}
        >
          <Plus size={16} /> New presentation
        </button>
      </header>
      <div className="library-tools">
        <label className="search">
          Search{" "}
          <input
            aria-label="Search presentations"
            placeholder="Find a presentation…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div>
          <button
            className="file-button"
            disabled={busy}
            onClick={() => importInput.current?.click()}
          >
            <Import size={16} /> Import project JSON
          </button>
          <input
            ref={importInput}
            className="visually-hidden"
            tabIndex={-1}
            aria-label="Project JSON file"
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              try {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 4_000_000)
                    throw new Error("Maximum project size: 4 MB");
                  await create(false, deserialize(await file.text()));
                }
              } catch (err) {
                setError((err as Error).message);
              }
              e.target.value = "";
            }}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {busy && <p role="status">Loading workspace…</p>}
      <section className="deck-grid" aria-label="Presentations">
        <article className="deck reference">
          <div className="deck-art">
            <span className="eyebrow">REFERENCE PROJECT / 003 SCENES</span>
            <h2>
              PACKET<span>A living network.</span>
            </h2>
            <div className="mini-packet">
              <i />
              <i />
              <i />
              <i />
            </div>
            <span className="art-footer">273 BYTES. ONE CONTINUOUS STORY.</span>
          </div>
          <div className="deck-info">
            <div>
              <h3>PACKET / Motion Editor Reference</h3>
              <p>Example presentation · 3 slides · editable content</p>
            </div>
            <button
              aria-label="Create PACKET demo"
              disabled={busy}
              onClick={() => create()}
            >
              <ArrowUpRight size={20} />
            </button>
          </div>
        </article>
        {items
          .filter((i) => i.title.toLowerCase().includes(query.toLowerCase()))
          .map((item) => (
            <article className="deck" key={item.presentationId}>
              <a className="saved-deck" href={`/studio/${item.presentationId}`}>
                <Layers size={32} />
                <h2>{item.title}</h2>
                <span>Open in Studio ↗</span>
              </a>
              <div className="deck-info">
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    {new Date(item.updatedAt).toLocaleString("zh-TW")} ·{" "}
                    {item.published ? "Published" : "Draft"}
                  </p>
                </div>
                {item.published && (
                  <a
                    href={`/p/${item.presentationId}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`View ${item.title}`}
                  >
                    <ArrowUpRight size={18} />
                  </a>
                )}
              </div>
            </article>
          ))}
      </section>
      <p className="library-note">
        Local workspace · Documents are saved on this computer. Original PACKET
        source has not been supplied; the reference is authored from the
        specification.
      </p>
    </main>
  );
}
