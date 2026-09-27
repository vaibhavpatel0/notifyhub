/** Layout for long-form platform pages: guides and legal documents. */
export function DocPage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="page-width py-10 sm:py-14">
      <header className="max-w-[68ch] border-b border-line pb-6">
        <h1 className="hd-1">{title}</h1>
        {intro ? <p className="lede mt-3">{intro}</p> : null}
        {updated ? <p className="meta mt-3">Last updated {updated}</p> : null}
      </header>
      <div className="doc mt-8 max-w-[68ch] text-[1.0625rem] leading-relaxed text-ink-2">{children}</div>
    </article>
  );
}
