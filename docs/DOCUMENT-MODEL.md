# Document v1

Zod strict objects define Presentation, Section, LogicalSlide, Scene, Step, Element, SharedActor, Track, Keyframe, Camera, Asset, Theme, source references and Version. Scene includes timeline labels, duration, transition duration and presenter notes. Representation is a scene-specific actor instance field.

IDs are globally unique. Tracks reference scene element IDs or actor IDs, never CSS selectors. Page/step numbers derive from logical ordering. Validation checks ownership, parent cycles, target references, asset references, range bounds and packet byte sums.

`serialize`/`deserialize` validate at boundaries. `normalize` clones and sorts keyframes; it does not mutate input. `migrate` accepts v1; there are no historical migrations yet, and future versions fail closed. Unknown JSON fields fail rather than silently losing data.

Current limits: numeric animation channels only; explicit clip, stagger, nested-sequence and animation-group entities are not defined yet. Native bundle/source manifest preservation needs a later format extension. Plain text is used; arbitrary HTML is never inserted. Image assets are embedded PNG/JPEG/WebP data URLs.
