"use client"

import { useEffect, useState } from 'react'

// Check if notification permission is granted
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  return permission
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }

  const result = await Notification.requestPermission()
  return result === 'granted'
}

// Show a local notification
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null
  }

  if (Notification.permission !== 'granted') {
    return null
  }

  const notification = new Notification(title, {
    icon: '/icon.svg',
    badge: '/badge.svg',
    ...options,
  })

  return notification
}

// Parse VAPID key from environment
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

// Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Subscribe to push notifications
export async function subscribeToPush(
  userId: string,
  _supabase: any
): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported')
    return null
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY ? urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer : undefined,
    })

    // Send subscription to the server so storage does not depend on permissive
    // client-side table policies.
    const subscriptionJson = subscription.toJSON()
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription: subscriptionJson,
        userAgent: navigator.userAgent,
      }),
    })

    return subscription
  } catch (error) {
    console.error('Push subscription error:', error)
    return null
  }
}

// Unsubscribe from push
export async function unsubscribeFromPush(
  userId: string,
  _supabase: any
): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          endpoint: subscription.endpoint,
        }),
      })
    }
  } catch (error) {
    console.error('Push unsubscribe error:', error)
  }
}

// Check if push is supported
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

// Service worker registration with message handling
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    
    // Handle messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && (event.data.type === 'NOTIFICATION_CLICKED' || event.data.type === 'NAVIGATE_TO_ROOM')) {
        const { roomId, messageId } = event.data
        if (roomId) {
          window.location.href = `/?room=${roomId}`
        }
      }
    })

    return registration
  } catch (error) {
    console.error('Service worker registration error:', error)
    return null
  }
}
