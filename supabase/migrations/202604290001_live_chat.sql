create table if not exists public.live_chat_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.live_chat_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  email text not null,
  role text not null default 'agent' check (role in ('owner', 'admin', 'supervisor', 'agent')),
  status text not null default 'offline' check (status in ('online', 'away', 'offline', 'busy')),
  max_active_chats integer not null default 5 check (max_active_chats > 0),
  is_active boolean not null default true,
  can_view_all_chats boolean not null default false,
  can_manage_settings boolean not null default false,
  can_manage_agents boolean not null default false,
  last_active_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.live_chat_agent_departments (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.live_chat_agents(id) on delete cascade,
  department_id uuid not null references public.live_chat_departments(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (agent_id, department_id)
);

create table if not exists public.live_chat_visitors (
  id uuid primary key default gen_random_uuid(),
  anonymous_token_hash text unique,
  user_id uuid references auth.users(id) on delete set null,
  name text,
  email text,
  phone text,
  company text,
  ip_hash text,
  user_agent text,
  country text,
  city text,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (anonymous_token_hash is not null or user_id is not null)
);

create table if not exists public.live_chat_settings (
  id text primary key default 'default' check (id = 'default'),
  widget_enabled boolean not null default true,
  widget_position text not null default 'bottom-right' check (widget_position in ('bottom-right', 'bottom-left')),
  brand_color text not null default '#1c3d2e',
  welcome_message text not null default 'Hi, how can we help with your trip today?',
  offline_message text not null default 'We are away right now, but send a message and we will reply soon.',
  require_prechat_email boolean not null default true,
  allow_attachments boolean not null default true,
  max_attachment_size_mb integer not null default 5 check (max_attachment_size_mb between 1 and 25),
  sound_enabled boolean not null default true,
  browser_notifications_enabled boolean not null default true,
  business_hours_enabled boolean not null default false,
  auto_assignment_enabled boolean not null default true,
  proactive_chat_enabled boolean not null default true,
  csat_enabled boolean not null default true,
  transcript_enabled boolean not null default true,
  default_department_id uuid references public.live_chat_departments(id) on delete set null,
  auto_close_after_hours integer not null default 72 check (auto_close_after_hours >= 1),
  data_retention_days integer not null default 365 check (data_retention_days >= 30),
  ai_enabled boolean not null default false,
  ai_auto_reply_enabled boolean not null default false,
  ai_suggestions_enabled boolean not null default false,
  ai_handoff_required boolean not null default true,
  typical_reply_minutes integer not null default 15 check (typical_reply_minutes > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.live_chat_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.live_chat_visitors(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  department_id uuid references public.live_chat_departments(id) on delete set null,
  assigned_agent_id uuid references public.live_chat_agents(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'open', 'pending', 'resolved', 'closed', 'spam')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  source text not null default 'website_widget',
  subject text,
  initial_page_url text,
  referrer_url text,
  current_page_url text,
  visitor_name text,
  visitor_email text,
  last_message_preview text,
  last_message_at timestamptz not null default timezone('utc', now()),
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  waiting_since timestamptz,
  unread_by_visitor integer not null default 0 check (unread_by_visitor >= 0),
  unread_by_agents integer not null default 0 check (unread_by_agents >= 0),
  tags text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.live_chat_conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('visitor', 'user', 'agent', 'system', 'bot')),
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_agent_id uuid references public.live_chat_agents(id) on delete set null,
  sender_visitor_id uuid references public.live_chat_visitors(id) on delete set null,
  body text,
  message_type text not null default 'text' check (message_type in ('text', 'image', 'file', 'system', 'note', 'event', 'handoff', 'rating_request')),
  is_internal_note boolean not null default false,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  read_by_visitor_at timestamptz,
  read_by_agent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (body is not null or jsonb_array_length(attachments) > 0 or message_type in ('system', 'event', 'handoff', 'rating_request'))
);

create table if not exists public.live_chat_assignments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.live_chat_conversations(id) on delete cascade,
  agent_id uuid not null references public.live_chat_agents(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assignment_type text not null default 'manual' check (assignment_type in ('manual', 'auto', 'transfer', 'round_robin')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.live_chat_canned_responses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  shortcut text unique,
  body text not null,
  department_id uuid references public.live_chat_departments(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.live_chat_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.live_chat_business_hours (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references public.live_chat_departments(id) on delete cascade,
  timezone text not null default 'UTC',
  weekday integer not null check (weekday between 0 and 6),
  opens_at time not null default '09:00',
  closes_at time not null default '17:00',
  is_closed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (department_id, weekday)
);

create table if not exists public.live_chat_automation_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger_type text not null check (trigger_type in ('page_visit', 'new_conversation', 'first_message', 'offline', 'no_agent_available', 'keyword', 'time_waiting')),
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  priority integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.live_chat_ratings (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.live_chat_conversations(id) on delete cascade,
  visitor_id uuid not null references public.live_chat_visitors(id) on delete cascade,
  agent_id uuid references public.live_chat_agents(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  feedback text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (conversation_id, visitor_id)
);

create table if not exists public.live_chat_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.live_chat_conversations(id) on delete cascade,
  visitor_id uuid references public.live_chat_visitors(id) on delete cascade,
  agent_id uuid references public.live_chat_agents(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.live_chat_typing_indicators (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.live_chat_conversations(id) on delete cascade,
  actor_type text not null check (actor_type in ('visitor', 'user', 'agent', 'bot')),
  actor_id text not null,
  is_typing boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (conversation_id, actor_type, actor_id)
);

create index if not exists live_chat_conversations_status_idx
  on public.live_chat_conversations (status, last_message_at desc);

create index if not exists live_chat_conversations_assigned_agent_idx
  on public.live_chat_conversations (assigned_agent_id, status, last_message_at desc);

create index if not exists live_chat_conversations_department_idx
  on public.live_chat_conversations (department_id, status, last_message_at desc);

create index if not exists live_chat_conversations_last_message_idx
  on public.live_chat_conversations (last_message_at desc);

create index if not exists live_chat_conversations_visitor_idx
  on public.live_chat_conversations (visitor_id, last_message_at desc);

create index if not exists live_chat_conversations_user_idx
  on public.live_chat_conversations (user_id, last_message_at desc);

create index if not exists live_chat_conversations_priority_idx
  on public.live_chat_conversations (priority, status, last_message_at desc);

create index if not exists live_chat_messages_conversation_created_idx
  on public.live_chat_messages (conversation_id, created_at asc);

create index if not exists live_chat_agents_user_idx
  on public.live_chat_agents (user_id);

create index if not exists live_chat_agents_status_idx
  on public.live_chat_agents (status, is_active);

create index if not exists live_chat_visitors_user_idx
  on public.live_chat_visitors (user_id);

create index if not exists live_chat_visitors_token_hash_idx
  on public.live_chat_visitors (anonymous_token_hash);

create index if not exists live_chat_events_conversation_created_idx
  on public.live_chat_events (conversation_id, created_at desc);

create index if not exists live_chat_events_public_created_idx
  on public.live_chat_events (is_public, created_at desc);

create trigger live_chat_departments_set_updated_at
before update on public.live_chat_departments
for each row execute function public.set_updated_at();

create trigger live_chat_agents_set_updated_at
before update on public.live_chat_agents
for each row execute function public.set_updated_at();

create trigger live_chat_visitors_set_updated_at
before update on public.live_chat_visitors
for each row execute function public.set_updated_at();

create trigger live_chat_settings_set_updated_at
before update on public.live_chat_settings
for each row execute function public.set_updated_at();

create trigger live_chat_conversations_set_updated_at
before update on public.live_chat_conversations
for each row execute function public.set_updated_at();

create trigger live_chat_messages_set_updated_at
before update on public.live_chat_messages
for each row execute function public.set_updated_at();

create trigger live_chat_canned_responses_set_updated_at
before update on public.live_chat_canned_responses
for each row execute function public.set_updated_at();

create trigger live_chat_business_hours_set_updated_at
before update on public.live_chat_business_hours
for each row execute function public.set_updated_at();

create trigger live_chat_automation_rules_set_updated_at
before update on public.live_chat_automation_rules
for each row execute function public.set_updated_at();

create or replace function public.live_chat_current_agent_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.id
  from public.live_chat_agents as a
  where a.user_id = auth.uid()
    and a.is_active
  limit 1;
$$;

create or replace function public.live_chat_current_agent_can_view_all()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.live_chat_agents as a
      where a.user_id = auth.uid()
        and a.is_active
        and (
          a.can_view_all_chats
          or a.role in ('owner', 'admin', 'supervisor')
        )
    )
    or public.current_admin_role() in ('super_admin', 'admin'),
    false
  );
$$;

create or replace function public.live_chat_current_agent_can_manage_settings()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.live_chat_agents as a
      where a.user_id = auth.uid()
        and a.is_active
        and (
          a.can_manage_settings
          or a.role in ('owner', 'admin')
        )
    )
    or public.current_admin_role() in ('super_admin', 'admin'),
    false
  );
$$;

create or replace function public.live_chat_current_agent_can_manage_agents()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.live_chat_agents as a
      where a.user_id = auth.uid()
        and a.is_active
        and (
          a.can_manage_agents
          or a.role in ('owner', 'admin')
        )
    )
    or public.current_admin_role() in ('super_admin', 'admin'),
    false
  );
$$;

create or replace function public.live_chat_agent_can_access_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.live_chat_conversations as c
      join public.live_chat_agents as a
        on a.id = public.live_chat_current_agent_id()
      where c.id = target_conversation_id
        and a.is_active
        and (
          public.live_chat_current_agent_can_view_all()
          or c.assigned_agent_id = a.id
          or c.assigned_agent_id is null
          or (
            c.department_id is not null
            and exists (
              select 1
              from public.live_chat_agent_departments as ad
              where ad.agent_id = a.id
                and ad.department_id = c.department_id
            )
          )
        )
    ),
    false
  );
$$;

create or replace function public.live_chat_after_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  message_preview text;
begin
  message_preview := left(coalesce(new.body, case when jsonb_array_length(new.attachments) > 0 then 'Attachment' else new.message_type end), 180);

  if not new.is_internal_note then
    update public.live_chat_conversations
    set
      last_message_at = new.created_at,
      last_message_preview = nullif(message_preview, ''),
      unread_by_agents = case
        when new.sender_type in ('visitor', 'user') then unread_by_agents + 1
        else unread_by_agents
      end,
      unread_by_visitor = case
        when new.sender_type in ('agent', 'bot') then unread_by_visitor + 1
        else unread_by_visitor
      end,
      first_response_at = case
        when new.sender_type = 'agent' and first_response_at is null then new.created_at
        else first_response_at
      end,
      waiting_since = case
        when new.sender_type in ('visitor', 'user') then new.created_at
        else waiting_since
      end,
      status = case
        when status = 'new' and new.sender_type in ('visitor', 'user') then 'open'
        when status = 'pending' and new.sender_type in ('visitor', 'user') then 'open'
        else status
      end,
      updated_at = timezone('utc', now())
    where id = new.conversation_id;
  end if;

  insert into public.live_chat_events (
    conversation_id,
    visitor_id,
    agent_id,
    event_type,
    payload,
    is_public
  )
  select
    c.id,
    c.visitor_id,
    new.sender_agent_id,
    case
      when new.is_internal_note then 'internal_note_created'
      else 'message_created'
    end,
    jsonb_build_object(
      'messageId', new.id,
      'senderType', new.sender_type,
      'messageType', new.message_type,
      'isInternalNote', new.is_internal_note
    ),
    new.sender_type in ('agent', 'bot', 'system') and not new.is_internal_note
  from public.live_chat_conversations as c
  where c.id = new.conversation_id;

  return new;
end;
$$;

create trigger live_chat_messages_after_insert
after insert on public.live_chat_messages
for each row execute function public.live_chat_after_message_insert();

create or replace function public.live_chat_after_conversation_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status
    or old.priority is distinct from new.priority
    or old.assigned_agent_id is distinct from new.assigned_agent_id
    or old.department_id is distinct from new.department_id then
    insert into public.live_chat_events (
      conversation_id,
      visitor_id,
      agent_id,
      event_type,
      payload,
      is_public
    )
    values (
      new.id,
      new.visitor_id,
      new.assigned_agent_id,
      'conversation_updated',
      jsonb_build_object(
        'status', new.status,
        'priority', new.priority,
        'assignedAgentId', new.assigned_agent_id,
        'departmentId', new.department_id
      ),
      old.status is distinct from new.status
    );
  end if;

  return new;
end;
$$;

create trigger live_chat_conversations_after_update
after update on public.live_chat_conversations
for each row execute function public.live_chat_after_conversation_update();

insert into public.live_chat_departments (name, slug, description, sort_order)
values
  ('General Support', 'general-support', 'General travel support and customer questions.', 10),
  ('Sales', 'sales', 'New trip planning, quotes, and booking questions.', 20),
  ('Operations', 'operations', 'Existing bookings, document review, and trip changes.', 30)
on conflict (slug) do nothing;

insert into public.live_chat_settings (id, default_department_id)
select 'default', d.id
from public.live_chat_departments as d
where d.slug = 'general-support'
on conflict (id) do nothing;

insert into public.live_chat_agents (
  user_id,
  display_name,
  email,
  role,
  status,
  can_view_all_chats,
  can_manage_settings,
  can_manage_agents,
  max_active_chats,
  is_active,
  created_at
)
select
  au.id,
  coalesce(nullif(au.full_name, ''), au.email),
  au.email,
  case
    when au.role = 'super_admin' then 'owner'
    when au.role = 'admin' then 'admin'
    else 'agent'
  end,
  'offline',
  au.role in ('super_admin', 'admin'),
  au.role in ('super_admin', 'admin'),
  au.role in ('super_admin', 'admin'),
  case when au.role in ('super_admin', 'admin') then 10 else 5 end,
  au.is_active,
  au.created_at
from public.admin_users as au
where au.role in ('super_admin', 'admin', 'agent', 'support')
on conflict (user_id) do nothing;

insert into public.live_chat_agent_departments (agent_id, department_id)
select a.id, d.id
from public.live_chat_agents as a
cross join public.live_chat_departments as d
where d.slug = 'general-support'
on conflict (agent_id, department_id) do nothing;

insert into public.live_chat_canned_responses (title, shortcut, body)
values
  ('Friendly greeting', '/hello', 'Hi! Thanks for reaching out. I am checking this for you now.'),
  ('Need booking reference', '/booking-ref', 'Could you share your booking reference so I can find the trip details quickly?'),
  ('Closing follow-up', '/close', 'I am glad we could help. I will close this chat for now, but you can reply here if you need anything else.')
on conflict (shortcut) do nothing;

insert into public.live_chat_tags (name, color)
values
  ('booking', '#1c3d2e'),
  ('payment', '#c9a84c'),
  ('visa', '#2563eb'),
  ('urgent', '#dc2626')
on conflict (name) do nothing;

insert into public.live_chat_business_hours (department_id, timezone, weekday, opens_at, closes_at, is_closed)
select d.id, 'Africa/Lagos', weekday, '09:00', '18:00', weekday in (0, 6)
from public.live_chat_departments as d
cross join generate_series(0, 6) as weekday
on conflict (department_id, weekday) do nothing;

alter table public.live_chat_departments enable row level security;
alter table public.live_chat_agents enable row level security;
alter table public.live_chat_agent_departments enable row level security;
alter table public.live_chat_visitors enable row level security;
alter table public.live_chat_settings enable row level security;
alter table public.live_chat_conversations enable row level security;
alter table public.live_chat_messages enable row level security;
alter table public.live_chat_assignments enable row level security;
alter table public.live_chat_canned_responses enable row level security;
alter table public.live_chat_tags enable row level security;
alter table public.live_chat_business_hours enable row level security;
alter table public.live_chat_automation_rules enable row level security;
alter table public.live_chat_ratings enable row level security;
alter table public.live_chat_events enable row level security;
alter table public.live_chat_typing_indicators enable row level security;

create policy "live_chat_departments_public_read"
on public.live_chat_departments
for select
to anon, authenticated
using (is_active or public.live_chat_current_agent_can_manage_settings());

create policy "live_chat_departments_manager_write"
on public.live_chat_departments
for all
to authenticated
using (public.live_chat_current_agent_can_manage_settings())
with check (public.live_chat_current_agent_can_manage_settings());

create policy "live_chat_settings_public_read"
on public.live_chat_settings
for select
to anon, authenticated
using (true);

create policy "live_chat_settings_manager_write"
on public.live_chat_settings
for all
to authenticated
using (public.live_chat_current_agent_can_manage_settings())
with check (public.live_chat_current_agent_can_manage_settings());

create policy "live_chat_agents_team_read"
on public.live_chat_agents
for select
to authenticated
using (public.live_chat_current_agent_id() is not null or user_id = auth.uid());

create policy "live_chat_agents_self_status_update"
on public.live_chat_agents
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "live_chat_agents_manager_write"
on public.live_chat_agents
for all
to authenticated
using (public.live_chat_current_agent_can_manage_agents())
with check (public.live_chat_current_agent_can_manage_agents());

create policy "live_chat_agent_departments_team_read"
on public.live_chat_agent_departments
for select
to authenticated
using (public.live_chat_current_agent_id() is not null);

create policy "live_chat_agent_departments_manager_write"
on public.live_chat_agent_departments
for all
to authenticated
using (public.live_chat_current_agent_can_manage_agents())
with check (public.live_chat_current_agent_can_manage_agents());

create policy "live_chat_visitors_owner_or_agent_read"
on public.live_chat_visitors
for select
to authenticated
using (
  user_id = auth.uid()
  or public.live_chat_current_agent_id() is not null
);

create policy "live_chat_visitors_owner_update"
on public.live_chat_visitors
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "live_chat_conversations_owner_or_agent_read"
on public.live_chat_conversations
for select
to authenticated
using (
  user_id = auth.uid()
  or public.live_chat_agent_can_access_conversation(id)
);

create policy "live_chat_conversations_owner_insert"
on public.live_chat_conversations
for insert
to authenticated
with check (user_id = auth.uid());

create policy "live_chat_conversations_agent_update"
on public.live_chat_conversations
for update
to authenticated
using (public.live_chat_agent_can_access_conversation(id))
with check (public.live_chat_agent_can_access_conversation(id));

create policy "live_chat_messages_owner_or_agent_read"
on public.live_chat_messages
for select
to authenticated
using (
  (
    not is_internal_note
    and exists (
      select 1
      from public.live_chat_conversations as c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  )
  or public.live_chat_agent_can_access_conversation(conversation_id)
);

create policy "live_chat_messages_owner_insert"
on public.live_chat_messages
for insert
to authenticated
with check (
  sender_type = 'user'
  and sender_user_id = auth.uid()
  and not is_internal_note
  and exists (
    select 1
    from public.live_chat_conversations as c
    where c.id = conversation_id
      and c.user_id = auth.uid()
  )
);

create policy "live_chat_messages_agent_insert"
on public.live_chat_messages
for insert
to authenticated
with check (
  sender_type = 'agent'
  and public.live_chat_agent_can_access_conversation(conversation_id)
);

create policy "live_chat_assignments_agent_read"
on public.live_chat_assignments
for select
to authenticated
using (public.live_chat_agent_can_access_conversation(conversation_id));

create policy "live_chat_assignments_agent_insert"
on public.live_chat_assignments
for insert
to authenticated
with check (public.live_chat_agent_can_access_conversation(conversation_id));

create policy "live_chat_canned_responses_agent_read"
on public.live_chat_canned_responses
for select
to authenticated
using (public.live_chat_current_agent_id() is not null and is_active);

create policy "live_chat_canned_responses_manager_write"
on public.live_chat_canned_responses
for all
to authenticated
using (public.live_chat_current_agent_can_manage_settings())
with check (public.live_chat_current_agent_can_manage_settings());

create policy "live_chat_tags_agent_read"
on public.live_chat_tags
for select
to authenticated
using (public.live_chat_current_agent_id() is not null);

create policy "live_chat_tags_manager_write"
on public.live_chat_tags
for all
to authenticated
using (public.live_chat_current_agent_can_manage_settings())
with check (public.live_chat_current_agent_can_manage_settings());

create policy "live_chat_business_hours_public_read"
on public.live_chat_business_hours
for select
to anon, authenticated
using (true);

create policy "live_chat_business_hours_manager_write"
on public.live_chat_business_hours
for all
to authenticated
using (public.live_chat_current_agent_can_manage_settings())
with check (public.live_chat_current_agent_can_manage_settings());

create policy "live_chat_automation_rules_manager_read"
on public.live_chat_automation_rules
for select
to authenticated
using (public.live_chat_current_agent_can_manage_settings());

create policy "live_chat_automation_rules_manager_write"
on public.live_chat_automation_rules
for all
to authenticated
using (public.live_chat_current_agent_can_manage_settings())
with check (public.live_chat_current_agent_can_manage_settings());

create policy "live_chat_ratings_owner_or_agent_read"
on public.live_chat_ratings
for select
to authenticated
using (
  exists (
    select 1
    from public.live_chat_conversations as c
    where c.id = conversation_id
      and (c.user_id = auth.uid() or public.live_chat_agent_can_access_conversation(c.id))
  )
);

create policy "live_chat_ratings_authenticated_insert"
on public.live_chat_ratings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.live_chat_conversations as c
    where c.id = conversation_id
      and c.user_id = auth.uid()
  )
);

create policy "live_chat_events_public_signal_read"
on public.live_chat_events
for select
to anon, authenticated
using (is_public);

create policy "live_chat_events_agent_read"
on public.live_chat_events
for select
to authenticated
using (
  public.live_chat_current_agent_can_view_all()
  or (
    conversation_id is not null
    and public.live_chat_agent_can_access_conversation(conversation_id)
  )
);

create policy "live_chat_events_agent_insert"
on public.live_chat_events
for insert
to authenticated
with check (
  public.live_chat_current_agent_can_view_all()
  or (
    conversation_id is not null
    and public.live_chat_agent_can_access_conversation(conversation_id)
  )
);

create policy "live_chat_typing_indicators_owner_or_agent_read"
on public.live_chat_typing_indicators
for select
to authenticated
using (
  public.live_chat_agent_can_access_conversation(conversation_id)
  or exists (
    select 1
    from public.live_chat_conversations as c
    where c.id = conversation_id
      and c.user_id = auth.uid()
  )
);

create policy "live_chat_typing_indicators_owner_or_agent_write"
on public.live_chat_typing_indicators
for all
to authenticated
using (
  public.live_chat_agent_can_access_conversation(conversation_id)
  or exists (
    select 1
    from public.live_chat_conversations as c
    where c.id = conversation_id
      and c.user_id = auth.uid()
  )
)
with check (
  public.live_chat_agent_can_access_conversation(conversation_id)
  or exists (
    select 1
    from public.live_chat_conversations as c
    where c.id = conversation_id
      and c.user_id = auth.uid()
  )
);
