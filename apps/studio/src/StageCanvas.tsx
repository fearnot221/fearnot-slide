"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Element, Presentation } from "@packet/document-model";
import { resolveScene } from "@packet/motion-engine";
import { cameraMatrix, viewportToWorld } from "@packet/camera-engine";
import { SceneRenderer } from "@packet/scene-engine";
import { FitStage } from "@packet/presentation-runtime";
import type { Command } from "@packet/editor-core";
type Gesture = {
  pointerId: number;
  start: { x: number; y: number };
  element: Element;
  mode: "move" | "resize";
  patch: Partial<Element>;
};
export function StageCanvas({
  document: doc,
  sceneId,
  time,
  selected,
  select,
  dispatch,
  zoom,
  grid,
  snap,
}: {
  document: Presentation;
  sceneId: string;
  time: number;
  selected: string[];
  select: (ids: string[]) => void;
  dispatch: (command: Command) => void;
  zoom: number;
  grid: boolean;
  snap: boolean;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const [fitWidth, setFitWidth] = useState(640);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setFitWidth(
        Math.max(
          160,
          Math.min(
            entry.contentRect.width,
            ((entry.contentRect.height - 40) * 16) / 9,
          ),
        ),
      ),
    );
    if (scroll.current) observer.observe(scroll.current);
    return () => observer.disconnect();
  }, []);
  const area = useRef<HTMLDivElement>(null),
    [gesture, setGesture] = useState<Gesture | null>(null);
  const resolved = resolveScene(doc, sceneId, time),
    matrix = cameraMatrix(resolved.camera);
  const preview = gesture
    ? {
        ...doc,
        scenes: doc.scenes.map((s) =>
          s.sceneId === sceneId
            ? {
                ...s,
                elements: s.elements.map((e) =>
                  e.elementId === gesture.element.elementId
                    ? { ...gesture.element, ...gesture.patch }
                    : e,
                ),
                timeline: {
                  ...s.timeline,
                  tracks: s.timeline.tracks.filter(
                    (t) =>
                      t.targetId !== gesture.element.elementId &&
                      t.targetId !== gesture.element.actorId,
                  ),
                },
              }
            : s,
        ),
      }
    : doc;
  const point = (e: PointerEvent) =>
    viewportToWorld(
      { x: e.clientX, y: e.clientY },
      area.current!.getBoundingClientRect(),
      resolved.camera,
    );
  function start(
    e: PointerEvent<HTMLElement>,
    element: Element,
    mode: "move" | "resize" = "move",
  ) {
    if (element.locked || element.parentId) return;
    e.stopPropagation();
    e.preventDefault();
    const ids = e.shiftKey
      ? [...new Set([...selected, element.elementId])]
      : selected.includes(element.elementId)
        ? selected
        : [element.elementId];
    select(ids);
    area.current?.setPointerCapture(e.pointerId);
    setGesture({
      pointerId: e.pointerId,
      start: point(e),
      element,
      mode,
      patch: {},
    });
  }
  function move(e: PointerEvent) {
    if (!gesture) return;
    const p = point(e),
      dx = p.x - gesture.start.x,
      dy = p.y - gesture.start.y,
      quantize = (v: number) =>
        snap ? Math.round(v / 10) * 10 : Math.round(v);
    const patch =
      gesture.mode === "move"
        ? {
            x: quantize(gesture.element.x + dx),
            y: quantize(gesture.element.y + dy),
          }
        : {
            width: Math.max(10, quantize(gesture.element.width + dx)),
            height: Math.max(10, quantize(gesture.element.height + dy)),
          };
    setGesture({ ...gesture, patch });
  }
  function finish() {
    if (!gesture) return;
    if (Object.keys(gesture.patch).length)
      dispatch({
        type: "element.pose",
        sceneId,
        ids: [gesture.element.elementId],
        patch: gesture.patch,
        time: Math.round(time),
      });
    setGesture(null);
  }
  return (
    <div ref={scroll} className="stage-scroll">
      <div
        className="stage-viewport"
        style={{ width: (fitWidth * zoom) / 100 }}
      >
        <div className="stage-meta">
          <span>{resolved.scene.name}</span>
          <span>1920 × 1080 · {Math.round(zoom)}%</span>
        </div>
        <div
          ref={area}
          className={`stage-interactive ${grid ? "show-grid" : ""}`}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={() => setGesture(null)}
          onPointerDown={(e) => {
            if (!(e.target as HTMLElement).closest("[data-element-id]"))
              select([]);
          }}
        >
          <FitStage>
            <SceneRenderer
              document={preview}
              sceneId={sceneId}
              time={time}
              onElementPointerDown={start}
            />
            <svg
              className="selection-overlay"
              width="1920"
              height="1080"
              viewBox="0 0 1920 1080"
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                overflow: "visible",
              }}
              aria-hidden="true"
            >
              <g transform={`matrix(${matrix.join(",")})`}>
                {resolved.elements
                  .filter(
                    (e) =>
                      selected.includes(e.elementId) &&
                      !e.hidden &&
                      !e.parentId,
                  )
                  .map((e) => {
                    const p =
                      gesture?.element.elementId === e.elementId
                        ? { ...gesture.element, ...gesture.patch }
                        : e;
                    return (
                      <g
                        key={e.elementId}
                        transform={`translate(${p.x},${p.y}) rotate(${p.rotation},${p.width / 2},${p.height / 2})`}
                      >
                        <rect
                          width={p.width}
                          height={p.height}
                          fill="none"
                          stroke="#f0a86e"
                          strokeWidth={3}
                        />
                        {!e.locked && (
                          <rect
                            x={p.width - 9}
                            y={p.height - 9}
                            width={18}
                            height={18}
                            fill="#f0a86e"
                            stroke="#101216"
                            strokeWidth={2}
                            style={{
                              pointerEvents: "all",
                              cursor: "nwse-resize",
                            }}
                            onPointerDown={(ev) =>
                              start(
                                ev as unknown as PointerEvent<HTMLElement>,
                                e,
                                "resize",
                              )
                            }
                          />
                        )}
                      </g>
                    );
                  })}
              </g>
            </svg>
          </FitStage>
        </div>
        <div className="stage-bottom">
          <span>WORLD SPACE</span>
          <span>Drag to move · corner to resize · Shift to select</span>
        </div>
      </div>
    </div>
  );
}
