# Architecture

Client Studio → editor-core Command → validated Presentation → shared scene-engine.

Animation document → GSAP time driver → pure resolveScene(time) → DOM/SVG. Renderer never reads previous DOM state. Camera matrix wraps world coordinates; Editor FitStage is a separate scale. Overlay selection is rendered outside the exported scene.

Next host calls a FileRepository in development. One JSON record contains draft + monotonic etag + immutable revision snapshots + published revision pointer. Public route reads only the pointed snapshot and mounts the same Renderer through presentation-runtime. It does not import Studio or commands.

The JSON boundary validates IDs, references, ranges and actor packet totals. UI errors are surfaced. Undo/redo stores up to 100 complete snapshots, trading bounded memory for simple reliable history.

No PostgreSQL, auth provider, asset server, worker or collaboration subsystem is connected yet. Do not create empty service layers to suggest those systems work.
