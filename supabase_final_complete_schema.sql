-- ============================================================
-- QwikChat FINAL COMPLETE DATABASE SCHEMA & RLS FIX
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES
-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text UNIQUE NOT NULL,
  username text UNIQUE,
  avatar_url text,
  status text DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE', 'OFFLINE', 'BUSY', 'AWAY')),
  bio text,
  last_seen timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  privacy_last_seen boolean DEFAULT true,
  privacy_read_receipts boolean DEFAULT true,
  settings jsonb DEFAULT '{}'::jsonb
);

-- Chats Table
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('DIRECT', 'GROUP')),
  name text,
  avatar_url text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Chat Participants Table
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
  last_read_message_id uuid,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  is_archived boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  is_muted boolean DEFAULT false,
  deleted_until timestamp with time zone,
  UNIQUE(chat_id, user_id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  content text NOT NULL DEFAULT '' CHECK (char_length(content) <= 10000),
  type text DEFAULT 'TEXT' CHECK (type IN ('TEXT', 'IMAGE', 'FILE', 'SYSTEM', 'DOCUMENT')),
  attachment_url text,
  is_edited boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  deleted_at timestamp with time zone,
  reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  is_deleted_for_everyone boolean DEFAULT false,
  file_url text,
  file_type text
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON public.messages (chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat ON public.chat_participants (chat_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users (username);

-- 4. ROW LEVEL SECURITY (RLS) - NUCLEAR RESET
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 5. MEMBERSHIP FUNCTION
CREATE OR REPLACE FUNCTION public.check_chat_membership(cid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_id = cid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. POLICIES
-- USERS
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- CHATS
-- Slect allows viewing if in participants OR creator (fixes 403 on create)
CREATE POLICY "chats_select" ON public.chats FOR SELECT TO authenticated USING (auth.uid() = created_by OR public.check_chat_membership(id));
CREATE POLICY "chats_insert" ON public.chats FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "chats_update" ON public.chats FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_participants.chat_id = chats.id AND chat_participants.user_id = auth.uid() AND chat_participants.role = 'ADMIN'));

-- CHAT PARTICIPANTS
CREATE POLICY "participants_select" ON public.chat_participants FOR SELECT TO authenticated USING (public.check_chat_membership(chat_id));
CREATE POLICY "participants_insert" ON public.chat_participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.chats WHERE id = chat_participants.chat_id AND created_by = auth.uid()) OR EXISTS (SELECT 1 FROM public.chat_participants cp WHERE cp.chat_id = chat_participants.chat_id AND cp.user_id = auth.uid() AND cp.role = 'ADMIN'));
CREATE POLICY "participants_update" ON public.chat_participants FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "participants_delete" ON public.chat_participants FOR DELETE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.chat_participants cp WHERE cp.chat_id = chat_participants.chat_id AND cp.user_id = auth.uid() AND cp.role = 'ADMIN'));

-- MESSAGES
CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated USING (public.check_chat_membership(chat_id));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND public.check_chat_membership(chat_id));
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_delete" ON public.messages FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- 7. TRIGGERS & FUNCTIONS
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS trigger AS $$
BEGIN
  new.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS chats_updated_at ON public.chats;
CREATE TRIGGER chats_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 8. STORAGE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
       ('chat-attachments', 'chat-attachments', true, 10485760, array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Public access for avatars" ON storage.objects;
CREATE POLICY "Public access for avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Public access for chat-attachments" ON storage.objects;
CREATE POLICY "Public access for chat-attachments" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');
DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');

-- 9. REALTIME
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages, public.chats, public.chat_participants, public.users;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
