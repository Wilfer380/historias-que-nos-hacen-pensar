import { describe, expect, it } from 'vitest'
import {
  chooseUnusedIndex,
  normalizeRotation,
  rotationForSegment,
  segmentAtPointer,
} from './rouletteMath'

describe('roulette pointer math', () => {
  it('places every selected segment center under the fixed pointer after multiple turns', () => {
    for (let index = 0; index < 12; index += 1) {
      const rotation = rotationForSegment(73, index, 12, 6)
      expect(rotation).toBeGreaterThan(6 * 360)
      expect(segmentAtPointer(rotation, 12)).toBe(index)
      expect(normalizeRotation(rotation)).toBe(normalizeRotation(-index * 30))
    }
  })

  it('maps the random interval uniformly across the currently unused indices', () => {
    const unused = [1, 4, 8, 11]
    expect(chooseUnusedIndex(unused, 0)).toBe(1)
    expect(chooseUnusedIndex(unused, 0.2499)).toBe(1)
    expect(chooseUnusedIndex(unused, 0.25)).toBe(4)
    expect(chooseUnusedIndex(unused, 0.5)).toBe(8)
    expect(chooseUnusedIndex(unused, 0.9999)).toBe(11)
  })
})
