# Implementation plan

1. Empty-folder audit: no code, assets, manifest, ZIP or local Git repository. Parent Git root is the user's home; leave it alone.
2. Establish pnpm workspace with Next App Router host, client Studio, framework-independent document/motion/camera/editor packages.
3. Implement strict v1 document validation, stable IDs, referential integrity, pure timeline resolution and GSAP clock, camera matrices, shared actor resolution.
4. Author a three-scene/four-step 273-byte PACKET fixture. Use shared renderer in Studio and read-only player.
5. Implement real commands and history, selection/drag/resize, inspector, keyframe/time/value/easing editor, camera editing, direct step navigation.
6. Provide explicit local-development durable drafts, optimistic concurrency, immutable revisions and publication. Reject private APIs in production until real authorization exists.
7. Verify unit/integration and browser flows; document completed and missing capabilities honestly. Continue dependent work as feasible.

Scope reaches document fixture, all renderer consumers, commands, API boundaries, tests and docs. No original user files exist to replace. PostgreSQL/auth/export are separate milestones, not fake UI actions.
