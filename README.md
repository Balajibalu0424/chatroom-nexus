# Chatroom

A modern private chat platform built with Next.js, Supabase, and real-time messaging. Create or join chatrooms with PIN protection - no email or signup required.

![Chatroom Preview](https://via.placeholder.com/800x400?text=Chatroom+Preview)

## Features

### 🔐 Privacy First
- **No email required** - Just pick a username and PIN
- **PIN-protected rooms** - Optional room-level security
- **Your data stays yours** - No tracking, no selling

### 💬 Rich Messaging
- Real-time text messages
- Image sharing with upload
- Sticker packs
- Emoji picker
- Reply to messages
- Edit & delete your messages
- Reactions (👍 ❤️ 😂 😮 😢 🙏)

### 👥 Rooms
- Create public or private rooms
- Share room codes with friends
- Optional PIN lock for private rooms
- See who's in the room

### 📱 Modern UI
- WhatsApp-like interface
- Dark/Light mode
- Smooth animations
- Mobile responsive

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Realtime, Auth)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account
- A Vercel account

### 1. Clone and Install

```bash
cd chatroom
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** and run the schema from `supabase/schema.sql`
3. Create a storage bucket named `chatroom-images`:
   - Go to **Storage** in Supabase dashboard
   - Create new bucket: `chatroom-images`
   - Set it to **Public**
4. Get your **Project URL** and **anon/public key** from Project Settings

### 3. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start chatting!

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create chatroom --public --push
```

### 2. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or connect your GitHub repo to Vercel through the dashboard.

### 3. Set Environment Variables

In Vercel dashboard, add the same environment variables from `.env.local`.

### 4. Done! 🎉

Your app is now live!

## Project Structure

```
chatroom/
├── src/
│   ├── app/              # Next.js app router
│   │   ├── page.tsx      # Main landing/rooms page
│   │   └── globals.css   # Global styles
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   ├── auth/        # Login/register forms
│   │   ├── chat/        # Chat components
│   │   └── room/        # Room management
│   └── lib/
│       ├── supabase.ts  # Supabase client
│       ├── stores.ts    # Zustand stores
│       ├── types.ts     # TypeScript types
│       └── utils.ts    # Utility functions
├── supabase/
│   └── schema.sql       # Database schema
└── package.json
```

## How It Works

### Authentication Flow

1. User enters username + PIN (4-6 digits)
2. PIN is hashed client-side and stored in Supabase
3. Session persists in localStorage
4. No email, no passwords, no tokens to manage

### Room Access

1. Create a room → get a 6-character code
2. Share code with friends
3. If room is PIN-locked, enter PIN to join
4. Room members can see and send messages

### Real-time Messaging

- Supabase Realtime handles live updates
- Messages appear instantly for all room members
- Typing indicators show when someone is typing
- Reactions update in real-time

## License

MIT - Do whatever you want with it!

## Contributing

Contributions welcome! Open an issue or PR.
