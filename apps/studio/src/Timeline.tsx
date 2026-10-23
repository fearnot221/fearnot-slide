import { useState, type PointerEvent } from "react";
import {
  Play,
  Pause,
  SkipBack,
  RotateCcw,
  Plus,
  Diamond,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  newId,
  channels,
  type Scene,
  type Track,
  type Channel,
  type Keyframe,
  type Ease,
} from "@packet/document-model";
import { interpolate } from "@packet/motion-engine";
import type { Command } from "@packet/editor-core";
import type { usePlayback } from "@packet/presentation-runtime";
import { NumberField } from "./Inspector";
type Selection = { trackId: string; keyframeId: string };
export function Timeline({
  scene,
  playback,
  selectedTarget,
  dispatch,
}: {
  scene: Scene;
  playback: ReturnType<typeof usePlayback>;
  selectedTarget: string;
  dispatch: (c: Command) => void;
}) {
  const [property, setProperty] = useState<Channel>("x"),
    [selection, setSelection] = useState<Selection | null>(null),
    [expanded, setExpanded] = useState(true),
    [drag, setDrag] = useState<{ selection: Selection; time: number } | null>(
      null,
    );
  const target = selectedTarget || scene.elements[0]?.elementId || "camera",
    track = scene.timeline.tracks.find((t) => t.trackId === selection?.trackId),
    key = track?.keyframes.find((k) => k.keyframeId === selection?.keyframeId);
  const available =
    target === "camera"
      ? channels.filter((c) => ["x", "y", "zoom", "rotation"].includes(c))
      : channels.filter((c) => c !== "zoom");
  const put = (t: Track) =>
    dispatch({ type: "track.put", sceneId: scene.sceneId, track: t });
  function add() {
    const p = available.includes(property) ? property : available[0],
      existing = scene.timeline.tracks.find(
        (t) => t.targetId === target && t.property === p,
      ),
      time = Math.round(playback.time);
    const el = scene.elements.find(
      (e) => e.elementId === target || e.actorId === target,
    );
    const base =
      target === "camera"
        ? scene.camera[p as keyof typeof scene.camera]
        : (el?.[p as keyof typeof el] ?? 0);
    const value = existing
      ? interpolate(existing.keyframes, time)
      : typeof base === "number"
        ? base
        : 0;
    const k: Keyframe = {
      keyframeId: newId("key"),
      time,
      value,
      ease: "power2.inOut",
    };
    let t: Track;
    if (existing) {
      const same = existing.keyframes.find((k) => k.time === time);
      if (same) {
        setSelection({
          trackId: existing.trackId,
          keyframeId: same.keyframeId,
        });
        return;
      }
      t = {
        ...existing,
        keyframes: [...existing.keyframes, k].sort((a, b) => a.time - b.time),
      };
    } else
      t = {
        trackId: newId("track"),
        targetId: target,
        property: p,
        muted: false,
        keyframes:
          time === 0
            ? [k]
            : [
                {
                  keyframeId: newId("key"),
                  time: 0,
                  value: typeof base === "number" ? base : 0,
                  ease: "none",
                },
                k,
              ],
      };
    put(t);
    setSelection({ trackId: t.trackId, keyframeId: k.keyframeId });
  }
  function patch(value: Partial<Keyframe>) {
    if (selection)
      dispatch({
        type: "keyframe.patch",
        sceneId: scene.sceneId,
        ...selection,
        patch: value,
      });
  }
  function rulerTime(e: PointerEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.round(
      Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) *
        scene.duration,
    );
  }
  return (
    <section
      className={`timeline ${expanded ? "" : "collapsed"}`}
      aria-label="Motion timeline"
      id="animation-editor"
    >
      <div className="timeline-toolbar">
        <button aria-label="Go to start" onClick={() => playback.seek(0)}>
          <SkipBack size={15} />
        </button>
        <button
          aria-label={playback.playing ? "Pause" : "Play"}
          onClick={() =>
            playback.playing ? playback.pause() : playback.play()
          }
        >
          {playback.playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          aria-label="Reverse playback"
          onClick={() => playback.play(true)}
        >
          <RotateCcw size={15} />
        </button>
        <output className="timecode" role="timer" aria-live="off">
          {(playback.time / 1000).toFixed(2)}
          <span> / {(scene.duration / 1000).toFixed(1)} s</span>
        </output>
        <select
          aria-label="Playback speed"
          value={playback.speed}
          onChange={(e) => playback.setSpeed(+e.target.value)}
        >
          {[0.25, 0.5, 1, 1.5, 2].map((v) => (
            <option key={v} value={v}>
              {v}×
            </option>
          ))}
        </select>
        <label className="check">
          <input
            type="checkbox"
            checked={playback.loop}
            onChange={(e) => playback.setLoop(e.target.checked)}
          />
          Loop
        </label>
        <div className="timeline-add">
          <span>
            {target === "camera"
              ? "Camera"
              : (scene.elements.find(
                  (e) => e.elementId === target || e.actorId === target,
                )?.name ?? "Element")}
          </span>
          <select
            aria-label="Animation property"
            value={available.includes(property) ? property : available[0]}
            onChange={(e) => setProperty(e.target.value as Channel)}
          >
            {available.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <button onClick={add}>
            <Plus size={13} /> Keyframe
          </button>
        </div>
        <button
          className="collapse"
          aria-label={expanded ? "Collapse timeline" : "Expand timeline"}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>
      {expanded && (
        <>
          <div className="scrub-row">
            <span className="eyebrow">TIMELINE / MS</span>
            <input
              aria-label="Timeline time"
              type="range"
              min={0}
              max={scene.duration}
              step={10}
              value={playback.time}
              onChange={(e) => playback.seek(+e.target.value)}
            />
          </div>
          <div className="timeline-tracks">
            <div className="track-row ruler-row">
              <span>PROPERTY</span>
              <div
                className="ruler"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  playback.seek(rulerTime(e));
                }}
                onPointerMove={(e) => {
                  if (e.buttons === 1) playback.seek(rulerTime(e));
                }}
              >
                {Array.from({ length: 7 }, (_, i) => (
                  <span key={i} style={{ left: `${(i / 6) * 100}%` }}>
                    {(((i / 6) * scene.duration) / 1000).toFixed(1)}s
                  </span>
                ))}
              </div>
            </div>
            {scene.timeline.tracks.map((t) => (
              <div
                className={`track-row ${selection?.trackId === t.trackId ? "active" : ""}`}
                key={t.trackId}
              >
                <div className="track-label">
                  <Diamond size={10} />
                  <span title={t.targetId}>
                    {t.targetId === "camera"
                      ? "Camera"
                      : (scene.elements.find(
                          (e) =>
                            e.elementId === t.targetId ||
                            e.actorId === t.targetId,
                        )?.name ?? t.targetId)}
                    <small>{t.property}</small>
                  </span>
                  <button
                    aria-label={`Delete ${t.property} track`}
                    onClick={() =>
                      dispatch({
                        type: "track.delete",
                        sceneId: scene.sceneId,
                        trackId: t.trackId,
                      })
                    }
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                <div
                  className="track-lane"
                  onPointerMove={(e) => {
                    if (drag && drag.selection.trackId === t.trackId)
                      setDrag({ ...drag, time: rulerTime(e) });
                  }}
                  onPointerUp={() => {
                    if (drag) {
                      dispatch({
                        type: "keyframe.patch",
                        sceneId: scene.sceneId,
                        ...drag.selection,
                        patch: { time: drag.time },
                      });
                      setDrag(null);
                    }
                  }}
                  onPointerCancel={() => setDrag(null)}
                >
                  <div
                    className="track-span"
                    style={{
                      left: `${(Math.min(...t.keyframes.map((k) => k.time)) / scene.duration) * 100}%`,
                      width: `${((Math.max(...t.keyframes.map((k) => k.time)) - Math.min(...t.keyframes.map((k) => k.time))) / scene.duration) * 100}%`,
                    }}
                  />
                  <div
                    className="playhead"
                    style={{
                      left: `${(playback.time / scene.duration) * 100}%`,
                    }}
                  />
                  {t.keyframes.map((k) => (
                    <button
                      key={k.keyframeId}
                      className={`keyframe ${selection?.keyframeId === k.keyframeId ? "selected" : ""}`}
                      aria-label={`Keyframe ${t.property} at ${k.time}ms`}
                      aria-pressed={selection?.keyframeId === k.keyframeId}
                      style={{
                        left: `${((drag?.selection.keyframeId === k.keyframeId ? drag.time : k.time) / scene.duration) * 100}%`,
                      }}
                      onClick={() => {
                        setSelection({
                          trackId: t.trackId,
                          keyframeId: k.keyframeId,
                        });
                        playback.seek(k.time);
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        const s = {
                          trackId: t.trackId,
                          keyframeId: k.keyframeId,
                        };
                        setSelection(s);
                        setDrag({ selection: s, time: k.time });
                        e.currentTarget.parentElement?.setPointerCapture(
                          e.pointerId,
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                          e.preventDefault();
                          dispatch({
                            type: "keyframe.patch",
                            sceneId: scene.sceneId,
                            trackId: t.trackId,
                            keyframeId: k.keyframeId,
                            patch: {
                              time: Math.max(
                                0,
                                Math.min(
                                  scene.duration,
                                  k.time + (e.key === "ArrowRight" ? 10 : -10),
                                ),
                              ),
                            },
                          });
                        }
                      }}
                    >
                      ◆
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!scene.timeline.tracks.length && (
              <p className="timeline-empty">
                Select an element or Camera, then add a keyframe at the
                playhead.
              </p>
            )}
          </div>
          <div className="keyframe-inspector">
            {key && track ? (
              <>
                <span className="eyebrow">KEYFRAME / {track.property}</span>
                <NumberField
                  label="Time (ms)"
                  value={key.time}
                  min={0}
                  max={scene.duration}
                  onChange={(v) => patch({ time: v })}
                />
                <NumberField
                  label="Value"
                  value={key.value}
                  step={0.1}
                  onChange={(v) => patch({ value: v })}
                />
                <label>
                  Easing
                  <select
                    aria-label="Keyframe easing"
                    value={key.ease}
                    onChange={(e) => patch({ ease: e.target.value as Ease })}
                  >
                    {[
                      "none",
                      "power1.inOut",
                      "power2.out",
                      "power2.inOut",
                      "sine.inOut",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <button
                  aria-label="Delete selected keyframe"
                  onClick={() => {
                    dispatch({
                      type: "keyframe.delete",
                      sceneId: scene.sceneId,
                      trackId: track.trackId,
                      keyframeId: key.keyframeId,
                    });
                    setSelection(null);
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </>
            ) : (
              <span className="hint">
                ◆ Select a keyframe to edit time, value and easing. Drag
                diamonds to retime.
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
