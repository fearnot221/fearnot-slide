"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="notice">
      <h1>Unable to load this presentation</h1>
      <p>
        A storage or application error occurred. Existing files have been
        preserved.
      </p>
      <button onClick={reset}>Retry</button>
      <Link href="/">Library</Link>
    </main>
  );
}
