-- ================================================
-- Chatroom App - Supabase Database Setup
-- Run this in your Supabase SQL Editor
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- TABLES
-- ================================================

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#4ECDC4',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  pin_hash TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_locked BOOLEAN DEFAULT FALSE
);

-- Room members (junction table)
CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'sticker', 'voice')),
  file_url TEXT,
  file_name TEXT,
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Message reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Typing status
CREATE TABLE IF NOT EXISTS public.typing_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  is_typing BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- ================================================
-- INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_messages_room_id ON public.messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms(code);
CREATE INDEX IF NOT EXISTS idx_typing_status_room_id ON public.typing_status(room_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- Users: Anyone can read, authenticated users can insert (for registration)
-- Users can only update their own data
CREATE POLICY "Users are viewable by authenticated users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Rooms: Viewable by room members only
CREATE POLICY "Rooms are viewable by members" ON public.rooms
  FOR SELECT USING (
    id IN (
      SELECT room_id FROM public.room_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create rooms" ON public.rooms
  FOR INSERT WITH CHECK (true);

-- Room members: Viewable by authenticated users
CREATE POLICY "Room members are viewable by authenticated users" ON public.room_members
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join rooms" ON public.room_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" ON public.room_members
  FOR DELETE USING (auth.uid() = user_id);

-- Messages: Viewable by room members only
CREATE POLICY "Messages are viewable by room members" ON public.messages
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM public.room_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Room members can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    room_id IN (
      SELECT room_id FROM public.room_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = user_id);

-- Message reactions
CREATE POLICY "Room members can view reactions" ON public.message_reactions
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM public.messages WHERE room_id IN (
        SELECT room_id FROM public.room_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can add reactions" ON public.message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their reactions" ON public.message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Typing status: Only visible to room members
CREATE POLICY "Typing status visible to room members" ON public.typing_status
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM public.room_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their typing status" ON public.typing_status
  FOR ALL USING (auth.uid() = user_id);

-- ================================================
-- REALTIME SUBSCRIPTIONS
-- ================================================

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;

-- ================================================
-- FUNCTIONS
-- ================================================

-- Function to clean up typing status
CREATE OR REPLACE FUNCTION public.cleanup_typing_status()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.typing_status
  WHERE updated_at < NOW() - INTERVAL '5 seconds';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for cleanup (optional - can be handled in app)
-- DROP TRIGGER IF EXISTS cleanup_typing ON public.typing_status;

-- ================================================
-- STORAGE BUCKETS
-- ================================================

-- Create storage bucket for chat images (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chatroom-images', 'chatroom-images', true);

-- Storage policy for images
-- CREATE POLICY "Anyone can upload images" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'chatroom-images');

-- CREATE POLICY "Anyone can view images" ON storage.objects
--   FOR SELECT USING (bucket_id = 'chatroom-images');

-- CREATE POLICY "Users can delete their images" ON storage.objects
--   FOR DELETE USING (bucket_id = 'chatroom-images' AND auth.uid()::text = (storage.foldername(name))[1]);
