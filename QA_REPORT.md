# QA Report - Rich Messaging and Notifications

Date: 2026-05-10

## Automated Checks

- `npm run test:unit`: passed, 17 tests.
- `npm run test:integration`: passed, 5 tests.
- `npm run build`: passed. Remaining warnings are existing or intentional `<img>` usage for user/provider media previews plus the existing `starred-messages` hook warning.
- `npm test`: passed, 4 browser tests with 1 admin test skipped by existing test configuration.

## Browser Smoke Checks

- Desktop login/register surface renders the upgraded glassmorphism layout.
- Created a QA account and opened the room creation flow.
- Created a QA room, verified the chat composer renders accessible controls for image, file, voice, emoji, sticker, and GIF actions.
- Sent a text message successfully.
- Opened the GIF picker and sent a built-in fallback GIF when no GIPHY key is configured.
- Mobile viewport smoke check at 390x844 verified the login form renders with no browser console errors.

## Coverage Notes

- In-app notifications, unread badges, tab-title unread counts, sound settings, privacy previews, reduced-motion flags, 3D effect flags, GIF safety rating, sticker picker, reply rendering, media preview rendering, and push payload privacy are covered by implementation plus unit/browser smoke checks.
- Browser push requires host VAPID env vars and the Supabase migration that creates/updates push subscription and notification settings storage.
- Mobile push support is browser/platform-dependent; unsupported browsers fall back to in-app notifications.

## Blockers

- Supabase migration could not be applied from this environment. The Supabase connector returned a permission error, and `.env.local` does not include `SUPABASE_DB_PASSWORD`.
- The live Supabase schema is missing `room_members.is_muted`, new `user_settings` columns, and `push_subscriptions`; browser push and room mute persistence need the migration applied.
- The live Supabase RLS policies currently return an infinite-recursion error for client room-member room listing. Existing login and in-session create/chat flows can still be smoke-tested, but persistent room listing needs the database policy migration/fix applied.
