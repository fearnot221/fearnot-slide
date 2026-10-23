# ADR 0002: explicit development repository, fail closed in production

Accepted 2026-10-24.

Deliver real save/reload/publication without pretending to have PostgreSQL or authentication. Store validated documents on disk with atomic rename, per-document filesystem locks and version checks. Every revision gets a new ID and cloned document. Updating a draft cannot change published data.

Enable private operations only when NODE_ENV=development AND ENABLE_LOCAL_DEMO=1 AND Host is loopback AND Origin/Sec-Fetch-Site are accepted. Production rejects all private requests. Read-only publication uses no demo bypass.

Replace this repository with a transactional PostgreSQL/Drizzle implementation and enforce OIDC resource authorization before production editing. File persistence is single-host, has no disk fsync guarantee, and crash-abandoned locks require operator recovery.
