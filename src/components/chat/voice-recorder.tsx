"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Mic, Square, Loader2, Play, Pause, X, Send } from 'lucide-react'

interface VoiceRecorderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (url: string, duration: number) => void
}

export function VoiceRecorder({ open, onOpenChange, onSend }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (e) {
      console.error('Failed to start recording:', e)
      toast.error('Microphone access denied')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSend = async () => {
    if (!audioBlob) return

    setIsSending(true)

    try {
      const { supabase } = await import('@/lib/supabase')
      
      const fileName = `voice-${Date.now()}.webm`
      const filePath = `voice/${fileName}`

      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(filePath, audioBlob, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        throw error
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath)

      toast.success('Voice message sent!')
      onSend(publicUrl, recordingTime)
      handleClose()
    } catch (e: any) {
      console.error('Send voice error:', e)
      toast.error('Failed to send voice message')
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
    setIsRecording(false)
    setIsPaused(false)
    onOpenChange(false)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Voice Message</DialogTitle>
        </DialogHeader>

        <div className="py-8">
          {audioUrl && (
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              onEnded={() => setIsPlaying(false)}
            />
          )}

          {isRecording ? (
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-red-500" />
                </div>
              </div>
              
              <p className="text-2xl font-mono mb-2">{formatTime(recordingTime)}</p>
              <p className="text-sm text-muted-foreground mb-6">Recording...</p>

              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={handleClose}
                >
                  <X className="h-5 w-5" />
                </Button>
                
                <Button 
                  variant="destructive"
                  size="icon"
                  className="h-16 w-16 rounded-full"
                  onClick={stopRecording}
                >
                  <Square className="h-6 w-6" />
                </Button>
                
                <div className="w-12" /> {/* Spacer for symmetry */}
              </div>
            </div>
          ) : audioUrl ? (
            <div className="flex flex-col items-center">
              <div className="w-full bg-muted rounded-lg p-4 mb-6">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={playAudio}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                  
                  <div className="flex-1">
                    <div className="h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: '30%' }}
                      />
                    </div>
                  </div>
                  
                  <span className="text-sm font-mono">
                    {formatTime(recordingTime)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                
                <Button 
                  onClick={handleSend}
                  disabled={isSending}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Mic className="h-10 w-10 text-primary" />
              </div>
              
              <p className="text-muted-foreground mb-6">
                Tap the button below to start recording
              </p>

              <Button 
                size="lg"
                className="rounded-full px-8"
                onClick={startRecording}
              >
                <Mic className="h-5 w-5 mr-2" />
                Start Recording
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
