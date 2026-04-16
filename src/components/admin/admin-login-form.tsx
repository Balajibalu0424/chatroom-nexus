'use client'

import { useState, startTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Shield, KeyRound, Loader2, LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nextPath = searchParams.get('next') || '/admin'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          totpCode,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        toast.error(data.error || 'Admin login failed')
        return
      }

      toast.success('Admin session started')
      startTransition(() => {
        router.replace(nextPath)
        router.refresh()
      })
    } catch (error) {
      toast.error('Unable to reach the admin login endpoint')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="admin-username" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Admin Username
        </Label>
        <div className="relative">
          <Shield className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="admin-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="h-12 pl-10"
            placeholder="Enter admin username"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-password" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Password
        </Label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="h-12 pl-10"
            placeholder="Enter admin password"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-totp" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          TOTP Code
        </Label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="admin-totp"
            inputMode="numeric"
            pattern="\d{6}"
            value={totpCode}
            onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            autoComplete="one-time-code"
            className="h-12 pl-10 text-center font-mono tracking-[0.35em]"
            placeholder="123456"
            required
          />
        </div>
      </div>

      <Button type="submit" className="h-12 w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Enter Admin Console
      </Button>
    </form>
  )
}
