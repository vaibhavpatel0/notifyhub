-- =====================================================================
-- Student years (1st, 2nd, 3rd, 4th ...)
--   * departments.years_count: how many years the department's course runs
--     (4 for B.Tech, 2 for MBA/M.Tech, 5 for B.Arch ...).
--   * announcements.years / events.years: which years a notice or event is
--     for. Empty means every year.
-- =====================================================================

-- =====================================================================
-- Fix: guard_tenant_row referenced new.created_by in the same expression as
-- the table-name test. PL/pgSQL resolves the field before the test runs, so
-- every UPDATE on departments and admins (which have no created_by) failed.
-- =====================================================================
create or replace function public.guard_tenant_row()
returns trigger language plpgsql as $$
begin
  if new.college_id is distinct from old.college_id then
    raise exception 'college_id cannot be changed' using errcode = '42501';
  end if;
  if tg_table_name in ('announcements', 'events') then
    if new.created_by is distinct from old.created_by then
      new.created_by = old.created_by;
    end if;
  end if;
  return new;
end $$;

alter table public.departments
  add column if not exists years_count smallint not null default 4
    check (years_count between 1 and 6);

alter table public.announcements
  add column if not exists years smallint[] not null default '{}'
    check (years <@ array[1, 2, 3, 4, 5, 6]::smallint[]);

alter table public.events
  add column if not exists years smallint[] not null default '{}'
    check (years <@ array[1, 2, 3, 4, 5, 6]::smallint[]);

-- Search gains a year filter. A student picking "2nd year" sees notices for
-- every year plus those aimed at 2nd year.
drop function if exists public.search_announcements(uuid, text, text, uuid, boolean, text, text, integer, integer);

create or replace function public.search_announcements(
  p_college    uuid,
  p_query      text default null,
  p_category   text default null,
  p_department uuid default null,
  p_urgent     boolean default null,
  p_scope      text default null,
  p_sort       text default 'latest',
  p_limit      integer default 20,
  p_offset     integer default 0,
  p_year       smallint default null
)
returns table (
  id uuid, ref_no integer, ref_year integer, title text, description text, category text, scope public.content_scope,
  department_id uuid, department_name text, department_code text, department_slug text,
  attachment_url text, image_url text, is_urgent boolean, is_pinned boolean,
  published_at timestamptz, expires_at timestamptz, years smallint[], total_count bigint
)
language sql stable security invoker set search_path = public as $$
  with q as (
    select nullif(trim(p_query), '') as text,
           '%' || replace(replace(replace(coalesce(trim(p_query), ''), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  )
  select a.id, a.ref_no, a.ref_year, a.title, left(a.description, 400), a.category, a.scope,
         a.department_id, d.name, d.code, d.slug,
         a.attachment_url, a.image_url, a.is_urgent, a.is_pinned,
         a.published_at, a.expires_at, a.years, count(*) over ()
  from public.announcements a
  left join public.departments d on d.id = a.department_id
  cross join q
  where a.college_id = p_college
    and a.status = 'published' and a.published_at <= now()
    and (a.expires_at is null or a.expires_at > now())
    and (p_category is null or a.category = p_category)
    and (p_department is null or a.department_id = p_department)
    and (p_urgent is null or a.is_urgent = p_urgent)
    and (p_scope is null or a.scope::text = p_scope)
    and (p_year is null or cardinality(a.years) = 0 or p_year = any (a.years))
    and (q.text is null
         or a.search @@ websearch_to_tsquery('english', q.text)
         or a.title ilike q.pattern
         or a.category ilike q.pattern
         or d.name ilike q.pattern
         or d.code ilike q.pattern)
  order by
    case when p_sort = 'latest' then a.is_urgent end desc nulls last,
    case when p_sort = 'oldest' then a.published_at end asc,
    case when p_sort = 'upcoming' then a.expires_at end asc nulls last,
    a.published_at desc
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
$$;

grant execute on function public.search_announcements(uuid, text, text, uuid, boolean, text, text, integer, integer, smallint) to anon, authenticated;

-- Postgraduate and management courses usually run two years.
update public.departments
set years_count = 2
where years_count = 4
  and (upper(code) in ('MBA', 'MCA', 'MTECH', 'M.TECH', 'MSC', 'M.SC', 'MCOM', 'M.COM', 'MA', 'PGDM')
       or name ~* '^(master|m\.? ?tech|post ?graduate)');

update public.departments
set years_count = 5
where years_count = 4 and (upper(code) in ('BARCH', 'B.ARCH') or name ~* 'architecture');

-- =====================================================================
-- College search for the NotifyHub home page ("Find your college").
-- Runs as the caller, so RLS limits it to colleges whose portal is live.
-- Every word typed must appear in the name, short name, address or web address.
-- =====================================================================
create or replace function public.search_colleges(p_query text, p_limit integer default 8)
returns table (name text, short_name text, slug text, logo_url text, address text, is_demo boolean)
language sql stable security invoker set search_path = public as $$
  with q as (
    select lower(trim(coalesce(p_query, ''))) as t
  ),
  words as (
    select '%' || replace(replace(replace(w, '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
    from q, regexp_split_to_table(q.t, '\s+') as w
    where w <> ''
  )
  select c.name, c.short_name, c.slug, c.logo_url, c.address, c.is_demo
  from public.colleges c, q
  where c.status = 'active' and c.slug is not null
    and char_length(q.t) between 2 and 100
    and not exists (
      select 1 from words
      where c.name not ilike words.pattern
        and coalesce(c.short_name, '') not ilike words.pattern
        and coalesce(c.address, '') not ilike words.pattern
        and c.slug not ilike words.pattern
        and coalesce(c.website_domain, '') not ilike words.pattern
    )
  order by
    (c.slug = q.t or lower(coalesce(c.short_name, '')) = q.t) desc,
    (lower(c.name) like q.t || '%') desc,
    c.is_demo asc,
    c.name
  limit least(greatest(p_limit, 1), 20);
$$;

grant execute on function public.search_colleges(text, integer) to anon, authenticated;
