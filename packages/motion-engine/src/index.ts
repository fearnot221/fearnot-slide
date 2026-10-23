import { gsap } from "gsap";
import type {
  Presentation,
  Scene,
  Element,
  Track,
  Camera,
  Keyframe,
  Ease,
} from "@packet/document-model";
export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
export function easing(ease: Ease, t: number): number {
  return gsap.parseEase(ease)(clamp(t, 0, 1));
}
export function interpolate(keys: Keyframe[], time: number): number {
  const sorted = [...keys].sort((a, b) => a.time - b.time);
  if (!sorted.length) throw new Error("Empty keyframes");
  if (time <= sorted[0].time) return sorted[0].value;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1],
      b = sorted[i];
    if (time <= b.time)
      return (
        a.value +
        (b.value - a.value) *
          easing(b.ease, (time - a.time) / (b.time - a.time))
      );
  }
  return sorted[sorted.length - 1].value;
}
export type ResolvedScene = {
  scene: Scene;
  elements: Element[];
  camera: Camera;
  time: number;
};
function applyTracks(
  scene: Scene,
  time: number,
  elements: Element[],
  camera: Camera,
) {
  // Later unmuted tracks win per target/property; before their first key they do not override the base state.
  for (const t of scene.timeline.tracks) {
    if (t.muted || time < Math.min(...t.keyframes.map((k) => k.time))) continue;
    const value = interpolate(t.keyframes, time);
    if (t.targetId === "camera") {
      Object.assign(camera, { [t.property]: value });
    } else {
      const el = elements.find(
        (e) => e.elementId === t.targetId || e.actorId === t.targetId,
      );
      if (el) Object.assign(el, { [t.property]: value });
    }
  }
}
export function resolveScene(
  doc: Presentation,
  sceneId: string,
  time: number,
): ResolvedScene {
  const scene = doc.scenes.find((s) => s.sceneId === sceneId);
  if (!scene) throw new Error("Unknown scene");
  const t = clamp(time, 0, scene.duration),
    elements = structuredClone(scene.elements),
    camera = { ...scene.camera };
  const order = doc.logicalSlides.flatMap((s) => s.sceneIds),
    prev = doc.scenes.find(
      (s) => s.sceneId === order[order.indexOf(sceneId) - 1],
    );
  if (prev && scene.transitionMs > 0 && t < scene.transitionMs) {
    const previous = structuredClone(prev.elements);
    applyTracks(prev, prev.duration, previous, { ...prev.camera });
    const p = easing("power2.inOut", t / scene.transitionMs);
    for (const el of elements) {
      const from = previous.find((e) => el.actorId && e.actorId === el.actorId);
      if (from)
        for (const property of [
          "x",
          "y",
          "width",
          "height",
          "rotation",
          "opacity",
        ] as const)
          el[property] = from[property] + (el[property] - from[property]) * p;
    }
  }
  applyTracks(scene, t, elements, camera);
  return { scene, elements, camera, time: t };
}
export const resolveActor = (
  doc: Presentation,
  actorId: string,
  sceneId: string,
  time: number,
) => {
  const actor = doc.actors.find((a) => a.actorId === actorId);
  if (!actor) throw new Error("Unknown actor");
  return {
    actor,
    instance: resolveScene(doc, sceneId, time).elements.find(
      (e) => e.actorId === actorId,
    ),
  };
};
export function compileTimeline(scene: Scene, onTime: (ms: number) => void) {
  const clock = { ms: 0 };
  const timeline = gsap.timeline({
    paused: true,
    onUpdate: () => onTime(clock.ms),
  });
  timeline.fromTo(
    clock,
    { ms: 0 },
    {
      ms: scene.duration,
      duration: scene.duration / 1000,
      ease: "none",
      immediateRender: false,
    },
    0,
  );
  for (const label of scene.timeline.labels)
    timeline.addLabel(label.name, label.time / 1000);
  return {
    timeline,
    seek(ms: number) {
      timeline.pause();
      timeline.time(clamp(ms, 0, scene.duration) / 1000, true);
      onTime(clamp(ms, 0, scene.duration));
    },
    dispose() {
      timeline.kill();
    },
  };
}
export function makeTrack(
  targetId: string,
  property: Track["property"],
  from: number,
  to: number,
  duration: number,
  id: string,
): Track {
  return {
    trackId: `track-${id}`,
    targetId,
    property,
    muted: false,
    keyframes: [
      { keyframeId: `key-${id}-a`, time: 0, value: from, ease: "none" },
      {
        keyframeId: `key-${id}-b`,
        time: duration,
        value: to,
        ease: "power2.inOut",
      },
    ],
  };
}
