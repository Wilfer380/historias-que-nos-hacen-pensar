import { useEffect, useRef, useState } from 'react'
import { stories, type Story, type StoryId } from '../data/stories'
import {
  chooseUnusedIndex,
  rotationForSegment,
  segmentAtPointer,
} from '../lib/rouletteMath'

const VIEWBOX_SIZE = 400
const CENTER = VIEWBOX_SIZE / 2
const RADIUS = 176
const SEGMENT_DEGREES = 360 / stories.length
const SEGMENT_COLORS = [
  '#2563eb',
  '#0f766e',
  '#7c3aed',
  '#c2410c',
  '#0369a1',
  '#4d7c0f',
  '#a21caf',
  '#b45309',
  '#4338ca',
  '#047857',
  '#be123c',
  '#6d28d9',
] as const
const REVEALED_COLOR = '#dc2626'

export interface RouletteProps {
  readonly random?: () => number
  readonly spinDurationMs?: number
}

function pointOnCircle(angle: number, radius = RADIUS) {
  const radians = ((angle - 90) * Math.PI) / 180
  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  }
}

function segmentPath(index: number): string {
  const start = pointOnCircle(index * SEGMENT_DEGREES - SEGMENT_DEGREES / 2)
  const end = pointOnCircle(index * SEGMENT_DEGREES + SEGMENT_DEGREES / 2)
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y} Z`
}

function wrapPhrase(phrase: string, maximumLineLength = 16): string[] {
  const words = phrase.split(' ')
  const lines: string[] = []

  for (const word of words) {
    const lastLine = lines.at(-1)
    if (!lastLine || lastLine.length + word.length + 1 > maximumLineLength) {
      lines.push(word)
    } else {
      lines[lines.length - 1] = `${lastLine} ${word}`
    }
  }

  return lines
}

function SegmentLabel({ story, revealed }: { story: Story; revealed: boolean }) {
  const angle = (story.id - 1) * SEGMENT_DEGREES

  if (!revealed) {
    return (
      <text
        className="segment-number"
        x={CENTER}
        y={65}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(${angle} ${CENTER} ${CENTER})`}
      >
        {story.id}
      </text>
    )
  }

  const lines = wrapPhrase(story.phrase)
  const firstLineY = 54 - ((lines.length - 1) * 9) / 2

  return (
    <text
      className="segment-phrase"
      aria-label={story.phrase}
      textAnchor="middle"
      transform={`rotate(${angle} ${CENTER} ${CENTER})`}
    >
      {lines.map((line, index) => (
        <tspan key={`${story.id}-${line}`} x={CENTER} y={firstLineY + index * 9}>
          {index === lines.length - 1 ? line : `${line} `}
        </tspan>
      ))}
    </text>
  )
}

export function Roulette({ random = Math.random, spinDurationMs = 4800 }: RouletteProps) {
  const prefersReducedMotion =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const effectiveSpinDuration = prefersReducedMotion ? Math.min(spinDurationMs, 80) : spinDurationMs
  const [revealedIds, setRevealedIds] = useState<ReadonlySet<StoryId>>(() => new Set())
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [announcedStatus, setAnnouncedStatus] = useState('La ruleta está lista para girar.')
  const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingStory = useRef<Story | null>(null)

  const roundComplete = revealedIds.size === stories.length

  useEffect(
    () => () => {
      if (completionTimer.current) clearTimeout(completionTimer.current)
    },
    [],
  )

  function completeSpin() {
    const story = pendingStory.current
    if (!story) return

    setSelectedStory(story)
    setRevealedIds((current) => new Set(current).add(story.id))
    setIsSpinning(false)
    pendingStory.current = null
    completionTimer.current = null

    const isFinalStory = revealedIds.size + 1 === stories.length
    setAnnouncedStatus(
      isFinalStory
        ? `Ronda completa. Descubriste las 12 historias. Última historia: ${story.phrase}`
        : `Historia ${story.id}: ${story.phrase}`,
    )
  }

  function spin() {
    if (isSpinning || roundComplete) return

    const unusedIndices = stories
      .map((story, index) => ({ story, index }))
      .filter(({ story }) => !revealedIds.has(story.id))
      .map(({ index }) => index)
    const selectedIndex = chooseUnusedIndex(unusedIndices, random())
    const story = stories[selectedIndex]
    if (!story) return

    const targetRotation = rotationForSegment(rotation, selectedIndex, stories.length)
    if (segmentAtPointer(targetRotation, stories.length) !== selectedIndex) {
      throw new Error('Roulette selection and pointer rotation disagree')
    }

    pendingStory.current = story
    setSelectedStory(null)
    setIsSpinning(true)
    setAnnouncedStatus('La ruleta está girando.')
    setRotation(targetRotation)
    completionTimer.current = setTimeout(completeSpin, effectiveSpinDuration)
  }

  function reset() {
    if (completionTimer.current) clearTimeout(completionTimer.current)
    completionTimer.current = null
    pendingStory.current = null
    setRevealedIds(new Set())
    setSelectedStory(null)
    setRotation(0)
    setIsSpinning(false)
    setAnnouncedStatus('Ruleta reiniciada. Las 12 historias están disponibles.')
  }

  return (
    <section className="roulette" aria-labelledby="roulette-heading">
      <div className="roulette-copy">
        <p className="eyebrow">Aprender Sin Barreras</p>
        <h1 id="roulette-heading">Historias que nos hacen pensar</h1>
        <p className="intro">
          Girá la ruleta y descubrí historias que invitan a reflexionar sobre el acceso a la educación.
        </p>
        <p className="progress" aria-label={`${revealedIds.size} de 12 historias descubiertas`}>
          <strong>{revealedIds.size}</strong> de 12 historias descubiertas
        </p>
      </div>

      <div className="roulette-stage">
        <div className="wheel-frame">
          <svg
            className="wheel"
            viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
            role="img"
            aria-label={`Ruleta de 12 historias. ${revealedIds.size} descubiertas.`}
          >
            <circle cx={CENTER} cy={CENTER} r="194" className="wheel-shadow" />
            <g
              data-testid="wheel-rotor"
              className="wheel-rotor"
              style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: `${effectiveSpinDuration}ms`,
              }}
            >
              {stories.map((story, index) => {
                const revealed = revealedIds.has(story.id)
                return (
                  <g
                    key={story.id}
                    data-testid={`segment-${story.id}`}
                    data-story-id={story.id}
                    data-revealed={revealed ? 'true' : 'false'}
                    aria-label={revealed ? `Historia ${story.id}: ${story.phrase}` : `Historia ${story.id}`}
                  >
                    <path
                      d={segmentPath(index)}
                      fill={revealed ? REVEALED_COLOR : SEGMENT_COLORS[index]}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <SegmentLabel story={story} revealed={revealed} />
                  </g>
                )
              })}
              <circle cx={CENTER} cy={CENTER} r="36" className="wheel-hub" />
              <circle cx={CENTER} cy={CENTER} r="11" className="wheel-hub-center" />
            </g>
          </svg>
          <div className="pointer" aria-hidden="true" />
        </div>

        <div className="controls">
          <button className="button button-primary" type="button" onClick={spin} disabled={isSpinning || roundComplete}>
            {isSpinning ? 'GIRANDO…' : 'GIRAR RULETA'}
          </button>
          <button className="button button-secondary" type="button" onClick={reset}>
            REINICIAR RULETA
          </button>
        </div>
      </div>

      <aside className={`result-panel${selectedStory || roundComplete ? ' result-panel-active' : ''}`} aria-label="Resultado de la ruleta">
        {selectedStory ? (
          <>
            <p className="result-kicker">Historia {selectedStory.id}</p>
            <h2>{selectedStory.phrase}</h2>
            {roundComplete ? (
              <>
                <p>Ronda completa. ¡Descubriste las 12 historias!</p>
                <p>Reiniciá la ruleta para comenzar una nueva ronda.</p>
              </>
            ) : (
              <p>Una historia para escuchar, compartir y pensar en comunidad.</p>
            )}
          </>
        ) : (
          <>
            <p className="result-kicker">Tu próxima historia</p>
            <h2>La ruleta está lista</h2>
            <p>Las historias descubiertas quedarán marcadas en rojo durante toda la ronda.</p>
          </>
        )}
      </aside>

      <p className="sr-only" role="status" aria-live="polite">
        {announcedStatus}
      </p>
    </section>
  )
}
