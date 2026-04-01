"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores'

// Check if notification permission is granted
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const settings = useAuthStore((state) => state.settings)

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
    icon: '/icon.png',
    badge: '/badge.png',
    ...options,
  })

  return notification
}

// Parse VAPID key from environment
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || ''

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
  supabase: any
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

    // Send subscription to server
    const subscriptionJson = subscription.toJSON()
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subscriptionJson.endpoint,
      keys: subscriptionJson.keys,
      created_at: new Date().toISOString(),
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
  supabase: any
): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)
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
      if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
        // Handle notification click - could navigate to the chat
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
