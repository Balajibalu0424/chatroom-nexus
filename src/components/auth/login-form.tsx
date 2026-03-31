"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/stores'
import { toast } from 'sonner'
import { Loader2, MessageCircle, Shield } from 'lucide-react'

interface LoginFormProps {
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (username.length < 3) {
      toast.error('Username must be at least 3 characters')
      return
    }
    
    if (pin.length < 4 || pin.length > 6) {
      toast.error('PIN must be 4-6 digits')
      return
    }
    
    if (!/^\d+$/.test(pin)) {
      toast.error('PIN must contain only numbers')
      return
    }

    setIsLoading(true)
    
    try {
      const result = mode === 'login' 
        ? await login(username, pin)
        : await register(username, pin)
      
      if (result.success) {
        toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!')
        onSuccess()
      } else {
        toast.error(result.error || 'Authentication failed')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!isLoading && (
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            autoComplete="off"
            className="h-12"
          />
        </div>
      )}
      
      {!isLoading && (
        <div className="space-y-2">
          <Label htmlFor="pin">
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {mode === 'login' ? 'Your PIN' : 'Create a PIN (4-6 digits)'}
            </div>
          </Label>
          <Input
            id="pin"
            type="password"
            placeholder={mode === 'login' ? 'Enter your PIN' : 'Create a 4-6 digit PIN'}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            autoComplete="off"
            className="h-12 text-center text-xl tracking-[0.5em] font-mono"
          />
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? 'Signing you in...' : 'Creating your account...'}
          </p>
        </div>
      )}

      {!isLoading && (
        <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
          {mode === 'login' ? (
            <>Enter Chatroom</>
          ) : (
            <>Create Account</>
          )}
        </Button>
      )}

      {!isLoading && (
        <div className="text-center text-sm">
          {mode === 'login' ? (
            <p className="text-muted-foreground">
              New here?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-primary hover:underline font-medium"
              >
                Create account
              </button>
            </p>
          ) : (
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      )}

      <div className="pt-2 border-t">
        <p className="text-xs text-center text-muted-foreground">
          Your PIN is stored securely and never leaves your device
        </p>
      </div>
    </form>
  )
}
