import { useEffect, useRef, useState } from 'react'
import type { Story } from '../data/stories'

export interface VideoPlayerProps {
  readonly story: Story
  readonly onClose: () => void
}

type PlayerStatus = 'loading' | 'playing' | 'manual-play' | 'error'

function releaseVideo(video: HTMLVideoElement) {
  video.pause()
  video.removeAttribute('src')
  video.load()
}

export function VideoPlayer({ story, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playbackRejected = useRef(false)
  const mediaFailed = useRef(false)
  const [status, setStatus] = useState<PlayerStatus>('loading')

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let active = true
    void video.play().catch(() => {
      if (!active || mediaFailed.current) return
      playbackRejected.current = true
      setStatus('manual-play')
    })

    return () => {
      active = false
      releaseVideo(video)
    }
  }, [story.videoUrl])

  function restart() {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
  }

  function showLoading() {
    if (!playbackRejected.current && !mediaFailed.current) setStatus('loading')
  }

  function showError() {
    mediaFailed.current = true
    setStatus('error')
  }

  return (
    <section className="video-player" aria-labelledby="video-player-heading">
      <div className="video-player-heading">
        <div>
          <p className="result-kicker">Historia {story.id}</p>
          <h2 id="video-player-heading">{story.phrase}</h2>
        </div>
        <button className="button button-secondary" type="button" onClick={onClose}>
          CERRAR VIDEO
        </button>
      </div>

      <div className="video-frame">
        <video
          ref={videoRef}
          src={story.videoUrl}
          preload="none"
          controls
          playsInline
          aria-label={`Video de la historia ${story.id}: ${story.phrase}`}
          onLoadStart={showLoading}
          onWaiting={showLoading}
          onPlaying={() => setStatus('playing')}
          onError={showError}
        />
      </div>

      <div className="video-player-footer">
        <button className="button button-secondary" type="button" onClick={restart}>
          VOLVER AL INICIO
        </button>
        <div className="video-status" aria-live="polite">
          {status === 'loading' && <p role="status">Abriendo el video. Esperá un momento…</p>}
          {status === 'playing' && <p role="status">Reproduciendo el video.</p>}
          {status === 'manual-play' && (
            <p role="status">El navegador no inició la reproducción. Presioná Play en los controles del video.</p>
          )}
          {status === 'error' && (
            <p role="alert">No se pudo cargar el video. Cerralo e intentá abrirlo nuevamente.</p>
          )}
        </div>
      </div>
    </section>
  )
}
