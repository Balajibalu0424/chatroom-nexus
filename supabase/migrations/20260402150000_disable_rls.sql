-- ================================================
-- DISABLE RLS - Custom auth app doesn't use Supabase Auth
-- Run in Supabase SQL Editor
-- ================================================

-- Disable RLS on all tables (app handles authorization via user_id)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_bans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.starred_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence DISABLE ROW LEVEL SECURITY;
