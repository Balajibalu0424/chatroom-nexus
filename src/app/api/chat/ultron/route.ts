import { NextResponse } from 'next/server'

const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

interface UltrinMessageRequest {
  roomId: string
  userId: string
  username: string
  message: string
  messageId: string
}

export async function POST(request: Request) {
  try {
    const { roomId, userId, username, message, messageId }: UltrinMessageRequest =
      await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    }

    if (!OPENCLAW_GATEWAY_URL || !OPENCLAW_GATEWAY_TOKEN) {
      console.error('OpenClaw Gateway not configured')
      return NextResponse.json(
        { error: 'AI assistant not configured' },
        { status: 500 }
      )
    }

    // Call OpenClaw Gateway sessions_send tool
    const gatewayUrl = `${OPENCLAW_GATEWAY_URL}/tools/invoke`

    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        tool: 'sessions_send',
        action: 'json',
        args: {
          sessionKey: 'main',
          message: `[From ${username} in room ${roomId}]: ${message}`,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenClaw Gateway error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to get response from AI assistant' },
        { status: response.status }
      )
    }

    const result = await response.json()

    if (!result.ok) {
      console.error('OpenClaw tool error:', result.error)
      return NextResponse.json(
        { error: result.error?.message || 'AI assistant error' },
        { status: 500 }
      )
    }

    // Extract the response text
    const responseText = result.result?.text || result.result || 'No response'

    return NextResponse.json({
      success: true,
      response: responseText,
      messageId, // Echo back the messageId for client reference
    })
  } catch (error) {
    console.error('Ultron API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  const configured = !!(OPENCLAW_GATEWAY_URL && OPENCLAW_GATEWAY_TOKEN)
  return NextResponse.json({
    status: configured ? 'configured' : 'not_configured',
    gatewayUrl: configured ? '***' : null,
  })
}
