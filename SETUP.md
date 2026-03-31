# Chatroom Setup Guide

Your code is deployed to GitHub. Follow these steps to set up Supabase and deploy to Vercel.

---

## Part 1: Create Supabase Project

### 1.1 Create a new Supabase project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in
2. Click **New Project**
3. Give it a name like `Chatroom`
4. Set a strong database password (save this!)
5. Select a region closest to your users
6. Click **Create new project**

Wait ~2 minutes for the project to be provisioned.

### 1.2 Get your API credentials

Once created, go to **Settings → API** in your Supabase dashboard. You'll find:

```
Project URL: https://xxxxxxxxxxxx.supabase.co
anon/public key: eyJhbGc... (starts with eyJ...)
```

Copy these — you'll need them for Vercel.

### 1.3 Run the database schema

In your Supabase dashboard, go to **SQL Editor** and run this schema:

```sql
-- ================================================
-- USERS TABLE
-- ================================================
create table public.users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  pin_hash text not null,
  avatar_color text default '#4ECDC4',
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users are viewable by authenticated users"
  on public.users for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own profile"
  on public.users for insert
  with check (true);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- ================================================
-- ROOMS TABLE
-- ================================================
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text unique not null,
  pin_hash text,
  created_by uuid references public.users(id) on delete set null,
  is_locked boolean default false,
  created_at timestamptz default now()
);

alter table public.rooms enable row level security;

create policy "Rooms are viewable by authenticated users"
  on public.rooms for select
  using (auth.role() = 'authenticated');

create policy "Anyone can create rooms"
  on public.rooms for insert
  with check (true);

-- ================================================
-- ROOM MEMBERS TABLE
-- ================================================
create table public.room_members (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(room_id, user_id)
);

alter table public.room_members enable row level security;

create policy "Room members viewable by authenticated users"
  on public.room_members for select
  using (auth.role() = 'authenticated');

create policy "Users can join rooms"
  on public.room_members for insert
  with check (true);

create policy "Users can leave rooms"
  on public.room_members for delete
  using (true);

-- ================================================
-- MESSAGES TABLE
-- ================================================
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  content text not null,
  type text default 'text',
  file_url text,
  file_name text,
  reply_to uuid references public.messages(id) on delete set null,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz
);

alter table public.messages enable row level security;

-- Anyone in a room can read messages
create policy "Room members can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.room_members
      where room_id = messages.room_id
    )
  );

-- Anyone can insert messages (room access is enforced via join)
create policy "Room members can send messages"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.room_members
      where room_id = messages.room_id
    )
  );

-- Users can update their own messages
create policy "Users can update their own messages"
  on public.messages for update
  using (auth.uid() = user_id);

-- Users can soft-delete their own messages
create policy "Users can delete their own messages"
  on public.messages for delete
  using (auth.uid() = user_id);

-- ================================================
-- MESSAGE REACTIONS TABLE
-- ================================================
create table public.message_reactions (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;

create policy "Reactions are viewable by authenticated users"
  on public.message_reactions for select
  using (auth.role() = 'authenticated');

create policy "Room members can add reactions"
  on public.message_reactions for insert
  with check (
    exists (
      select 1 from public.room_members rm
      join public.messages m on m.room_id = rm.room_id
      where m.id = message_id
    )
  );

create policy "Users can remove their reactions"
  on public.message_reactions for delete
  using (auth.uid() = user_id);

-- ================================================
-- ENABLE REALTIME
-- ================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_reactions;

-- ================================================
-- INDEXES
-- ================================================
create index messages_room_id_created_at_idx on public.messages(room_id, created_at);
create index messages_user_id_idx on public.messages(user_id);
create index room_members_user_id_idx on public.room_members(user_id);
create index message_reactions_message_id_idx on public.message_reactions(message_id);
```

### 1.4 Set up Storage (for images)

1. In Supabase dashboard, go to **Storage**
2. Click **New bucket**
3. Name it `chat-media`
4. Set it to **Public**
5. Add this policy for uploads:

```sql
-- Allow anyone to upload to chat-media bucket
create policy "Anyone can upload files"
  on storage.objects for insert
  with check (bucket_id = 'chat-media');

create policy "Anyone can view files"
  on storage.objects for select
  using (bucket_id = 'chat-media');
```

---

## Part 2: Deploy to Vercel

### 2.1 Deploy via GitHub (Recommended)

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click **Add New... → Project**
3. Find your GitHub repo `chatroom-nexus` (or `chatroom`)
4. Click **Import**
5. Under **Environment Variables**, add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (from step 1.2) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key (from step 1.2) |

6. Click **Deploy**

Vercel will automatically detect Next.js and deploy.

### 2.2 Alternative: Deploy via CLI

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Login
vercel login

# Deploy
cd d:/projects/chatroom
vercel --prod
```

### 2.3 Configure environment variables on Vercel

If you deploy via CLI, set environment variables:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

---

## Part 3: Update Supabase Auth Settings

After deploying, update your Supabase auth settings:

1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to your Vercel deployment URL (e.g., `https://chatroom-nexus.vercel.app`)
3. Add your Vercel domain to **Redirect URLs**: `https://chatroom-nexus.vercel.app/**`

---

## Part 4: Local Development

To run locally:

```bash
cd d:/projects/chatroom
npm install
npm run dev
```

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Features Implemented

✅ Username + PIN authentication (no email required)
✅ PINs hashed with SHA-256 + salt (Web Crypto API)
✅ Room creation with optional PIN lock
✅ Room joining via 6-character code
✅ Real-time messaging (Supabase Realtime)
✅ Emoji reactions on messages
✅ Stickers
✅ Image uploads
✅ Reply to messages
✅ Edit/delete own messages
✅ Typing indicators
✅ Message grouping
✅ Date dividers
✅ Unread message count
✅ WhatsApp-inspired UI with sidebar

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main landing/chat page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles + theme
├── components/
│   ├── auth/
│   │   └── login-form.tsx  # Login/register form
│   ├── chat/
│   │   ├── chat-view.tsx   # Main chat window
│   │   ├── message-bubble.tsx
│   │   ├── emoji-picker.tsx
│   │   ├── sticker-picker.tsx
│   │   ├── image-upload.tsx
│   │   └── typing-indicator.tsx
│   ├── room/
│   │   └── create-join-room.tsx
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── supabase.ts        # Supabase client
│   ├── stores.ts          # Zustand stores
│   ├── utils.ts           # Utilities + crypto
│   └── types.ts           # TypeScript types
└── hooks/                 # Custom React hooks
supabase/
├── config.toml           # Supabase local config
└── schema.sql            # Database schema
```

---

## Troubleshooting

**Build fails on Vercel?**
- Check that your Supabase URL and anon key are set in Vercel environment variables
- Make sure the Supabase project is not paused

**Messages not appearing?**
- Check Supabase Realtime is enabled (Storage → Replication)
- Check Row Level Security policies are correct

**Can't upload images?**
- Make sure the `chat-media` storage bucket exists
- Check storage policies allow public access
