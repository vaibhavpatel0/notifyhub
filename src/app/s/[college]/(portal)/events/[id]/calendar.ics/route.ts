import { getPublicCollege, getPublicEvent } from "@/lib/data";
import { portalUrl } from "@/lib/tenant";

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);

/** iCalendar file so students can add an event to their phone calendar. */
export async function GET(_req: Request, { params }: { params: Promise<{ college: string; id: string }> }) {
  const { college: slug, id } = await params;
  const college = await getPublicCollege(slug);
  const event = college && /^[0-9a-f-]{36}$/i.test(id) ? await getPublicEvent(college.id, id) : null;
  if (!college || !event) return new Response("Not found", { status: 404 });

  const end = event.ends_at ?? new Date(new Date(event.starts_at).getTime() + 2 * 3600_000).toISOString();
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NotifyHub//Campus events//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@notifyhub`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(event.starts_at)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(event.title)}`,
    event.venue ? `LOCATION:${esc(event.venue)}` : null,
    `DESCRIPTION:${esc(event.description.slice(0, 1000))}`,
    `URL:${portalUrl(slug, `/events/${event.id}`)}`,
    `ORGANIZER;CN=${esc(event.organizer || college.name)}:mailto:${college.contact_email || "noreply@notifyhub.in"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60)}.ics"`,
    },
  });
}
