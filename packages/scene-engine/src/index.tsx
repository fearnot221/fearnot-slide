import type { CSSProperties, PointerEvent, ReactNode } from "react";
import type { Presentation, Element } from "@packet/document-model";
import { resolveScene } from "@packet/motion-engine";
import { cameraMatrix } from "@packet/camera-engine";
export type SceneRendererProps = {
  document: Presentation;
  sceneId: string;
  time: number;
  onElementPointerDown?: (
    event: PointerEvent<HTMLElement>,
    element: Element,
  ) => void;
};
function ElementBody({
  element: e,
  document: doc,
}: {
  element: Element;
  document: Presentation;
}) {
  if (e.type === "packet") {
    const actor = doc.actors.find((a) => a.actorId === e.actorId)!;
    const packet = actor.packet;
    if (e.representation === "packet")
      return (
        <div
          className="packet-token"
          style={{
            width: "100%",
            height: "100%",
            background: e.fill,
            color: "#101216",
            display: "grid",
            placeItems: "center",
            border: "2px solid #f4cfad",
            fontSize: 24,
            fontFamily: "monospace",
            fontWeight: 700,
          }}
        >
          #{packet.frameNumber}
        </div>
      );
    if (e.representation === "layers")
      return (
        <div style={{ display: "grid", gap: 12, height: "100%" }}>
          {packet.segments.map((s, i) => (
            <div
              key={s.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0 24px",
                background: s.color,
                color: "#101216",
                fontSize: 25,
                fontFamily: "monospace",
                opacity: Math.min(1, Math.max(0, e.pathProgress * 4 - i)),
                width: `${100 - i * 8}%`,
              }}
            >
              <strong>{s.name}</strong>
              <span>{s.bytes} bytes</span>
            </div>
          ))}
        </div>
      );
    return (
      <div
        style={{ height: "100%", display: "flex", border: "1px solid #e9c49d" }}
      >
        {packet.segments.map((s) => (
          <div
            key={s.name}
            style={{
              width: `${(s.bytes / packet.totalBytes) * 100}%`,
              background: s.color,
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
              color: "#101216",
              fontSize: s.bytes > 30 ? 40 : 18,
              fontFamily: "monospace",
              fontWeight: 600,
            }}
          >
            {s.bytes > 30 ? `${s.name} · ${s.bytes} B` : s.name}
          </div>
        ))}
      </div>
    );
  }
  if (e.type === "text")
    return (
      <div
        style={{
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          fontSize: e.fontSize,
          fontFamily: e.fontFamily,
          fontWeight: e.fontWeight,
          letterSpacing: e.letterSpacing,
          lineHeight: e.lineHeight,
          textAlign: e.align,
          color: e.fill,
          width: "100%",
          height: "100%",
        }}
      >
        {e.text}
      </div>
    );
  if (e.type === "image") {
    const asset = doc.assets.find((a) => a.assetId === e.assetId);
    return asset ? (
      <img
        src={asset.url}
        alt={e.name}
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    ) : null;
  }
  if (e.type === "group") return null;
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${e.width} ${e.height}`}
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      {e.type === "rect" && (
        <rect
          width={e.width}
          height={e.height}
          fill={e.fill}
          stroke={e.stroke}
          strokeWidth={e.strokeWidth}
        />
      )}
      {e.type === "ellipse" && (
        <ellipse
          cx={e.width / 2}
          cy={e.height / 2}
          rx={e.width / 2}
          ry={e.height / 2}
          fill={e.fill}
          stroke={e.stroke}
          strokeWidth={e.strokeWidth}
        />
      )}
      {(e.type === "line" || e.type === "arrow") && (
        <>
          <path
            d={`M 0 ${e.height / 2} L ${e.width} ${e.height / 2}`}
            fill="none"
            stroke={e.stroke}
            strokeWidth={e.strokeWidth || 4}
          />
          {e.type === "arrow" && (
            <path
              d={`M ${e.width - 25} ${e.height / 2 - 20} L ${e.width} ${e.height / 2} L ${e.width - 25} ${e.height / 2 + 20}`}
              fill="none"
              stroke={e.stroke}
              strokeWidth={e.strokeWidth || 4}
            />
          )}
        </>
      )}
      {e.type === "path" && (
        <path
          d={e.path}
          fill={e.fill}
          stroke={e.stroke}
          strokeWidth={e.strokeWidth}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - e.pathProgress}
        />
      )}
    </svg>
  );
}
export function SceneRenderer({
  document: doc,
  sceneId,
  time,
  onElementPointerDown,
}: SceneRendererProps) {
  const state = resolveScene(doc, sceneId, time);
  const matrix = cameraMatrix(state.camera);
  const render = (e: Element): ReactNode => {
    if (e.hidden) return null;
    const style: CSSProperties = {
      position: "absolute",
      left: 0,
      top: 0,
      width: e.width,
      height: e.height,
      transform: `translate(${e.x}px, ${e.y}px) rotate(${e.rotation}deg)`,
      transformOrigin: "center",
      opacity: e.opacity,
      pointerEvents: e.locked ? "none" : "auto",
    };
    return (
      <div
        key={e.actorId ?? e.elementId}
        data-element-id={e.elementId}
        data-actor-id={e.actorId}
        style={style}
        onPointerDown={(event) => onElementPointerDown?.(event, e)}
      >
        <ElementBody element={e} document={doc} />
        {state.elements.filter((c) => c.parentId === e.elementId).map(render)}
      </div>
    );
  };
  return (
    <div
      data-testid="scene-renderer"
      data-scene-id={sceneId}
      style={{
        width: 1920,
        height: 1080,
        position: "relative",
        overflow: "hidden",
        background: state.scene.background,
        color: doc.theme.foreground,
        fontFamily: doc.theme.fontFamily,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `matrix(${matrix.join(",")})`,
          transformOrigin: "0 0",
        }}
      >
        {state.elements.filter((e) => !e.parentId).map(render)}
      </div>
    </div>
  );
}
