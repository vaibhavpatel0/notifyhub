import Link from "next/link";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="hd-1">{title}</h1>
        {description ? <p className="mt-1 text-ink-2">{description}</p> : null}
      </div>
      {action ? <Link href={action.href} className="btn-primary">{action.label}</Link> : null}
    </div>
  );
}

const MESSAGES: Record<string, string> = {
  published: "Published. Students can see it now.",
  scheduled: "Scheduled. It will appear at the chosen time.",
  draft: "Saved as a draft. Only admins can see it.",
  deleted: "Deleted.",
  "1": "Saved.",
};
const ERRORS: Record<string, string> = {
  delete: "Could not delete. You may not have permission.",
  has_admins: "This department still has department admins. Reassign or remove them on the Team page first.",
  last_admin: "A college needs at least one active college admin.",
  update: "Could not update. You may not have permission.",
  college_admin_only: "Only college admins can open that page.",
};

export function Flash({ saved, error }: { saved?: string; error?: string }) {
  if (error) return <p role="alert" className="mb-5 rounded-md border border-urgent/30 bg-urgent-tint px-3 py-2 font-bold text-urgent-strong">{ERRORS[error] ?? "Something went wrong."}</p>;
  if (saved) return <p role="status" className="mb-5 rounded-md border border-ok/30 bg-ok-tint px-3 py-2 font-bold text-ok">{MESSAGES[saved] ?? "Saved."}</p>;
  return null;
}
