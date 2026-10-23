import { z } from "zod";

export const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const number = z.number().finite();
export const channels = [
  "x",
  "y",
  "width",
  "height",
  "rotation",
  "opacity",
  "fontSize",
  "pathProgress",
  "zoom",
] as const;
export const easeSchema = z.enum([
  "none",
  "power1.inOut",
  "power2.out",
  "power2.inOut",
  "sine.inOut",
]);
export const cameraSchema = z.strictObject({
  x: number,
  y: number,
  zoom: number.min(0.05).max(20),
  rotation: number,
});
export const sourceSchema = z.strictObject({
  sourceSlideId: z.string().optional(),
  sourceElementId: z.string().optional(),
  file: z.string(),
  capability: z.enum(["editable", "partial", "native-only", "unsupported"]),
});
export const elementSchema = z.strictObject({
  elementId: idSchema,
  name: z.string().max(200),
  type: z.enum([
    "text",
    "rect",
    "ellipse",
    "line",
    "arrow",
    "path",
    "image",
    "group",
    "packet",
  ]),
  x: number,
  y: number,
  width: number.min(1).max(20000),
  height: number.min(1).max(20000),
  rotation: number,
  opacity: number.min(0).max(1),
  fill: z.string().max(100),
  stroke: z.string().max(100),
  strokeWidth: number.min(0).max(100),
  text: z.string().max(10000),
  fontSize: number.min(1).max(500),
  fontFamily: z.string().max(200),
  fontWeight: number.min(100).max(900),
  letterSpacing: number.min(-20).max(100),
  lineHeight: number.min(0.5).max(5),
  align: z.enum(["left", "center", "right"]),
  hidden: z.boolean(),
  locked: z.boolean(),
  parentId: idSchema.optional(),
  actorId: idSchema.optional(),
  representation: z.enum(["bar", "layers", "packet"]).optional(),
  path: z.string().max(20000),
  pathProgress: number.min(0).max(1),
  assetId: idSchema.optional(),
  source: sourceSchema.optional(),
});
export const keyframeSchema = z.strictObject({
  keyframeId: idSchema,
  time: number.min(0),
  value: number,
  ease: easeSchema,
});
export const trackSchema = z.strictObject({
  trackId: idSchema,
  targetId: idSchema,
  property: z.enum(channels),
  keyframes: z.array(keyframeSchema).min(1).max(1000),
  muted: z.boolean(),
});
export const sceneSchema = z.strictObject({
  sceneId: idSchema,
  name: z.string().min(1).max(200),
  duration: number.min(100).max(600000),
  background: z.string().max(100),
  camera: cameraSchema,
  elements: z.array(elementSchema).max(1000),
  timeline: z.strictObject({
    timelineId: idSchema,
    tracks: z.array(trackSchema).max(500),
    labels: z.array(
      z.strictObject({
        labelId: idSchema,
        name: z.string(),
        time: number.min(0),
      }),
    ),
  }),
  transitionMs: number.min(0).max(10000),
  notes: z.string().max(20000),
});
export const stepSchema = z.strictObject({
  stepId: idSchema,
  sceneId: idSchema,
  name: z.string().max(200),
  time: number.min(0),
});
const packetSchema = z
  .strictObject({
    frameNumber: z.number().int().positive(),
    totalBytes: z.number().int().positive(),
    segments: z
      .array(
        z.strictObject({
          name: z.string(),
          bytes: z.number().int().positive(),
          color: z.string(),
        }),
      )
      .min(1),
  })
  .refine(
    (p) => p.segments.reduce((s, v) => s + v.bytes, 0) === p.totalBytes,
    "Protocol bytes must equal totalBytes",
  );
export const documentSchema = z.strictObject({
  schemaVersion: z.literal(1),
  presentationId: idSchema,
  title: z.string().min(1).max(200),
  sections: z.array(
    z.strictObject({
      sectionId: idSchema,
      name: z.string(),
      logicalSlideIds: z.array(idSchema),
    }),
  ),
  logicalSlides: z
    .array(
      z.strictObject({
        logicalSlideId: idSchema,
        name: z.string(),
        sceneIds: z.array(idSchema).min(1),
        stepIds: z.array(idSchema).min(1),
      }),
    )
    .min(1),
  scenes: z.array(sceneSchema).min(1).max(100),
  steps: z.array(stepSchema).min(1),
  actors: z.array(
    z.strictObject({
      actorId: idSchema,
      name: z.string(),
      packet: packetSchema,
    }),
  ),
  assets: z.array(
    z.strictObject({
      assetId: idSchema,
      name: z.string(),
      url: z
        .string()
        .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
        .max(2000000),
    }),
  ),
  theme: z.strictObject({
    background: z.string(),
    foreground: z.string(),
    accent: z.string(),
    fontFamily: z.string(),
  }),
  sourceReferences: z.array(sourceSchema),
  version: z.strictObject({
    versionId: idSchema,
    createdAt: z.string().datetime(),
  }),
});
export type Presentation = z.infer<typeof documentSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type Element = z.infer<typeof elementSchema>;
export type Track = z.infer<typeof trackSchema>;
export type Keyframe = z.infer<typeof keyframeSchema>;
export type Camera = z.infer<typeof cameraSchema>;
export type Channel = (typeof channels)[number];
export type Ease = z.infer<typeof easeSchema>;
export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export class DocumentValidationError extends Error {
  readonly status = 400;
}

export function validateDocument(input: unknown): Presentation {
  const doc = documentSchema.parse(input);
  const ids = new Set<string>();
  const register = (id: string) => {
    if (id === "camera")
      throw new DocumentValidationError("Reserved entity ID: camera");
    if (ids.has(id))
      throw new DocumentValidationError(`Duplicate stable ID: ${id}`);
    ids.add(id);
  };
  register(doc.presentationId);
  register(doc.version.versionId);
  for (const a of doc.actors) register(a.actorId);
  for (const a of doc.assets) register(a.assetId);
  for (const s of doc.sections) register(s.sectionId);
  for (const s of doc.logicalSlides) register(s.logicalSlideId);
  for (const s of doc.steps) register(s.stepId);
  for (const s of doc.scenes) {
    register(s.sceneId);
    register(s.timeline.timelineId);
    const local = new Map(s.elements.map((e) => [e.elementId, e]));
    const actors = new Set<string>();
    for (const e of s.elements) {
      register(e.elementId);
      if (e.actorId) {
        if (!doc.actors.some((a) => a.actorId === e.actorId))
          throw new DocumentValidationError("Missing shared actor");
        if (actors.has(e.actorId))
          throw new DocumentValidationError("Actor used twice in scene");
        actors.add(e.actorId);
      }
      if (e.type === "packet" && !e.actorId)
        throw new DocumentValidationError("Packet requires shared actor");
      if (e.type === "image" && !e.assetId)
        throw new DocumentValidationError("Image requires asset");
      if (e.assetId && !doc.assets.some((a) => a.assetId === e.assetId))
        throw new DocumentValidationError("Missing asset");
      const visited = new Set([e.elementId]);
      let parent = e.parentId;
      while (parent) {
        if (visited.has(parent))
          throw new DocumentValidationError("Group cycle");
        visited.add(parent);
        const p = local.get(parent);
        if (!p || p.type !== "group")
          throw new DocumentValidationError("Invalid group parent");
        parent = p.parentId;
      }
    }
    for (const label of s.timeline.labels) {
      register(label.labelId);
      if (label.time > s.duration)
        throw new DocumentValidationError("Label outside scene");
    }
    for (const t of s.timeline.tracks) {
      register(t.trackId);
      if (
        t.targetId !== "camera" &&
        !local.has(t.targetId) &&
        !actors.has(t.targetId)
      )
        throw new DocumentValidationError("Missing track target");
      if (
        t.targetId === "camera" &&
        !["x", "y", "zoom", "rotation"].includes(t.property)
      )
        throw new DocumentValidationError("Invalid camera channel");
      if (t.targetId !== "camera" && t.property === "zoom")
        throw new DocumentValidationError("Zoom is a camera channel");
      const times = new Set<number>();
      for (const k of t.keyframes) {
        register(k.keyframeId);
        if (k.time > s.duration || times.has(k.time))
          throw new DocumentValidationError(
            "Invalid or duplicate keyframe time",
          );
        times.add(k.time);
        if (
          ["opacity", "pathProgress"].includes(t.property) &&
          (k.value < 0 || k.value > 1)
        )
          throw new DocumentValidationError("Channel must be between 0 and 1");
        if (
          ["width", "height", "fontSize", "zoom"].includes(t.property) &&
          k.value <= 0
        )
          throw new DocumentValidationError("Channel must be positive");
      }
    }
  }
  const ownedScenes = new Set<string>(),
    ownedSteps = new Set<string>();
  for (const slide of doc.logicalSlides) {
    for (const id of slide.sceneIds) {
      if (!doc.scenes.some((s) => s.sceneId === id) || ownedScenes.has(id))
        throw new DocumentValidationError("Invalid scene ownership");
      ownedScenes.add(id);
    }
    for (const id of slide.stepIds) {
      const step = doc.steps.find((s) => s.stepId === id);
      if (!step || !slide.sceneIds.includes(step.sceneId) || ownedSteps.has(id))
        throw new DocumentValidationError("Invalid step ownership");
      ownedSteps.add(id);
    }
  }
  if (
    ownedScenes.size !== doc.scenes.length ||
    ownedSteps.size !== doc.steps.length
  )
    throw new DocumentValidationError("Unowned scene or step");
  for (const step of doc.steps) {
    const scene = doc.scenes.find((s) => s.sceneId === step.sceneId);
    if (!scene || step.time > scene.duration)
      throw new DocumentValidationError("Invalid step reference");
  }
  const sectionSlides = new Set<string>();
  for (const section of doc.sections)
    for (const id of section.logicalSlideIds) {
      if (
        !doc.logicalSlides.some((s) => s.logicalSlideId === id) ||
        sectionSlides.has(id)
      )
        throw new DocumentValidationError("Invalid section reference");
      sectionSlides.add(id);
    }
  return doc;
}
export const serialize = (doc: Presentation) =>
  JSON.stringify(validateDocument(doc), null, 2);
export const deserialize = (json: string): Presentation =>
  validateDocument(JSON.parse(json));
export const migrate = (input: unknown): Presentation =>
  validateDocument(input); // v1 is the first format; unknown versions fail closed.
export function normalize(doc: Presentation): Presentation {
  const copy = validateDocument(doc);
  for (const s of copy.scenes)
    for (const t of s.timeline.tracks)
      t.keyframes.sort((a, b) => a.time - b.time);
  return copy;
}
export const orderedSteps = (doc: Presentation) =>
  doc.logicalSlides.flatMap((l) =>
    l.stepIds.map((id) => doc.steps.find((s) => s.stepId === id)!),
  );
export const pageNumber = (doc: Presentation, sceneId: string) =>
  doc.logicalSlides.findIndex((l) => l.sceneIds.includes(sceneId)) + 1;
export function makeElement(
  type: Element["type"],
  overrides: Partial<Element> = {},
): Element {
  return {
    elementId: newId("element"),
    name: type,
    type,
    x: 300,
    y: 300,
    width: 400,
    height: type === "text" ? 100 : 200,
    rotation: 0,
    opacity: 1,
    fill: type === "text" ? "#f1eee8" : "#F0A86E",
    stroke: "#7896B2",
    strokeWidth: 0,
    text: type === "text" ? "新增文字 / New text" : "",
    fontSize: 56,
    fontFamily: "system-ui, sans-serif",
    fontWeight: 500,
    letterSpacing: 0,
    lineHeight: 1.3,
    align: "left",
    hidden: false,
    locked: false,
    path: "M 0 100 C 150 -100 250 300 400 100",
    pathProgress: 1,
    ...overrides,
  };
}
export function makeScene(name = "Untitled scene"): Scene {
  return {
    sceneId: newId("scene"),
    name,
    duration: 4000,
    background: "#101216",
    camera: { x: 0, y: 0, zoom: 1, rotation: 0 },
    elements: [],
    timeline: { timelineId: newId("timeline"), tracks: [], labels: [] },
    transitionMs: 0,
    notes: "",
  };
}
