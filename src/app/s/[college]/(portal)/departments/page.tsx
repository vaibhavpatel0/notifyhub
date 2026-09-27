import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { getPublicCollege, getPublicDepartments } from "@/lib/data";
import { portalPath } from "@/lib/tenant";

export const metadata: Metadata = { title: "Departments" };

export default async function DepartmentsPage({ params }: { params: Promise<{ college: string }> }) {
  const { college: slug } = await params;
  const college = await getPublicCollege(slug);
  if (!college) notFound();
  const departments = await getPublicDepartments(college.id);
  return (
    <div className="page-width py-8 sm:py-10">
      <h1 className="hd-1">Departments</h1>
      <p className="mt-1 text-ink-2">Each department page lists its own notices and events.</p>
      {departments.length ? (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <li key={d.id}>
              <Link href={portalPath(slug, `/departments/${d.slug}`)} className="flex h-full gap-4 rounded-lg border border-line bg-surface p-4 hover:border-line-strong">
                <span className="w-16 shrink-0 text-[1.25rem] font-extrabold" style={{ color: "var(--tenant)" }}>{d.code}</span>
                <span className="min-w-0">
                  <span className="block font-bold leading-snug">{d.name}</span>
                  {d.description ? <span className="mt-1 line-clamp-2 block text-[0.9375rem] text-ink-2">{d.description}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6"><EmptyState title="No departments listed yet" /></div>
      )}
    </div>
  );
}
