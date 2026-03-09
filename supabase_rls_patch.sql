-- ============================================================
-- QwikChat RLS POLICY PATCH: Fix Chat Creation (403 Error)
-- Run this in Supabase SQL Editor
-- ============================================================

-- The issue: .insert(...).select() fails because the SELECT policy
-- requires membership in chat_participants, which doesn't exist yet!
-- This patch allows the creator to view the chat immediately.

-- 1. Drop the restrictive select policy
DROP POLICY IF EXISTS "chats_select" ON public.chats;

-- 2. Create a smarter select policy
-- Allows viewing if you are in chat_participants OR if you created it
CREATE POLICY "chats_select" ON public.chats
  FOR SELECT TO authenticated USING (
    auth.uid() = created_by 
    OR public.check_chat_membership(id)
  );

-- 3. Double check insert policy is healthy
DROP POLICY IF EXISTS "chats_insert" ON public.chats;
CREATE POLICY "chats_insert" ON public.chats
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- 4. Also ensure chat_participants can be inserted by the creator
DROP POLICY IF EXISTS "participants_insert" ON public.chat_participants;
CREATE POLICY "participants_insert" ON public.chat_participants
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chats
      WHERE id = chat_participants.chat_id
        AND created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
        AND cp.user_id = auth.uid()
        AND cp.role = 'ADMIN'
    )
  );

-- 5. Final check of policies
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename IN ('chats', 'chat_participants')
ORDER BY tablename, cmd;
