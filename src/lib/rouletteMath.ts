export const FULL_ROTATION_DEGREES = 360

export function normalizeRotation(rotation: number): number {
  return ((rotation % FULL_ROTATION_DEGREES) + FULL_ROTATION_DEGREES) % FULL_ROTATION_DEGREES
}

export function segmentAngle(segmentCount: number): number {
  if (!Number.isInteger(segmentCount) || segmentCount < 1) {
    throw new RangeError('segmentCount must be a positive integer')
  }

  return FULL_ROTATION_DEGREES / segmentCount
}

/**
 * Segments are centered clockwise from the fixed pointer. This returns the
 * clockwise wheel rotation whose selected segment center finishes at the pointer.
 */
export function rotationForSegment(
  currentRotation: number,
  segmentIndex: number,
  segmentCount: number,
  fullTurns = 5,
): number {
  if (!Number.isInteger(segmentIndex) || segmentIndex < 0 || segmentIndex >= segmentCount) {
    throw new RangeError('segmentIndex must identify an existing segment')
  }

  const desiredRotation = normalizeRotation(-segmentIndex * segmentAngle(segmentCount))
  const forwardOffset = normalizeRotation(desiredRotation - normalizeRotation(currentRotation))

  return currentRotation + Math.max(0, Math.trunc(fullTurns)) * FULL_ROTATION_DEGREES + forwardOffset
}

/** Returns the segment centered under the fixed top pointer for an exact resting rotation. */
export function segmentAtPointer(rotation: number, segmentCount: number): number {
  const rawIndex = Math.round(-normalizeRotation(rotation) / segmentAngle(segmentCount))
  return ((rawIndex % segmentCount) + segmentCount) % segmentCount
}

export function chooseUnusedIndex(unusedIndices: readonly number[], randomValue: number): number {
  if (unusedIndices.length === 0) {
    throw new RangeError('No unused segments remain')
  }

  const boundedRandom = Math.min(Math.max(randomValue, 0), 1 - Number.EPSILON)
  const selected = unusedIndices[Math.floor(boundedRandom * unusedIndices.length)]
  if (selected === undefined) throw new RangeError('Unable to select an unused segment')
  return selected
}
