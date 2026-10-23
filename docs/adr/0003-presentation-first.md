# ADR 0003: presentation-first workspace, optional motion authoring

Accepted 2026-10-24 after product feedback.

The main product is a slide presentation editor. Default authoring shows a complete composition, real slide thumbnails, content tools, notes, slide navigation and Present. Timeline/Camera/Actors are only shown after opening Animation. Adding content keeps slide navigation visible. Present is primary; publishing is secondary.

Keep LogicalSlide, Scene and Step distinct. The sidebar lists LogicalSlides, not a renamed flat scene list. Scene navigation within a logical slide remains available in Animation. The underlying JSON and existing motion definitions are preserved.

Normal composition resolves at the scene endpoint. Geometry/style edits use the same pose command as canvas transforms, updating existing animated channels at that time. Multi-object poses stay one history entry and preserve locks. Motion mode remains playhead-driven and its Inspector edits base values.

Present starts at the current logical slide's first ordered Step and autoplays its entry. Public deep links retain stable paused restoration. Arrows and Previous/Next continue to trigger playback.

This is a workflow change, not a claim that slide templates, reorder/duplicate/delete, production collaboration or the full presentation platform are complete.
