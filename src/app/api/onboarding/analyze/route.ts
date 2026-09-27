import { getOnboarding } from "@/lib/onboarding/session";
import { analyzeWebsite, STEP_LABELS, type AnalysisEvent } from "@/lib/onboarding/analyzer";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Streams analysis progress as newline-delimited JSON so the onboarding
 * screen can tick off each check as it actually happens.
 */
export async function POST() {
  const record = await getOnboarding();
  if (!record) {
    return Response.json({ error: "Your onboarding session has expired. Start again." }, { status: 401 });
  }
  if (record.onboarding.stage > 3) {
    return Response.json({ error: "Analysis is already complete." }, { status: 409 });
  }

  const db = createAdminClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      send({ type: "labels", labels: STEP_LABELS });
      try {
        const result = await analyzeWebsite(record.college.official_website, (e: AnalysisEvent) => send(e));
        await db.from("website_analysis").insert({
          college_id: record.college.id,
          website_url: record.college.official_website,
          status: result.status,
          detected_name: result.name,
          detected_email: result.officialEmails[0] ?? null,
          detected_logo: result.logo,
          detected_departments: result.departments.map((d) => d.code),
          analysis_result: result,
          error: result.error ?? null,
        });
        // An unreachable site still lets the college continue by typing details in.
        await db.from("college_onboarding").update({ stage: 2 }).eq("college_id", record.college.id).lt("stage", 2);
        send({ type: "result", result });
      } catch (err) {
        console.error("analyze", err);
        send({ type: "error", message: "The analysis stopped unexpectedly. You can continue and enter the details yourself." });
        await db.from("college_onboarding").update({ stage: 2 }).eq("college_id", record.college.id).lt("stage", 2);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
