"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compileTimeline } from "@packet/motion-engine";
import {
  orderedSteps,
  pageNumber,
  type Presentation,
  type Scene,
} from "@packet/document-model";
import { SceneRenderer } from "@packet/scene-engine";
export function usePlayback(scene: Scene) {
  const [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [loop, setLoop] = useState(false);
  const clock = useRef<ReturnType<typeof compileTimeline> | null>(null);
  const timeRef = useRef(0);
  const update = useCallback((t: number) => {
    timeRef.current = t;
    setTime(t);
  }, []);
  useEffect(() => {
    const c = compileTimeline(scene, update);
    clock.current = c;
    setPlaying(false);
    c.seek(Math.min(timeRef.current, scene.duration));
    c.timeline.eventCallback("onComplete", () => setPlaying(false));
    c.timeline.eventCallback("onReverseComplete", () => setPlaying(false));
    return () => c.dispose();
  }, [scene, update]);
  useEffect(() => {
    clock.current?.timeline.timeScale(speed);
  }, [speed, scene.timeline]);
  useEffect(() => {
    clock.current?.timeline.repeat(loop ? -1 : 0);
  }, [loop, scene.timeline]);
  const seek = useCallback((t: number) => {
    clock.current?.seek(t);
    setPlaying(false);
  }, []);
  const play = useCallback(
    (reverse = false) => {
      const c = clock.current;
      if (!c) return;
      if (reverse) {
        if (c.timeline.time() === 0) c.seek(scene.duration);
        c.timeline.reverse();
      } else {
        if (c.timeline.time() * 1000 >= scene.duration) c.seek(0);
        c.timeline.play();
      }
      setPlaying(true);
    },
    [scene.duration],
  );
  const pause = useCallback(() => {
    clock.current?.timeline.pause();
    setPlaying(false);
  }, []);
  return { time, playing, speed, setSpeed, loop, setLoop, seek, play, pause };
}
export function FitStage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setScale(entry.contentRect.width / 1920),
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className="fit-stage"
      style={{
        width: "100%",
        aspectRatio: "16/9",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 1920,
          height: 1080,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        {children}
      </div>
    </div>
  );
}
export function Viewer({
  document: doc,
  initialStepId,
  autoPlay = false,
}: {
  document: Presentation;
  initialStepId?: string;
  autoPlay?: boolean;
}) {
  const steps = useMemo(() => orderedSteps(doc), [doc]),
    [stepId, setStepId] = useState(initialStepId ?? steps[0].stepId),
    [ready, setReady] = useState(false);
  const step = steps.find((s) => s.stepId === stepId) ?? steps[0];
  const scene = doc.scenes.find((s) => s.sceneId === step.sceneId)!;
  const playback = usePlayback(scene);
  const seek = playback.seek;
  const play = playback.play;
  const playOnNavigation = useRef(autoPlay);
  useEffect(() => {
    const id =
      initialStepId ?? new URLSearchParams(location.search).get("step");
    if (id && steps.some((s) => s.stepId === id)) setStepId(id);
    setReady(true);
  }, [steps, initialStepId]);
  useEffect(() => {
    if (!ready) return;
    seek(step.time);
    if (playOnNavigation.current) {
      playOnNavigation.current = false;
      play();
    }
    const url = new URL(location.href);
    url.searchParams.set("step", step.stepId);
    history.replaceState(null, "", url);
  }, [ready, step.stepId, step.time, seek, play]);
  const navigate = useCallback(
    (direction: number) => {
      const index = steps.findIndex((s) => s.stepId === step.stepId);
      const next = steps[index + direction];
      if (next) {
        playOnNavigation.current = true;
        setStepId(next.stepId);
      }
    },
    [steps, step.stepId, setStepId],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          "input,select,textarea,[contenteditable]:not([contenteditable=false])",
        )
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        navigate(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigate(-1);
      }
      if (e.code === "Space" && !target.closest("button,a")) {
        e.preventDefault();
        if (playback.playing) playback.pause();
        else playback.play();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [navigate, playback]);
  return (
    <main className="viewer">
      <header>
        <a href="/">PACKET STUDIO</a>
        <span>{doc.title}</span>
        <span>
          {pageNumber(doc, scene.sceneId)} / {doc.logicalSlides.length}
        </span>
      </header>
      <FitStage>
        <SceneRenderer
          document={doc}
          sceneId={scene.sceneId}
          time={playback.time}
        />
      </FitStage>
      <footer>
        <button
          onClick={() => navigate(-1)}
          disabled={step.stepId === steps[0].stepId}
        >
          ← Previous
        </button>
        <button
          onClick={() =>
            playback.playing ? playback.pause() : playback.play()
          }
        >
          {playback.playing ? "Pause" : "Play"}
        </button>
        <button onClick={() => playback.play(true)}>Reverse</button>
        <input
          aria-label="Viewer time"
          type="range"
          min={0}
          max={scene.duration}
          value={playback.time}
          onChange={(e) => playback.seek(+e.target.value)}
        />
        <select
          aria-label="Teaching step"
          value={step.stepId}
          onChange={(e) => setStepId(e.target.value)}
        >
          {steps.map((s, i) => (
            <option key={s.stepId} value={s.stepId}>
              {i + 1}. {s.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => navigate(1)}
          disabled={step.stepId === steps.at(-1)!.stepId}
        >
          Next →
        </button>
        <button onClick={() => window.print()}>Print / PDF</button>
      </footer>
      {scene.notes && (
        <aside className="presenter-notes">
          <strong>Presenter notes</strong>
          <p>{scene.notes}</p>
        </aside>
      )}
    </main>
  );
}
