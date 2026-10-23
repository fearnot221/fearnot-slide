# Testing

`pnpm test`: Vitest pure core + temporary-disk repository integration tests. Covers round-trip, version/unknown fields, stable IDs, ordering, integrity, total bytes, keyframes/easing, direct seek/reverse reconstruction, GSAP explicit seek, actor identity/transitions, camera transforms, lock handling, commands/undo/redo, asset references, create/save/reload/conflict/concurrent writers/revisions/publication.

`pnpm test:e2e`: Playwright Chrome, isolated server 3100 and test storage. Exercises browser authoring through GUI, actual persisted motion/geometry, reload, publish, immutable public viewer, deep-link refresh, invalid requests and cross-origin rejection, slow autosave ordering, real resize-handle and keyframe pointer gestures, and arrow-triggered playback in Preview/public Viewer (including button focus, same-scene steps, reverse navigation, paused scrubbing and deep links). Visual tests compare mid-animation renderer screenshots. Baselines are platform-specific.

`pnpm typecheck`, `pnpm lint`, `pnpm build` are separate gates. Current results are recorded in IMPLEMENTATION-STATUS after execution, not assumed from source inspection.

No original PACKET Golden Master, PostgreSQL/auth/queue/export integration, mobile device or Safari/Firefox checks yet. Browser Print/PDF output has not been visually validated as a PDF document.

Presentation-first regression coverage: default slide endpoint composition, real thumbnail updates and constrained 16:9 sizing, optional animation UI, current-slide automatic presentation, slide creation and preservation of existing motion. Core pose tests also check that a multi-object edit is one undo entry and skips locked elements. Current result: 43 Vitest tests and 7 browser tests pass, with the three animation-frame baselines plus a full-workspace baseline.
