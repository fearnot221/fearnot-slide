# Security boundaries

No production authentication/authorization has been implemented. All private Studio APIs reject production, even with demo flag set. Development flag is explicit in pnpm dev; server binds loopback. Loopback Host, same Origin and Sec-Fetch-Site checks protect the local demo against browser cross-origin writes. Public routes load published snapshots only. Presenter notes are removed on the server before serializing a public document; preview in Studio retains them.

All body streams are capped at 4 MB. Documents are strict validated JSON. File IDs reject path separators. Atomic writes use random temporary files and permissions 0600. Errors do not replace draft data. Shared actor/asset references are validated. Raw HTML and imported programs are not executed. Images only accept embedded PNG/JPEG/WebP; max individual UI upload is 1 MB.

This is not a substitute for OIDC resource permissions, CSRF strategy under real sessions, quotas, rate limits, audit events, managed asset storage or authorization tests. Do not expose next dev to the internet. The unguessable publication ID is currently the only sharing mechanism; public/private permission management is not present.
