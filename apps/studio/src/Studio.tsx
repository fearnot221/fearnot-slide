"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import {
  Undo2,
  Redo2,
  Play,
  Upload,
  Download,
  Plus,
  Type,
  Square,
  Circle,
  MousePointer2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Camera,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Box,
  ImagePlus,
} from "lucide-react";
import {
  newId,
  makeElement,
  orderedSteps,
  serialize,
  type Element,
  type Presentation,
} from "@packet/document-model";
import { resolveScene } from "@packet/motion-engine";
import { SceneRenderer } from "@packet/scene-engine";
import { usePlayback, Viewer, FitStage } from "@packet/presentation-runtime";
import type { RecordData } from "@packet/database";
import type { Command } from "@packet/editor-core";
import { createEditorStore } from "./store";
import { useDraft } from "./useDraft";
import { StageCanvas } from "./StageCanvas";
import { Timeline } from "./Timeline";
import { Inspector } from "./Inspector";
import { downloadJson } from "./api";
export function Studio({ initial }: { initial: RecordData }) {
  const [store] = useState(() => createEditorStore(initial.document)),
    state = useStore(store),
    doc = state.history.present;
  const [sceneId, setSceneId] = useState(doc.scenes[0].sceneId),
    [tab, setTab] = useState<"scenes" | "layers" | "actors" | "versions">(
      "scenes",
    ),
    [error, setError] = useState(""),
    [zoom, setZoom] = useState(100),
    [grid, setGrid] = useState(false),
    [snap, setSnap] = useState(true),
    [preview, setPreview] = useState(false),
    [animationOpen, setAnimationOpen] = useState(false),
    [cameraTarget, setCameraTarget] = useState(false),
    [operation, setOperation] = useState(false);
  const scene = doc.scenes.find((s) => s.sceneId === sceneId) ?? doc.scenes[0],
    playback = usePlayback(scene),
    draft = useDraft(doc, initial),
    steps = orderedSteps(doc),
    selected = state.selected;
  const slideIndex = doc.logicalSlides.findIndex((slide) =>
    slide.sceneIds.includes(scene.sceneId),
  );
  const slide = doc.logicalSlides[slideIndex];
  const slideSteps = steps.filter((step) =>
    slide.stepIds.includes(step.stepId),
  );
  const stageTime = animationOpen ? playback.time : scene.duration;
  const imageInput = useRef<HTMLInputElement>(null);
  function addSlide() {
    dispatch({ type: "scene.add" });
    const added = store.getState().history.present.logicalSlides.at(-1)!;
    jump(added.sceneIds[0]);
    setTab("scenes");
  }
  function toggleAnimation() {
    playback.pause();
    setAnimationOpen(!animationOpen);
    setCameraTarget(false);
    if (tab === "actors") setTab("scenes");
  }
  const dispatch = useCallback(
    (command: Command) => {
      try {
        store.getState().dispatch(command);
        setError("");
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [store],
  );
  const select = useCallback(
    (ids: string[]) => {
      store.getState().select(ids);
      setCameraTarget(false);
    },
    [store],
  );
  function add(type: Element["type"]) {
    const el = makeElement(type);
    dispatch({ type: "element.add", sceneId: scene.sceneId, element: el });
    select([el.elementId]);
  }
  function jump(id: string, time = 0) {
    setSceneId(id);
    select([]);
    playback.pause();
    queueMicrotask(() => playback.seek(time));
  }
  const pendingSeek = useRef<number | null>(null);
  const seek = playback.seek;
  function goStep(id: string) {
    const step = steps.find((s) => s.stepId === id);
    if (!step) return;
    if (step.sceneId === scene.sceneId) playback.seek(step.time);
    else {
      pendingSeek.current = step.time;
      setSceneId(step.sceneId);
      select([]);
    }
  }
  useEffect(() => {
    seek(pendingSeek.current ?? 0);
    pendingSeek.current = null;
  }, [scene.sceneId, seek]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.isContentEditable || target.matches("input,textarea,select"))
        return;
      if (preview) {
        if (e.key === "Escape") setPreview(false);
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) store.getState().redo();
        else store.getState().undo();
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void draft.save().catch((err) => setError(err.message));
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        dispatch({
          type: "element.duplicate",
          sceneId: scene.sceneId,
          ids: selected,
        });
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        dispatch({
          type: "element.delete",
          sceneId: scene.sceneId,
          ids: selected,
        });
        select([]);
      }
      if (e.key === "Escape") select([]);
      if (animationOpen && e.code === "Space" && !target.matches("button")) {
        e.preventDefault();
        if (playback.playing) playback.pause();
        else playback.play();
      }
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) &&
        selected.length
      ) {
        e.preventDefault();
        const el = resolveScene(doc, scene.sceneId, stageTime).elements.find(
          (v) => v.elementId === selected[0],
        );
        if (el) {
          const amount = e.shiftKey ? 10 : 1;
          dispatch({
            type: "element.pose",
            sceneId: scene.sceneId,
            ids: selected,
            time: stageTime,
            patch:
              e.key === "ArrowLeft" || e.key === "ArrowRight"
                ? { x: el.x + (e.key === "ArrowRight" ? amount : -amount) }
                : { y: el.y + (e.key === "ArrowDown" ? amount : -amount) },
          });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    scene,
    selected,
    dispatch,
    store,
    select,
    playback,
    draft,
    preview,
    animationOpen,
    doc,
    stageTime,
  ]);
  async function snapshot(publish: boolean) {
    setOperation(true);
    await draft.snapshot(publish);
    setOperation(false);
    setTab("versions");
  }
  function addActor(actor?: Presentation["actors"][number]) {
    const existing =
      actor && scene.elements.find((e) => e.actorId === actor.actorId);
    if (existing) {
      select([existing.elementId]);
      return;
    }
    const shared = actor ?? {
      actorId: newId("actor"),
      name: "New packet",
      packet: {
        frameNumber: 8,
        totalBytes: 273,
        segments: [
          { name: "Ethernet", bytes: 14, color: "#7896B2" },
          { name: "IP", bytes: 20, color: "#8aafa2" },
          { name: "TCP", bytes: 20, color: "#c3b58a" },
          { name: "Data", bytes: 219, color: "#F0A86E" },
        ],
      },
    };
    const element = makeElement("packet", {
      name: shared.name,
      actorId: shared.actorId,
      representation: "bar",
      x: 300,
      y: 500,
      width: 1320,
      height: 170,
    });
    dispatch(
      actor
        ? { type: "element.add", sceneId: scene.sceneId, element }
        : { type: "actor.add", sceneId: scene.sceneId, actor: shared, element },
    );
    select([element.elementId]);
  }
  if (preview)
    return (
      <>
        <div className="preview-bar">
          <span>Unsaved document preview · same presentation runtime</span>
          <button onClick={() => setPreview(false)}>
            Return to Studio · Esc
          </button>
        </div>
        <Viewer document={doc} initialStepId={slideSteps[0]?.stepId} autoPlay />
      </>
    );
  return (
    <main className="studio">
      <header className="topbar">
        <Link href="/" className="brand-mark" aria-label="Presentation library">
          P
        </Link>
        <div className="document-title">
          <input
            aria-label="Presentation name"
            key={doc.title}
            defaultValue={doc.title}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value !== doc.title)
                dispatch({ type: "title", title: e.target.value.trim() });
            }}
          />
          <span
            role="status"
            aria-label="Save status"
            className={draft.error ? "save-status error" : "save-status"}
          >
            <i />
            {draft.status}
          </span>
        </div>
        <div className="history-controls">
          <button
            aria-label="Undo"
            title="Undo (⌘Z)"
            disabled={!state.history.past.length}
            onClick={state.undo}
          >
            <Undo2 size={17} />
          </button>
          <button
            aria-label="Redo"
            title="Redo (⌘⇧Z)"
            disabled={!state.history.future.length}
            onClick={state.redo}
          >
            <Redo2 size={17} />
          </button>
        </div>
        <button onClick={addSlide}>
          <Plus size={15} /> New slide
        </button>
        <span className="top-spacer" />
        <span className="local-badge">LOCAL WORKSPACE</span>
        <button
          onClick={() =>
            downloadJson(
              `${doc.title.replace(/[^a-z0-9]/gi, "-")}.json`,
              serialize(doc),
            )
          }
        >
          <Download size={15} /> Project JSON
        </button>
        <button
          className="primary"
          onClick={() => {
            playback.pause();
            setPreview(true);
          }}
        >
          <Play size={15} /> Present
        </button>
        {draft.published && (
          <a
            className="button"
            href={`/p/${doc.presentationId}`}
            target="_blank"
            rel="noreferrer"
          >
            Open published ↗
          </a>
        )}
        <button disabled={operation} onClick={() => snapshot(true)}>
          <Upload size={15} />
          {operation ? "Saving…" : "Publish"}
        </button>
      </header>
      {(error || draft.error) && (
        <div className="error-banner" role="alert">
          {error || draft.error}
          <button
            onClick={() => draft.save().catch((e) => setError(e.message))}
          >
            Retry save
          </button>
          <button
            onClick={() =>
              downloadJson("recovery-project.json", serialize(doc))
            }
          >
            Export recovery copy
          </button>
        </div>
      )}
      <div className="editor-main">
        <aside className="left-panel">
          <div className="panel-tabs">
            <button
              aria-pressed={tab === "scenes"}
              onClick={() => setTab("scenes")}
            >
              Slides
            </button>
            <button
              aria-pressed={tab === "layers"}
              onClick={() => setTab("layers")}
            >
              Layers
            </button>
            {animationOpen && (
              <button
                aria-pressed={tab === "actors"}
                onClick={() => setTab("actors")}
              >
                Actors
              </button>
            )}
            <button
              aria-pressed={tab === "versions"}
              onClick={() => setTab("versions")}
            >
              History
            </button>
          </div>
          {tab === "scenes" ? (
            <>
              <div className="panel-heading">
                <span>{doc.logicalSlides.length} SLIDES</span>
                <button aria-label="Add slide" onClick={addSlide}>
                  <Plus size={15} />
                </button>
              </div>
              <ol className="scene-list">
                {doc.logicalSlides.map((logicalSlide, i) => {
                  const thumbnail = doc.scenes.find(
                    (s) => s.sceneId === logicalSlide.sceneIds[0],
                  )!;
                  const active = logicalSlide.sceneIds.includes(scene.sceneId);
                  return (
                    <li key={logicalSlide.logicalSlideId}>
                      <button
                        className={`scene-card ${active ? "active" : ""}`}
                        aria-label={`Open slide ${i + 1}: ${logicalSlide.name}`}
                        aria-pressed={active}
                        onClick={() => jump(thumbnail.sceneId)}
                      >
                        <span className="scene-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="slide-thumbnail" aria-hidden="true">
                          <FitStage>
                            <SceneRenderer
                              document={doc}
                              sceneId={thumbnail.sceneId}
                              time={thumbnail.duration}
                            />
                          </FitStage>
                        </div>
                        <span className="scene-card-label">
                          {logicalSlide.name}
                        </span>
                      </button>
                      {animationOpen &&
                        active &&
                        logicalSlide.sceneIds.length > 1 && (
                          <div className="slide-scenes">
                            {logicalSlide.sceneIds.map((id, j) => (
                              <button
                                key={id}
                                aria-pressed={scene.sceneId === id}
                                onClick={() => jump(id)}
                              >
                                Scene {j + 1} ·{" "}
                                {doc.scenes.find((s) => s.sceneId === id)!.name}
                              </button>
                            ))}
                          </div>
                        )}
                    </li>
                  );
                })}
              </ol>
              {animationOpen && (
                <div className="panel-footer">
                  <span className="eyebrow">SLIDE BUILDS</span>
                  {slideSteps.map((s, i) => (
                    <button
                      key={s.stepId}
                      className={
                        s.sceneId === scene.sceneId ? "current-step" : ""
                      }
                      onClick={() => goStep(s.stepId)}
                    >
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      {s.name}
                    </button>
                  ))}
                  {animationOpen && (
                    <button
                      onClick={() =>
                        dispatch({
                          type: "step.add",
                          sceneId: scene.sceneId,
                          time: Math.round(playback.time),
                        })
                      }
                    >
                      <Plus size={13} /> Step at playhead
                    </button>
                  )}
                </div>
              )}
            </>
          ) : tab === "layers" ? (
            <>
              <div className="panel-heading">
                <span>{scene.elements.length} ELEMENTS</span>
              </div>
              <div className="layer-list">
                {[...scene.elements].reverse().map((e) => (
                  <div
                    className={`layer-row ${selected.includes(e.elementId) ? "active" : ""}`}
                    key={e.elementId}
                  >
                    <button
                      className="layer-select"
                      onClick={(ev) =>
                        select(
                          ev.shiftKey
                            ? [...new Set([...selected, e.elementId])]
                            : [e.elementId],
                        )
                      }
                    >
                      {e.actorId ? (
                        <Box size={13} />
                      ) : e.type === "text" ? (
                        <Type size={13} />
                      ) : (
                        <Square size={13} />
                      )}
                      <span>{e.name}</span>
                    </button>
                    <button
                      aria-label={`${e.hidden ? "Show" : "Hide"} ${e.name}`}
                      onClick={() =>
                        dispatch({
                          type: "element.patch",
                          sceneId: scene.sceneId,
                          ids: [e.elementId],
                          patch: { hidden: !e.hidden },
                        })
                      }
                    >
                      {e.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button
                      aria-label={`${e.locked ? "Unlock" : "Lock"} ${e.name}`}
                      onClick={() => {
                        if (e.locked) {
                          dispatch({
                            type: "element.unlock",
                            sceneId: scene.sceneId,
                            id: e.elementId,
                          });
                        } else
                          dispatch({
                            type: "element.patch",
                            sceneId: scene.sceneId,
                            ids: [e.elementId],
                            patch: { locked: true },
                          });
                      }}
                    >
                      {e.locked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                  </div>
                ))}
              </div>
              <div className="layer-actions">
                <button
                  aria-label="Move layer forward"
                  disabled={!selected.length}
                  onClick={() =>
                    dispatch({
                      type: "element.reorder",
                      sceneId: scene.sceneId,
                      id: selected[0],
                      direction: 1,
                    })
                  }
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  aria-label="Move layer backward"
                  disabled={!selected.length}
                  onClick={() =>
                    dispatch({
                      type: "element.reorder",
                      sceneId: scene.sceneId,
                      id: selected[0],
                      direction: -1,
                    })
                  }
                >
                  <ChevronDown size={15} />
                </button>
                <button
                  aria-label="Duplicate selected element"
                  disabled={
                    !selected.length ||
                    scene.elements.some(
                      (e) => selected.includes(e.elementId) && !!e.actorId,
                    )
                  }
                  title="Shared actor instances cannot be duplicated within the same scene"
                  onClick={() =>
                    dispatch({
                      type: "element.duplicate",
                      sceneId: scene.sceneId,
                      ids: selected,
                    })
                  }
                >
                  <Copy size={15} />
                </button>
                <button
                  aria-label="Delete selected element"
                  disabled={!selected.length}
                  onClick={() => {
                    dispatch({
                      type: "element.delete",
                      sceneId: scene.sceneId,
                      ids: selected,
                    });
                    select([]);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </>
          ) : tab === "actors" ? (
            <>
              <div className="panel-heading">
                <span>SHARED ACTORS</span>
                <button
                  aria-label="Create shared packet actor"
                  onClick={() => addActor()}
                >
                  <Plus size={15} />
                </button>
              </div>
              {doc.actors.map((a) => (
                <div className="actor-row" key={a.actorId}>
                  <Box size={16} />
                  <div>
                    <strong>{a.name}</strong>
                    <small>
                      {a.packet.totalBytes} bytes ·{" "}
                      {
                        doc.scenes.filter((s) =>
                          s.elements.some((e) => e.actorId === a.actorId),
                        ).length
                      }{" "}
                      scenes
                    </small>
                  </div>
                  <button onClick={() => addActor(a)}>
                    {scene.elements.some((e) => e.actorId === a.actorId)
                      ? "Select"
                      : "Place"}
                  </button>
                </div>
              ))}
              <p className="panel-hint">
                Place an actor in another scene to preserve its identity.
                Representation and geometry belong to each scene.
              </p>
            </>
          ) : (
            <>
              <div className="panel-heading">
                <span>{draft.revisions.length} REVISIONS</span>
              </div>
              <button
                className="create-revision"
                disabled={operation}
                onClick={() => snapshot(false)}
              >
                <Plus size={14} /> Create revision
              </button>
              {[...draft.revisions].reverse().map((r, i) => (
                <div key={r.revisionId} className="revision-row">
                  <strong>Revision {draft.revisions.length - i}</strong>
                  <small>{new Date(r.createdAt).toLocaleString("zh-TW")}</small>
                  <code>{r.revisionId.slice(0, 22)}…</code>
                </div>
              ))}
              <p className="panel-hint">
                Revisions are immutable snapshots. Restore UI is not yet
                available.
              </p>
            </>
          )}
        </aside>
        <section className="center-panel">
          <div className="canvas-toolbar">
            <div className="tool-group">
              <button aria-label="Selection tool" className="selected">
                <MousePointer2 size={17} />
              </button>
              <button aria-label="Add text" onClick={() => add("text")}>
                <Type size={17} />
                <span>Text</span>
              </button>
              <button aria-label="Add rectangle" onClick={() => add("rect")}>
                <Square size={16} />
              </button>
              <button aria-label="Add ellipse" onClick={() => add("ellipse")}>
                <Circle size={16} />
              </button>
              <select
                aria-label="Add shape"
                value=""
                onChange={(e) => {
                  if (e.target.value) add(e.target.value as Element["type"]);
                }}
              >
                <option value="">More shapes</option>
                <option value="line">Line</option>
                <option value="arrow">Arrow</option>
                <option value="path">SVG path</option>
              </select>
              <button
                aria-label="Add image"
                onClick={() => imageInput.current?.click()}
              >
                <ImagePlus size={17} />
                <span>Image</span>
              </button>
              <input
                ref={imageInput}
                aria-label="Image file"
                tabIndex={-1}
                className="visually-hidden"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  try {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1_000_000)
                      throw new Error("Image limit: 1 MB");
                    const url = await new Promise<string>((resolve, reject) => {
                      const r = new FileReader();
                      r.onload = () => resolve(String(r.result));
                      r.onerror = () =>
                        reject(new Error("Unable to read image"));
                      r.readAsDataURL(file);
                    });
                    const assetId = newId("asset"),
                      element = makeElement("image", {
                        assetId,
                        name: file.name,
                      });
                    dispatch({
                      type: "asset.add",
                      sceneId: scene.sceneId,
                      asset: { assetId, name: file.name, url },
                      element,
                    });
                    select([element.elementId]);
                  } catch (err) {
                    setError((err as Error).message);
                  }
                  e.target.value = "";
                }}
              />
            </div>
            <div className="canvas-options">
              <button
                aria-label="Animation"
                aria-expanded={animationOpen}
                aria-controls="animation-editor"
                className={animationOpen ? "selected" : ""}
                onClick={toggleAnimation}
              >
                <Sparkles size={14} /> Animation
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={grid}
                  onChange={(e) => setGrid(e.target.checked)}
                />
                Grid
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={snap}
                  onChange={(e) => setSnap(e.target.checked)}
                />
                Snap
              </label>
              <select
                aria-label="Editor zoom"
                value={zoom}
                onChange={(e) => setZoom(+e.target.value)}
              >
                {[60, 80, 100, 125, 150, 200].map((v) => (
                  <option key={v} value={v}>
                    {v === 100 ? "Fit" : `${v}%`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <StageCanvas
            document={doc}
            sceneId={scene.sceneId}
            time={stageTime}
            selected={selected}
            select={select}
            dispatch={dispatch}
            zoom={zoom}
            grid={grid}
            snap={snap}
          />
          <div className="scene-navigation">
            <span>
              Slide {slideIndex + 1} of {doc.logicalSlides.length}
            </span>
            <span>{slide.name}</span>
            <button
              aria-label="Previous slide"
              disabled={slideIndex === 0}
              onClick={() =>
                jump(doc.logicalSlides[slideIndex - 1].sceneIds[0])
              }
            >
              <ChevronLeft size={14} />
            </button>
            <button
              aria-label="Next slide"
              disabled={slideIndex === doc.logicalSlides.length - 1}
              onClick={() =>
                jump(doc.logicalSlides[slideIndex + 1].sceneIds[0])
              }
            >
              <ChevronRight size={14} />
            </button>
            {animationOpen && (
              <button
                className={cameraTarget ? "selected" : ""}
                onClick={() => setCameraTarget(!cameraTarget)}
              >
                <Camera size={14} />
                {cameraTarget ? "Camera selected" : "Animate camera"}
              </button>
            )}
          </div>
          {animationOpen && (
            <Timeline
              scene={scene}
              playback={playback}
              selectedTarget={
                cameraTarget
                  ? "camera"
                  : (scene.elements.find((e) => e.elementId === selected[0])
                      ?.actorId ??
                    selected[0] ??
                    "")
              }
              dispatch={dispatch}
            />
          )}
        </section>
        <Inspector
          key={animationOpen ? "animation" : "slide"}
          document={doc}
          scene={scene}
          time={stageTime}
          animationOpen={animationOpen}
          selected={selected}
          dispatch={dispatch}
          onCamera={() => setCameraTarget(true)}
        />
      </div>
      <footer className="statusbar">
        <span>
          Slide {slideIndex + 1} of {doc.logicalSlides.length}
        </span>
        <span>⌘Z Undo · ⌘D Duplicate · ⌘S Save</span>
        <span>1920 × 1080</span>
      </footer>
    </main>
  );
}
