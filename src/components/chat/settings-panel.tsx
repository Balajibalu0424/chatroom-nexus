"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/stores'
import { toast } from 'sonner'
import { Settings, Moon, Bell, Lock, User, LogOut, Trash2, AlertTriangle } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogout: () => void
}

export function SettingsPanel({ open, onOpenChange, onLogout }: SettingsPanelProps) {
  const { user, logout } = useAuthStore()
  const [username, setUsername] = useState(user?.username || '')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [notifications, setNotifications] = useState(true)

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
        setCurrentPin('')
        setNewPin('')
        setConfirmPin('')
      } else {
        toast.error('Failed to update PIN')
      }
    } catch (e) {
      toast.error('An error occurred')
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    
    try {
      const { supabase } = await import('@/lib/supabase')
      
      // Delete user's messages
      await supabase.from('messages').delete().eq('user_id', user.id)
      
      // Delete room memberships
      await supabase.from('room_members').delete().eq('user_id', user.id)
      
      // Delete user
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
              <Avatar className="h-16 w-16">
                <AvatarFallback style={{ backgroundColor: user?.avatar_color }} className="text-lg">
                  {getInitials(user?.username || '?')}
                </AvatarFallback>
              </Avatar>
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

          {/* Preferences Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Preferences
            </h3>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Use dark theme</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsDarkMode(!isDarkMode)}
              >
                {isDarkMode ? 'Dark' : 'Light'}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notifications</p>
                <p className="text-xs text-muted-foreground">Receive message notifications</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setNotifications(!notifications)}
              >
                {notifications ? 'On' : 'Off'}
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
