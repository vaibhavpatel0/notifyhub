import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { InviteForm } from "@/components/admin/InviteForm";
import { Flash, PageHeader } from "@/components/admin/PageHeader";
import { StatusPill } from "@/components/ui/Badges";
import { updateAdmin } from "@/lib/actions/admin";
import { requireCollegeAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AdminMember, DepartmentRef } from "@/lib/types";

export const metadata = { title: "Team" };

export default async function TeamPage({ params, searchParams }: { params: Promise<{ college: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [{ college: slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireCollegeAdmin(slug);
  const supabase = await createClient();
  const [{ data: team }, { data: depts }] = await Promise.all([
    supabase.from("admins").select("*, department:departments(id, name, code, slug)").eq("college_id", ctx.college.id).order("role").order("name"),
    supabase.from("departments").select("id, name, code, slug").eq("college_id", ctx.college.id).order("sort_order"),
  ]);
  const members = (team ?? []) as AdminMember[];

  return (
    <div className="space-y-6">
      <PageHeader title="Team" description="People who can sign in and publish for your college." />
      <Flash saved={sp.saved} error={sp.error} />
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[0.9375rem]">
          <thead className="border-b border-line bg-sunken text-[0.8125rem] text-ink-3">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-bold">Name</th>
              <th scope="col" className="px-4 py-2.5 font-bold">Role</th>
              <th scope="col" className="px-4 py-2.5 font-bold">Status</th>
              <th scope="col" className="px-4 py-2.5 font-bold">Added</th>
              <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  <p className="font-bold">{m.name}{m.user_id === ctx.userId ? <span className="font-normal text-ink-3"> (you)</span> : null}</p>
                  <p className="meta">{m.email}</p>
                </td>
                <td className="px-4 py-3">{m.role === "college_admin" ? "College admin" : `Department admin, ${m.department?.code ?? ""}`}</td>
                <td className="px-4 py-3"><StatusPill status={m.status} /></td>
                <td className="px-4 py-3 text-ink-2">{formatDate(m.created_at, ctx.college.timezone)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <form action={updateAdmin}>
                      <input type="hidden" name="college" value={slug} />
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="op" value={m.status === "active" ? "disable" : "enable"} />
                      <button type="submit" className="btn-secondary btn-sm">{m.status === "active" ? "Disable" : "Enable"}</button>
                    </form>
                    <form action={updateAdmin}>
                      <input type="hidden" name="college" value={slug} />
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="op" value="remove" />
                      <ConfirmSubmit message={`Remove ${m.name} from the team? They will no longer be able to sign in to this college.`}>Remove</ConfirmSubmit>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <InviteForm slug={slug} departments={(depts ?? []) as DepartmentRef[]} />
    </div>
  );
}
