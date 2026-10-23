import { produce } from "immer";
import {
  validateDocument,
  newId,
  makeScene,
  type Presentation,
  type Element,
  type Scene,
  type Track,
  type Keyframe,
} from "@packet/document-model";
export type Command =
  | { type: "element.unlock"; sceneId: string; id: string }
  | { type: "element.add"; sceneId: string; element: Element }
  | {
      type: "element.pose";
      sceneId: string;
      ids: string[];
      patch: Partial<Element>;
      time: number;
    }
  | {
      type: "actor.add";
      sceneId: string;
      actor: Presentation["actors"][number];
      element: Element;
    }
  | {
      type: "asset.add";
      sceneId: string;
      asset: Presentation["assets"][number];
      element: Element;
    }
  | {
      type: "element.patch";
      sceneId: string;
      ids: string[];
      patch: Partial<Element>;
    }
  | { type: "element.delete"; sceneId: string; ids: string[] }
  | { type: "element.duplicate"; sceneId: string; ids: string[] }
  | { type: "element.reorder"; sceneId: string; id: string; direction: -1 | 1 }
  | { type: "scene.add" }
  | {
      type: "scene.patch";
      sceneId: string;
      patch: Partial<Pick<Scene, "name" | "camera" | "transitionMs" | "notes">>;
    }
  | { type: "step.add"; sceneId: string; time: number }
  | { type: "track.put"; sceneId: string; track: Track }
  | { type: "track.delete"; sceneId: string; trackId: string }
  | {
      type: "keyframe.patch";
      sceneId: string;
      trackId: string;
      keyframeId: string;
      patch: Partial<Keyframe>;
    }
  | {
      type: "keyframe.delete";
      sceneId: string;
      trackId: string;
      keyframeId: string;
    }
  | { type: "title"; title: string };
export function execute(doc: Presentation, command: Command): Presentation {
  const result = produce(doc, (d) => {
    if (command.type === "title") {
      d.title = command.title;
      return;
    }
    if (command.type === "scene.add") {
      const scene = makeScene(`Slide ${d.logicalSlides.length + 1}`),
        stepId = newId("step"),
        logicalSlideId = newId("slide");
      d.scenes.push(scene);
      d.steps.push({ stepId, sceneId: scene.sceneId, name: "Start", time: 0 });
      d.logicalSlides.push({
        logicalSlideId,
        name: scene.name,
        sceneIds: [scene.sceneId],
        stepIds: [stepId],
      });
      d.sections[0]?.logicalSlideIds.push(logicalSlideId);
      return;
    }
    const s = d.scenes.find((s) => s.sceneId === command.sceneId);
    if (!s) throw new Error("Scene not found");
    switch (command.type) {
      case "actor.add":
        d.actors.push(command.actor);
        s.elements.push(command.element);
        break;
      case "asset.add":
        d.assets.push(command.asset);
        s.elements.push(command.element);
        break;
      case "element.pose": {
        for (const e of s.elements) {
          if (!command.ids.includes(e.elementId) || e.locked) continue;
          for (const [property, value] of Object.entries(command.patch)) {
            const tracks = s.timeline.tracks.filter(
              (t) =>
                !t.muted &&
                (t.targetId === e.elementId || t.targetId === e.actorId) &&
                t.property === property,
            );
            const t = tracks.at(-1);
            if (t && typeof value === "number") {
              const k = t.keyframes.find((k) => k.time === command.time);
              if (k) k.value = value;
              else
                t.keyframes.push({
                  keyframeId: newId("key"),
                  time: command.time,
                  value,
                  ease: "power2.inOut",
                });
              t.keyframes.sort((a, b) => a.time - b.time);
            } else Object.assign(e, { [property]: value });
          }
        }
        break;
      }
      case "element.unlock": {
        const e = s.elements.find((e) => e.elementId === command.id);
        if (e) e.locked = false;
        break;
      }
      case "element.add":
        s.elements.push(command.element);
        break;
      case "element.patch":
        for (const e of s.elements)
          if (command.ids.includes(e.elementId) && !e.locked)
            Object.assign(e, command.patch);
        break;
      case "element.delete": {
        const ids = new Set(
          command.ids.filter(
            (id) => !s.elements.find((e) => e.elementId === id)?.locked,
          ),
        );
        let changed = true;
        while (changed) {
          changed = false;
          for (const e of s.elements)
            if (e.parentId && ids.has(e.parentId) && !ids.has(e.elementId)) {
              ids.add(e.elementId);
              changed = true;
            }
        }
        const actors = s.elements
          .filter((e) => ids.has(e.elementId) && e.actorId)
          .map((e) => e.actorId);
        s.elements = s.elements.filter((e) => !ids.has(e.elementId));
        s.timeline.tracks = s.timeline.tracks.filter(
          (t) => !ids.has(t.targetId) && !actors.includes(t.targetId),
        );
        break;
      }
      case "element.duplicate":
        for (const e of [...s.elements])
          if (
            command.ids.includes(e.elementId) &&
            e.type !== "group" &&
            !e.actorId
          )
            s.elements.push({
              ...e,
              elementId: newId("element"),
              actorId: undefined,
              x: e.x + 32,
              y: e.y + 32,
              name: `${e.name} copy`,
              ...(e.type === "packet" ? { actorId: e.actorId } : {}),
            });
        break;
      case "element.reorder": {
        const index = s.elements.findIndex((e) => e.elementId === command.id),
          next = index + command.direction;
        if (index >= 0 && next >= 0 && next < s.elements.length)
          [s.elements[index], s.elements[next]] = [
            s.elements[next],
            s.elements[index],
          ];
        break;
      }
      case "scene.patch":
        Object.assign(s, command.patch);
        break;
      case "step.add": {
        const stepId = newId("step");
        d.steps.push({
          stepId,
          sceneId: s.sceneId,
          name: `Step ${d.steps.length + 1}`,
          time: command.time,
        });
        d.logicalSlides
          .find((l) => l.sceneIds.includes(s.sceneId))!
          .stepIds.push(stepId);
        break;
      }
      case "track.put": {
        const i = s.timeline.tracks.findIndex(
          (t) => t.trackId === command.track.trackId,
        );
        if (i < 0) s.timeline.tracks.push(command.track);
        else s.timeline.tracks[i] = command.track;
        break;
      }
      case "track.delete":
        s.timeline.tracks = s.timeline.tracks.filter(
          (t) => t.trackId !== command.trackId,
        );
        break;
      case "keyframe.patch": {
        const t = s.timeline.tracks.find((t) => t.trackId === command.trackId),
          k = t?.keyframes.find((k) => k.keyframeId === command.keyframeId);
        if (!k) throw new Error("Keyframe not found");
        Object.assign(k, command.patch);
        t!.keyframes.sort((a, b) => a.time - b.time);
        break;
      }
      case "keyframe.delete": {
        const t = s.timeline.tracks.find((t) => t.trackId === command.trackId);
        if (t) {
          t.keyframes = t.keyframes.filter(
            (k) => k.keyframeId !== command.keyframeId,
          );
          if (!t.keyframes.length)
            s.timeline.tracks = s.timeline.tracks.filter((v) => v !== t);
        }
        break;
      }
    }
  });
  return validateDocument(result);
}
export type History = {
  past: Presentation[];
  present: Presentation;
  future: Presentation[];
};
export const history = (doc: Presentation): History => ({
  past: [],
  present: validateDocument(doc),
  future: [],
});
export const commit = (h: History, c: Command): History => ({
  past: [...h.past.slice(-99), h.present],
  present: execute(h.present, c),
  future: [],
});
export const undo = (h: History): History =>
  h.past.length
    ? {
        past: h.past.slice(0, -1),
        present: h.past[h.past.length - 1],
        future: [h.present, ...h.future],
      }
    : h;
export const redo = (h: History): History =>
  h.future.length
    ? {
        past: [...h.past, h.present],
        present: h.future[0],
        future: h.future.slice(1),
      }
    : h;
