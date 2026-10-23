# Implementation status — 2026-10-24

This session delivered a runnable **local core vertical slice**, not the whole production platform. No original PACKET source or bundle was present. At the initial implementation stage, the enclosing Git repository belonged to the home directory and was left untouched. On the user’s later publication request, a dedicated repository was initialized inside this project; drafts, environment files, dependencies and build output remain excluded.

## Working capabilities

| Area | Implemented and connected |
| --- | --- |
| Document | Strict Zod v1 JSON contract, stable unique IDs, referential/ownership checks, serialization/normalization, version rejection, page/step ordering. |
| Reference | PACKET three scenes/four steps, same 273-byte actor and three representations, editable numeric motion, editable camera, notes and topology. JSON fixture supplied. |
| Scene | Shared 1920×1080 DOM/SVG renderer, logical/world/camera/viewport separation, groups in document/render tree, HTML text, primitive shapes, SVG path draw, embedded images. |
| Studio | Create blank/reference/import JSON; select/Shift multi-select; single-object drag and corner resize; geometry/rotation/style/text; layers hide/lock/reorder; ordinary-element duplicate/delete; undo/redo; grid/10-unit snap; stage fit by width AND height; scroll/zoom; panel resize; collapsible timeline. |
| Motion | GSAP time driver; deterministic arbitrary-time resolution; multiple tracks; create/select/edit/delete/drag keyframes; easing/time/value GUI; scrub/seek/play/pause/reverse/speed/loop; numeric camera tracks. |
| Actors | Registry identity independent from scene element ID; create/place actor in GUI; per-scene representation; transform/opacity transition duration editing; direct scene reconstruction. |
| Camera | Pan/zoom/rotation, matrix inverse utilities, element focus, base Inspector and editable/scrubbable timeline. |
| Steps | Add current playhead as step; direct step jump; public deep link + refresh; keyboard forward/back controls and step indicator. Preview/public arrows and Previous/Next start playback after navigation; direct links, step selection and scrubbing remain paused. |
| Persistence | Atomic local-disk save, 700ms autosave, per-document filesystem locks, monotonic etag, stale-writer rejection, explicit recovery export, immutable revisions and published snapshots. Slow in-flight writes cannot mark later edits as saved. |
| Viewer | Same renderer/runtime as Studio; published snapshot only; no editing overlay; notes stripped on server before public serialization. |
| Import/export | Strict portable Project JSON import/export. Current-frame browser Print / Save as PDF. |
| Boundaries | pnpm workspaces, Next host + client Studio + independent packages; package dependencies declared. Commands own document edits, no editor→database coupling. |

## Verification actually executed

- `pnpm check`: PASS — strict TypeScript, ESLint (0 warnings/errors), Vitest **43 tests** across core, disk integration and security boundaries.
- `pnpm build`: PASS — Next.js 16.4.2 production build including all API, Studio and public routes.
- `pnpm test:e2e`: PASS — final **7-test** run — complete GUI edit/save/publish/deep-link flow, actual persisted values, HTTP validation/conflict/origin checks, three intermediate-frame visual comparisons, slow autosave race. Final run also verifies actual canvas corner-resize and pointer-dragged keyframe values persisted on disk, plus automatic arrow navigation playback across scenes and within the same scene.
- Three visual baselines were created and then successfully compared without update mode. They are this renderer's macOS regression references, not original PACKET golden masters.
- Real `next start` smoke on port 3200: private GET/POST returned **503** even with ENABLE_LOCAL_DEMO=1; existing published page returned **200**, rendered the shared scene, and did not serialize instructor notes. Temporary production server was stopped.
- Manual in-app browser: created an editable local PACKET, directly jumped to the layers step at 3000ms, inspected full UI and saved `docs/implementation/studio-preview.png`. Development demo remains on port 3000 for the user.

Earlier failed checks were repaired rather than hidden: obsolete lockfile release-age rejection (pinned Next to 16.4.2); Timeline JSX syntax; generated build paths in lint; legitimate same-origin Host comparison; test tab selection/status selector; stage height fit; autosave status race. Initial snapshot generation alone was not counted as regression validation.

## Not completed / limitations

- **Production platform is not ready.** No PostgreSQL/Drizzle schema/migrations, OIDC/Logto, workspace/resource permissions, audit events, S3, Redis/BullMQ, worker, Docker Compose or Caddy deployment. Development file repository intentionally fails closed for private operations in production.
- No original PACKET conversion or native-runtime adapter. No AST analyzer, source extraction, ZIP import or original visual golden master. Original source/assets must be supplied for compatibility work.
- No group/ungroup GUI, multi-object drag/resize, clipboard, alignment guides, independent editor pan gesture, custom component SDK/registry, rich text, asset library, domain property editor, publication permissions, archive/delete UI or revision restore UI.
- Tracks currently animate finite numeric properties. No clip entities/groups, stagger, nested sequence UI, color/visibility channels, path-follow solver, graph editor, full shape/layout/representation morph or automatic camera follow.
- Shared representations change discretely at scene entry. Transform/opacity transition baseline is deterministic; explicit tracks win. Journey uses x/y waypoints along an illustrative topology, not an exact SVG path-follow solver.
- Portable JSON embeds image data; file limits are 4 MB request, 1 MB per UI image. No standalone Web/ZIP, multipage PDF, PNG sequence jobs, MP4 or PPTX export. Browser print is a single frame only and has not been PDF-render QA'd.
- Desktop authoring only; mobile browser library/viewer are responsive, Studio overflows on small screens. Safari/Firefox/real devices have not been tested. Original jf open 粉圓 font was not supplied; system CJK fallback is used.
- Disk persistence is single-host/local-disk only. No database transaction/fsync durability guarantees; crash-abandoned locks need operator cleanup after confirming no writer. Revision snapshots grow file size. Public share IDs have no access administration yet.
- Document format has version handling but no historical migrations (v1 is the first supported schema). Advanced entities from the full brief are deliberately not represented by empty schemas.
- UI styling currently uses scoped plain CSS and native controls; Tailwind/Radix were not added to the initial slice. No external font/network asset dependency is required to edit/play.

## Next concrete work

1. Add PostgreSQL + Drizzle migrations/repository for users/workspaces/memberships/presentations/drafts/revisions/publications/permissions/assets/jobs/audit. Preserve the tested etag and immutable revision semantics inside transactions.
2. Add OIDC server sessions and per-resource authorization, then replace the local-only API gate with actual permission checks and add authenticated integration/E2E tests. Do not enable the demo bypass in production.
3. Finish authoring gaps (group transforms, clipboard, multi-object operations, camera paths and representation mapping), then implement native PACKET preservation once the source is available.
4. Add immutable-revision export workers using the shared runtime, S3 asset snapshot references and real Web/ZIP/PDF/PNG outputs, followed by deployment manifests and security QA.

## Presentation-first refinement — 2026-10-24

Default Studio now shows complete slides and real content thumbnails grouped by LogicalSlide, with slide counts, previous/next and New slide. Present is the primary action and starts from the current slide with automatic playback. Timeline, Camera, Shared Actors and builds are opt-in under Animation. Normal geometry/style editing updates visible endpoint poses (including existing animated channels) atomically; advanced Inspector retains base-state editing. Thumbnail sizing and existing motion controls are covered by browser regressions. See ADR 0003 and the verification log for executed checks.
