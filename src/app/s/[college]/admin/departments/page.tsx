import Link from "next/link";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { Flash, PageHeader } from "@/components/admin/PageHeader";
import { StatusPill } from "@/components/ui/Badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteDepartment } from "@/lib/actions/admin";
import { requireCollegeAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { portalPath } from "@/lib/tenant";

export const metadata = { title: "Departments" };

export default async function AdminDepartments({ params, searchParams }: { params: Promise<{ college: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [{ college: slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireCollegeAdmin(slug);
  const p = (path: string) => portalPath(slug, path);
  const supabase = await createClient();
  const { data } = await supabase
    .from("departments")
    .select("id, name, code, slug, status, head_name, sort_order, admins(count), announcements(count)")
    .eq("college_id", ctx.college.id)
    .order("sort_order")
    .order("name");

  return (
    <div>
      <PageHeader title="Departments" description="Each department gets a public page and can have its own admins." action={{ href: p("/admin/departments/new"), label: "Add department" }} />
      <Flash saved={sp.saved} error={sp.error} />
      {data?.length ? (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[0.9375rem]">
            <thead className="border-b border-line bg-sunken text-[0.8125rem] text-ink-3">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-bold">Department</th>
                <th scope="col" className="px-4 py-2.5 font-bold">Head</th>
                <th scope="col" className="px-4 py-2.5 text-right font-bold">Notices</th>
                <th scope="col" className="px-4 py-2.5 text-right font-bold">Admins</th>
                <th scope="col" className="px-4 py-2.5 font-bold">Status</th>
                <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((d) => {
                const admins = (d.admins as unknown as { count: number }[])[0]?.count ?? 0;
                const notices = (d.announcements as unknown as { count: number }[])[0]?.count ?? 0;
                return (
                  <tr key={d.id}>
                    <td className="px-4 py-3">
                      <span className="mr-2 font-extrabold">{d.code}</span>
                      <Link href={p(`/admin/departments/${d.id}`)} className="hover:underline">{d.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{d.head_name ?? "Not set"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{notices}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{admins}</td>
                    <td className="px-4 py-3"><StatusPill status={d.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {ctx.college.status === "active" && d.status === "active" ? (
                          <a href={p(`/departments/${d.slug}`)} target="_blank" rel="noopener" className="btn-ghost btn-sm">View</a>
                        ) : null}
                        <Link href={p(`/admin/departments/${d.id}`)} className="btn-secondary btn-sm">Edit</Link>
                        <form action={deleteDepartment}>
                          <input type="hidden" name="college" value={slug} />
                          <input type="hidden" name="id" value={d.id} />
                          <ConfirmSubmit message={`Delete ${d.code}? Its ${notices} notices and its events will be deleted too.`}>Delete</ConfirmSubmit>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No departments yet" body="Add departments so they can publish their own notices." action={{ href: p("/admin/departments/new"), label: "Add department" }} />
      )}
    </div>
  );
}
