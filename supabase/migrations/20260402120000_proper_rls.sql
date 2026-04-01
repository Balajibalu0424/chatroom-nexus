-- ================================================
-- MIGRATION: Proper Row Level Security
-- Priority: CRITICAL for production security
-- ================================================

-- ================================================
-- USERS TABLE - RLS
-- ================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read all users (needed for chat display)
CREATE POLICY "users_read_all" ON public.users
  FOR SELECT USING (true);

-- Users can update only their own profile
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ================================================
-- ROOMS TABLE - RLS
-- ================================================
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Anyone can read rooms (public listing)
CREATE POLICY "rooms_read_all" ON public.rooms
  FOR SELECT USING (true);

-- Only room creator can update room
CREATE POLICY "rooms_update_creator" ON public.rooms
  FOR UPDATE USING (auth.uid() = created_by);

-- Anyone can create rooms
CREATE POLICY "rooms_insert_all" ON public.rooms
  FOR INSERT WITH CHECK (true);

-- ================================================
-- ROOM_MEMBERS TABLE - RLS
-- ================================================
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- Room members can read room members
CREATE POLICY "room_members_read" ON public.room_members
  FOR SELECT USING (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.room_members rm 
      WHERE rm.room_id = public.room_members.room_id 
      AND rm.user_id = auth.uid()
    )
  );

-- Members can insert themselves
CREATE POLICY "room_members_insert_self" ON public.room_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Members can leave (delete themselves)
CREATE POLICY "room_members_delete_self" ON public.room_members
  FOR DELETE USING (user_id = auth.uid());

-- ================================================
-- MESSAGES TABLE - RLS
-- ================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages: only room members can read
CREATE POLICY "messages_read_room_members" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = messages.room_id
      AND rm.user_id = auth.uid()
    )
  );

-- Messages: only room members can insert
CREATE POLICY "messages_insert_room_members" ON public.messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = messages.room_id
      AND rm.user_id = auth.uid()
    )
  );

-- Messages: only sender can update
CREATE POLICY "messages_update_own" ON public.messages
  FOR UPDATE USING (user_id = auth.uid());

-- Messages: only sender or room admin can delete
CREATE POLICY "messages_delete_own_or_admin" ON public.messages
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.room_admins ra
      WHERE ra.room_id = messages.room_id
      AND ra.user_id = auth.uid()
    )
  );

-- ================================================
-- MESSAGE_REACTIONS - RLS
-- ================================================
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Reactions: room members can read
CREATE POLICY "reactions_read" ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_members rm
      JOIN public.messages m ON m.room_id = rm.room_id
      WHERE m.id = message_reactions.message_id
      AND rm.user_id = auth.uid()
    )
  );

-- Reactions: room members can insert
CREATE POLICY "reactions_insert" ON public.message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      JOIN public.messages m ON m.room_id = rm.room_id
      WHERE m.id = message_reactions.message_id
      AND rm.user_id = auth.uid()
    )
  );

-- Reactions: user can delete own
CREATE POLICY "reactions_delete_own" ON public.message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- ================================================
-- ROOM_BANS TABLE - RLS
-- ================================================
ALTER TABLE public.room_bans ENABLE ROW LEVEL SECURITY;

-- Room members can see bans
CREATE POLICY "bans_read_room_members" ON public.room_bans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = room_bans.room_id
      AND rm.user_id = auth.uid()
    )
  );

-- Only admins can create bans
CREATE POLICY "bans_insert_admins" ON public.room_bans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_admins ra
      WHERE ra.room_id = room_bans.room_id
      AND ra.user_id = auth.uid()
    )
  );

-- Only admins can delete bans
CREATE POLICY "bans_delete_admins" ON public.room_bans
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.room_admins ra
      WHERE ra.room_id = room_bans.room_id
      AND ra.user_id = auth.uid()
    )
  );

-- ================================================
-- ROOM_ADMINS TABLE - RLS
-- ================================================
ALTER TABLE public.room_admins ENABLE ROW LEVEL SECURITY;

-- Anyone can read admins
CREATE POLICY "admins_read_all" ON public.room_admins
  FOR SELECT USING (true);

-- Room creator can manage admins
CREATE POLICY "admins_manage_creator" ON public.room_admins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_admins.room_id
      AND r.created_by = auth.uid()
    )
  );

-- ================================================
-- USER_SETTINGS TABLE - RLS
-- ================================================
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own settings
CREATE POLICY "settings_read_own" ON public.user_settings
  FOR SELECT USING (user_id = auth.uid());

-- Users can only update their own settings
CREATE POLICY "settings_update_own" ON public.user_settings
  FOR UPDATE USING (user_id = auth.uid());

-- Users can only insert their own settings
CREATE POLICY "settings_insert_own" ON public.user_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ================================================
-- STARRED_MESSAGES TABLE - RLS
-- ================================================
ALTER TABLE public.starred_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own starred messages
CREATE POLICY "starred_read_own" ON public.starred_messages
  FOR SELECT USING (user_id = auth.uid());

-- Users can only star/unstar their own
CREATE POLICY "starred_manage_own" ON public.starred_messages
  FOR ALL USING (user_id = auth.uid());

-- ================================================
-- Disable the permissive policies from earlier
-- ================================================
DROP POLICY IF EXISTS "starred_messages_all" ON public.starred_messages;
DROP POLICY IF EXISTS "user_settings_all" ON public.user_settings;
DROP POLICY IF EXISTS "room_admins_all" ON public.room_admins;
DROP POLICY IF EXISTS "room_bans_all" ON public.room_bans;

-- ================================================
-- ANON AUTH FIX - Ensure anonymous access works
-- Note: For anonymous auth, you need to enable it
-- in Supabase Dashboard > Authentication > Providers
-- ================================================
