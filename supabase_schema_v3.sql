-- ============================================================
-- QwikChat Schema Enhancements v3 (Feature Completion)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Users Table Enhancements
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS privacy_last_seen BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS privacy_read_receipts BOOLEAN DEFAULT true;

-- 2. Messages Table Enhancements (Media, Replies, Deletions)
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_type_check;

ALTER TABLE public.messages
ADD CONSTRAINT messages_type_check CHECK (type IN ('TEXT', 'IMAGE', 'DOCUMENT', 'SYSTEM'));

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_deleted_for_everyone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- 3. Chat Participants Enhancements (Mute, Pin, Clear History)
ALTER TABLE public.chat_participants
ADD COLUMN IF NOT EXISTS deleted_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- 4. Supabase Storage Buckets for Media Files
-- Ensure the chat-attachments bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-attachments',
    'chat-attachments',
    true,
    10485760, -- 10MB limit
    '{image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}'
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = '{image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}';

-- RLS for Storage Bucket (Authenticated users can upload/read)
DROP POLICY IF EXISTS "Public access for chat-attachments" ON storage.objects;
CREATE POLICY "Public access for chat-attachments" ON storage.objects
    FOR SELECT USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Authenticated users can upload chat-attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat-attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'chat-attachments' AND 
        auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Users can delete their own chat-attachments" ON storage.objects;
CREATE POLICY "Users can delete their own chat-attachments" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'chat-attachments' AND 
        auth.uid() = owner
    );

-- 5. Helper Functions

-- Function to securely update last_seen
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET last_seen = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expose RPC to call update_last_seen
GRANT EXECUTE ON FUNCTION update_last_seen() TO authenticated;
