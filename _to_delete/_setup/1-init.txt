-- =====================================================================
-- NotifyHub initial schema
-- Multi-tenant: every tenant-owned row carries college_id, and every
-- table has Row Level Security enabled. The database, not the frontend,
-- decides who can read or change what.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.college_status as enum ('onboarding', 'pending_review', 'active', 'suspended', 'rejected');
create type public.verification_status as enum ('pending', 'manual_review', 'verified', 'rejected');
create type public.verification_method as enum ('email_otp', 'dns_txt', 'html_meta', 'manual');
create type public.admin_role as enum ('college_admin', 'department_admin');
create type public.content_scope as enum ('college', 'department');
create type public.content_status as enum ('draft', 'published', 'archived');

-- ---------------------------------------------------------------------
-- Platform
-- ---------------------------------------------------------------------
create table public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.platform_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value) values
  ('require_manual_approval', 'false'::jsonb),
  ('accept_new_colleges', 'true'::jsonb),
  ('max_upload_mb', '10'::jsonb);

-- ---------------------------------------------------------------------
-- Colleges (tenants)
-- ---------------------------------------------------------------------
create table public.colleges (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(name) between 2 and 200),
  short_name          text check (char_length(short_name) <= 20),
  slug                text unique check (slug ~ '^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,39}$'),
  official_website    text not null check (official_website ~ '^https?://'),
  website_domain      text not null,
  official_email      text,
  description         text check (char_length(description) <= 600),
  about               text check (char_length(about) <= 8000),
  logo_url            text,
  cover_image_url     text,
  welcome_heading     text check (char_length(welcome_heading) <= 120),
  welcome_text        text check (char_length(welcome_text) <= 600),
  address             text check (char_length(address) <= 400),
  phone               text check (char_length(phone) <= 40),
  contact_email       text check (char_length(contact_email) <= 200),
  social_links        jsonb not null default '{}'::jsonb,
  brand_color         text not null default '#1f4e8c' check (brand_color ~ '^#[0-9a-f]{6}$'),
  timezone            text not null default 'Asia/Kolkata',
  homepage_sections   jsonb not null default
    '{"urgent": true, "important": true, "announcements": true, "events": true, "departments": true, "about": true, "contact": true}'::jsonb,
  is_demo             boolean not null default false,
  status              public.college_status not null default 'onboarding',
  verification_status public.verification_status not null default 'pending',
  verification_method public.verification_method,
  verified            boolean generated always as (verification_status = 'verified') stored,
  verified_at         timestamptz,
  published_at        timestamptz,
  status_reason       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- One verified tenant per website domain: stops a second party claiming a college.
create unique index colleges_verified_domain_uniq
  on public.colleges (website_domain) where verification_status = 'verified';
create index colleges_status_idx on public.colleges (status);

-- Private onboarding data. Never readable by the public or by college admins.
create table public.college_onboarding (
  college_id         uuid primary key references public.colleges (id) on delete cascade,
  session_hash       text not null,
  contact_name       text not null,
  contact_email      text not null,
  contact_phone      text,
  stage              smallint not null default 1 check (stage between 1 and 8),
  verification_email text,
  verification_token text not null default encode(gen_random_bytes(16), 'hex'),
  review_note        text,
  pending_departments jsonb not null default '[]'::jsonb,
  detected_logo      text,
  expires_at         timestamptz not null default now() + interval '7 days',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.website_analysis (
  id                   uuid primary key default gen_random_uuid(),
  college_id           uuid not null references public.colleges (id) on delete cascade,
  website_url          text not null,
  status               text not null check (status in ('running', 'completed', 'failed', 'blocked')),
  detected_name        text,
  detected_email       text,
  detected_logo        text,
  detected_departments text[] not null default '{}',
  analysis_result      jsonb not null default '{}'::jsonb,
  error                text,
  created_at           timestamptz not null default now()
);
create index website_analysis_college_idx on public.website_analysis (college_id, created_at desc);

-- One-time codes are stored as HMAC hashes, never in plain text.
create table public.verification_tokens (
  id          uuid primary key default gen_random_uuid(),
  college_id  uuid not null references public.colleges (id) on delete cascade,
  email       text not null,
  otp_hash    text not null,
  attempts    smallint not null default 0,
  expires_at  timestamptz not null,
  verified    boolean not null default false,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index verification_tokens_college_idx on public.verification_tokens (college_id, created_at desc);

-- ---------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------
create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  college_id  uuid not null references public.colleges (id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 120),
  code        text not null check (code ~ '^[A-Za-z0-9&.\- ]{1,12}$'),
  slug        text not null check (slug ~ '^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,39}$'),
  description text check (char_length(description) <= 2000),
  image_url   text,
  head_name   text check (char_length(head_name) <= 120),
  show_head   boolean not null default true,
  status      text not null default 'active' check (status in ('active', 'hidden')),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (college_id, slug),
  unique (id, college_id)          -- target for composite foreign keys below
);
create index departments_college_idx on public.departments (college_id, sort_order);

-- ---------------------------------------------------------------------
-- Admins (college admins and department admins)
-- ---------------------------------------------------------------------
create table public.admins (
  id            uuid primary key default gen_random_uuid(),
  college_id    uuid not null references public.colleges (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 120),
  email         text not null,
  role          public.admin_role not null,
  department_id uuid,
  status        text not null default 'active' check (status in ('active', 'disabled')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (college_id, user_id),
  -- a department admin must belong to a department of the SAME college
  foreign key (department_id, college_id) references public.departments (id, college_id) on delete restrict,
  check ((role = 'department_admin' and department_id is not null)
      or (role = 'college_admin' and department_id is null))
);
create index admins_user_idx on public.admins (user_id);

-- ---------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------
create table public.college_counters (
  college_id uuid not null references public.colleges (id) on delete cascade,
  year       integer not null,
  last_ref   integer not null default 0,
  primary key (college_id, year)
);

create table public.announcements (
  id              uuid primary key default gen_random_uuid(),
  college_id      uuid not null references public.colleges (id) on delete cascade,
  department_id   uuid,
  ref_no          integer,
  ref_year        integer,
  title           text not null check (char_length(title) between 3 and 200),
  description     text not null default '' check (char_length(description) <= 20000),
  category        text not null default 'general' check (category ~ '^[a-z][a-z0-9-]{1,39}$'),
  scope           public.content_scope not null default 'college',
  attachment_url  text,
  attachment_name text,
  image_url       text,
  is_urgent       boolean not null default false,
  is_pinned       boolean not null default false,
  status          public.content_status not null default 'published',
  published_at    timestamptz not null default now(),
  expires_at      timestamptz,
  view_count      integer not null default 0,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  search          tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored,
  foreign key (department_id, college_id) references public.departments (id, college_id) on delete cascade,
  check ((scope = 'college' and department_id is null) or (scope = 'department' and department_id is not null)),
  check (expires_at is null or expires_at > published_at)
);
create index announcements_feed_idx on public.announcements (college_id, status, published_at desc);
create index announcements_dept_idx on public.announcements (department_id, published_at desc);
create index announcements_search_idx on public.announcements using gin (search);

-- ---------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------
create table public.events (
  id                uuid primary key default gen_random_uuid(),
  college_id        uuid not null references public.colleges (id) on delete cascade,
  department_id     uuid,
  scope             public.content_scope not null default 'college',
  title             text not null check (char_length(title) between 3 and 200),
  description       text not null default '' check (char_length(description) <= 20000),
  venue             text check (char_length(venue) <= 200),
  organizer         text check (char_length(organizer) <= 200),
  starts_at         timestamptz not null,
  ends_at           timestamptz,
  image_url         text,
  registration_url  text check (registration_url ~ '^https?://'),
  attachment_url    text,
  attachment_name   text,
  countdown_enabled boolean not null default true,
  status            public.content_status not null default 'published',
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (department_id, college_id) references public.departments (id, college_id) on delete cascade,
  check ((scope = 'college' and department_id is null) or (scope = 'department' and department_id is not null)),
  check (ends_at is null or ends_at > starts_at)
);
create index events_college_idx on public.events (college_id, status, starts_at);
create index events_dept_idx on public.events (department_id, starts_at);

-- ---------------------------------------------------------------------
-- Notifications and activity
-- ---------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  college_id uuid references public.colleges (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null,
  title      text not null,
  message    text,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

create table public.activity_logs (
  id          bigint generated always as identity primary key,
  college_id  uuid references public.colleges (id) on delete cascade,
  admin_id    uuid references auth.users (id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  summary     text,
  created_at  timestamptz not null default now()
);
create index activity_logs_college_idx on public.activity_logs (college_id, created_at desc);

-- =====================================================================
-- Authorisation helpers
-- SECURITY DEFINER so policies can consult admins/platform_admins without
-- recursive RLS evaluation. They only ever answer about auth.uid().
-- =====================================================================
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

create or replace function public.is_college_member(p_college uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where college_id = p_college and user_id = (select auth.uid()) and status = 'active'
  );
$$;

create or replace function public.is_college_admin(p_college uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where college_id = p_college and user_id = (select auth.uid())
      and status = 'active' and role = 'college_admin'
  );
$$;

-- College admins manage everything in their college; department admins
-- only rows whose department_id is their own department.
create or replace function public.can_manage_content(p_college uuid, p_department uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin()
      or public.is_college_admin(p_college)
      or (p_department is not null and exists (
            select 1 from public.admins
            where college_id = p_college and user_id = (select auth.uid())
              and status = 'active' and role = 'department_admin'
              and department_id = p_department));
$$;

create or replace function public.college_is_public(p_college uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.colleges where id = p_college and status = 'active');
$$;

create or replace function public.department_is_public(p_department uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.departments where id = p_department and status = 'active');
$$;

create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

-- =====================================================================
-- Triggers
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger colleges_updated_at before update on public.colleges for each row execute function public.set_updated_at();
create trigger onboarding_updated_at before update on public.college_onboarding for each row execute function public.set_updated_at();
create trigger departments_updated_at before update on public.departments for each row execute function public.set_updated_at();
create trigger admins_updated_at before update on public.admins for each row execute function public.set_updated_at();
create trigger announcements_updated_at before update on public.announcements for each row execute function public.set_updated_at();
create trigger events_updated_at before update on public.events for each row execute function public.set_updated_at();

-- Rows can never be moved between tenants, and authorship cannot be rewritten.
create or replace function public.guard_tenant_row()
returns trigger language plpgsql as $$
begin
  if new.college_id is distinct from old.college_id then
    raise exception 'college_id cannot be changed' using errcode = '42501';
  end if;
  if tg_table_name in ('announcements', 'events') and new.created_by is distinct from old.created_by then
    new.created_by = old.created_by;
  end if;
  return new;
end $$;

create trigger departments_guard before update on public.departments for each row execute function public.guard_tenant_row();
create trigger admins_guard before update on public.admins for each row execute function public.guard_tenant_row();
create trigger announcements_guard before update on public.announcements for each row execute function public.guard_tenant_row();
create trigger events_guard before update on public.events for each row execute function public.guard_tenant_row();

-- College admins may edit their profile, but not their identity, status or verification.
create or replace function public.guard_college_update()
returns trigger language plpgsql as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') or public.is_platform_admin() then
    return new;
  end if;
  if new.slug is distinct from old.slug
     or new.status is distinct from old.status
     or new.verification_status is distinct from old.verification_status
     or new.verification_method is distinct from old.verification_method
     or new.verified_at is distinct from old.verified_at
     or new.published_at is distinct from old.published_at
     or new.website_domain is distinct from old.website_domain
     or new.official_website is distinct from old.official_website
     or new.official_email is distinct from old.official_email
     or new.is_demo is distinct from old.is_demo
     or new.status_reason is distinct from old.status_reason then
    raise exception 'Only NotifyHub can change verification, address or status fields' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger colleges_guard before update on public.colleges for each row execute function public.guard_college_update();

-- Stamp authorship and give each announcement a circular number per college per year (e.g. 14/2026).
create or replace function public.announcement_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_year integer := extract(year from coalesce(new.published_at, now()) at time zone 'Asia/Kolkata')::integer;
begin
  if new.created_by is null then
    new.created_by = auth.uid();
  end if;
  insert into public.college_counters as c (college_id, year, last_ref)
  values (new.college_id, v_year, 1)
  on conflict (college_id, year) do update set last_ref = c.last_ref + 1
  returning last_ref into new.ref_no;
  new.ref_year = v_year;
  return new;
end $$;

create trigger announcements_before_insert before insert on public.announcements
  for each row execute function public.announcement_before_insert();

create or replace function public.event_before_insert()
returns trigger language plpgsql as $$
begin
  if new.created_by is null then
    new.created_by = auth.uid();
  end if;
  return new;
end $$;

create trigger events_before_insert before insert on public.events
  for each row execute function public.event_before_insert();

-- A college must always keep at least one active college admin.
-- SECURITY INVOKER on purpose: current_user must be the API role, and a college
-- admin's own RLS view of `admins` already covers their whole college.
create or replace function public.keep_one_college_admin()
returns trigger language plpgsql set search_path = public as $$
declare
  v_remaining integer;
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return coalesce(new, old);
  end if;
  if old.role = 'college_admin' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'college_admin' or new.status <> 'active') then
    select count(*) into v_remaining from public.admins
    where college_id = old.college_id and role = 'college_admin' and status = 'active' and id <> old.id;
    if v_remaining = 0 then
      raise exception 'A college needs at least one active college admin' using errcode = '23514';
    end if;
  end if;
  return coalesce(new, old);
end $$;

create trigger admins_keep_one before update or delete on public.admins
  for each row execute function public.keep_one_college_admin();

-- Activity log written by the database, so it cannot be skipped or forged by clients.
create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_action text := lower(tg_op);
  v_college uuid;
begin
  v_college := case when tg_table_name = 'colleges' then (v_row ->> 'id')::uuid else (v_row ->> 'college_id')::uuid end;
  -- rows removed by a cascading college deletion: nothing left to log against
  if tg_op = 'DELETE' and not exists (select 1 from public.colleges where id = v_college) then
    return old;
  end if;
  if tg_op = 'UPDATE' and tg_table_name = 'colleges' then
    if new.status is distinct from old.status then
      v_action := 'status:' || new.status::text;
    elsif new.verification_status is distinct from old.verification_status then
      v_action := 'verification:' || new.verification_status::text;
    else
      v_action := 'profile_update';
    end if;
  elsif tg_op = 'UPDATE' and tg_table_name in ('announcements', 'events')
        and (to_jsonb(new) ->> 'status') is distinct from (to_jsonb(old) ->> 'status') then
    v_action := 'status:' || (to_jsonb(new) ->> 'status');
  end if;

  insert into public.activity_logs (college_id, admin_id, action, entity_type, entity_id, summary)
  values (
    v_college, auth.uid(), v_action, tg_table_name, (v_row ->> 'id')::uuid,
    left(coalesce(v_row ->> 'title', v_row ->> 'name', v_row ->> 'email'), 200)
  );
  return coalesce(new, old);
end $$;

create trigger announcements_activity after insert or update or delete on public.announcements
  for each row execute function public.log_activity();
create trigger events_activity after insert or update or delete on public.events
  for each row execute function public.log_activity();
create trigger departments_activity after insert or update or delete on public.departments
  for each row execute function public.log_activity();
create trigger admins_activity after insert or update or delete on public.admins
  for each row execute function public.log_activity();
create trigger colleges_activity after insert or update on public.colleges
  for each row execute function public.log_activity();

-- In-platform notifications for college admins.
create or replace function public.notify_on_department_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' and new.scope = 'department' then
    insert into public.notifications (college_id, user_id, type, title, message, link)
    select new.college_id, a.user_id, 'department_post',
           case when new.is_urgent then 'Urgent notice posted by ' else 'New notice from ' end || d.code,
           new.title, '/admin/announcements/' || new.id || '/edit'
    from public.admins a
    join public.departments d on d.id = new.department_id
    where a.college_id = new.college_id and a.role = 'college_admin' and a.status = 'active'
      and a.user_id is distinct from new.created_by;
  end if;
  return new;
end $$;

create trigger announcements_notify after insert on public.announcements
  for each row execute function public.notify_on_department_post();

create or replace function public.notify_on_college_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('active', 'suspended', 'rejected') then
    insert into public.notifications (college_id, user_id, type, title, message, link)
    select new.id, a.user_id, 'college_status',
           case new.status
             when 'active' then 'Your portal is live'
             when 'suspended' then 'Your portal has been suspended'
             else 'Your college registration was not approved' end,
           new.status_reason, '/admin'
    from public.admins a
    where a.college_id = new.id and a.role = 'college_admin' and a.status = 'active';
  end if;
  return new;
end $$;

create trigger colleges_notify after update on public.colleges
  for each row execute function public.notify_on_college_status();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.platform_admins     enable row level security;
alter table public.platform_settings   enable row level security;
alter table public.colleges            enable row level security;
alter table public.college_onboarding  enable row level security;
alter table public.website_analysis    enable row level security;
alter table public.verification_tokens enable row level security;
alter table public.departments         enable row level security;
alter table public.admins              enable row level security;
alter table public.college_counters    enable row level security;
alter table public.announcements       enable row level security;
alter table public.events              enable row level security;
alter table public.notifications       enable row level security;
alter table public.activity_logs       enable row level security;

-- Defence in depth: anonymous visitors can never write, and never see private tables at all.
revoke insert, update, delete, truncate on all tables in schema public from anon;
revoke all on public.platform_admins, public.platform_settings, public.college_onboarding,
  public.website_analysis, public.verification_tokens, public.college_counters,
  public.admins, public.notifications, public.activity_logs from anon;

-- platform_admins / platform_settings
create policy "platform admins read own row" on public.platform_admins
  for select to authenticated using (user_id = (select auth.uid()));
create policy "platform admins read settings" on public.platform_settings
  for select to authenticated using (public.is_platform_admin());
create policy "platform admins update settings" on public.platform_settings
  for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

-- colleges
create policy "public reads active colleges" on public.colleges
  for select to anon, authenticated using (status = 'active');
create policy "members read own college" on public.colleges
  for select to authenticated using (public.is_college_member(id));
create policy "college admins update own college" on public.colleges
  for update to authenticated using (public.is_college_admin(id)) with check (public.is_college_admin(id));
create policy "platform admins manage colleges" on public.colleges
  for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

-- private onboarding tables: platform admins only (the app uses the service role during onboarding)
create policy "platform admins read onboarding" on public.college_onboarding
  for select to authenticated using (public.is_platform_admin());
create policy "platform admins read analysis" on public.website_analysis
  for select to authenticated using (public.is_platform_admin());
create policy "platform admins read verification" on public.verification_tokens
  for select to authenticated using (public.is_platform_admin());

-- departments
create policy "public reads active departments" on public.departments
  for select to anon, authenticated using (status = 'active' and public.college_is_public(college_id));
create policy "members read departments" on public.departments
  for select to authenticated using (public.is_college_member(college_id) or public.is_platform_admin());
create policy "college admins insert departments" on public.departments
  for insert to authenticated with check (public.is_college_admin(college_id) or public.is_platform_admin());
create policy "college admins update departments" on public.departments
  for update to authenticated
  using (public.is_college_admin(college_id) or public.is_platform_admin())
  with check (public.is_college_admin(college_id) or public.is_platform_admin());
create policy "college admins delete departments" on public.departments
  for delete to authenticated using (public.is_college_admin(college_id) or public.is_platform_admin());

-- admins
create policy "admins read self and college admins read team" on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_college_admin(college_id) or public.is_platform_admin());
create policy "college admins insert team" on public.admins
  for insert to authenticated with check (public.is_college_admin(college_id) or public.is_platform_admin());
create policy "college admins update team" on public.admins
  for update to authenticated
  using (public.is_college_admin(college_id) or public.is_platform_admin())
  with check (public.is_college_admin(college_id) or public.is_platform_admin());
create policy "college admins remove team" on public.admins
  for delete to authenticated using (public.is_college_admin(college_id) or public.is_platform_admin());

-- announcements
create policy "public reads live announcements" on public.announcements
  for select to anon, authenticated
  using (
    status = 'published' and published_at <= now()
    and (expires_at is null or expires_at > now())
    and public.college_is_public(college_id)
    and (department_id is null or public.department_is_public(department_id))
  );
create policy "members read all college announcements" on public.announcements
  for select to authenticated using (public.is_college_member(college_id) or public.is_platform_admin());
create policy "authorised admins create announcements" on public.announcements
  for insert to authenticated
  with check (public.can_manage_content(college_id, department_id) and created_by = (select auth.uid()));
create policy "authorised admins update announcements" on public.announcements
  for update to authenticated
  using (public.can_manage_content(college_id, department_id))
  with check (public.can_manage_content(college_id, department_id));
create policy "authorised admins delete announcements" on public.announcements
  for delete to authenticated using (public.can_manage_content(college_id, department_id));

-- events
create policy "public reads published events" on public.events
  for select to anon, authenticated
  using (
    status = 'published' and public.college_is_public(college_id)
    and (department_id is null or public.department_is_public(department_id))
  );
create policy "members read all college events" on public.events
  for select to authenticated using (public.is_college_member(college_id) or public.is_platform_admin());
create policy "authorised admins create events" on public.events
  for insert to authenticated
  with check (public.can_manage_content(college_id, department_id) and created_by = (select auth.uid()));
create policy "authorised admins update events" on public.events
  for update to authenticated
  using (public.can_manage_content(college_id, department_id))
  with check (public.can_manage_content(college_id, department_id));
create policy "authorised admins delete events" on public.events
  for delete to authenticated using (public.can_manage_content(college_id, department_id));

-- notifications: each admin sees and marks only their own
create policy "users read own notifications" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "users mark own notifications" on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- activity logs: read-only, written by triggers
create policy "college admins read activity" on public.activity_logs
  for select to authenticated using (public.is_college_admin(college_id) or public.is_platform_admin());

-- =====================================================================
-- RPCs
-- =====================================================================

-- Public search. SECURITY INVOKER: RLS still applies to the caller.
create or replace function public.search_announcements(
  p_college    uuid,
  p_query      text default null,
  p_category   text default null,
  p_department uuid default null,
  p_urgent     boolean default null,
  p_scope      text default null,
  p_sort       text default 'latest',
  p_limit      integer default 20,
  p_offset     integer default 0
)
returns table (
  id uuid, ref_no integer, ref_year integer, title text, description text, category text, scope public.content_scope,
  department_id uuid, department_name text, department_code text, department_slug text,
  attachment_url text, image_url text, is_urgent boolean, is_pinned boolean,
  published_at timestamptz, expires_at timestamptz, total_count bigint
)
language sql stable security invoker set search_path = public as $$
  with q as (
    select nullif(trim(p_query), '') as text,
           '%' || replace(replace(replace(coalesce(trim(p_query), ''), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  )
  select a.id, a.ref_no, a.ref_year, a.title, left(a.description, 400), a.category, a.scope,
         a.department_id, d.name, d.code, d.slug,
         a.attachment_url, a.image_url, a.is_urgent, a.is_pinned,
         a.published_at, a.expires_at, count(*) over ()
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

-- View counter callable by anonymous visitors, only for publicly visible announcements.
create or replace function public.record_announcement_view(p_id uuid)
returns void language sql volatile security definer set search_path = public as $$
  update public.announcements a
  set view_count = view_count + 1
  where a.id = p_id and a.status = 'published' and a.published_at <= now()
    and (a.expires_at is null or a.expires_at > now())
    and public.college_is_public(a.college_id);
$$;

-- Subdomain availability (slugs are public by nature: they are hostnames).
create or replace function public.slug_available(p_slug text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_slug ~ '^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,39}$'
     and not exists (select 1 from public.colleges where slug = lower(p_slug));
$$;

-- College analytics for the admin dashboard. Invoker: members only see their own college.
create or replace function public.college_analytics(p_college uuid)
returns jsonb language sql stable security invoker set search_path = public as $$
  select case when not (public.is_college_member(p_college) or public.is_platform_admin()) then null else
  jsonb_build_object(
    'total_announcements', (select count(*) from public.announcements where college_id = p_college and status <> 'archived'),
    'announcements_this_month', (select count(*) from public.announcements where college_id = p_college
        and published_at >= date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'),
    'urgent_live', (select count(*) from public.announcements where college_id = p_college and is_urgent
        and status = 'published' and (expires_at is null or expires_at > now())),
    'active_events', (select count(*) from public.events where college_id = p_college and status = 'published'
        and coalesce(ends_at, starts_at + interval '3 hours') >= now()),
    'departments', (select count(*) from public.departments where college_id = p_college),
    'total_views', (select coalesce(sum(view_count), 0) from public.announcements where college_id = p_college),
    'most_viewed', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select id, title, view_count, published_at from public.announcements
        where college_id = p_college and status = 'published' order by view_count desc, published_at desc limit 5) t),
    'department_activity', (select coalesce(jsonb_agg(t order by t.posts desc, t.name), '[]'::jsonb) from (
        select d.id, d.name, d.code,
               (select count(*) from public.announcements a where a.department_id = d.id
                  and a.published_at >= now() - interval '30 days') as posts,
               (select count(*) from public.events e where e.department_id = d.id
                  and e.created_at >= now() - interval '30 days') as events
        from public.departments d where d.college_id = p_college) t)
  ) end;
$$;

create or replace function public.platform_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'total', (select count(*) from public.colleges where status <> 'onboarding'),
    'verified', (select count(*) from public.colleges where verification_status = 'verified'),
    'pending', (select count(*) from public.colleges where status = 'pending_review'),
    'active', (select count(*) from public.colleges where status = 'active'),
    'suspended', (select count(*) from public.colleges where status = 'suspended'),
    'onboarding', (select count(*) from public.colleges where status = 'onboarding'),
    'announcements', (select count(*) from public.announcements),
    'events', (select count(*) from public.events)
  );
end $$;

revoke execute on function public.platform_stats() from anon;
revoke execute on function public.college_analytics(uuid) from anon;
grant execute on function public.search_announcements(uuid, text, text, uuid, boolean, text, text, integer, integer) to anon, authenticated;
grant execute on function public.record_announcement_view(uuid) to anon, authenticated;
grant execute on function public.slug_available(text) to anon, authenticated;

-- =====================================================================
-- Realtime: public pages subscribe to these tables; RLS decides what each
-- subscriber receives.
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.announcements, public.events, public.notifications;
  end if;
end $$;

-- =====================================================================
-- Storage: one public-read bucket, files grouped by college id.
--   <college_id>/<kind>/<random>-<filename>
-- Size and type limits are enforced by the bucket itself.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'college-files', 'college-files', true, 10485760,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do nothing;

create policy "members upload into own college folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'college-files'
    and public.is_college_member(public.try_uuid((storage.foldername(name))[1]))
  );
create policy "uploader or college admin can replace" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'college-files'
    and (owner = (select auth.uid()) or public.is_college_admin(public.try_uuid((storage.foldername(name))[1])))
  );
create policy "uploader or college admin can delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'college-files'
    and (owner = (select auth.uid()) or public.is_college_admin(public.try_uuid((storage.foldername(name))[1])))
  );

-- Lets a portal explain why it is unavailable ("suspended", "pending_review")
-- without exposing any other data about a non-public college.
create or replace function public.portal_status(p_slug text)
returns text language sql stable security definer set search_path = public as $$
  select status::text from public.colleges where slug = lower(p_slug);
$$;
grant execute on function public.portal_status(text) to anon, authenticated;

-- Abandoned onboardings hold a slug reservation; release them after 7 days.
-- Schedule with pg_cron:  select cron.schedule('nh-cleanup', '17 3 * * *', 'select public.cleanup_abandoned_onboarding()');
create or replace function public.cleanup_abandoned_onboarding()
returns integer language sql volatile security definer set search_path = public as $$
  with gone as (
    delete from public.colleges c
    using public.college_onboarding o
    where o.college_id = c.id and c.status = 'onboarding' and o.expires_at < now()
    returning c.id
  )
  select count(*)::integer from gone;
$$;
revoke execute on function public.cleanup_abandoned_onboarding() from public, anon, authenticated;

-- Lookup used only by the server (service role) when a college admin adds a
-- teammate who may already have a NotifyHub account.
create or replace function public.auth_user_id(p_email text)
returns uuid language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke execute on function public.auth_user_id(text) from public, anon, authenticated;
