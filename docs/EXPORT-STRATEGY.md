# Export

Implemented: portable validated Project JSON and browser print of the current Viewer frame (can Save as PDF). Viewer uses the same renderer as Studio; selection overlay is outside the scene.

Not implemented: standalone offline Web bundle, ZIP packaging, multi-slide/multi-step PDF, server-generated PNG sequence, export job queue, MP4/PPTX. Current browser print must not be described as the complete PDF export pipeline.

Next: use Playwright worker to open the immutable public revision, seek exact scene/step/time, wait for assets/fonts and capture the shared Renderer. Add explicit page policy (logical-slide designated step, all steps, custom range) and job records. Asset snapshot references must remain attached to revisions.
