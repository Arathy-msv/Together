// Assembles the recorded scenes, title cards and narration into the final videos.
//
// Inputs (from record.mjs and narrate.mjs): work/recording/timeline.json + frames, work/narration/*.
// Outputs in output/ (ignored by git):
//   together-demo.mp4           1920×1080 30 fps H.264 + AAC, soft English subtitles, chapter markers
//   together-demo.en.srt        English subtitles
//   chapters/NN-<chapter>.mp4   one clip per chapter (with its own .srt)
//   together-presales.mp4/.srt  short presales cut (scene list in presales.mjs)
//   scene-timings.md            narration script with the final start/end time of every scene
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadScript } from './script.mjs'
import { renderCards } from './cards.mjs'
import { PRESALES_SCENES } from './presales.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const recording = path.join(root, 'work', 'recording')
const narration = path.join(root, 'work', 'narration')
const build = path.join(root, 'work', 'build')
const output = path.join(root, 'output')
const FPS = 30
const RATE = 48000
const LEAD = 0.5 // narration starts this long after a scene begins
const CARD_LEAD = 0.6
const CARD_TAIL = 1.2
// Long, mostly silent stretches (typing, page loads) may play back faster, never more than this.
// Narration audio is never sped up.
const MAX_SPEEDUP = 1.6
const QUIET_TAIL = 2.2

const ffmpeg = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] })
const probe = (file) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim())

fs.rmSync(build, { recursive: true, force: true })
fs.mkdirSync(build, { recursive: true })
fs.mkdirSync(path.join(output, 'chapters'), { recursive: true })

const { chapters } = loadScript()
const timeline = JSON.parse(fs.readFileSync(path.join(recording, 'timeline.json'), 'utf8'))
const cues = JSON.parse(fs.readFileSync(path.join(narration, 'cues.json'), 'utf8'))
const durations = JSON.parse(fs.readFileSync(path.join(narration, 'durations.json'), 'utf8'))
const recorded = Object.fromEntries(timeline.scenes.map((scene) => [scene.id, scene]))
const frames = timeline.frames.map((f) => ({ t: f.t, file: path.join(recording, f.file) }))

const problems = []
for (const scene of timeline.scenes) if (scene.consoleErrors) problems.push(`${scene.id}: console errors ${JSON.stringify(scene.consoleErrors)}`)

console.log('Rendering title cards…')
const cards = await renderCards(path.join(build, 'cards'), path.join(root, 'assets', 'greenwood-logo.png'))

const VIDEO_ARGS = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-profile:v', 'high', '-g', String(FPS * 2)]

/** Narration placed at `lead` seconds, padded with silence to exactly `seconds`. */
function audioClip(id, lead, seconds, file) {
  const source = path.join(narration, `${id}.wav`)
  ffmpeg(['-i', source, '-af', `adelay=${Math.round(lead * 1000)}:all=1,apad`, '-t', seconds.toFixed(4), '-ac', '2', '-ar', String(RATE), '-c:a', 'pcm_s16le', file])
}

function cardClip(id, index) {
  const seconds = Math.round((durations[id] + CARD_LEAD + CARD_TAIL) * FPS) / FPS
  const video = path.join(build, `${index}-${id}.mp4`)
  const fadeOut = (seconds - 0.4).toFixed(3)
  ffmpeg(['-loop', '1', '-framerate', String(FPS), '-i', cards[id], '-t', seconds.toFixed(4), '-vf', `scale=1920:1080,fade=in:st=0:d=0.4,fade=out:st=${fadeOut}:d=0.4,format=yuv420p`, ...VIDEO_ARGS, '-an', video])
  const audio = path.join(build, `${index}-${id}.wav`)
  audioClip(id, CARD_LEAD, seconds, audio)
  return { id, video, audio, seconds, lead: CARD_LEAD, speed: 1 }
}

function sceneClip(id, index) {
  const scene = recorded[id]
  if (!scene || !scene.end) throw new Error(`Scene ${id} was not recorded; run record.mjs`)
  const real = scene.end - scene.start
  if (real < durations[id] + LEAD + 0.5) throw new Error(`Scene ${id} (${real.toFixed(1)} s) is shorter than its narration; run record.mjs again after narrate.mjs`)
  const need = durations[id] + LEAD + QUIET_TAIL
  const speed = real > need + 3 ? Math.min(MAX_SPEEDUP, real / need) : 1
  const seconds = Math.round((real / speed) * FPS) / FPS
  const before = frames.filter((f) => f.t <= scene.start).at(-1)
  const inside = frames.filter((f) => f.t > scene.start && f.t < scene.end)
  const list = before ? [{ ...before, t: scene.start }, ...inside] : inside
  if (!list.length) throw new Error(`No frames for ${id}`)
  const lines = []
  list.forEach((frame, i) => {
    const next = i + 1 < list.length ? list[i + 1].t : scene.end
    lines.push(`file '${frame.file}'`, `duration ${((next - frame.t) / speed).toFixed(4)}`)
  })
  lines.push(`file '${list.at(-1).file}'`)
  const concat = path.join(build, `${index}-${id}.txt`)
  fs.writeFileSync(concat, lines.join('\n'))
  const video = path.join(build, `${index}-${id}.mp4`)
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', concat, '-vf', `scale=1920:1080:flags=lanczos,fps=${FPS},format=yuv420p`, '-frames:v', String(Math.round(seconds * FPS)), ...VIDEO_ARGS, '-an', video])
  const audio = path.join(build, `${index}-${id}.wav`)
  audioClip(id, LEAD, seconds, audio)
  return { id, video, audio, seconds, lead: LEAD, speed }
}

console.log('Building scene clips…')
const clips = []
let index = 0
for (const chapter of chapters) {
  for (const scene of chapter.scenes) {
    index += 1
    const clip = scene.card ? cardClip(scene.id, String(index).padStart(2, '0')) : sceneClip(scene.id, String(index).padStart(2, '0'))
    clip.chapter = chapter
    clip.sentences = scene.sentences
    clips.push(clip)
    process.stdout.write(`  ${scene.id} ${clip.seconds.toFixed(1)}s${clip.speed > 1 ? ` (×${clip.speed.toFixed(2)})` : ''}\n`)
  }
}

const stamp = (s) => {
  const ms = Math.round(s * 1000)
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`
}
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Wraps a subtitle into at most two lines of about 42 characters. */
function wrap(text) {
  if (text.length <= 42) return text
  const words = text.split(' ')
  let best = text
  let bestScore = Infinity
  for (let i = 1; i < words.length; i += 1) {
    const a = words.slice(0, i).join(' ')
    const b = words.slice(i).join(' ')
    const score = Math.max(a.length, b.length)
    if (score < bestScore) { bestScore = score; best = `${a}\n${b}` }
  }
  return best
}

/** Splits a long sentence into readable cue chunks timed by character share. */
function chunks(cue) {
  const limit = 84
  if (cue.text.length <= limit) return [cue]
  const words = cue.text.split(' ')
  const target = cue.text.length / Math.ceil(cue.text.length / limit)
  const parts = []
  let current = ''
  words.forEach((word, i) => {
    current = current ? `${current} ${word}` : word
    const left = words.length - i - 1
    const pause = /[,;:.—]$/.test(word) && current.length >= target * 0.6
    if (left > 1 && (pause || current.length >= target)) { parts.push(current); current = '' }
  })
  if (current) parts.push(current)
  if (parts.length > 1 && parts.at(-1).length < 28) {
    const tail = parts.pop()
    parts.push(`${parts.pop()} ${tail}`)
  }
  const total = parts.reduce((n, p) => n + p.length, 0)
  let t = cue.start
  return parts.map((text) => {
    const length = ((cue.end - cue.start) * text.length) / total
    const piece = { start: t, end: t + length, text }
    t += length
    return piece
  })
}

function writeOutputs(selection, name, { title, file } = {}) {
  const videoList = path.join(build, `${name}.videos.txt`)
  fs.writeFileSync(videoList, selection.map((clip) => `file '${clip.video}'`).join('\n'))
  const audioList = path.join(build, `${name}.audio.txt`)
  fs.writeFileSync(audioList, selection.map((clip) => `file '${clip.audio}'`).join('\n'))
  const audio = path.join(build, `${name}.wav`)
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', audioList, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', String(RATE), '-c:a', 'pcm_s16le', audio])

  const srt = []
  const chaptersMeta = [';FFMETADATA1', `title=Together — Greenwood School demo${title ? ` (${title})` : name === 'together-demo' ? '' : ` (${selection[0].chapter.title})`}`]
  const timings = []
  const marks = []
  let t = 0
  let n = 0
  for (const clip of selection) {
    if (clip.chapter !== marks.at(-1)?.chapter) {
      if (marks.length) marks.at(-1).end = t
      marks.push({ chapter: clip.chapter, start: t })
    }
    for (const cue of cues[clip.id]) {
      for (const piece of chunks(cue)) {
        n += 1
        srt.push(String(n), `${stamp(t + clip.lead + piece.start)} --> ${stamp(t + clip.lead + piece.end)}`, wrap(piece.text), '')
      }
    }
    timings.push({ clip, start: t, end: t + clip.seconds })
    t += clip.seconds
  }
  marks.at(-1).end = t
  for (const mark of marks) chaptersMeta.push('[CHAPTER]', 'TIMEBASE=1/1000', `START=${Math.round(mark.start * 1000)}`, `END=${Math.round(mark.end * 1000)}`, `title=${mark.chapter.title}`)
  const base = file ?? (name === 'together-demo' ? path.join(output, 'together-demo') : path.join(output, 'chapters', name))
  const srtFile = `${base}.en.srt`
  fs.writeFileSync(srtFile, srt.join('\n'))
  const meta = path.join(build, `${name}.ffmeta`)
  fs.writeFileSync(meta, chaptersMeta.join('\n') + '\n')
  const mp4 = `${base}.mp4`
  ffmpeg([
    '-f', 'concat', '-safe', '0', '-i', videoList, '-i', audio, '-i', srtFile, '-i', meta,
    '-map', '0:v', '-map', '1:a', '-map', '2:s', '-map_metadata', '3', '-map_chapters', '3',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-c:s', 'mov_text',
    '-metadata:s:a:0', 'language=eng', '-metadata:s:s:0', 'language=eng', '-metadata:s:s:0', 'title=English',
    '-movflags', '+faststart', mp4,
  ])
  return { mp4, srtFile, timings, seconds: t }
}

console.log('Writing the main walkthrough…')
const main = writeOutputs(clips, 'together-demo')

console.log('Writing chapter clips…')
const chapterOutputs = []
chapters.forEach((chapter, i) => {
  const selection = clips.filter((clip) => clip.chapter === chapter)
  if (chapter.id === 'intro' || chapter.id === 'end') return
  chapterOutputs.push(writeOutputs(selection, `${String(i).padStart(2, '0')}-${chapter.id}`))
})

console.log('Writing the presales cut…')
const byId = Object.fromEntries(clips.map((clip) => [clip.id, clip]))
const missing = PRESALES_SCENES.filter((id) => !byId[id])
if (missing.length) throw new Error(`Presales scenes not in the script: ${missing.join(', ')}`)
const presales = writeOutputs(PRESALES_SCENES.map((id) => byId[id]), 'together-presales', { title: 'presales', file: path.join(output, 'together-presales') })

const doc = ['# Narration script with final timings', '', `Generated by \`assemble.mjs\` for \`output/together-demo.mp4\` (${clock(main.seconds)} total).`, 'Edit the narration in `narration/script.md`, then rerun narrate → record → assemble.', '']
let lastChapter = null
for (const { clip, start, end } of main.timings) {
  if (clip.chapter !== lastChapter) { doc.push(`## ${clip.chapter.title}`, ''); lastChapter = clip.chapter }
  doc.push(`### ${clock(start)}–${clock(end)} · \`${clip.id}\`${clip.speed > 1 ? ` (screen played at ×${clip.speed.toFixed(2)})` : ''}`, '')
  for (const sentence of clip.sentences) doc.push(`- ${sentence.text}`)
  doc.push('')
}
fs.writeFileSync(path.join(output, 'scene-timings.md'), doc.join('\n'))
fs.writeFileSync(path.join(root, 'narration', 'scene-timings.md'), doc.join('\n'))

const report = {
  main: { file: main.mp4, seconds: Number(main.seconds.toFixed(2)), measured: probe(main.mp4) },
  presales: { file: presales.mp4, seconds: Number(presales.seconds.toFixed(2)), scenes: PRESALES_SCENES },
  chapters: chapterOutputs.map((c) => ({ file: c.mp4, seconds: Number(c.seconds.toFixed(2)) })),
  speedups: clips.filter((c) => c.speed > 1).map((c) => `${c.id} ×${c.speed.toFixed(2)}`),
  problems,
}
fs.writeFileSync(path.join(output, 'assembly-report.json'), JSON.stringify(report, null, 1))
console.log(JSON.stringify(report, null, 1))
