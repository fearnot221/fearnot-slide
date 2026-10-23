# Next milestones

Product direction: slide authoring and interactive presentation lead. Next UX work should prioritize slide reorder/duplicate/delete, notes and presenter flow; motion stays an optional panel. Do not expand the video-production metaphor.

1. Production persistence/auth: Drizzle schema and migrations for users/workspaces/memberships/presentations/drafts/revisions/publications/permissions/assets/jobs/audit; transactional etag checks; OIDC session and server-side resource authorization; integration tests against PostgreSQL.
2. Complete authoring: group/ungroup + transformed-group hit testing, clipboard, multi-object transforms, align/snap guides, camera follow/path, shared representation crossfades; actor metadata inspector and component registry/plugin contract.
3. Native PACKET: inspect actual source/archive when supplied; isolate runtime; retain source manifests; implement AST/adapters only for statically supported features; original intermediate-frame golden masters.
4. Export worker: shared runtime Web/ZIP/PDF/PNG, immutable revision jobs, asset dependencies, S3 and Redis/BullMQ, hardened Docker Compose/Caddy deployment.
5. Advanced graph/path/morph editing, collaborative editing and PPTX/MP4 only after core production reliability.
