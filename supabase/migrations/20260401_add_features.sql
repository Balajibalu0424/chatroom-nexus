-- ================================================
-- MIGRATION: Add missing features
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Add columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

-- 2. Add columns to rooms table
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

-- 3. Add columns to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;

-- 4. Create starred_messages table
CREATE TABLE IF NOT EXISTS public.starred_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- 5. Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
  notifications BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  message_preview BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create room_admins table (for admin controls)
CREATE TABLE IF NOT EXISTS public.room_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'moderator')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- 7. Create room_bans table (for kick/ban)
CREATE TABLE IF NOT EXISTS public.room_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  banned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- ================================================
-- INDEXES
-- ================================================
CREATE INDEX IF NOT EXISTS idx_starred_messages_user ON public.starred_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_starred_messages_message ON public.starred_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_room_admins_room ON public.room_admins(room_id);
CREATE INDEX IF NOT EXISTS idx_room_admins_user ON public.room_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_room_bans_room ON public.room_bans(room_id);
CREATE INDEX IF NOT EXISTS idx_room_bans_user ON public.room_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_starred ON public.messages(room_id, is_starred);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

-- Starred messages
ALTER TABLE public.starred_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "starred_messages_all" ON public.starred_messages FOR ALL USING (true);

-- User settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_all" ON public.user_settings FOR ALL USING (true);

-- Room admins
ALTER TABLE public.room_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_admins_all" ON public.room_admins FOR ALL USING (true);

-- Room bans
ALTER TABLE public.room_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_bans_all" ON public.room_bans FOR ALL USING (true);

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_settings
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- REALTIME
-- ================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.starred_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_bans;
