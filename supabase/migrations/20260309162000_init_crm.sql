create extension if not exists pgcrypto;

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'standard_user' check (role in ('admin', 'commercial', 'standard_user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector text default 'Food Ingredients',
  city text,
  country text,
  website text,
  notes text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text unique,
  phone text,
  job_title text,
  notes text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null unique,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text default 'Unknown',
  status text not null default 'open' check (status in ('open', 'won', 'lost')),
  estimated_value numeric(12,2) not null default 0,
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  current_stage_id uuid references public.pipeline_stages(id) on delete set null,
  last_activity_at timestamptz,
  owner_id uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_stage_id uuid references public.pipeline_stages(id) on delete set null,
  to_stage_id uuid not null references public.pipeline_stages(id) on delete restrict,
  changed_by uuid references public.profiles(id) on delete set null,
  comment text,
  changed_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  due_date timestamptz,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  assigned_to uuid references public.profiles(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  event_type text not null check (event_type in ('welcome', 'followup', 'custom')),
  subject text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  template_id uuid references public.email_templates(id) on delete set null,
  recipient_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_companies_owner_id on public.companies(owner_id);
create index if not exists idx_contacts_company_id on public.contacts(company_id);
create index if not exists idx_contacts_owner_id on public.contacts(owner_id);
create index if not exists idx_leads_owner_id on public.leads(owner_id);
create index if not exists idx_leads_assigned_to on public.leads(assigned_to);
create index if not exists idx_leads_current_stage_id on public.leads(current_stage_id);
create index if not exists idx_lead_stage_history_lead_id on public.lead_stage_history(lead_id);
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_email_logs_recipient_email on public.email_logs(recipient_email);
create index if not exists idx_email_logs_status on public.email_logs(status);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.tg_set_updated_at();

drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at
before update on public.companies
for each row
execute function public.tg_set_updated_at();

drop trigger if exists trg_contacts_updated_at on public.contacts;
create trigger trg_contacts_updated_at
before update on public.contacts
for each row
execute function public.tg_set_updated_at();

drop trigger if exists trg_pipeline_stages_updated_at on public.pipeline_stages;
create trigger trg_pipeline_stages_updated_at
before update on public.pipeline_stages
for each row
execute function public.tg_set_updated_at();

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
before update on public.leads
for each row
execute function public.tg_set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row
execute function public.tg_set_updated_at();

drop trigger if exists trg_email_templates_updated_at on public.email_templates;
create trigger trg_email_templates_updated_at
before update on public.email_templates
for each row
execute function public.tg_set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'standard_user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.set_default_lead_stage()
returns trigger
language plpgsql
as $$
begin
  if new.current_stage_id is null then
    select id into new.current_stage_id
    from public.pipeline_stages
    order by sort_order asc
    limit 1;
  end if;
  if new.owner_id is null then
    new.owner_id = auth.uid();
  end if;
  if new.last_activity_at is null then
    new.last_activity_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_default_lead_stage on public.leads;
create trigger trg_set_default_lead_stage
before insert on public.leads
for each row
execute function public.set_default_lead_stage();

create or replace function public.log_lead_stage_change()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.lead_stage_history (lead_id, from_stage_id, to_stage_id, changed_by, comment)
    values (new.id, null, new.current_stage_id, auth.uid(), 'Initial stage');
    return new;
  end if;

  if (tg_op = 'UPDATE' and old.current_stage_id is distinct from new.current_stage_id) then
    insert into public.lead_stage_history (lead_id, from_stage_id, to_stage_id, changed_by, comment)
    values (new.id, old.current_stage_id, new.current_stage_id, auth.uid(), 'Stage updated');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_lead_stage_change on public.leads;
create trigger trg_log_lead_stage_change
after insert or update on public.leads
for each row
execute function public.log_lead_stage_change();

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.leads enable row level security;
alter table public.lead_stage_history enable row level security;
alter table public.tasks enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_logs enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "companies_rw_for_members" on public.companies;
create policy "companies_rw_for_members"
on public.companies for all
using (
  auth.role() = 'authenticated' and
  (owner_id = auth.uid() or owner_id is null or public.is_admin(auth.uid()))
)
with check (
  auth.role() = 'authenticated' and
  (owner_id = auth.uid() or owner_id is null or public.is_admin(auth.uid()))
);

drop policy if exists "contacts_rw_for_members" on public.contacts;
create policy "contacts_rw_for_members"
on public.contacts for all
using (
  auth.role() = 'authenticated' and
  (owner_id = auth.uid() or owner_id is null or public.is_admin(auth.uid()))
)
with check (
  auth.role() = 'authenticated' and
  (owner_id = auth.uid() or owner_id is null or public.is_admin(auth.uid()))
);

drop policy if exists "pipeline_stages_read_authenticated" on public.pipeline_stages;
create policy "pipeline_stages_read_authenticated"
on public.pipeline_stages for select
using (auth.role() = 'authenticated');

drop policy if exists "pipeline_stages_admin_write" on public.pipeline_stages;
create policy "pipeline_stages_admin_write"
on public.pipeline_stages for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "leads_rw_for_members" on public.leads;
create policy "leads_rw_for_members"
on public.leads for all
using (
  auth.role() = 'authenticated' and
  (owner_id = auth.uid() or assigned_to = auth.uid() or public.is_admin(auth.uid()))
)
with check (
  auth.role() = 'authenticated' and
  (owner_id = auth.uid() or assigned_to = auth.uid() or public.is_admin(auth.uid()))
);

drop policy if exists "lead_stage_history_read_members" on public.lead_stage_history;
create policy "lead_stage_history_read_members"
on public.lead_stage_history for select
using (
  auth.role() = 'authenticated' and
  exists (
    select 1 from public.leads l
    where l.id = lead_stage_history.lead_id
    and (l.owner_id = auth.uid() or l.assigned_to = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "lead_stage_history_insert_members" on public.lead_stage_history;
create policy "lead_stage_history_insert_members"
on public.lead_stage_history for insert
with check (
  auth.role() = 'authenticated' and
  exists (
    select 1 from public.leads l
    where l.id = lead_stage_history.lead_id
    and (l.owner_id = auth.uid() or l.assigned_to = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "tasks_rw_for_members" on public.tasks;
create policy "tasks_rw_for_members"
on public.tasks for all
using (
  auth.role() = 'authenticated' and
  (owner_id = auth.uid() or assigned_to = auth.uid() or public.is_admin(auth.uid()))
)
with check (
  auth.role() = 'authenticated' and
  (owner_id = auth.uid() or assigned_to = auth.uid() or public.is_admin(auth.uid()))
);

drop policy if exists "email_templates_read_authenticated" on public.email_templates;
create policy "email_templates_read_authenticated"
on public.email_templates for select
using (auth.role() = 'authenticated');

drop policy if exists "email_templates_admin_write" on public.email_templates;
create policy "email_templates_admin_write"
on public.email_templates for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "email_logs_rw_for_members" on public.email_logs;
create policy "email_logs_rw_for_members"
on public.email_logs for all
using (
  auth.role() = 'authenticated' and
  (
    exists (
      select 1 from public.leads l
      where l.id = email_logs.lead_id
      and (l.owner_id = auth.uid() or l.assigned_to = auth.uid() or public.is_admin(auth.uid()))
    )
    or public.is_admin(auth.uid())
  )
)
with check (
  auth.role() = 'authenticated' and
  (
    exists (
      select 1 from public.leads l
      where l.id = email_logs.lead_id
      and (l.owner_id = auth.uid() or l.assigned_to = auth.uid() or public.is_admin(auth.uid()))
    )
    or public.is_admin(auth.uid())
  )
);

insert into public.pipeline_stages (name, sort_order, is_closed)
values
  ('Nouveau lead', 1, false),
  ('Qualification', 2, false),
  ('Echantillon envoye', 3, false),
  ('Devis envoye', 4, false),
  ('Negociation', 5, false),
  ('Gagne', 6, true),
  ('Perdu', 7, true)
on conflict (name) do update
set sort_order = excluded.sort_order,
    is_closed = excluded.is_closed;

insert into public.email_templates (name, event_type, subject, body, is_active)
values
  (
    'Welcome Lead',
    'welcome',
    'Bienvenue - Merci pour votre interet',
    'Bonjour {{name}},\n\nMerci pour votre interet. Notre equipe vous contactera tres vite pour qualifier votre besoin en matieres premieres alimentaires.\n\nCordialement,\nEquipe commerciale',
    true
  ),
  (
    'Followup Devis 72h',
    'followup',
    'Relance de votre devis',
    'Bonjour {{name}},\n\nNous revenons vers vous concernant le devis partage il y a 72h. N hesitez pas a nous confirmer vos questions pour finaliser votre commande.\n\nCordialement,\nEquipe commerciale',
    true
  )
on conflict (name) do update
set event_type = excluded.event_type,
    subject = excluded.subject,
    body = excluded.body,
    is_active = excluded.is_active;
