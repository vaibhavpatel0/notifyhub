import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Activity" };

export default async function Activity() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_logs")
    .select("id, action, entity_type, summary, created_at, college:colleges(name, slug)")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div>
      <h1 className="hd-1 mb-5">Activity</h1>
      {data?.length ? (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[0.9375rem]">
            <thead className="border-b border-line bg-sunken text-[0.8125rem] text-ink-3">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-bold">When</th>
                <th scope="col" className="px-4 py-2.5 font-bold">College</th>
                <th scope="col" className="px-4 py-2.5 font-bold">Action</th>
                <th scope="col" className="px-4 py-2.5 font-bold">Item</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((l) => {
                const c = l.college as unknown as { name: string } | null;
                return (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-ink-2">{formatDateTime(l.created_at)}</td>
                    <td className="px-4 py-2.5">{c?.name ?? "Deleted college"}</td>
                    <td className="px-4 py-2.5">{l.action} {l.entity_type.replace(/s$/, "")}</td>
                    <td className="px-4 py-2.5 text-ink-2">{l.summary}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No activity yet" />
      )}
    </div>
  );
}
