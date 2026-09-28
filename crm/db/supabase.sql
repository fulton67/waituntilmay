-- Supabase-only setup. Run once in the SQL editor AFTER `npm run crm:migrate`.
-- (Kept out of drizzle migrations because PGlite has no auth/storage schemas.)

-- 1. Row-level security. The app itself connects as the postgres role via DATABASE_URL and is
--    not affected; these policies only govern the anon/authenticated keys used by the browser
--    for Realtime and Storage. Only interviewers (rows created on allowlisted sign-in) can read.
create or replace function public.crm_is_interviewer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.interviewers where lower(email) = lower(auth.jwt() ->> 'email'))
$$;

do $$
declare t text;
begin
  foreach t in array array['interviewers','candidates','candidate_skills','areas','candidate_areas','interviews','notes','activity'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists crm_read on public.%I', t);
    execute format('create policy crm_read on public.%I for select to authenticated using (public.crm_is_interviewer())', t);
  end loop;
end $$;

-- 2. Realtime: broadcast changes on the four live tables.
alter publication supabase_realtime add table public.interviews, public.notes, public.candidates, public.activity;

-- 3. Storage: private "resumes" bucket, PDF only, 10 MB max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 10485760, array['application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists crm_resumes_read on storage.objects;
create policy crm_resumes_read on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and public.crm_is_interviewer());
drop policy if exists crm_resumes_write on storage.objects;
create policy crm_resumes_write on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and public.crm_is_interviewer());
