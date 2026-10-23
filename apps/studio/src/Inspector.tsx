import { useState } from "react";
import { focus } from "@packet/camera-engine";
import { resolveScene } from "@packet/motion-engine";
import type { Element, Presentation, Scene } from "@packet/document-model";
import type { Command } from "@packet/editor-core";
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        aria-label={label}
        key={`${label}-${value}`}
        type="number"
        defaultValue={Math.round(value * 1000) / 1000}
        min={min}
        max={max}
        step={step}
        onBlur={(e) => {
          const next = e.currentTarget.valueAsNumber;
          if (
            Number.isFinite(next) &&
            next !== value &&
            (min === undefined || next >= min) &&
            (max === undefined || next <= max)
          )
            onChange(next);
          else e.currentTarget.value = String(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}
export function Inspector({
  document: doc,
  scene,
  time,
  selected,
  dispatch,
  onCamera,
  animationOpen,
}: {
  document: Presentation;
  scene: Scene;
  time: number;
  selected: string[];
  dispatch: (c: Command) => void;
  onCamera: () => void;
  animationOpen: boolean;
}) {
  const [tab, setTab] = useState<"design" | "camera">("design");
  const state = resolveScene(doc, scene.sceneId, time);
  const el = (animationOpen ? scene.elements : state.elements).find(
    (e) => e.elementId === selected[0],
  );
  const patch = (value: Partial<Element>) =>
    dispatch(
      animationOpen
        ? {
            type: "element.patch",
            sceneId: scene.sceneId,
            ids: selected,
            patch: value,
          }
        : {
            type: "element.pose",
            sceneId: scene.sceneId,
            ids: selected,
            patch: value,
            time,
          },
    );
  const camera = state.camera;
  return (
    <aside className="inspector">
      <div className="panel-tabs">
        <button
          aria-pressed={tab === "design"}
          onClick={() => setTab("design")}
        >
          Design
        </button>
        {animationOpen && (
          <button
            aria-pressed={tab === "camera"}
            onClick={() => {
              setTab("camera");
              onCamera();
            }}
          >
            Camera
          </button>
        )}
      </div>
      {animationOpen && tab === "camera" ? (
        <>
          <section>
            <h3>Presentation camera</h3>
            <p className="hint">
              Independent of editor zoom. Timeline tracks override base values.
            </p>
            <div className="field-grid">
              {(["x", "y", "zoom", "rotation"] as const).map((p) => (
                <NumberField
                  key={p}
                  label={`Camera ${p}`}
                  value={scene.camera[p]}
                  min={p === "zoom" ? 0.05 : undefined}
                  max={p === "zoom" ? 20 : undefined}
                  step={p === "zoom" ? 0.05 : 1}
                  onChange={(v) =>
                    dispatch({
                      type: "scene.patch",
                      sceneId: scene.sceneId,
                      patch: { camera: { ...scene.camera, [p]: v } },
                    })
                  }
                />
              ))}
            </div>
            <p className="hint">
              Resolved: {camera.x.toFixed(0)}, {camera.y.toFixed(0)} ·{" "}
              {camera.zoom.toFixed(2)}×
            </p>
            <button
              disabled={!el}
              onClick={() => {
                if (el)
                  dispatch({
                    type: "scene.patch",
                    sceneId: scene.sceneId,
                    patch: { camera: focus(el) },
                  });
              }}
            >
              Focus selected element
            </button>
          </section>
        </>
      ) : el ? (
        <>
          <section>
            <span className="eyebrow">
              {el.actorId && animationOpen
                ? "SHARED ACTOR"
                : el.type.toUpperCase()}
            </span>
            <input
              className="element-name"
              aria-label="Element name"
              key={el.elementId + el.name}
              defaultValue={el.name}
              onBlur={(e) => {
                if (e.target.value !== el.name) patch({ name: e.target.value });
              }}
            />
            {el.actorId && animationOpen && (
              <code className="actor-id">{el.actorId}</code>
            )}
            <h3>Transform</h3>
            <div className="field-grid">
              {(
                ["x", "y", "width", "height", "rotation", "opacity"] as const
              ).map((p) => (
                <NumberField
                  key={p}
                  label={p}
                  value={el[p]}
                  min={
                    ["width", "height"].includes(p)
                      ? 1
                      : p === "opacity"
                        ? 0
                        : undefined
                  }
                  max={p === "opacity" ? 1 : undefined}
                  step={p === "opacity" ? 0.1 : 1}
                  onChange={(v) => patch({ [p]: v })}
                />
              ))}
            </div>
            {animationOpen && (
              <p className="hint">
                Base values. Animate these using the timeline below.
              </p>
            )}
          </section>
          <section>
            <h3>Appearance</h3>
            {!["image", "group", "line", "arrow"].includes(el.type) &&
              (el.type !== "packet" || el.representation === "packet") && (
                <label className="color-field">
                  Fill
                  <input
                    aria-label="Fill color"
                    type="color"
                    value={
                      /^#[a-f0-9]{6}$/i.test(el.fill) ? el.fill : "#f0a86e"
                    }
                    onChange={(e) => patch({ fill: e.target.value })}
                  />
                  <code>{el.fill}</code>
                </label>
              )}
            {["rect", "ellipse", "path", "line", "arrow"].includes(el.type) && (
              <>
                <label className="color-field">
                  Stroke
                  <input
                    aria-label="Stroke color"
                    type="color"
                    value={el.stroke}
                    onChange={(e) => patch({ stroke: e.target.value })}
                  />
                </label>
                <NumberField
                  label="Stroke width"
                  value={el.strokeWidth}
                  min={0}
                  max={100}
                  onChange={(v) => patch({ strokeWidth: v })}
                />
              </>
            )}
            {el.type === "packet" && (
              <label className="stacked-label">
                Representation
                <select
                  aria-label="Representation"
                  value={el.representation}
                  onChange={(e) =>
                    patch({
                      representation: e.target
                        .value as Element["representation"],
                    })
                  }
                >
                  <option value="bar">Data bar</option>
                  <option value="layers">Protocol layers</option>
                  <option value="packet">Traveling packet</option>
                </select>
              </label>
            )}
          </section>
          {el.type === "text" && (
            <section>
              <h3>Typography</h3>
              <label className="stacked-label">
                Text
                <textarea
                  aria-label="Text content"
                  key={el.elementId + el.text}
                  defaultValue={el.text}
                  onBlur={(e) => {
                    if (e.target.value !== el.text)
                      patch({ text: e.target.value });
                  }}
                />
              </label>
              <label className="stacked-label">
                Font family
                <input
                  aria-label="Font family"
                  key={el.fontFamily}
                  defaultValue={el.fontFamily}
                  onBlur={(e) => patch({ fontFamily: e.target.value })}
                />
              </label>
              <div className="field-grid">
                {(
                  [
                    "fontSize",
                    "fontWeight",
                    "letterSpacing",
                    "lineHeight",
                  ] as const
                ).map((p) => (
                  <NumberField
                    key={p}
                    label={p}
                    value={el[p]}
                    step={p === "lineHeight" ? 0.1 : 1}
                    onChange={(v) => patch({ [p]: v })}
                  />
                ))}
              </div>
              <label className="stacked-label">
                Alignment
                <select
                  value={el.align}
                  onChange={(e) =>
                    patch({ align: e.target.value as Element["align"] })
                  }
                >
                  <option>left</option>
                  <option>center</option>
                  <option>right</option>
                </select>
              </label>
            </section>
          )}
          {el.type === "path" && (
            <section>
              <h3>SVG geometry</h3>
              <label className="stacked-label">
                Path data
                <textarea
                  defaultValue={el.path}
                  key={el.path}
                  onBlur={(e) => patch({ path: e.target.value })}
                />
              </label>
              <NumberField
                label="Path progress"
                value={el.pathProgress}
                min={0}
                max={1}
                step={0.1}
                onChange={(v) => patch({ pathProgress: v })}
              />
            </section>
          )}
        </>
      ) : (
        <section>
          <h3>Slide</h3>
          <p className="hint">
            Select an element on the canvas or in Layers to edit its properties.
          </p>
          {animationOpen && (
            <>
              <NumberField
                label="Actor transition (ms)"
                value={scene.transitionMs}
                min={0}
                max={10000}
                onChange={(v) =>
                  dispatch({
                    type: "scene.patch",
                    sceneId: scene.sceneId,
                    patch: { transitionMs: v },
                  })
                }
              />
              <p className="hint">
                Shared actor geometry morphs from the previous scene. Explicit
                tracks take priority.
              </p>
            </>
          )}
        </section>
      )}
      <section>
        <h3>Presenter notes</h3>
        <textarea
          aria-label="Presenter notes"
          key={scene.sceneId}
          defaultValue={scene.notes}
          onBlur={(e) => {
            if (e.target.value !== scene.notes)
              dispatch({
                type: "scene.patch",
                sceneId: scene.sceneId,
                patch: { notes: e.target.value },
              });
          }}
        />
      </section>
    </aside>
  );
}
