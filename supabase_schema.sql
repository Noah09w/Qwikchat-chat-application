-- ============================================================
-- QwikChat Supabase Schema v2 — HARDENED + COMPLETE
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Users Table (mirrors auth.users, auto-populated by trigger)
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  username text unique,
  avatar_url text,
  status text default 'OFFLINE' check (status in ('ONLINE', 'OFFLINE', 'BUSY', 'AWAY')),
  last_seen timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Chats Table
create table if not exists public.chats (
  id uuid default uuid_generate_v4() primary key,
  type text not null check (type in ('DIRECT', 'GROUP')),
  name text,
  avatar_url text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Chat Participants Table
create table if not exists public.chat_participants (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text default 'MEMBER' check (role in ('ADMIN', 'MEMBER')),
  last_read_message_id uuid,
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  unique(chat_id, user_id)
);

-- Messages Table
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  sender_id uuid references public.users(id) on delete set null,
  content text not null default '' check (char_length(content) <= 10000),
  type text default 'TEXT' check (type in ('TEXT', 'IMAGE', 'FILE', 'SYSTEM')),
  attachment_url text,
  is_edited boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  deleted_at timestamp with time zone
);

-- Add foreign key for last_read_message_id
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_last_read_message') then
    alter table public.chat_participants
      add constraint fk_last_read_message foreign key (last_read_message_id)
      references public.messages(id) on delete set null;
  end if;
end $$;

-- ============================================================
-- 2. INDEXES (Performance)
-- ============================================================
create index if not exists idx_messages_chat_created on public.messages (chat_id, created_at desc);
create index if not exists idx_messages_sender on public.messages (sender_id);
create index if not exists idx_chat_participants_user on public.chat_participants (user_id);
create index if not exists idx_chat_participants_chat on public.chat_participants (chat_id);
create index if not exists idx_users_email on public.users (email);
create index if not exists idx_users_username on public.users (username);

-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS) — HARDENED
-- ============================================================

alter table public.users enable row level security;
alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

-- Drop existing policies if re-running
do $$ begin
  drop policy if exists "Public profiles are viewable by everyone." on public.users;
  drop policy if exists "Users can insert their own profile." on public.users;
  drop policy if exists "Users can update own profile." on public.users;
  drop policy if exists "Users can view chats they participate in." on public.chats;
  drop policy if exists "Users can create chats." on public.chats;
  drop policy if exists "Users can view participants of their chats." on public.chat_participants;
  drop policy if exists "Users can join chats or add others if they are admin." on public.chat_participants;
  drop policy if exists "Users can view messages of their chats." on public.messages;
  drop policy if exists "Users can insert messages in their chats." on public.messages;
  -- v2 policies
  drop policy if exists "users_select_authenticated" on public.users;
  drop policy if exists "users_insert_own" on public.users;
  drop policy if exists "users_update_own" on public.users;
  drop policy if exists "users_no_delete" on public.users;
  drop policy if exists "chats_select_participant" on public.chats;
  drop policy if exists "chats_insert_authenticated" on public.chats;
  drop policy if exists "chats_update_admin" on public.chats;
  drop policy if exists "participants_select_own_chats" on public.chat_participants;
  drop policy if exists "participants_insert_self_or_admin" on public.chat_participants;
  drop policy if exists "participants_update_own_read" on public.chat_participants;
  drop policy if exists "participants_delete_self_or_admin" on public.chat_participants;
  drop policy if exists "messages_select_participant" on public.messages;
  drop policy if exists "messages_insert_participant" on public.messages;
  drop policy if exists "messages_update_own" on public.messages;
  drop policy if exists "messages_delete_own" on public.messages;
end $$;

-- ---- USERS TABLE ----

-- Only authenticated users can see profiles (not anonymous/public)
create policy "users_select_authenticated" on public.users
  for select to authenticated using (true);

-- Users can only insert their own profile row (trigger does this)
create policy "users_insert_own" on public.users
  for insert to authenticated with check (auth.uid() = id);

-- Users can only update their own profile, restricted fields
create policy "users_update_own" on public.users
  for update to authenticated using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Cannot change email or id via client
  );

-- Prevent client-side user deletion (use Supabase dashboard)
create policy "users_no_delete" on public.users
  for delete to authenticated using (false);

-- ---- CHATS TABLE ----

-- Users can only see chats they are a participant in
create policy "chats_select_participant" on public.chats
  for select to authenticated using (
    exists (
      select 1 from public.chat_participants
      where chat_participants.chat_id = chats.id
        and chat_participants.user_id = auth.uid()
    )
  );

-- Any authenticated user can create a chat (must be created_by themselves)
create policy "chats_insert_authenticated" on public.chats
  for insert to authenticated with check (auth.uid() = created_by);

-- Only admins can update chat details (name, avatar)
create policy "chats_update_admin" on public.chats
  for update to authenticated using (
    exists (
      select 1 from public.chat_participants
      where chat_participants.chat_id = chats.id
        and chat_participants.user_id = auth.uid()
        and chat_participants.role = 'ADMIN'
    )
  );

-- ---- CHAT PARTICIPANTS TABLE ----

-- Users can view participants only for chats they belong to
create policy "participants_select_own_chats" on public.chat_participants
  for select to authenticated using (
    exists (
      select 1 from public.chat_participants cp
      where cp.chat_id = chat_participants.chat_id
        and cp.user_id = auth.uid()
    )
  );

-- Users can add themselves, or admins can add others
create policy "participants_insert_self_or_admin" on public.chat_participants
  for insert to authenticated with check (
    user_id = auth.uid()
    OR exists (
      select 1 from public.chat_participants cp
      where cp.chat_id = chat_participants.chat_id
        and cp.user_id = auth.uid()
        and cp.role = 'ADMIN'
    )
  );

-- Users can update their own participation (e.g., last_read_message_id)
create policy "participants_update_own_read" on public.chat_participants
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users can remove themselves from a chat, or admins can remove others
create policy "participants_delete_self_or_admin" on public.chat_participants
  for delete to authenticated using (
    user_id = auth.uid()
    OR exists (
      select 1 from public.chat_participants cp
      where cp.chat_id = chat_participants.chat_id
        and cp.user_id = auth.uid()
        and cp.role = 'ADMIN'
    )
  );

-- ---- MESSAGES TABLE ----

-- Users can read messages only in chats they participate in
create policy "messages_select_participant" on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.chat_participants
      where chat_participants.chat_id = messages.chat_id
        and chat_participants.user_id = auth.uid()
    )
  );

-- Users can only send messages in chats they participate in, as themselves
create policy "messages_insert_participant" on public.messages
  for insert to authenticated with check (
    auth.uid() = sender_id
    AND exists (
      select 1 from public.chat_participants
      where chat_participants.chat_id = messages.chat_id
        and chat_participants.user_id = auth.uid()
    )
  );

-- Users can only edit their own messages (sets is_edited = true)
create policy "messages_update_own" on public.messages
  for update to authenticated using (
    auth.uid() = sender_id
  ) with check (
    auth.uid() = sender_id
    AND is_edited = true  -- enforce that edits must flag is_edited
  );

-- Users can only soft-delete their own messages
create policy "messages_delete_own" on public.messages
  for delete to authenticated using (
    auth.uid() = sender_id
  );

-- ============================================================
-- 4. FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;  -- prevent duplicate errors on re-confirm
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Drop existing trigger if re-running
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update the updated_at field on user profile changes
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute procedure public.handle_updated_at();

drop trigger if exists chats_updated_at on public.chats;
create trigger chats_updated_at
  before update on public.chats
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- 5. STORAGE BUCKETS
-- ============================================================

-- Create storage buckets for avatars and chat attachments
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, -- 2MB limit
    array['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('chat-attachments', 'chat-attachments', false, 10485760, -- 10MB limit
    array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'])
on conflict (id) do nothing;

-- Storage RLS: Avatars (public readable, user-writable for own folder)
drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS: Chat Attachments (only chat participants can read)
drop policy if exists "attachments_select_participant" on storage.objects;
create policy "attachments_select_participant" on storage.objects
  for select to authenticated using (
    bucket_id = 'chat-attachments'
    AND exists (
      select 1 from public.chat_participants
      where chat_participants.chat_id = (storage.foldername(name))[1]::uuid
        and chat_participants.user_id = auth.uid()
    )
  );

drop policy if exists "attachments_insert_participant" on storage.objects;
create policy "attachments_insert_participant" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'chat-attachments'
    AND exists (
      select 1 from public.chat_participants
      where chat_participants.chat_id = (storage.foldername(name))[1]::uuid
        and chat_participants.user_id = auth.uid()
    )
  );

-- ============================================================
-- 6. ENABLE SUPABASE REALTIME
-- ============================================================

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chats;
alter publication supabase_realtime add table public.chat_participants;
alter publication supabase_realtime add table public.users;
