-- ============================================================
-- FIX: Supabase 500 Error (RLS Infinite Recursion)
-- ============================================================
-- This script fixes the infinite recursion error in the chat_participants table.
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor).

-- 1. Drop the problematic recursive policy
DROP POLICY IF EXISTS "participants_select_own_chats" ON public.chat_participants;

-- 2. Create a SECURITY DEFINER function to check membership.
-- Functions with SECURITY DEFINER run with the privileges of the creator (postgres),
-- which allows them to bypass RLS and break the recursion loop.
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

-- 3. Create a new, non-recursive policy using the function
CREATE POLICY "participants_select_v2" ON public.chat_participants
FOR SELECT TO authenticated USING (
  public.check_chat_membership(chat_id)
);

-- 4. Also ensure 'chats' policy is healthy
DROP POLICY IF EXISTS "chats_select_participant" ON public.chats;
CREATE POLICY "chats_select_v2" ON public.chats
FOR SELECT TO authenticated USING (
  public.check_chat_membership(id)
);
