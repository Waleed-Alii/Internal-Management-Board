create table if not exists public.tickets (
  id text primary key,
  title text not null,
  description text not null default '',
  owner text not null,
  owner_username text not null,
  assigned_to text not null default '',
  assigned_to_username text not null default '',
  priority text not null default '',
  project text not null default '',
  tag text not null default '',
  status text not null default 'todo',
  due text not null default 'Unscheduled',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  estimate text not null default '',
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.tickets
add column if not exists assigned_to text not null default '';

alter table if exists public.tickets
add column if not exists assigned_to_username text not null default '';

create table if not exists public.epics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null references public.tickets(id) on delete cascade,
  author text not null,
  author_username text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  username text primary key,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_username_valid check (char_length(username) between 1 and 256),
  constraint user_preferences_size_valid check (octet_length(preferences::text) <= 800000)
);

create index if not exists tickets_status_idx on public.tickets(status);
create index if not exists tickets_owner_username_idx on public.tickets(owner_username);
create index if not exists tickets_assigned_to_username_idx on public.tickets(assigned_to_username);
create unique index if not exists epics_name_lower_idx on public.epics (lower(name));
create index if not exists ticket_comments_ticket_id_idx on public.ticket_comments(ticket_id);
create index if not exists tickets_created_at_idx on public.tickets(created_at);

create sequence if not exists public.aqma_ticket_number_seq;

do $$
declare
  maximum_ticket_number bigint;
  current_sequence_number bigint;
  sequence_was_called boolean;
begin
  select coalesce(max(substring(upper(id) from '^AQMA-([0-9]+)$')::bigint), 0)
  into maximum_ticket_number
  from public.tickets;

  select last_value, is_called
  into current_sequence_number, sequence_was_called
  from public.aqma_ticket_number_seq;

  if sequence_was_called then
    maximum_ticket_number := greatest(maximum_ticket_number, current_sequence_number);
  end if;

  if maximum_ticket_number > 0 then
    perform setval('public.aqma_ticket_number_seq', maximum_ticket_number, true);
  else
    perform setval('public.aqma_ticket_number_seq', 1, false);
  end if;
end;
$$;

create or replace function public.allocate_aqma_ticket_id()
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select 'AQMA-' || lpad(nextval('public.aqma_ticket_number_seq')::text, 4, '0');
$$;

revoke all on function public.allocate_aqma_ticket_id() from public;
grant execute on function public.allocate_aqma_ticket_id() to service_role;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tickets_status_valid') then
    alter table public.tickets add constraint tickets_status_valid
      check (status in ('todo', 'progress', 'assistance', 'blocked', 'done', 'backlog')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tickets_priority_valid') then
    alter table public.tickets add constraint tickets_priority_valid
      check (lower(priority) in ('low', 'medium', 'high')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tickets_text_lengths_valid') then
    alter table public.tickets add constraint tickets_text_lengths_valid
      check (
        char_length(title) <= 200 and
        char_length(description) <= 20000 and
        char_length(owner) <= 200 and
        char_length(assigned_to) <= 200 and
        char_length(project) <= 120 and
        char_length(tag) <= 80
      ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ticket_comments_body_length_valid') then
    alter table public.ticket_comments add constraint ticket_comments_body_length_valid
      check (char_length(body) between 1 and 5000) not valid;
  end if;
end;
$$;

alter table public.tickets enable row level security;
alter table public.epics enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.user_preferences enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at
before update on public.tickets
for each row
execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row
execute function public.set_updated_at();
