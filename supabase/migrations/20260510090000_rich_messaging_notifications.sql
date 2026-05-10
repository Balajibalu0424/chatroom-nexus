-- ================================================
-- RICH MESSAGING AND NOTIFICATION SETTINGS
-- ================================================

ALTER TABLE public.room_members
  ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false;

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS privacy_mode TEXT DEFAULT 'balanced' CHECK (privacy_mode IN ('balanced', 'private')),
  ADD COLUMN IF NOT EXISTS media_autoplay BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reduced_motion BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS effects_3d BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS gif_rating TEXT DEFAULT 'g' CHECK (gif_rating IN ('g', 'pg')),
  ADD COLUMN IF NOT EXISTS muted_rooms UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sound_volume NUMERIC(3,2) DEFAULT 0.50 CHECK (sound_volume >= 0 AND sound_volume <= 1);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_room_members_unmuted_recipients
  ON public.room_members(room_id, user_id)
  WHERE is_muted = false;

CREATE INDEX IF NOT EXISTS idx_user_settings_push_enabled
  ON public.user_settings(user_id)
  WHERE notifications = true AND push_enabled = true;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_room_created_at
  ON public.messages(room_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- The public chat app uses custom PIN auth rather than Supabase Auth JWTs.
-- Keep the admin remote-access tables protected by their own RLS setup, but
-- remove recursive client policies from the chat tables so room listing and
-- messaging continue to work through the existing app-level authorization.
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.message_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_bans DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.starred_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.presence DISABLE ROW LEVEL SECURITY;
