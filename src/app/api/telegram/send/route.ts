import { NextResponse } from 'next/server'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''

// Store user's Telegram chat IDs (in production, store in DB)
const userTelegramLinks = new Map<string, string>()

export async function POST(request: Request) {
  try {
    const { userId, chatId, action } = await request.json()

    if (action === 'link') {
      // Link user's Telegram to their chatroom account
      if (userId && chatId) {
        userTelegramLinks.set(userId, chatId)
        return NextResponse.json({ success: true })
      }
    }

    if (action === 'unlink') {
      userTelegramLinks.delete(userId)
      return NextResponse.json({ success: true })
    }

    if (action === 'send') {
      const { userId: targetUserId, message } = await request.json()
      const linkedChatId = userTelegramLinks.get(targetUserId)
      
      if (linkedChatId) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: linkedChatId,
            text: message
          })
        })
        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Telegram API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
