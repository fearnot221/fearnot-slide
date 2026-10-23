# PACKET Studio

Goal: presentations first — author slides and present interactively. Motion is optional; preserve deterministic playback and shared actors.
Current milestone: first local working vertical slice; 43 unit/integration tests, 7 E2E tests and production build pass. See docs/IMPLEMENTATION-STATUS.md.

- Strict TypeScript; document JSON is the source of truth. Never persist GSAP instances.
- Pure model/motion/camera packages must not depend on Next or editor UI.
- Studio and public viewer share scene-engine and presentation-runtime.
- UI mutations go through editor-core commands; keep undo/redo complete.
- Stable IDs are not page numbers; derive page and step ordering.
- Validate documents at import and persistence boundaries; never execute imported code.
- Development file repository is loopback-only and disabled in production. No auth bypass in production.
- Preserve published snapshots. Use optimistic versions on drafts; never overwrite conflicts.
- Commands: pnpm dev, pnpm check, pnpm build, pnpm test:e2e.
- Test deterministic seeks, document integrity, commands, concurrency and publication.
- Do not scan or operate the enclosing home-directory Git repository. Scope Git commands to this project.
- No original PACKET source/assets were supplied. Fixture is authored from the brief.
- Product priority: slide authoring, logical-slide management, presenter flow and notes before additional motion complexity. Keep Timeline/Camera/Actors opt-in.
- Infrastructure next: PostgreSQL/Drizzle repository and resource authorization via OIDC, then export worker.
