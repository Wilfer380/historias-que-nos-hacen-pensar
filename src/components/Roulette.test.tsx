import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stories } from '../data/stories'
import { rotationForSegment } from '../lib/rouletteMath'
import { Roulette } from './Roulette'

const SPIN_DURATION = 1000

function renderRoulette(random = () => 0) {
  return render(<Roulette random={random} spinDurationMs={SPIN_DURATION} />)
}

function finishSpin() {
  act(() => vi.advanceTimersByTime(SPIN_DURATION))
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('Roulette', () => {
  it('starts with all 12 numbers and no selected phrase', () => {
    renderRoulette()

    const wheel = screen.getByRole('img', { name: /ruleta de 12 historias/i })
    for (const story of stories) {
      expect(within(wheel).getByText(String(story.id))).toBeInTheDocument()
      expect(screen.queryByText(story.phrase)).not.toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { name: 'La ruleta está lista' })).toBeInTheDocument()
  })

  it('disables the spin control for the entire active spin', () => {
    renderRoulette()
    const spinButton = screen.getByRole('button', { name: 'GIRAR RULETA' })

    fireEvent.click(spinButton)

    expect(screen.getByRole('button', { name: 'GIRANDO…' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('La ruleta está girando.')
    act(() => vi.advanceTimersByTime(SPIN_DURATION - 1))
    expect(screen.getByRole('button', { name: 'GIRANDO…' })).toBeDisabled()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('button', { name: 'GIRAR RULETA' })).toBeEnabled()
  })

  it('completes deterministically with exact pointer, segment, story ID, and result agreement', () => {
    renderRoulette(() => 0.26)

    fireEvent.click(screen.getByRole('button', { name: 'GIRAR RULETA' }))
    finishSpin()

    const selectedStory = stories[3]
    const selectedSegment = screen.getByTestId(`segment-${selectedStory.id}`)
    const expectedRotation = rotationForSegment(0, 3, stories.length)
    expect(screen.getByTestId('wheel-rotor')).toHaveStyle(`transform: rotate(${expectedRotation}deg)`)
    expect(selectedSegment).toHaveAttribute('data-story-id', String(selectedStory.id))
    expect(selectedSegment).toHaveAttribute('data-revealed', 'true')
    expect(selectedSegment).toHaveTextContent(selectedStory.phrase)
    expect(screen.getByRole('heading', { name: selectedStory.phrase })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(`Historia ${selectedStory.id}: ${selectedStory.phrase}`)
  })

  it('keeps every prior discovered segment red with its exact phrase and never repeats', () => {
    renderRoulette(() => 0)

    fireEvent.click(screen.getByRole('button', { name: 'GIRAR RULETA' }))
    finishSpin()
    fireEvent.click(screen.getByRole('button', { name: 'GIRAR RULETA' }))
    finishSpin()

    for (const story of stories.slice(0, 2)) {
      const segment = screen.getByTestId(`segment-${story.id}`)
      expect(segment).toHaveAttribute('data-revealed', 'true')
      expect(segment.querySelector('path')).toHaveAttribute('fill', '#dc2626')
      expect(segment).toHaveTextContent(story.phrase)
    }
    expect(screen.getByLabelText('2 de 12 historias descubiertas')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: stories[1].phrase })).toBeInTheDocument()
  })

  it('keeps the twelfth pointer-selected story visible when announcing round completion', () => {
    renderRoulette(() => 0)
    let expectedRotation = 0

    for (let index = 0; index < stories.length; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'GIRAR RULETA' }))
      finishSpin()
      expectedRotation = rotationForSegment(expectedRotation, index, stories.length)
    }

    for (const story of stories) {
      const segment = screen.getByTestId(`segment-${story.id}`)
      expect(segment).toHaveAttribute('data-revealed', 'true')
      expect(segment).toHaveTextContent(story.phrase)
    }

    const finalStory = stories[11]
    const resultPanel = screen.getByLabelText('Resultado de la ruleta')
    expect(screen.getByTestId('wheel-rotor')).toHaveStyle(`transform: rotate(${expectedRotation}deg)`)
    expect(screen.getByTestId(`segment-${finalStory.id}`)).toHaveAttribute('data-story-id', String(finalStory.id))
    expect(within(resultPanel).getByText(`Historia ${finalStory.id}`)).toBeInTheDocument()
    expect(within(resultPanel).getByRole('heading', { name: finalStory.phrase })).toBeInTheDocument()
    expect(within(resultPanel).getByText('Ronda completa. ¡Descubriste las 12 historias!')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'GIRAR RULETA' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Ronda completa.')
  })

  it('reset cancels animation and restores numbers, colors, selection, and availability', () => {
    renderRoulette(() => 0)

    fireEvent.click(screen.getByRole('button', { name: 'GIRAR RULETA' }))
    finishSpin()
    fireEvent.click(screen.getByRole('button', { name: 'GIRAR RULETA' }))
    fireEvent.click(screen.getByRole('button', { name: 'REINICIAR RULETA' }))

    expect(screen.getByRole('button', { name: 'GIRAR RULETA' })).toBeEnabled()
    expect(screen.getByRole('heading', { name: 'La ruleta está lista' })).toBeInTheDocument()
    expect(screen.getByTestId('wheel-rotor')).toHaveStyle('transform: rotate(0deg)')
    expect(screen.getByLabelText('0 de 12 historias descubiertas')).toBeInTheDocument()
    for (const [index, story] of stories.entries()) {
      const segment = screen.getByTestId(`segment-${story.id}`)
      expect(segment).toHaveAttribute('data-revealed', 'false')
      expect(segment.querySelector('path')).not.toHaveAttribute('fill', '#dc2626')
      expect(within(segment).getByText(String(story.id))).toBeInTheDocument()
      expect(screen.queryByText(story.phrase)).not.toBeInTheDocument()
      expect(index).toBe(story.id - 1)
    }
    act(() => vi.runAllTimers())
    expect(screen.getByLabelText('0 de 12 historias descubiertas')).toBeInTheDocument()
  })
})
