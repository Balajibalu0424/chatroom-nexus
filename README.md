# Chatroom — Private Real-Time Messaging

A modern, real-time chatroom application with PIN-based authentication — no email, no password, no accounts. Just pick a username, set a PIN, and start chatting.

**🔗 Live App:** https://chatroom-nexus.vercel.app

---

## Features

- **No-Login Authentication** — Enter with username + 4-6 digit PIN. No email verification needed.
- **PIN-Hashed Security** — PINs are hashed with SHA-256 + salt using the Web Crypto API. Never stored in plain text.
- **Real-Time Messaging** — Instant message delivery powered by Supabase Realtime
- **Emoji Reactions** — React to any message with quick emoji reactions
- **Stickers** — Send meme stickers from a pre-loaded pack
- **Image Uploads** — Share photos directly in chat
- **Reply to Messages** — Reference and reply to specific messages
- **Edit & Delete** — Edit or delete your own messages
- **Room PIN Protection** — Lock rooms with an optional PIN
- **Typing Indicators** — See who's typing in real-time
- **Message Grouping** — Clean, WhatsApp-style message grouping
- **Dark Mode Default** — Modern dark theme with light mode support
- **Mobile Responsive** — Works beautifully on all screen sizes
- **Room Codes** — Share 6-character room codes to invite friends

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| UI Components | shadcn/ui, Radix UI primitives |
| Backend | Supabase (Postgres, Realtime, Storage) |
| Auth | PIN-based (SHA-256 hashed, Web Crypto API) |
| State | Zustand (client-side) |
| Deployment | Vercel |

---

## Quick Start

### 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a project
2. In the SQL Editor, run the schema from `supabase/schema.sql`
3. Create a storage bucket named `chat-media` and set it to **Public**
4. Copy your **Project URL** and **anon key** from Settings → API

### 2. Configure Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Database Schema

The app uses 12 tables:

| Table | Purpose |
|-------|---------|
| `users` | User profiles with hashed PINs |
| `sessions` | Device/session tracking |
| `rooms` | Chatroom metadata and codes |
| `room_members` | User ↔ Room membership |
| `messages` | All message content |
| `message_reactions` | Emoji reactions |
| `attachments` | File/image metadata |
| `stickers` | Sticker pack |
| `presence` | Online/offline status |
| `typing_state` | Who's typing |
| `room_access_logs` | Security audit log |
| `rate_limits` | Anti-spam tracking |

All tables have Row Level Security (RLS) enabled with permissive policies for the PIN-auth model.

---

## Security Model

### PIN Hashing

```typescript
// PINs are hashed with SHA-256 + static salt before storage
const SALT = 'chatroom_pin_salt_v1_'
const hash = await crypto.subtle.digest('SHA-256', pin + SALT)
```

### Room Access Control

- Room membership is tracked in `room_members` table
- RLS policies check membership before allowing message reads/writes
- Room PINs are verified client-side before allowing join

### Limitations of PIN-Based Auth

Since there's no email/password:
- **No account recovery** — If you forget your PIN, you lose access to that identity
- **No session invalidation** — PIN-based sessions persist on the device
- **Device-bound identity** — Same username+PIN on a different device = different account
- **Replay vulnerability** — A captured PIN hash could theoretically be replayed (mitigated by using HTTPS)

These tradeoffs are by design for the anonymous, frictionless experience.

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | ✅ |

Never expose the `service_role` key to the browser.

### Admin Remote Access

The repo now includes a separate `/admin` control plane that launches your own devices through MeshCentral instead of reusing the chatroom PIN flow.

Required server-only variables:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_SCRYPT`
- `ADMIN_TOTP_SECRET`
- `ADMIN_SESSION_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `MESHCENTRAL_URL`
- `MESHCENTRAL_USERID`
- `MESHCENTRAL_LOGIN_TOKEN_KEY`

Helpful setup commands:

```bash
npm run admin:hash-password -- "replace-with-strong-password"
npm run admin:totp-secret
```

Apply the new Supabase migration for `admin_devices` and `admin_audit_logs`, then replace the seeded placeholder MeshCentral node IDs for `Desktop` and `Laptop`.

---

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in project settings
4. Deploy

### Supabase Backend Setup

1. Create project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in SQL Editor
3. Create `chat-media` storage bucket (public)
4. Enable Realtime for `messages`, `message_reactions`, `room_members` tables
5. Add environment variables to Vercel

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx           # Main app (landing + chat)
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Theme + styles
├── components/
│   ├── auth/
│   │   └── login-form.tsx
│   ├── chat/
│   │   ├── chat-view.tsx        # Main chat window
│   │   ├── message-bubble.tsx    # Message with reactions
│   │   ├── emoji-picker.tsx     # Emoji selection
│   │   ├── sticker-picker.tsx    # Sticker selection
│   │   ├── image-upload.tsx      # Photo upload
│   │   └── typing-indicator.tsx   # Typing animation
│   ├── room/
│   │   └── create-join-room.tsx  # Create/join modal
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── supabase.ts       # Supabase client
│   ├── stores.ts         # Zustand state
│   ├── utils.ts          # Utilities + PIN hashing
│   └── types.ts          # TypeScript types
supabase/
├── schema.sql           # Full database schema
└── migrations/           # Migration files
```

---

## API Reference

### Key Supabase Queries

**Create user (registration):**
```typescript
supabase.from('users').insert({ username, pin_hash: hashedPin, avatar_color })
```

**Login:**
```typescript
supabase.from('users').select().eq('username', username)
  .then(verifyPin(pin, user.pin_hash))
```

**Join room:**
```typescript
supabase.from('room_members').insert({ room_id, user_id })
```

**Send message:**
```typescript
supabase.from('messages').insert({
  room_id, user_id, content, type: 'text'
})
```

**Add reaction:**
```typescript
supabase.from('message_reactions').insert({
  message_id, user_id, emoji
})
```

---

## Realtime Subscriptions

```typescript
supabase
  .channel(`room:${roomId}`)
  .on('postgres_changes', { event: 'INSERT', table: 'messages', filter: `room_id=eq.${roomId}` }, handler)
  .on('broadcast', { event: 'typing' }, handler)
  .subscribe()
```

---

## Known Limitations

- **No end-to-end encryption** — Data is visible to Supabase
- **No push notifications** — Would require service worker setup
- **No message search** — Supabase full-text search could be added
- **No read receipts** — Would need presence tracking enhancement
- **No voice messages** — Audio recording infrastructure not included

---

## License

MIT
