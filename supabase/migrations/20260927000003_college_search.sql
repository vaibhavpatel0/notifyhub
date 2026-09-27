-- =====================================================================
-- College search, version 2.
--   * Short forms: "vp", "vpcet" and "vp college" all find
--     "VP College of Engineering and Technology"; "vit" finds
--     "Vignan Institute of Technology". Initials are built from the name,
--     keeping all-capital words (VP, IIIT) whole, with and without "of/and/the".
--   * An empty query lists every live college, so students can browse.
--   * Best matches first: exact short name or address, then short-form
--     prefix, then names starting with the words typed.
-- =====================================================================

create or replace function public.college_initials(p_name text, p_keep_small_words boolean)
returns text language sql immutable set search_path = public as $$
  select coalesce(string_agg(
           case when w ~ '^[A-Z0-9]{2,}$' then lower(w) else lower(left(w, 1)) end, '' order by n), '')
  from regexp_split_to_table(regexp_replace(coalesce(p_name, ''), '[^A-Za-z0-9 ]', ' ', 'g'), '\s+') with ordinality as t(w, n)
  where w <> '' and (p_keep_small_words or lower(w) not in ('of', 'and', 'the', 'for', 'in', 'at'));
$$;

drop function if exists public.search_colleges(text, integer);

create or replace function public.search_colleges(p_query text, p_limit integer default 8)
returns table (name text, short_name text, slug text, logo_url text, address text, is_demo boolean, total_count bigint)
language sql stable security invoker set search_path = public as $$
  with q as (
    select lower(trim(coalesce(p_query, ''))) as t,
           regexp_replace(lower(coalesce(p_query, '')), '[^a-z0-9]', '', 'g') as compact
  ),
  words as (
    select '%' || replace(replace(replace(w, '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
    from q, regexp_split_to_table(q.t, '\s+') as w
    where w <> ''
  ),
  c as (
    select c.*,
           public.college_initials(c.name, false) as ini,
           public.college_initials(c.name, true) as ini_all,
           regexp_replace(lower(coalesce(c.short_name, '')), '[^a-z0-9]', '', 'g') as short_compact
    from public.colleges c
    where c.status = 'active' and c.slug is not null
  )
  select c.name, c.short_name, c.slug, c.logo_url, c.address, c.is_demo, count(*) over ()
  from c, q
  where char_length(q.t) <= 100
    and (
      q.t = ''
      -- every word typed appears somewhere (name, short name, address, web address)
      or not exists (
        select 1 from words
        where c.name not ilike words.pattern
          and coalesce(c.short_name, '') not ilike words.pattern
          and coalesce(c.address, '') not ilike words.pattern
          and c.slug not ilike words.pattern
          and coalesce(c.website_domain, '') not ilike words.pattern
      )
      -- or it is the start of a short form: "vp", "vpc", "vpcet", "vit"
      or (q.compact <> '' and (c.ini like q.compact || '%' or c.ini_all like q.compact || '%'
                               or c.short_compact like q.compact || '%' or c.slug like q.compact || '%'))
    )
  order by
    case
      when q.t = '' then 9
      when c.short_compact = q.compact or c.slug = q.compact then 0
      when c.ini = q.compact or c.ini_all = q.compact then 1
      when c.short_compact like q.compact || '%' or c.slug like q.compact || '%' then 2
      when c.ini like q.compact || '%' or c.ini_all like q.compact || '%' then 3
      when lower(c.name) like q.t || '%' then 4
      when lower(c.name) ~ ('(^|\s)' || regexp_replace(q.t, '([^a-z0-9 ])', '\\\1', 'g')) then 5
      else 6
    end,
    c.is_demo asc,
    c.name
  limit least(greatest(p_limit, 1), 50);
$$;

grant execute on function public.search_colleges(text, integer) to anon, authenticated;
