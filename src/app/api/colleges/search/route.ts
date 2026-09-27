import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { portalHost, portalUrl } from "@/lib/tenant";

export interface CollegeSearchResult {
  name: string;
  shortName: string | null;
  place: string | null;
  url: string;
  host: string;
  logoUrl: string | null;
  isDemo: boolean;
}

/** GET /api/colleges/search?q=vignan: live college portals matching the words typed. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ results: [] });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_colleges", { p_query: q, p_limit: 8 });
  if (error) {
    console.error("search_colleges", error);
    return NextResponse.json({ error: "Search is unavailable right now." }, { status: 503 });
  }
  const results: CollegeSearchResult[] = (data ?? []).map(
    (c: { name: string; short_name: string | null; slug: string; logo_url: string | null; address: string | null; is_demo: boolean }) => ({
      name: c.name,
      shortName: c.short_name,
      place: placeFrom(c.address),
      url: portalUrl(c.slug),
      host: portalHost(c.slug),
      logoUrl: c.logo_url,
      isDemo: c.is_demo,
    }),
  );
  return NextResponse.json({ results }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}

/** "Plot 7, College Road, Hyderabad, Telangana 500001" -> "Hyderabad, Telangana" */
function placeFrom(address: string | null) {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.replace(/\b\d{6}\b/, "").trim()).filter(Boolean);
  return parts.slice(-2).join(", ") || null;
}
