-- ============================================================
-- QwikChat FULL DATABASE FIX
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS everywhere
-- ============================================================

-- ============================================================
-- 1. ADD MISSING COLUMNS
-- ============================================================

-- Users table: bio, privacy, and settings JSONB
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS privacy_last_seen BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS privacy_read_receipts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Chat participants: archive, pin, mute support
ALTER TABLE public.chat_participants
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_until TIMESTAMPTZ;

-- Messages: replies, deletions, file attachments
-- First fix the type constraint to allow DOCUMENT type
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_type_check;

ALTER TABLE public.messages
ADD CONSTRAINT messages_type_check CHECK (type IN ('TEXT', 'IMAGE', 'DOCUMENT', 'FILE', 'SYSTEM'));

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_deleted_for_everyone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- ============================================================
-- 2. FIX RLS INFINITE RECURSION
-- ============================================================

-- Create a SECURITY DEFINER function to check chat membership
-- This breaks the recursion loop that occurs when chat_participants
-- RLS policy references chat_participants itself
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

-- Drop the old recursive policies
DROP POLICY IF EXISTS "participants_select_own_chats" ON public.chat_participants;
DROP POLICY IF EXISTS "participants_select_v2" ON public.chat_participants;

-- Create non-recursive replacement
CREATE POLICY "participants_select_v2" ON public.chat_participants
FOR SELECT TO authenticated USING (
  public.check_chat_membership(chat_id)
);

-- Also fix chats select policy
DROP POLICY IF EXISTS "chats_select_participant" ON public.chats;
DROP POLICY IF EXISTS "chats_select_v2" ON public.chats;

CREATE POLICY "chats_select_v2" ON public.chats
FOR SELECT TO authenticated USING (
  public.check_chat_membership(id)
);

-- ============================================================
-- 3. ENSURE REALTIME IS ENABLED
-- ============================================================

-- These are idempotent - safe to re-run
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 4. STORAGE BUCKET FOR ATTACHMENTS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-attachments',
    'chat-attachments',
    true,
    10485760,
    '{image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}'
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760;

-- Storage RLS
DROP POLICY IF EXISTS "Public access for chat-attachments" ON storage.objects;
CREATE POLICY "Public access for chat-attachments" ON storage.objects
    FOR SELECT USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Authenticated users can upload chat-attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat-attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'chat-attachments' AND
        auth.role() = 'authenticated'
    );

-- ============================================================
-- DONE! All fixes applied successfully.
-- ============================================================
