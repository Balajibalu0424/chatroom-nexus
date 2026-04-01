"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/stores'
import { toast } from 'sonner'
import { Settings, Moon, Sun, Monitor, Bell, Lock, User, LogOut, Trash2, AlertTriangle, Upload, Loader2, BellOff } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { isPushSupported, requestNotificationPermission, subscribeToPush, unsubscribeFromPush } from '@/lib/push-notifications'

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogout: () => void
}

export function SettingsPanel({ open, onOpenChange, onLogout }: SettingsPanelProps) {
  const { user, logout, settings, updateSettings, pushSubscription, subscribePush, unsubscribePush } = useAuthStore()
  const [username, setUsername] = useState(user?.username || '')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [loadingPush, setLoadingPush] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPushSupported(isPushSupported())
    }
  }, [])

  useEffect(() => {
    setPushEnabled(!!pushSubscription)
  }, [pushSubscription])

  const handleUpdateUsername = async () => {
    if (!username.trim() || !user) return
    
    try {
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase
        .from('users')
        .update({ username: username.trim() })
        .eq('id', user.id)

      if (!error) {
        toast.success('Username updated!')
      } else {
        toast.error('Failed to update username')
      }
    } catch (e) {
      toast.error('An error occurred')
    }
  }

  const handleUpdatePin = async () => {
    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      toast.error('PIN must be 4-6 digits')
      return
    }
    if (newPin !== confirmPin) {
      toast.error('PINs do not match')
      return
    }

    try {
      const { supabase } = await import('@/lib/supabase')
      const { hashPin } = await import('@/lib/utils')
      const pinHash = await hashPin(newPin)
      
      const { error } = await supabase
        .from('users')
        .update({ pin_hash: pinHash })
        .eq('id', user!.id)

      if (!error) {
        toast.success('PIN updated successfully!')
        setNewPin('')
        setConfirmPin('')
      } else {
        toast.error('Failed to update PIN')
      }
    } catch (e) {
      toast.error('An error occurred')
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar must be less than 2MB')
      return
    }

    setUploadingAvatar(true)

    try {
      const { supabase } = await import('@/lib/supabase')
      
      const ext = file.name.split('.').pop()
      const fileName = `avatars/${user.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file, { upsert: true })

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName)

      await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      toast.success('Avatar updated!')
    } catch (e) {
      toast.error('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    
    try {
      const { supabase } = await import('@/lib/supabase')
      
      await supabase.from('messages').delete().eq('user_id', user.id)
      await supabase.from('room_members').delete().eq('user_id', user.id)
      
      const { error } = await supabase.from('users').delete().eq('id', user.id)

      if (!error) {
        toast.success('Account deleted')
        onOpenChange(false)
        logout()
      } else {
        toast.error('Failed to delete account')
      }
    } catch (e) {
      toast.error('An error occurred')
    }
  }

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme })
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Manage your account and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </h3>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarFallback style={{ backgroundColor: user?.avatar_color }} className="text-lg">
                    {getInitials(user?.username || '?')}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/90 transition-colors">
                  <Upload className="h-3 w-3" />
                  <input 
                    type="file" 
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
              <div className="flex-1">
                <p className="font-medium">{user?.username}</p>
                <p className="text-xs text-muted-foreground">Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex gap-2">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter new username"
                />
                <Button onClick={handleUpdateUsername}>Update</Button>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Security
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="newPin">New PIN (4-6 digits)</Label>
              <Input
                id="newPin"
                type="password"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter new PIN"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm PIN</Label>
              <Input
                id="confirmPin"
                type="password"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Confirm new PIN"
              />
              <Button onClick={handleUpdatePin} className="w-full">
                Update PIN
              </Button>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Appearance
            </h3>
            
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={settings.theme === 'light' ? 'default' : 'outline'}
                className="flex flex-col items-center gap-1 h-auto py-3"
                onClick={() => applyTheme('light')}
              >
                <Sun className="h-5 w-5" />
                <span className="text-xs">Light</span>
              </Button>
              
              <Button
                variant={settings.theme === 'dark' ? 'default' : 'outline'}
                className="flex flex-col items-center gap-1 h-auto py-3"
                onClick={() => applyTheme('dark')}
              >
                <Moon className="h-5 w-5" />
                <span className="text-xs">Dark</span>
              </Button>
              
              <Button
                variant={settings.theme === 'system' ? 'default' : 'outline'}
                className="flex flex-col items-center gap-1 h-auto py-3"
                onClick={() => applyTheme('system')}
              >
                <Monitor className="h-5 w-5" />
                <span className="text-xs">System</span>
              </Button>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </h3>
            
            {pushSupported && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Browser Push</p>
                  <p className="text-xs text-muted-foreground">
                    {pushEnabled ? 'Enabled' : 'Click to enable'}
                  </p>
                </div>
                <Button
                  variant={pushEnabled ? 'default' : 'outline'}
                  size="sm"
                  disabled={loadingPush}
                  onClick={async () => {
                    setLoadingPush(true)
                    try {
                      if (pushEnabled) {
                        await unsubscribePush()
                        toast.success('Push notifications disabled')
                      } else {
                        const granted = await requestNotificationPermission()
                        if (granted) {
                          await subscribePush()
                          toast.success('Push notifications enabled!')
                        } else {
                          toast.error('Permission denied')
                        }
                      }
                    } catch (e) {
                      toast.error('Failed to update push settings')
                    }
                    setLoadingPush(false)
                  }}
                >
                  {loadingPush ? <Loader2 className="h-4 w-4 animate-spin" /> : pushEnabled ? 'Enabled' : 'Enable'}
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">In-App Notifications</p>
                <p className="text-xs text-muted-foreground">Show notification badges</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => updateSettings({ notifications: !settings.notifications })}
              >
                {settings.notifications ? 'On' : 'Off'}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sound</p>
                <p className="text-xs text-muted-foreground">Play sound for new messages</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => updateSettings({ sound_enabled: !settings.sound_enabled })}
              >
                {settings.sound_enabled ? 'On' : 'Off'}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Message Preview</p>
                <p className="text-xs text-muted-foreground">Show message content in notifications</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => updateSettings({ message_preview: !settings.message_preview })}
              >
                {settings.message_preview ? 'On' : 'Off'}
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </h3>
            
            <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
              <div>
                <p className="font-medium text-destructive">Delete Account</p>
                <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Logout */}
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              onOpenChange(false)
              onLogout()
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative bg-background p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold mb-2">Delete Account?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleDeleteAccount}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
