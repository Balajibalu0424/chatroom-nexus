-- ================================================
-- CHATROOM APP - COMPLETE DATABASE SCHEMA
-- Run this in: Supabase Dashboard → SQL Editor → paste and execute
-- ================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#4ECDC4',
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active TIMESTAMPTZ DEFAULT now()
);

-- 3. ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  pin_hash TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ROOM MEMBERS
CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- 5. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  file_url TEXT,
  file_name TEXT,
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 6. MESSAGE REACTIONS
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- 7. ATTACHMENTS
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. STICKERS
CREATE TABLE IF NOT EXISTS public.stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  pack TEXT DEFAULT 'classic',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. PRESENCE
CREATE TABLE IF NOT EXISTS public.presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'online',
  UNIQUE(room_id, user_id)
);

-- 10. TYPING STATE
CREATE TABLE IF NOT EXISTS public.typing_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- 11. ROOM ACCESS LOGS
CREATE TABLE IF NOT EXISTS public.room_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. RATE LIMITS
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  UNIQUE(identifier, action)
);

-- 13. ADMIN DEVICES
CREATE TABLE IF NOT EXISTS public.admin_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT UNIQUE NOT NULL,
  mesh_node_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'windows',
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  device_id UUID REFERENCES public.admin_devices(id) ON DELETE SET NULL,
  admin_username TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================
-- INDEXES
-- ================================================
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON public.messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms(code);
CREATE INDEX IF NOT EXISTS idx_presence_room ON public.presence(room_id);
CREATE INDEX IF NOT EXISTS idx_typing_room ON public.typing_state(room_id);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_message ON public.attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_id_action ON public.rate_limits(identifier, action);
CREATE INDEX IF NOT EXISTS idx_admin_devices_enabled_sort ON public.admin_devices(enabled, sort_order, label);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_device_id ON public.admin_audit_logs(device_id);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "users_select" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (true);

CREATE POLICY "sessions_all" ON public.sessions FOR ALL USING (true);
CREATE POLICY "rooms_select" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "room_members_select" ON public.room_members FOR SELECT USING (true);
CREATE POLICY "room_members_insert" ON public.room_members FOR INSERT WITH CHECK (true);
CREATE POLICY "room_members_delete" ON public.room_members FOR DELETE USING (true);
CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (true);
CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE USING (true);
CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE USING (true);
CREATE POLICY "reactions_select" ON public.message_reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert" ON public.message_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "reactions_delete_own" ON public.message_reactions FOR DELETE USING (true);
CREATE POLICY "attachments_select" ON public.attachments FOR SELECT USING (true);
CREATE POLICY "attachments_insert" ON public.attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "stickers_all" ON public.stickers FOR ALL USING (true);
CREATE POLICY "presence_select" ON public.presence FOR SELECT USING (true);
CREATE POLICY "presence_insert" ON public.presence FOR INSERT WITH CHECK (true);
CREATE POLICY "presence_update" ON public.presence FOR UPDATE USING (true);
CREATE POLICY "typing_select" ON public.typing_state FOR SELECT USING (true);
CREATE POLICY "typing_insert" ON public.typing_state FOR INSERT WITH CHECK (true);
CREATE POLICY "typing_update" ON public.typing_state FOR UPDATE USING (true);
CREATE POLICY "access_logs_all" ON public.room_access_logs FOR ALL USING (true);
CREATE POLICY "rate_limits_all" ON public.rate_limits FOR ALL USING (true);

-- ================================================
-- REALTIME
-- ================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;

-- ================================================
-- SEED STICKERS
-- ================================================
INSERT INTO public.stickers (name, url, pack) VALUES
  ('One Does Not Simply', 'https://i.imgflip.com/1bij.jpg', 'classic'),
  ('Change My Mind', 'https://i.imgflip.com/1ur9b0.jpg', 'classic'),
  ('Leonardo Dicaprio', 'https://i.imgflip.com/30b1gx.jpg', 'classic'),
  ('Drake Approving', 'https://i.imgflip.com/1h7in3.jpg', 'classic'),
  ('This Is Fine', 'https://i.imgflip.com/261o3j.jpg', 'classic'),
  ('Distracted Boyfriend', 'https://i.imgflip.com/2j3u1i.jpg', 'reactions'),
  ('Two Buttons', 'https://i.imgflip.com/3oevdk.jpg', 'reactions'),
  ('Woman Yelling at Cat', 'https://i.imgflip.com/4t0m5.jpg', 'reactions'),
  ('Thumbs Up', 'https://i.imgflip.com/4/280.jpg', 'reactions'),
  ('Awkward Look', 'https://i.imgflip.com/1g8my4.jpg', 'classic'),
  ('Roll Safe', 'https://i.imgflip.com/1h7in3.jpg', 'classic'),
  ('Surprised Pikachu', 'https://i.imgflip.com/2kbm1.jpg', 'classic')
ON CONFLICT DO NOTHING;

INSERT INTO public.admin_devices (label, mesh_node_id, platform, sort_order, enabled) VALUES
  ('Desktop', 'REPLACE_WITH_DESKTOP_NODE_ID', 'windows', 1, true),
  ('Laptop', 'REPLACE_WITH_LAPTOP_NODE_ID', 'windows', 2, true)
ON CONFLICT (label) DO NOTHING;

-- ================================================
-- STORAGE BUCKET (create manually in Dashboard → Storage)
-- ================================================
-- Go to Storage → Create bucket named "chat-media" (public)
-- Then run:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true) ON CONFLICT DO NOTHING;
-- CREATE POLICY "chat_media_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');
-- CREATE POLICY "chat_media_public_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-media');
