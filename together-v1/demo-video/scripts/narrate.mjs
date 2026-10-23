// Builds the narration track for every scene in narration/script.md.
//
// Voice priority:
//   1. Your own recording: narration/recordings/<scene-id>.wav (or .mp3/.m4a) is used as-is.
//   2. Local offline Piper TTS (one voice for the whole video). No cloud service is called.
// If neither is available the script stops and says so; record.mjs then cannot time scenes.
//
// Output (ignored by git): work/narration/<scene>.wav, cues.json (sentence timings), durations.json.
import { execFileSync, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadScript } from './script.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const out = path.join(root, 'work', 'narration')
const sentencesDir = path.join(out, 'sentences')
const recordings = path.join(root, 'narration', 'recordings')
const PYTHON = process.env.PIPER_PYTHON || '/tmp/ttsvenv/bin/python'
const VOICE = process.env.PIPER_VOICE || '/tmp/voices/en_US-ljspeech-high.onnx'
const LENGTH_SCALE = process.env.PIPER_LENGTH_SCALE || '1.08'
const GAP = 0.4
const RATE = 48000

fs.mkdirSync(sentencesDir, { recursive: true })
const { scenes } = loadScript()

const probe = (file) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim())
const ffmpeg = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args])

function userRecording(id) {
  for (const ext of ['wav', 'mp3', 'm4a']) {
    const file = path.join(recordings, `${id}.${ext}`)
    if (fs.existsSync(file)) return file
  }
  return null
}

const jobs = []
for (const scene of scenes) {
  if (userRecording(scene.id)) continue
  scene.sentences.forEach((sentence) => {
    const hash = crypto.createHash('sha1').update(`${VOICE}|${LENGTH_SCALE}|${sentence.speech}`).digest('hex').slice(0, 12)
    sentence.raw = path.join(sentencesDir, `${hash}.wav`)
    if (!fs.existsSync(sentence.raw)) jobs.push({ text: sentence.speech, out: sentence.raw })
  })
}
if (jobs.length) {
  if (!fs.existsSync(PYTHON) || !fs.existsSync(VOICE)) {
    console.error(`Local TTS is not available (looked for ${PYTHON} and ${VOICE}).`)
    console.error('Add your own recordings in narration/recordings/<scene-id>.wav, or install Piper (see README).')
    process.exit(2)
  }
  console.log(`Synthesizing ${jobs.length} sentences with local Piper voice ${path.basename(VOICE)}…`)
  const result = spawnSync(PYTHON, [path.join(here, 'piper_batch.py'), VOICE, LENGTH_SCALE], { input: JSON.stringify(jobs), stdio: ['pipe', 'ignore', 'inherit'] })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const silence = path.join(out, `gap.wav`)
ffmpeg(['-f', 'lavfi', '-i', `anullsrc=r=${RATE}:cl=mono`, '-t', String(GAP), '-c:a', 'pcm_s16le', silence])

const cues = {}
const durations = {}
const sources = {}
for (const scene of scenes) {
  const target = path.join(out, `${scene.id}.wav`)
  const own = userRecording(scene.id)
  if (own) {
    ffmpeg(['-i', own, '-ac', '1', '-ar', String(RATE), '-c:a', 'pcm_s16le', target])
    const total = probe(target)
    const weight = scene.sentences.map((s) => s.text.length)
    const sum = weight.reduce((a, b) => a + b, 0) || 1
    let t = 0
    cues[scene.id] = scene.sentences.map((s, i) => {
      const length = (total * weight[i]) / sum
      const cue = { start: t, end: t + length, text: s.text }
      t += length
      return cue
    })
    durations[scene.id] = total
    sources[scene.id] = 'user recording'
    continue
  }
  const parts = []
  const normalized = scene.sentences.map((sentence, i) => {
    const file = path.join(out, `${scene.id}.${i}.wav`)
    ffmpeg(['-i', sentence.raw, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse', '-ac', '1', '-ar', String(RATE), '-c:a', 'pcm_s16le', file])
    return file
  })
  let t = 0
  cues[scene.id] = scene.sentences.map((sentence, i) => {
    const length = probe(normalized[i])
    if (i > 0) { parts.push(silence); t += GAP }
    parts.push(normalized[i])
    const cue = { start: t, end: t + length, text: sentence.text }
    t += length
    return cue
  })
  const list = path.join(out, `${scene.id}.txt`)
  fs.writeFileSync(list, parts.map((file) => `file '${file}'`).join('\n'))
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c:a', 'pcm_s16le', target])
  for (const file of normalized) fs.rmSync(file)
  fs.rmSync(list)
  durations[scene.id] = probe(target)
  sources[scene.id] = `Piper TTS (${path.basename(VOICE)})`
}

fs.writeFileSync(path.join(out, 'cues.json'), JSON.stringify(cues, null, 1))
fs.writeFileSync(path.join(out, 'durations.json'), JSON.stringify(durations, null, 1))
fs.writeFileSync(path.join(out, 'sources.json'), JSON.stringify(sources, null, 1))
const total = Object.values(durations).reduce((a, b) => a + b, 0)
console.log(`${scenes.length} scenes, ${total.toFixed(1)} s of narration (${(total / 60).toFixed(1)} min).`)
