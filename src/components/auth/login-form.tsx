"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/stores'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={20}
          autoComplete="off"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="pin">PIN</Label>
        <Input
          id="pin"
          type="password"
          placeholder="4-6 digit PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          autoComplete="off"
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          className="flex-1"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === 'login' ? (
            'Enter'
          ) : (
            'Create Account'
          )}
        </Button>
      </div>

      <div className="text-center text-sm">
        {mode === 'login' ? (
          <p>
            New here?{' '}
            <button
              type="button"
              onClick={() => setMode('register')}
              className="text-primary hover:underline"
            >
              Create account
            </button>
          </p>
        ) : (
          <p>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-primary hover:underline"
            >
              Login
            </button>
          </p>
        )}
      </div>
    </form>
  )
}
