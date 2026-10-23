import { describe, it, expect } from "vitest";
import { packetDemo } from "@packet/fixture";
import {
  serialize,
  deserialize,
  validateDocument,
  makeElement,
  pageNumber,
  orderedSteps,
  normalize,
  migrate,
  newId,
} from "@packet/document-model";
import {
  interpolate,
  resolveScene,
  resolveActor,
  compileTimeline,
} from "@packet/motion-engine";
import {
  cameraMatrix,
  transformPoint,
  invert,
  viewportToWorld,
  focus,
} from "@packet/camera-engine";
import { history, commit, undo, redo, execute } from "@packet/editor-core";
describe("Document contract", () => {
  it("round-trips every authored field without mutation", () => {
    const doc = packetDemo();
    expect(deserialize(serialize(doc))).toEqual(doc);
  });
  it("rejects future versions and unknown fields rather than dropping data", () => {
    expect(() => migrate({ ...packetDemo(), schemaVersion: 2 })).toThrow();
    expect(() =>
      validateDocument({ ...packetDemo(), surprise: "lost" }),
    ).toThrow();
  });
  it("uses unique stable IDs", () => {
    expect(
      new Set(Array.from({ length: 1000 }, () => newId("element"))).size,
    ).toBe(1000);
  });
  it("derives page numbers from logical slide order", () => {
    const doc = packetDemo();
    expect(pageNumber(doc, "scene-intro")).toBe(1);
    doc.logicalSlides.reverse();
    expect(pageNumber(doc, "scene-intro")).toBe(3);
    expect(orderedSteps(doc)[0].stepId).toBe("step-4");
  });
  it("rejects duplicate IDs across entities", () => {
    const doc = packetDemo();
    doc.scenes[1].elements[0].elementId = doc.scenes[0].elements[0].elementId;
    expect(() => validateDocument(doc)).toThrow("Duplicate stable ID");
  });
  it("validates packet segment totals", () => {
    const doc = packetDemo();
    doc.actors[0].packet.segments[0].bytes++;
    expect(() => validateDocument(doc)).toThrow("Protocol bytes");
  });
  it("checks targets, actor references, assets, steps and group cycles", () => {
    for (const change of [
      (d: ReturnType<typeof packetDemo>) => {
        d.scenes[0].timeline.tracks[0].targetId = "missing";
      },
      (d: ReturnType<typeof packetDemo>) => {
        d.scenes[0].elements[2].actorId = "missing";
      },
      (d: ReturnType<typeof packetDemo>) => {
        d.steps[0].sceneId = "missing";
      },
      (d: ReturnType<typeof packetDemo>) => {
        d.scenes[0].elements[0].assetId = "missing";
      },
      (d: ReturnType<typeof packetDemo>) => {
        const e = makeElement("group");
        e.parentId = e.elementId;
        d.scenes[0].elements.push(e);
      },
    ]) {
      const d = packetDemo();
      change(d);
      expect(() => validateDocument(d)).toThrow();
    }
  });
  it("rejects duplicate keyframe times and invalid channels", () => {
    const d = packetDemo();
    d.scenes[0].timeline.tracks[0].keyframes[1].time = 0;
    expect(() => validateDocument(d)).toThrow("keyframe time");
  });
  it("normalizes times without changing source document", () => {
    const d = packetDemo();
    d.scenes[0].timeline.tracks[0].keyframes.reverse();
    const n = normalize(d);
    expect(n.scenes[0].timeline.tracks[0].keyframes[0].time).toBe(0);
    expect(d.scenes[0].timeline.tracks[0].keyframes[0].time).toBe(1200);
  });
});
describe("Motion and shared actors", () => {
  const key = (time: number, value: number) => ({
    keyframeId: `key-${time}`,
    time,
    value,
    ease: "none" as const,
  });
  it("interpolates, holds endpoints, supports unsorted data", () => {
    expect(interpolate([key(1000, 100), key(0, 0)], 500)).toBe(50);
    expect(interpolate([key(0, 2), key(1000, 4)], -1)).toBe(2);
    expect(interpolate([key(0, 2), key(1000, 4)], 2000)).toBe(4);
  });
  it("applies explicit easing", () => {
    const keys = [
      key(0, 0),
      { ...key(1000, 100), ease: "power2.out" as const },
    ];
    expect(interpolate(keys, 500)).toBeCloseTo(87.5);
  });
  it("direct scene/step/time seek equals sequential evaluation and reverse", () => {
    const doc = packetDemo();
    const direct = resolveScene(doc, "scene-journey", 850);
    for (let t = 0; t <= 6000; t += 50) resolveScene(doc, "scene-journey", t);
    resolveScene(doc, "scene-intro", 0);
    expect(resolveScene(doc, "scene-journey", 850)).toEqual(direct);
    expect(
      resolveScene(deserialize(serialize(doc)), "scene-journey", 850),
    ).toEqual(direct);
  });
  it("GSAP playback clock can directly seek backwards and to endpoints", () => {
    const times: number[] = [];
    const runtime = compileTimeline(packetDemo().scenes[0], (t) =>
      times.push(t),
    );
    runtime.seek(850);
    runtime.seek(0);
    runtime.seek(4000);
    runtime.seek(850);
    expect(times).toEqual([850, 0, 4000, 850]);
    runtime.dispose();
  });
  it("keeps actor identity across all three distinct representations", () => {
    const d = packetDemo();
    const states = d.scenes.map((s) =>
      resolveActor(d, "actor-packet-frame-8", s.sceneId, 3000),
    );
    expect(states.map((s) => s.actor.actorId)).toEqual(
      Array(3).fill("actor-packet-frame-8"),
    );
    expect(states.map((s) => s.instance?.representation)).toEqual([
      "bar",
      "layers",
      "packet",
    ]);
  });
  it("reconstructs actor transition directly without playing prior scene", () => {
    const d = packetDemo();
    const start = resolveActor(
      d,
      d.actors[0].actorId,
      "scene-protocol",
      0,
    ).instance!;
    expect(start.height).toBe(170);
    const middle = resolveActor(
      d,
      d.actors[0].actorId,
      "scene-protocol",
      500,
    ).instance!;
    expect(middle.height).toBeCloseTo(265);
    expect(
      resolveActor(d, d.actors[0].actorId, "scene-protocol", 1000).instance!
        .height,
    ).toBe(360);
  });
  it("resolves camera state directly", () => {
    const c = resolveScene(packetDemo(), "scene-protocol", 2000).camera;
    expect(c.zoom).toBeCloseTo(1.04);
  });
  it("last active track wins, muted tracks do not", () => {
    const d = packetDemo(),
      s = d.scenes[0],
      t = s.timeline.tracks[0];
    s.timeline.tracks.push({ ...t, trackId: "last", keyframes: [key(0, 0.3)] });
    expect(resolveScene(d, s.sceneId, 500).elements[2].opacity).toBe(0.3);
    s.timeline.tracks.at(-1)!.muted = true;
    expect(resolveScene(d, s.sceneId, 500).elements[2].opacity).not.toBe(0.3);
  });
  it("does not mutate document while resolving", () => {
    const d = packetDemo(),
      before = serialize(d);
    resolveScene(d, "scene-protocol", 500);
    expect(serialize(d)).toBe(before);
  });
});
describe("Coordinate systems", () => {
  it("identity camera preserves world coordinates", () => {
    expect(
      transformPoint(cameraMatrix({ x: 0, y: 0, zoom: 1, rotation: 0 }), {
        x: 123,
        y: 456,
      }),
    ).toEqual({ x: 123, y: 456 });
  });
  it("inverts rotated, zoomed camera transforms", () => {
    const m = cameraMatrix({ x: 100, y: -40, zoom: 1.8, rotation: 23 }),
      p = { x: 230, y: 600 },
      result = transformPoint(invert(m), transformPoint(m, p));
    expect(result.x).toBeCloseTo(p.x);
    expect(result.y).toBeCloseTo(p.y);
  });
  it("separates editor scale from camera", () => {
    const c = { x: 0, y: 0, zoom: 2, rotation: 0 };
    expect(
      viewportToWorld({ x: 490, y: 280 }, { left: 10, top: 10, width: 960 }, c),
    ).toEqual({ x: 960, y: 540 });
  });
  it("focuses an element at stage center", () => {
    const e = { x: 300, y: 400, width: 200, height: 100 };
    expect(transformPoint(cameraMatrix(focus(e)), { x: 400, y: 450 })).toEqual({
      x: 960,
      y: 540,
    });
  });
  it("rejects singular matrices", () => {
    expect(() => invert([0, 0, 0, 0, 0, 0])).toThrow();
  });
});
describe("Editor commands and complete history", () => {
  it("undoes/redoes element geometry, styles, camera, scene, keyframes and steps", () => {
    const doc = packetDemo();
    let h = history(doc);
    h = commit(h, {
      type: "element.patch",
      sceneId: "scene-intro",
      ids: ["packet-intro"],
      patch: { x: 100, fill: "#ffffff" },
    });
    h = commit(h, {
      type: "scene.patch",
      sceneId: "scene-intro",
      patch: { camera: { x: 20, y: 30, zoom: 2, rotation: 0 } },
    });
    h = commit(h, {
      type: "keyframe.patch",
      sceneId: "scene-intro",
      trackId: doc.scenes[0].timeline.tracks[0].trackId,
      keyframeId: doc.scenes[0].timeline.tracks[0].keyframes[0].keyframeId,
      patch: { value: 0.2 },
    });
    h = commit(h, { type: "scene.add" });
    h = commit(h, { type: "step.add", sceneId: "scene-intro", time: 200 });
    const end = h.present;
    for (let i = 0; i < 5; i++) h = undo(h);
    expect(h.present).toEqual(doc);
    for (let i = 0; i < 5; i++) h = redo(h);
    expect(h.present).toEqual(end);
  });
  it("invalid commands do not change source document", () => {
    const d = packetDemo(),
      before = serialize(d);
    expect(() =>
      execute(d, {
        type: "element.patch",
        sceneId: "scene-intro",
        ids: ["packet-intro"],
        patch: { width: -1 },
      }),
    ).toThrow();
    expect(serialize(d)).toBe(before);
  });
  it("deleting a shared instance removes its tracks, preserves global actor and other scenes", () => {
    const d = execute(packetDemo(), {
      type: "element.delete",
      sceneId: "scene-intro",
      ids: ["packet-intro"],
    });
    expect(d.scenes[0].timeline.tracks).toHaveLength(0);
    expect(d.actors).toHaveLength(1);
    expect(d.scenes[1].elements.some((e) => e.actorId)).toBe(true);
  });
  it("respects locks and supports explicit unlock", () => {
    let d = execute(packetDemo(), {
      type: "element.patch",
      sceneId: "scene-intro",
      ids: ["packet-intro"],
      patch: { locked: true },
    });
    d = execute(d, {
      type: "element.patch",
      sceneId: "scene-intro",
      ids: ["packet-intro"],
      patch: { x: 10 },
    });
    expect(d.scenes[0].elements[2].x).toBe(300);
    d = execute(d, {
      type: "element.unlock",
      sceneId: "scene-intro",
      id: "packet-intro",
    });
    expect(d.scenes[0].elements[2].locked).toBe(false);
  });
  it("writes a pose into animated channels at current time", () => {
    const d = execute(packetDemo(), {
      type: "element.pose",
      sceneId: "scene-intro",
      ids: ["packet-intro"],
      time: 500,
      patch: { y: 650, x: 400 },
    });
    const e = resolveScene(d, "scene-intro", 500).elements[2];
    expect(e.y).toBe(650);
    expect(e.x).toBe(400);
  });
  it("clears redo history after branching", () => {
    let h = commit(history(packetDemo()), { type: "title", title: "First" });
    h = undo(h);
    h = commit(h, { type: "title", title: "Second" });
    expect(h.future).toHaveLength(0);
  });
});

it("commits multi-object presentation poses atomically and preserves locks", () => {
  const doc = packetDemo();
  doc.scenes[0].elements[1].locked = true;
  let h = commit(history(doc), {
    type: "element.pose",
    sceneId: "scene-intro",
    ids: doc.scenes[0].elements.map((e) => e.elementId),
    time: 4000,
    patch: { y: 700 },
  });
  const resolved = resolveScene(h.present, "scene-intro", 4000);
  expect(resolved.elements[0].y).toBe(700);
  expect(resolved.elements[1].y).toBe(doc.scenes[0].elements[1].y);
  expect(resolved.elements[2].y).toBe(700);
  h = undo(h);
  expect(h.present).toEqual(doc);
});
