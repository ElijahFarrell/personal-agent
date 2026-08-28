'use client'

import { Pause, Play, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const WAVEFORM_BARS = [
  0.35, 0.55, 0.72, 0.45, 0.88, 0.62, 0.95, 0.58, 0.78, 0.42, 0.68, 0.85,
  0.52, 0.74, 0.48, 0.9, 0.6, 0.82, 0.5, 0.7, 0.38, 0.65, 0.8, 0.55,
] as const

const DEMO_DURATION_SEC = 47

/** Set NEXT_PUBLIC_SAMPLE_CALL_URL when a real recording is available. */
const SAMPLE_AUDIO_SRC = process.env.NEXT_PUBLIC_SAMPLE_CALL_URL ?? ''

export function SampleCallPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isPlaying || SAMPLE_AUDIO_SRC) return

    const interval = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1 / DEMO_DURATION_SEC / 10
        if (next >= 1) {
          setIsPlaying(false)
          return 0
        }
        return next
      })
    }, 100)

    return () => window.clearInterval(interval)
  }, [isPlaying])

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current

    if (SAMPLE_AUDIO_SRC && audio) {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
        return
      }
      try {
        await audio.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
      return
    }

    if (isPlaying) {
      setIsPlaying(false)
      return
    }

    setIsPlaying(true)
  }, [isPlaying])

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (!audio?.duration) return
    setProgress(audio.currentTime / audio.duration)
  }, [])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    setProgress(0)
  }, [])

  const elapsedSec = progress * DEMO_DURATION_SEC

  return (
    <div
      id="sample-call"
      className="marketing-section glass relative overflow-hidden rounded-2xl p-6 sm:p-8"
    >
      <div
        className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-100/60 blur-2xl"
        aria-hidden
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">
              Sample call
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold text-foreground">
              Pre-op confirmation
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Orthopedic ASC · Day-before surgery
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            Live demo
          </span>
        </div>

        <div
          className="mt-8 flex h-16 items-end justify-center gap-[3px]"
          aria-hidden
        >
          {WAVEFORM_BARS.map((height, i) => (
            <div
              key={i}
              className={cn(
                'w-1 origin-bottom rounded-full bg-brand-300 transition-[background-color] duration-300',
                isPlaying && 'waveform-bar-active bg-brand-500'
              )}
              style={{
                height: `${height * 100}%`,
                animationDelay: isPlaying ? `${i * 40}ms` : undefined,
              }}
            />
          ))}
        </div>

        <div className="mt-6">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Playback progress"
          >
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-150"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs tabular-nums text-muted-foreground">
            <span>{formatTime(elapsedSec)}</span>
            <span>{formatTime(DEMO_DURATION_SEC)}</span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <Button
            type="button"
            size="lg"
            onClick={() => void togglePlay()}
            className="h-12 w-12 shrink-0 rounded-full bg-brand-600 p-0 text-background hover:bg-brand-700"
            aria-label={isPlaying ? 'Pause sample call' : 'Play sample call'}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" aria-hidden />
            ) : (
              <Play className="ml-0.5 h-5 w-5" aria-hidden />
            )}
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {isPlaying
                ? 'Agent confirming NPO instructions & arrival time…'
                : 'Hear how the agent confirms prep & arrival'}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Volume2 className="h-3.5 w-3.5" aria-hidden />
              {SAMPLE_AUDIO_SRC
                ? 'Recorded sample call'
                : 'Simulated demo · Add NEXT_PUBLIC_SAMPLE_CALL_URL for real audio'}
            </p>
          </div>
        </div>
      </div>

      {SAMPLE_AUDIO_SRC ? (
        <audio
          ref={audioRef}
          src={SAMPLE_AUDIO_SRC}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          preload="none"
        >
          <track kind="captions" />
        </audio>
      ) : null}
    </div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
