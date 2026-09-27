/**
 * Row Level Security and tenant-isolation tests.
 *
 * Runs the real migration against a real Postgres (with a small shim for the
 * Supabase auth/storage schemas) and then acts as different users by switching
 * to the `anon` / `authenticated` roles with a JWT subject, exactly the way
 * Supabase's API layer does.
 *
 *   TEST_DATABASE_URL=postgres://postgres@127.0.0.1:54329/postgres npm run test:db
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ADMIN_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/postgres";
const DB = "notifyhub_rls_test";
const root = join(__dirname, "..", "..");
const sql = (p: string) => readFileSync(join(root, p), "utf8");

const COLLEGE_A = "00000000-0000-4000-8000-000000000001"; // seeded demo college (vits)
const CSE = "00000000-0000-4000-8000-0000000000d1";
const ECE = "00000000-0000-4000-8000-0000000000d2";
const COLLEGE_B = "00000000-0000-4000-8000-00000000000b";
const B_DEPT = "00000000-0000-4000-8000-0000000000b1";
const COLLEGE_SUSPENDED = "00000000-0000-4000-8000-00000000000c";

const users = {
  adminA: "10000000-0000-4000-8000-000000000001",
  cseAdminA: "10000000-0000-4000-8000-000000000002",
  adminB: "10000000-0000-4000-8000-000000000003",
  platform: "10000000-0000-4000-8000-000000000004",
  outsider: "10000000-0000-4000-8000-000000000005",
  adminA2: "10000000-0000-4000-8000-000000000006",
};

let db: Client;

type Who = keyof typeof users | "anon";

/** Run `fn` as a given user inside a transaction that is always rolled back. */
async function as<T>(who: Who, fn: (c: Client) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    if (who === "anon") {
      await db.query("set local role anon");
      await db.query("select set_config('request.jwt.claim.sub', '', true)");
    } else {
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [users[who]]);
    }
    return await fn(db);
  } finally {
    await db.query("rollback");
  }
}

async function expectError(p: Promise<unknown>, pattern: RegExp) {
  await expect(p).rejects.toThrow(pattern);
}

beforeAll(async () => {
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`drop database if exists ${DB}`);
  await admin.query(`create database ${DB}`);
  await admin.end();

  const url = new URL(ADMIN_URL);
  url.pathname = `/${DB}`;
  db = new Client({ connectionString: url.toString() });
  await db.connect();
  await db.query("set client_min_messages = error");
  // roles are cluster-wide: create them only if an earlier run has not
  const shim = sql("tests/db/supabase-shim.sql").replace(
    /create role (\w+) nologin( bypassrls)?;/g,
    (_m, r, b) => `do $$ begin create role ${r} nologin${b ?? ""}; exception when duplicate_object then null; end $$;`,
  );
  await db.query(shim);
  for (const file of readdirSync(join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort()) {
    await db.query(sql(`supabase/migrations/${file}`));
  }
  await db.query(sql("supabase/seed.sql"));

  await db.query(
    `insert into auth.users (id, email) values
      ($1,'a@examplecollege.ac.in'),($2,'cse@examplecollege.ac.in'),($3,'b@other.edu.in'),
      ($4,'ops@notifyhub.in'),($5,'someone@gmail.com'),($6,'a2@examplecollege.ac.in')`,
    [users.adminA, users.cseAdminA, users.adminB, users.platform, users.outsider, users.adminA2],
  );
  await db.query(
    `insert into colleges (id, name, slug, official_website, website_domain, status, verification_status)
     values ($1, 'Other College', 'other', 'https://other.edu.in', 'other.edu.in', 'active', 'verified'),
            ($2, 'Suspended College', 'suspended', 'https://susp.ac.in', 'susp.ac.in', 'suspended', 'verified')`,
    [COLLEGE_B, COLLEGE_SUSPENDED],
  );
  await db.query(`insert into departments (id, college_id, name, code, slug) values ($1, $2, 'Management', 'MBA', 'mba')`, [B_DEPT, COLLEGE_B]);
  await db.query(
    `insert into admins (college_id, user_id, name, email, role, department_id) values
      ($1, $2, 'Admin A', 'a@examplecollege.ac.in', 'college_admin', null),
      ($1, $3, 'CSE Admin', 'cse@examplecollege.ac.in', 'department_admin', $4),
      ($5, $6, 'Admin B', 'b@other.edu.in', 'college_admin', null)`,
    [COLLEGE_A, users.adminA, users.cseAdminA, CSE, COLLEGE_B, users.adminB],
  );
  await db.query(`insert into platform_admins (user_id) values ($1)`, [users.platform]);
  await db.query(
    `insert into announcements (college_id, scope, title, status) values
      ($1, 'college', 'B private draft', 'draft'),
      ($1, 'college', 'B public notice', 'published')`,
    [COLLEGE_B],
  );
  await db.query(
    `insert into announcements (college_id, scope, title, status, published_at, expires_at) values
      ($1, 'college', 'A draft notice', 'draft', now(), null),
      ($1, 'college', 'A scheduled notice', 'published', now() + interval '2 days', null),
      ($1, 'college', 'A expired notice', 'published', now() - interval '10 days', now() - interval '1 day')`,
    [COLLEGE_A],
  );
  await db.query(`insert into announcements (college_id, scope, title) values ($1, 'college', 'Suspended college notice')`, [COLLEGE_SUSPENDED]);
});

afterAll(async () => {
  await db?.end();
});

describe("public visitors (anon)", () => {
  it("see active colleges only", async () => {
    const { rows } = await as("anon", (c) => c.query("select slug from colleges order by slug"));
    expect(rows.map((r) => r.slug)).toEqual(["other", "vits"]);
  });

  it("see only live, published announcements", async () => {
    const { rows } = await as("anon", (c) =>
      c.query("select title from announcements where college_id = $1", [COLLEGE_A]),
    );
    const titles = rows.map((r) => r.title);
    expect(titles).toContain("Internal Examination Schedule (Mid-II)");
    expect(titles).not.toContain("A draft notice");
    expect(titles).not.toContain("A scheduled notice");
    expect(titles).not.toContain("A expired notice");
  });

  it("see nothing from a suspended college", async () => {
    const { rows } = await as("anon", (c) => c.query("select 1 from announcements where college_id = $1", [COLLEGE_SUSPENDED]));
    expect(rows).toHaveLength(0);
  });

  it("cannot write anything", async () => {
    await expectError(
      as("anon", (c) => c.query(`insert into announcements (college_id, scope, title) values ($1,'college','hack')`, [COLLEGE_A])),
      /permission denied/,
    );
    await expectError(as("anon", (c) => c.query(`update colleges set name = 'x'`)), /permission denied/);
    await expectError(as("anon", (c) => c.query(`delete from events`)), /permission denied/);
  });

  it("cannot read admin, onboarding or verification data", async () => {
    for (const table of ["admins", "college_onboarding", "verification_tokens", "website_analysis", "activity_logs", "platform_settings"]) {
      await expectError(as("anon", (c) => c.query(`select * from ${table}`)), /permission denied/);
    }
  });

  it("can search announcements, including by department code", async () => {
    const exam = await as("anon", (c) =>
      c.query("select title, total_count from search_announcements($1, 'examination')", [COLLEGE_A]),
    );
    expect(exam.rows.map((r) => r.title)).toContain("Internal Examination Schedule (Mid-II)");
    const byDept = await as("anon", (c) => c.query("select title from search_announcements($1, 'ECE')", [COLLEGE_A]));
    expect(byDept.rows.map((r) => r.title)).toContain("ECE: Registration for embedded systems workshop");
    const urgent = await as("anon", (c) =>
      c.query("select bool_and(is_urgent) as all_urgent, count(*)::int as n from search_announcements($1, p_urgent => true)", [COLLEGE_A]),
    );
    expect(urgent.rows[0]).toEqual({ all_urgent: true, n: 2 });
  });

  it("college admins can edit a department and a team member (tables without created_by)", async () => {
    await as("adminA", async (c) => {
      const d = await c.query("update departments set years_count = 2, description = 'Edited' where id = $1 returning years_count", [CSE]);
      expect(d.rows[0].years_count).toBe(2);
      const a = await c.query("update admins set name = 'Renamed' where college_id = $1 and user_id = $2 returning name", [COLLEGE_A, users.cseAdminA]);
      expect(a.rows[0].name).toBe("Renamed");
    });
  });

  it("can find live colleges by name, short form or place, but not hidden ones", async () => {
    const find = async (q: string) => (await as("anon", (c) => c.query("select slug from search_colleges($1)", [q]))).rows.map((r) => r.slug);
    expect(await find("vignan")).toContain("vits");
    expect(await find("VITS")).toEqual(["vits"]); // exact short name
    expect(await find("vit")).toContain("vits"); // initials of Vignan Institute of Technology
    expect(await find("v.i.t")).toContain("vits"); // dots ignored
    expect(await find("viot")).toContain("vits"); // initials including "of"
    expect(await find("vignan hyderabad")).toContain("vits"); // words may match different fields
    expect(await find("vignan chennai")).not.toContain("vits");
    expect(await find("100%_\\\\")).toEqual([]); // wildcards are literal
    const all = await find("");
    expect(all).toEqual(expect.arrayContaining(["vits", "other"])); // empty query lists every live college
    expect(all).not.toContain("suspended");
    expect(await find("suspended")).toEqual([]);
  });

  it("builds short forms from college names", async () => {
    const { rows } = await db.query(
      "select public.college_initials('VP College of Engineering and Technology', false) a, public.college_initials('VP College of Engineering and Technology', true) b, public.college_initials('Indian Institute of Information Technology (IIIT) Hyderabad', false) c",
    );
    expect(rows[0]).toEqual({ a: "vpcet", b: "vpcoeat", c: "iiitiiith" });
  });

  it("can filter announcements by student year", async () => {
    const titles = async (year: number) =>
      (await as("anon", (c) => c.query("select title from search_announcements($1, p_year => $2::smallint, p_limit => 50)", [COLLEGE_A, year]))).rows.map((r) => r.title);
    const first = await titles(1);
    expect(first).toContain("Anti-ragging undertaking: submission deadline"); // 1st year only
    expect(first).toContain("Holiday Announcement"); // every year
    expect(first).not.toContain("Internal Examination Schedule (Mid-II)"); // 2nd to 4th year
    const fourth = await titles(4);
    expect(fourth).toContain("Placement Drive Registration Open");
    expect(fourth).not.toContain("Anti-ragging undertaking: submission deadline");
    await expectError(db.query("update announcements set years = '{7}' where college_id = $1", [COLLEGE_A]), /check/i);
  });

  it("can count a view on a public announcement but not on a draft", async () => {
    const { rows } = await db.query("select id from announcements where title in ('Holiday Announcement','A draft notice') order by title");
    const [draftId, holidayId] = [rows[0].id, rows[1].id];
    await db.query("begin");
    try {
      await db.query("set local role anon");
      await db.query("select record_announcement_view($1)", [holidayId]);
      await db.query("select record_announcement_view($1)", [draftId]);
      await db.query("reset role");
      const r = await db.query("select title, view_count from announcements where id = any($1) order by title", [[draftId, holidayId]]);
      expect(r.rows).toEqual([
        { title: "A draft notice", view_count: 0 },
        { title: "Holiday Announcement", view_count: 1 },
      ]);
    } finally {
      await db.query("rollback");
    }
  });
});

describe("college admins", () => {
  it("read their own drafts but never another college's", async () => {
    const own = await as("adminA", (c) => c.query("select 1 from announcements where title = 'A draft notice'"));
    expect(own.rows).toHaveLength(1);
    const other = await as("adminA", (c) => c.query("select 1 from announcements where title = 'B private draft'"));
    expect(other.rows).toHaveLength(0);
  });

  it("cannot create content in another college", async () => {
    await expectError(
      as("adminA", (c) =>
        c.query(`insert into announcements (college_id, scope, title) values ($1,'college','cross-tenant')`, [COLLEGE_B]),
      ),
      /row-level security/,
    );
  });

  it("cannot update or delete another college's rows (silently matches nothing)", async () => {
    const res = await as("adminA", (c) => c.query(`update announcements set title = 'owned' where college_id = $1`, [COLLEGE_B]));
    expect(res.rowCount).toBe(0);
    const del = await as("adminA", (c) => c.query(`delete from departments where college_id = $1`, [COLLEGE_B]));
    expect(del.rowCount).toBe(0);
  });

  it("cannot move a row into another college", async () => {
    await expectError(
      as("adminA", (c) => c.query(`update announcements set college_id = $1 where title = 'A draft notice'`, [COLLEGE_B])),
      /college_id cannot be changed|row-level security/,
    );
  });

  it("can edit their profile but not slug, status or verification", async () => {
    const ok = await as("adminA", (c) => c.query(`update colleges set welcome_heading = 'Hello' where id = $1`, [COLLEGE_A]));
    expect(ok.rowCount).toBe(1);
    await expectError(as("adminA", (c) => c.query(`update colleges set slug = 'stolen' where id = $1`, [COLLEGE_A])), /Only NotifyHub/);
    await expectError(as("adminA", (c) => c.query(`update colleges set status = 'active', is_demo = false where id = $1`, [COLLEGE_A])), /Only NotifyHub/);
    const other = await as("adminA", (c) => c.query(`update colleges set name = 'x' where id = $1`, [COLLEGE_B]));
    expect(other.rowCount).toBe(0);
  });

  it("see their own team but not other colleges' admins", async () => {
    const { rows } = await as("adminA", (c) => c.query("select email from admins order by email"));
    expect(rows.map((r) => r.email)).toEqual(["a@examplecollege.ac.in", "cse@examplecollege.ac.in"]);
  });

  it("cannot remove the last college admin", async () => {
    await expectError(as("adminA", (c) => c.query(`delete from admins where user_id = $1`, [users.adminA])), /at least one active college admin/);
  });

  it("can remove themselves when another college admin exists", async () => {
    await db.query("begin");
    try {
      await db.query(`insert into admins (college_id, user_id, name, email, role) values ($1,$2,'A2','a2@examplecollege.ac.in','college_admin')`, [COLLEGE_A, users.adminA2]);
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [users.adminA]);
      const r = await db.query(`delete from admins where user_id = $1`, [users.adminA]);
      expect(r.rowCount).toBe(1);
    } finally {
      await db.query("rollback");
    }
  });

  it("cannot assign a department admin to another college's department", async () => {
    await expectError(
      as("adminA", (c) =>
        c.query(
          `insert into admins (college_id, user_id, name, email, role, department_id) values ($1,$2,'x','x@x.in','department_admin',$3)`,
          [COLLEGE_A, users.outsider, B_DEPT],
        ),
      ),
      /foreign key/,
    );
  });

  it("read college analytics only for their own college", async () => {
    const own = await as("adminA", (c) => c.query("select college_analytics($1) as a", [COLLEGE_A]));
    expect(Number(own.rows[0].a.departments)).toBe(5);
    const other = await as("adminA", (c) => c.query("select college_analytics($1) as a", [COLLEGE_B]));
    expect(other.rows[0].a).toBeNull();
  });
});

describe("department admins", () => {
  it("can publish in their own department", async () => {
    const r = await as("cseAdminA", (c) =>
      c.query(`insert into announcements (college_id, department_id, scope, title) values ($1,$2,'department','CSE lab notice') returning ref_no, created_by`, [COLLEGE_A, CSE]),
    );
    expect(r.rows[0].created_by).toBe(users.cseAdminA);
    expect(r.rows[0].ref_no).toBeGreaterThan(0);
  });

  it("cannot publish in another department or college-wide", async () => {
    await expectError(
      as("cseAdminA", (c) =>
        c.query(`insert into announcements (college_id, department_id, scope, title) values ($1,$2,'department','ECE notice')`, [COLLEGE_A, ECE]),
      ),
      /row-level security/,
    );
    await expectError(
      as("cseAdminA", (c) => c.query(`insert into announcements (college_id, scope, title) values ($1,'college','College-wide')`, [COLLEGE_A])),
      /row-level security/,
    );
    await expectError(
      as("cseAdminA", (c) =>
        c.query(`insert into events (college_id, department_id, scope, title, starts_at) values ($1,$2,'department','ECE event', now() + interval '1 day')`, [COLLEGE_A, ECE]),
      ),
      /row-level security/,
    );
  });

  it("cannot edit another department's announcement or move their own out", async () => {
    const r = await as("cseAdminA", (c) => c.query(`update announcements set title = 'edited' where department_id = $1`, [ECE]));
    expect(r.rowCount).toBe(0);
    await expectError(
      as("cseAdminA", (c) =>
        c.query(`update announcements set department_id = $1 where title = 'CSE: Lab internal evaluation schedule'`, [ECE]),
      ),
      /row-level security/,
    );
  });

  it("cannot manage departments or the team", async () => {
    await expectError(
      as("cseAdminA", (c) => c.query(`insert into departments (college_id, name, code, slug) values ($1,'New','NEW','new')`, [COLLEGE_A])),
      /row-level security/,
    );
    const r = await as("cseAdminA", (c) => c.query(`update departments set name = 'x' where id = $1`, [CSE]));
    expect(r.rowCount).toBe(0);
    const team = await as("cseAdminA", (c) => c.query(`select email from admins`));
    expect(team.rows.map((x) => x.email)).toEqual(["cse@examplecollege.ac.in"]);
  });

  it("posting notifies the college admins, who only see their own notifications", async () => {
    await db.query("begin");
    try {
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [users.cseAdminA]);
      await db.query(`insert into announcements (college_id, department_id, scope, title, is_urgent) values ($1,$2,'department','CSE urgent', true)`, [COLLEGE_A, CSE]);
      const mine = await db.query(`select count(*)::int as n from notifications`);
      expect(mine.rows[0].n).toBe(0);
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [users.adminA]);
      const theirs = await db.query(`select title from notifications`);
      expect(theirs.rows.map((r) => r.title)).toEqual(["Urgent notice posted by CSE"]);
    } finally {
      await db.query("rollback");
    }
  });
});

describe("outsiders and platform admins", () => {
  it("a signed-in user with no college sees only public data", async () => {
    const r = await as("outsider", (c) => c.query(`select title from announcements where title like 'A %'`));
    expect(r.rows).toHaveLength(0);
    await expectError(as("outsider", (c) => c.query(`select platform_stats()`)), /not allowed/);
  });

  it("platform admins see every college and platform stats", async () => {
    const r = await as("platform", (c) => c.query(`select count(*)::int as n from colleges`));
    expect(r.rows[0].n).toBe(3);
    const s = await as("platform", (c) => c.query(`select platform_stats() as s`));
    expect(Number(s.rows[0].s.suspended)).toBe(1);
    const upd = await as("platform", (c) => c.query(`update colleges set status = 'active' where id = $1`, [COLLEGE_SUSPENDED]));
    expect(upd.rowCount).toBe(1);
  });
});

describe("storage", () => {
  it("members can upload only into their own college's folder", async () => {
    await as("adminA", (c) => c.query(`insert into storage.objects (bucket_id, name) values ('college-files', $1)`, [`${COLLEGE_A}/logo/x.png`]));
    await expectError(
      as("adminA", (c) => c.query(`insert into storage.objects (bucket_id, name) values ('college-files', $1)`, [`${COLLEGE_B}/logo/x.png`])),
      /row-level security/,
    );
    await expectError(
      as("adminA", (c) => c.query(`insert into storage.objects (bucket_id, name) values ('college-files', 'not-a-uuid/x.png')`)),
      /row-level security/,
    );
    await expectError(
      as("anon", (c) => c.query(`insert into storage.objects (bucket_id, name) values ('college-files', $1)`, [`${COLLEGE_A}/x.png`])),
      /row-level security|permission denied/,
    );
  });
});

describe("integrity", () => {
  it("a website domain can be verified by only one college", async () => {
    await expectError(
      db.query(
        `insert into colleges (name, official_website, website_domain, verification_status) values ('Impostor', 'https://www.examplecollege.ac.in', 'examplecollege.ac.in', 'verified')`,
      ),
      /colleges_verified_domain_uniq/,
    );
  });

  it("scope and department must agree", async () => {
    await expectError(
      db.query(`insert into announcements (college_id, scope, title, department_id) values ($1, 'college', 'bad', $2)`, [COLLEGE_A, CSE]),
      /check constraint/,
    );
  });

  it("a college can be deleted with all its data", async () => {
    await db.query("begin");
    try {
      await db.query(`delete from colleges where id = $1`, [COLLEGE_B]);
      const r = await db.query(`select count(*)::int as n from announcements where college_id = $1`, [COLLEGE_B]);
      expect(r.rows[0].n).toBe(0);
    } finally {
      await db.query("rollback");
    }
  });

  it("circular numbers are sequential per college", async () => {
    const r = await db.query(`select array_agg(ref_no order by ref_no) as refs from announcements where college_id = $1`, [COLLEGE_B]);
    expect(r.rows[0].refs).toEqual([1, 2]);
  });
});

describe("server-only functions", () => {
  it("cannot be called by visitors or admins", async () => {
    await expectError(as("anon", (c) => c.query(`select cleanup_abandoned_onboarding()`)), /permission denied/);
    await expectError(as("adminA", (c) => c.query(`select cleanup_abandoned_onboarding()`)), /permission denied/);
    await expectError(as("adminA", (c) => c.query(`select auth_user_id('a@examplecollege.ac.in')`)), /permission denied/);
  });

  it("report portal status without exposing a non-public college", async () => {
    const r = await as("anon", (c) => c.query(`select portal_status('suspended') as s`));
    expect(r.rows[0].s).toBe("suspended");
    const hidden = await as("anon", (c) => c.query(`select count(*)::int as n from colleges where slug = 'suspended'`));
    expect(hidden.rows[0].n).toBe(0);
  });

  it("abandoned onboardings are cleaned up and release their slug", async () => {
    await db.query("begin");
    try {
      const { rows } = await db.query(
        `insert into colleges (name, slug, official_website, website_domain) values ('Abandoned', 'abandoned', 'https://ab.ac.in', 'ab.ac.in') returning id`,
      );
      await db.query(`insert into college_onboarding (college_id, session_hash, contact_name, contact_email, expires_at) values ($1, 'x', 'n', 'e@ab.ac.in', now() - interval '1 day')`, [rows[0].id]);
      const r = await db.query(`select cleanup_abandoned_onboarding() as n`);
      expect(r.rows[0].n).toBe(1);
      const free = await db.query(`select slug_available('abandoned') as ok`);
      expect(free.rows[0].ok).toBe(true);
    } finally {
      await db.query("rollback");
    }
  });
});
