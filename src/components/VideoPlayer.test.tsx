import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stories } from '../data/stories'
import { VideoPlayer } from './VideoPlayer'

const story = stories[0]
let playMock: ReturnType<typeof vi.spyOn>
let pauseMock: ReturnType<typeof vi.spyOn>
let loadMock: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  playMock = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  pauseMock = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  loadMock = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('VideoPlayer', () => {
  it('assigns the exact selected URL, exposes native controls, and attempts playback', () => {
    render(<VideoPlayer story={story} onClose={vi.fn()} />)

    const video = screen.getByLabelText(`Video de la historia ${story.id}: ${story.phrase}`)
    expect(video).toHaveAttribute('src', story.videoUrl)
    expect(video).toHaveAttribute('preload', 'none')
    expect(video).toHaveAttribute('controls')
    expect(video).toHaveAttribute('playsinline')
    expect(playMock).toHaveBeenCalledTimes(1)
  })

  it('keeps controls available and explains how to continue when playback is rejected', async () => {
    playMock.mockRejectedValueOnce(new DOMException('Not allowed', 'NotAllowedError'))
    render(<VideoPlayer story={story} onClose={vi.fn()} />)

    expect(
      await screen.findByText('El navegador no inició la reproducción. Presioná Play en los controles del video.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(`Video de la historia ${story.id}: ${story.phrase}`)).toHaveAttribute('controls')
  })

  it('announces loading and reports media failures clearly', () => {
    render(<VideoPlayer story={story} onClose={vi.fn()} />)
    const video = screen.getByLabelText(`Video de la historia ${story.id}: ${story.phrase}`)

    expect(screen.getByRole('status')).toHaveTextContent('Abriendo el video')
    fireEvent.waiting(video)
    expect(screen.getByRole('status')).toHaveTextContent('Esperá un momento')
    fireEvent.error(video)
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el video')
  })

  it('returns the open video to the beginning', () => {
    render(<VideoPlayer story={story} onClose={vi.fn()} />)
    const video = screen.getByLabelText(`Video de la historia ${story.id}: ${story.phrase}`) as HTMLVideoElement
    video.currentTime = 42

    fireEvent.click(screen.getByRole('button', { name: 'VOLVER AL INICIO' }))

    expect(video.currentTime).toBe(0)
  })

  it('closes through its callback and releases media when unmounted', () => {
    const onClose = vi.fn()
    const view = render(<VideoPlayer story={story} onClose={onClose} />)
    const video = screen.getByLabelText(`Video de la historia ${story.id}: ${story.phrase}`)

    fireEvent.click(screen.getByRole('button', { name: 'CERRAR VIDEO' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    view.unmount()

    expect(pauseMock).toHaveBeenCalledTimes(1)
    expect(video).not.toHaveAttribute('src')
    expect(loadMock).toHaveBeenCalledTimes(1)
  })
})
