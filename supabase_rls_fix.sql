-- ============================================================
-- NUCLEAR RLS FIX: Drop ALL policies and recreate from scratch
-- Run this in Supabase SQL Editor
-- ============================================================

-- STEP 1: See what policies currently exist (check results below)
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- STEP 2: Drop ALL existing policies on all tables
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- STEP 3: Make sure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create the membership check function (breaks recursion)
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

-- ============================================================
-- USERS POLICIES
-- ============================================================
CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "users_insert" ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- CHATS POLICIES
-- ============================================================
CREATE POLICY "chats_select" ON public.chats
  FOR SELECT TO authenticated USING (
    public.check_chat_membership(id)
  );

CREATE POLICY "chats_insert" ON public.chats
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "chats_update" ON public.chats
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_participants.chat_id = chats.id
        AND chat_participants.user_id = auth.uid()
        AND chat_participants.role = 'ADMIN'
    )
  );

-- ============================================================
-- CHAT_PARTICIPANTS POLICIES
-- ============================================================
CREATE POLICY "participants_select" ON public.chat_participants
  FOR SELECT TO authenticated USING (
    public.check_chat_membership(chat_id)
  );

CREATE POLICY "participants_insert" ON public.chat_participants
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
        AND cp.user_id = auth.uid()
        AND cp.role = 'ADMIN'
    )
  );

CREATE POLICY "participants_update" ON public.chat_participants
  FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "participants_delete" ON public.chat_participants
  FOR DELETE TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
        AND cp.user_id = auth.uid()
        AND cp.role = 'ADMIN'
    )
  );

-- ============================================================
-- MESSAGES POLICIES
-- ============================================================
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_participants.chat_id = messages.chat_id
        AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_participants.chat_id = messages.chat_id
        AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_update" ON public.messages
  FOR UPDATE TO authenticated USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_delete" ON public.messages
  FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- ============================================================
-- VERIFY: List all policies to confirm
-- ============================================================
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
