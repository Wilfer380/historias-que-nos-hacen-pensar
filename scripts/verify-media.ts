import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stories } from '../src/data/stories.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const videosDirectory = join(projectRoot, 'public', 'videos')

async function sha256(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk)
  }
  return hash.digest('hex')
}

const expectedFiles = new Set(stories.map(({ webFilename }) => webFilename))
const actualFiles = (await readdir(videosDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.mp4'))
  .map((entry) => entry.name)

const missing = [...expectedFiles].filter((filename) => !actualFiles.includes(filename))
const unexpected = actualFiles.filter((filename) => !expectedFiles.has(filename as (typeof stories)[number]['webFilename']))

if (missing.length > 0 || unexpected.length > 0) {
  throw new Error(`Media set mismatch. Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`)
}

for (const story of stories) {
  const actualHash = await sha256(join(videosDirectory, story.webFilename))
  if (actualHash !== story.sha256) {
    throw new Error(`${story.webFilename} has SHA-256 ${actualHash}; expected ${story.sha256}.`)
  }
}

console.log(`Verified ${stories.length} MP4 files and their SHA-256 hashes.`)
