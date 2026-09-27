import Link from "next/link";
import { StatusPill } from "@/components/ui/Badges";
import { formatDate } from "@/lib/format";
import { portalHost, portalUrl } from "@/lib/tenant";
import { setCollegeStatus } from "@/lib/actions/super";
import { ConfirmSubmit } from "./ConfirmSubmit";

export interface CollegeListRow {
  id: string;
  name: string;
  slug: string | null;
  official_website: string;
  status: string;
  verification_status: string;
  verification_method: string | null;
  is_demo: boolean;
  created_at: string;
}

export function CollegeTable({ rows, back }: { rows: CollegeListRow[]; back: string }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-[0.9375rem]">
        <thead className="border-b border-line bg-sunken text-[0.8125rem] text-ink-3">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-bold">College</th>
            <th scope="col" className="px-4 py-2.5 font-bold">Portal address</th>
            <th scope="col" className="px-4 py-2.5 font-bold">Website</th>
            <th scope="col" className="px-4 py-2.5 font-bold">Verification</th>
            <th scope="col" className="px-4 py-2.5 font-bold">Portal</th>
            <th scope="col" className="px-4 py-2.5 font-bold">Created</th>
            <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((c) => (
            <tr key={c.id} className="align-top">
              <td className="px-4 py-3">
                <Link href={`/super-admin/colleges/${c.id}`} className="font-bold hover:underline">{c.name}</Link>
                {c.is_demo ? <p className="meta">Demo</p> : null}
              </td>
              <td className="px-4 py-3">
                {c.slug ? (c.status === "active" ? <a href={portalUrl(c.slug)} className="hover:underline" target="_blank" rel="noopener">{portalHost(c.slug)}</a> : portalHost(c.slug)) : <span className="text-ink-3">Not chosen</span>}
              </td>
              <td className="px-4 py-3 break-all text-ink-2">{c.official_website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</td>
              <td className="px-4 py-3"><StatusPill status={c.verification_status} /></td>
              <td className="px-4 py-3"><StatusPill status={c.status} /></td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-2">{formatDate(c.created_at)}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1.5">
                  <Link href={`/super-admin/colleges/${c.id}`} className="btn-secondary btn-sm">View</Link>
                  {c.verification_status !== "verified" && c.status !== "rejected" ? (
                    <QuickAction id={c.id} op="approve" back={back} label="Approve" confirm={`Approve ${c.name} and publish its portal?`} className="btn-primary btn-sm" />
                  ) : null}
                  {c.status === "pending_review" ? (
                    <QuickAction id={c.id} op="reject" back={back} label="Reject" confirm={`Reject ${c.name}?`} className="btn-danger btn-sm" />
                  ) : null}
                  {c.status === "active" ? (
                    <QuickAction id={c.id} op="suspend" back={back} label="Suspend" confirm={`Suspend ${c.name}? The public portal goes offline immediately.`} className="btn-danger btn-sm" />
                  ) : null}
                  {c.status === "suspended" ? <QuickAction id={c.id} op="reinstate" back={back} label="Reinstate" confirm={`Reinstate ${c.name}?`} className="btn-secondary btn-sm" /> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuickAction({ id, op, back, label, confirm, className }: { id: string; op: string; back: string; label: string; confirm: string; className: string }) {
  return (
    <form action={setCollegeStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="op" value={op} />
      <input type="hidden" name="back" value={back} />
      <ConfirmSubmit message={confirm} className={className}>{label}</ConfirmSubmit>
    </form>
  );
}

const SAVED: Record<string, string> = { approve: "Approved. The portal is live.", reject: "Rejected.", suspend: "Suspended. The portal is offline.", reinstate: "Reinstated.", "1": "Saved." };
const ERR: Record<string, string> = { domain_taken: "Another college already holds a verified registration for this domain.", update: "Could not update the college.", not_found: "College not found." };

export function StaffFlash({ saved, error }: { saved?: string; error?: string }) {
  if (error) return <p role="alert" className="mb-5 rounded-md border border-urgent/30 bg-urgent-tint px-3 py-2 font-bold text-urgent-strong">{ERR[error] ?? "Something went wrong."}</p>;
  if (saved) return <p role="status" className="mb-5 rounded-md border border-ok/30 bg-ok-tint px-3 py-2 font-bold text-ok">{SAVED[saved] ?? "Saved."}</p>;
  return null;
}
