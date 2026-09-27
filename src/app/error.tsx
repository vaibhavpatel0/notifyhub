"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page-width flex min-h-[60dvh] max-w-xl flex-col justify-center py-16">
      <h1 className="hd-1">This page could not load</h1>
      <p className="lede mt-3">Something went wrong on our side. Nothing you did caused it. Try again in a moment.</p>
      <button type="button" onClick={reset} className="btn-primary mt-6 self-start">Try again</button>
    </main>
  );
}
