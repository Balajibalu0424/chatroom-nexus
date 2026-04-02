import { NextResponse } from 'next/server'
import crypto from 'crypto'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''

// Store pending messages waiting for Telegram responses
const pendingMessages = new Map<string, {
  chatId: string
  roomId: string
  username: string
  timestamp: number
}>()

// Simple in-memory store for demo - in production use Redis or DB
const telegramSessions = new Map<string, {
  chat_id: string
  ultron_pending: string | null
}>()

export async function POST(request: Request) {
  try {
    const update = await request.json()

    // Handle /start command - register chat_id
    if (update.message?.text?.startsWith('/start')) {
      const chatId = update.message.chat.id.toString()
      telegramSessions.set(chatId, {
        chat_id: chatId,
        ultron_pending: null
      })
      
      // Acknowledge via Telegram
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '✅ Connected to Chatroom Nexus! Your Telegram is now linked. Messages you send here will appear in your chatroom.'
        })
      })
      
      return NextResponse.json({ ok: true })
    }

    // Handle regular messages from Telegram
    if (update.message && !update.message.text?.startsWith('/')) {
      const chatId = update.message.chat.id.toString()
      const text = update.message.text

      // If there's a pending ultron request, send to ultron
      const session = telegramSessions.get(chatId)
      if (session?.ultron_pending) {
        // Forward to OpenClaw Gateway
        const ultronRoomId = session.ultron_pending
        
        // Call the ultron API
        const ultronResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://chatroom-nexus.netlify.app'}/api/chat/ultron`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: ultronRoomId,
            userId: 'telegram',
            username: 'Telegram',
            message: text,
            messageId: `tg-${Date.now()}`
          })
        })

        if (ultronResponse.ok) {
          const result = await ultronResponse.json()
          // Send response back to Telegram
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🤖 Ultron: ${result.response || 'No response'}`
            })
          })
        }

        // Clear pending
        session.ultron_pending = null
        return NextResponse.json({ ok: true })
      }

      // Echo the message to acknowledge
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `📨 Received: "${text}". Type /ultron <room_id> to chat with Ultron in a specific room.`
        })
      })
    }

    // Handle /ultron command
    if (update.message?.text?.startsWith('/ultron')) {
      const chatId = update.message.chat.id.toString()
      const parts = update.message.text.split(' ')
      const roomId = parts[1]

      if (roomId) {
        const session = telegramSessions.get(chatId) || { chat_id: chatId, ultron_pending: null }
        session.ultron_pending = roomId
        telegramSessions.set(chatId, session)

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🎯 Ultron mode activated for room: ${roomId}. Send any message and I'll respond!`
          })
        })
      } else {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '❌ Usage: /ultron <room_id>\n\nExample: /ultron abc123'
          })
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ 
    status: 'telegram_webhook_active',
    mode: 'telegram_to_chatroom'
  })
}
