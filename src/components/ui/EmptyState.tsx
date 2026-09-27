import Link from "next/link";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-surface/60 px-5 py-8 text-center">
      <p className="hd-3">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-md text-[0.9375rem] text-ink-2">{body}</p> : null}
      {action ? (
        <Link href={action.href} className="btn-secondary btn-sm mt-4">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
