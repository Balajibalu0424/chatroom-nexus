/**
 * Ultron AI Assistant integration
 * Call this when a message is directed to @ultron to get an AI response
 */

interface UltrinResponse {
  success: boolean
  response?: string
  messageId?: string
  error?: string
}

export async function sendToUltron(
  roomId: string,
  userId: string,
  username: string,
  message: string,
  messageId: string
): Promise<UltrinResponse> {
  try {
    const response = await fetch('/api/chat/ultron', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
        userId,
        username,
        message,
        messageId,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to get response',
      }
    }

    return {
      success: true,
      response: data.response,
      messageId: data.messageId,
    }
  } catch (error) {
    console.error('Ultron API call failed:', error)
    return {
      success: false,
      error: 'Network error - could not reach AI assistant',
    }
  }
}

/**
 * Check if a message is directed at Ultron
 * Returns true if the message mentions @ultron (case insensitive)
 */
export function isMessageToUltron(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  return (
    lowerMessage.includes('@ultron') ||
    lowerMessage.startsWith('ultron') ||
    lowerMessage.includes('@ultrin') // Handle common misspellings
  )
}

/**
 * Extract the actual prompt after the @ultron mention
 */
export function extractUltronPrompt(message: string): string {
  return message
    .replace(/@ultron/gi, '')
    .replace(/@ultrin/gi, '')
    .replace(/^ultron\s*/gi, '')
    .trim()
}
