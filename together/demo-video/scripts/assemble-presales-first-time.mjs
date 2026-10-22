// Builds the first-time-customer presales cut without changing the full walkthrough
// or the earlier presales export.
import { execFileSync, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  FIRST_TIME_CLIPS,
  FIRST_TIME_OUTPUT,
  FIRST_TIME_SECTIONS,
  FIRST_TIME_TARGET_SECONDS,
} from './presales-first-time.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sourceDir = path.join(root, 'work', 'build')
const work = path.join(root, 'work', 'presales-first-time')
const clipsDir = path.join(work, 'clips')
const speechDir = path.join(work, 'speech')
const output = path.join(root, 'output')
const scriptFile = path.join(root, 'narration', 'presales-first-time.md')
const base = path.join(output, FIRST_TIME_OUTPUT)
const FPS = 30
const RATE = 48000
const PYTHON = process.env.PIPER_PYTHON || '/tmp/ttsvenv/bin/python'
const VOICE = process.env.PIPER_VOICE || '/tmp/voices/en_US-ljspeech-high.onnx'
const LENGTH_SCALE = process.env.PIPER_LENGTH_SCALE || '0.9'
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
const BOLD_FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
const VIDEO_ARGS = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-profile:v', 'high', '-g', String(FPS * 2)]

const ffmpeg = (args) =>
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: ['ignore', 'inherit', 'inherit'],
  })
const probe = (file) =>
  Number(
    execFileSync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      file,
    ])
      .toString()
      .trim(),
  )

function stamp(seconds, separator = ',') {
  const ms = Math.round(seconds * 1000)
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${separator}${String(ms % 1000).padStart(3, '0')}`
}

function displayAndSpeech(line) {
  let display = line
  let speech = line
  for (const match of line.matchAll(/\{([^|{}]+)\|([^{}]+)\}/g)) {
    display = display.replace(match[0], match[1])
    speech = speech.replace(match[0], match[2])
  }
  return { text: display, speech }
}

function narrationSections() {
  const sectionMap = new Map()
  let current = null
  for (const raw of fs.readFileSync(scriptFile, 'utf8').split(/\r?\n/)) {
    if (raw.startsWith('## ')) {
      const match = raw.match(/^## \d{2}:\d{2}–\d{2}:\d{2} · (.+)$/)
      current = match?.[1] ?? null
      if (current) sectionMap.set(current, [])
    } else if (current && raw.trim() && !raw.startsWith('#')) {
      sectionMap.get(current).push(displayAndSpeech(raw.trim()))
    }
  }
  const headings = [
    'The problem and product',
    'Your organization, your website',
    'Create and publish a campaign',
    'Share it with the community',
    'The supporter experience',
    'Sponsor-funded participation',
    'Local partner rewards',
    'Personal sharing',
    'Transparency after giving',
    'Close',
  ]
  if (headings.some((heading) => !sectionMap.has(heading))) {
    throw new Error('Narration headings no longer match the first-time section map')
  }
  return Object.fromEntries(FIRST_TIME_SECTIONS.map((section, i) => [section.id, sectionMap.get(headings[i])]))
}

function sourceFor(scene) {
  const matches = fs.readdirSync(sourceDir).filter((name) => name.endsWith(`-${scene}.mp4`))
  if (matches.length !== 1) throw new Error(`${scene}: expected one source clip, found ${matches.length}`)
  return path.join(sourceDir, matches[0])
}

function validateSources() {
  const checks = []
  for (const clip of FIRST_TIME_CLIPS.filter((item) => item.scene)) {
    const file = sourceFor(clip.scene)
    const duration = probe(file)
    if (clip.start < 0 || clip.end <= clip.start || clip.end > duration + 0.01) {
      throw new Error(`${clip.scene}: ${clip.start}–${clip.end} exceeds ${duration.toFixed(3)} seconds`)
    }
    checks.push({ scene: clip.scene, source: path.relative(root, file), sourceSeconds: Number(duration.toFixed(3)), start: clip.start, end: clip.end })
  }
  return checks
}

function textFile(name, content) {
  const file = path.join(work, `${name}.txt`)
  fs.writeFileSync(file, content)
  return file
}

function cardClip(card, seconds, target) {
  const ivory = 'F7F1E7'
  const green = '173F35'
  const amber = 'C99954'
  if (card === 'later') {
    const title = textFile('later-title', 'Later in the campaign')
    ffmpeg([
      '-f', 'lavfi', '-i', `color=c=0x${ivory}:s=1920x1080:r=${FPS}:d=${seconds}`,
      '-vf', `drawbox=x=0:y=0:w=1920:h=18:color=0x${amber}:t=fill,drawtext=fontfile=${BOLD_FONT}:textfile=${title}:fontcolor=0x${green}:fontsize=68:x=(w-text_w)/2:y=(h-text_h)/2,fade=t=in:st=0:d=0.35,fade=t=out:st=${(seconds - 0.35).toFixed(2)}:d=0.35`,
      '-t', String(seconds), ...VIDEO_ARGS, '-an', target,
    ])
    return
  }
  const together = textFile('closing-brand', 'TOGETHER')
  const statement = textFile('closing-statement', 'Your organization.\nYour fundraising website.\nMore ways to participate.\nA clearer view of progress.')
  const cta = textFile('closing-cta', 'Explore a pilot for your organization.')
  ffmpeg([
    '-f', 'lavfi', '-i', `color=c=0x${green}:s=1920x1080:r=${FPS}:d=${seconds}`,
    '-vf', [
      `drawbox=x=0:y=0:w=1920:h=18:color=0x${amber}:t=fill`,
      `drawtext=fontfile=${BOLD_FONT}:textfile=${together}:fontcolor=0x${amber}:fontsize=30:x=(w-text_w)/2:y=145`,
      `drawtext=fontfile=${BOLD_FONT}:textfile=${statement}:fontcolor=0x${ivory}:fontsize=62:line_spacing=18:x=(w-text_w)/2:y=250`,
      `drawtext=fontfile=${FONT}:textfile=${cta}:fontcolor=0x${ivory}:fontsize=34:x=(w-text_w)/2:y=825`,
      `fade=t=in:st=0:d=0.4`,
    ].join(','),
    '-t', String(seconds), ...VIDEO_ARGS, '-an', target,
  ])
}

function visualTimeline() {
  const built = []
  let index = 0
  for (const section of FIRST_TIME_SECTIONS) {
    for (const clip of section.clips) {
      index += 1
      const target = path.join(clipsDir, `${String(index).padStart(2, '0')}-${clip.scene ?? `card-${clip.card}`}.mp4`)
      const seconds = clip.duration ?? clip.end - clip.start
      if (clip.scene) {
        ffmpeg([
          '-ss', String(clip.start), '-t', String(seconds), '-i', sourceFor(clip.scene),
          '-vf', `scale=1707:960:flags=lanczos,pad=1920:1080:106:0:color=0xF7F1E7,setsar=1,fps=${FPS},format=yuv420p`,
          '-frames:v', String(Math.round(seconds * FPS)), ...VIDEO_ARGS, '-an', target,
        ])
      } else {
        cardClip(clip.card, seconds, target)
      }
      built.push({ ...clip, target, seconds })
      process.stdout.write(`  ${String(index).padStart(2, '0')} ${clip.scene ?? `card-${clip.card}`} ${seconds.toFixed(1)}s\n`)
    }
  }
  const list = path.join(work, 'visuals.txt')
  fs.writeFileSync(list, built.map(({ target }) => `file '${target}'`).join('\n'))
  const visual = path.join(work, 'visual.mp4')
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', visual])
  return { built, visual }
}

function synthesizeNarration(sections) {
  if (!fs.existsSync(PYTHON) || !fs.existsSync(VOICE)) {
    throw new Error(`Local Piper is unavailable (expected ${PYTHON} and ${VOICE})`)
  }
  const jobs = []
  for (const [section, cues] of Object.entries(sections)) {
    cues.forEach((cue, i) => {
      const hash = crypto.createHash('sha1').update(`${VOICE}|${LENGTH_SCALE}|${cue.speech}`).digest('hex').slice(0, 12)
      cue.raw = path.join(speechDir, `${section}-${String(i + 1).padStart(2, '0')}-${hash}.wav`)
      if (!fs.existsSync(cue.raw)) jobs.push({ text: cue.speech, out: cue.raw })
    })
  }
  if (jobs.length) {
    const result = spawnSync(PYTHON, [path.join(here, 'piper_batch.py'), VOICE, LENGTH_SCALE], {
      input: JSON.stringify(jobs),
      stdio: ['pipe', 'inherit', 'inherit'],
    })
    if (result.status !== 0) throw new Error(`Piper exited with ${result.status ?? 'no status'}`)
  }

  const globalCues = []
  const sectionAudio = []
  let globalStart = 0
  for (const section of FIRST_TIME_SECTIONS) {
    const cues = sections[section.id]
    const normalized = cues.map((cue, i) => {
      const file = path.join(speechDir, `${section.id}-${String(i + 1).padStart(2, '0')}.wav`)
      ffmpeg([
        '-i', cue.raw,
        '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse',
        '-ac', '1', '-ar', String(RATE), '-c:a', 'pcm_s16le', file,
      ])
      return { ...cue, file, seconds: probe(file) }
    })
    const speechSeconds = normalized.reduce((sum, cue) => sum + cue.seconds, 0)
    const margin = 0.5
    const availableGap = section.targetSeconds - speechSeconds - margin * 2
    if (availableGap < 0) {
      throw new Error(`${section.id}: ${speechSeconds.toFixed(2)} seconds of speech exceeds its ${section.targetSeconds}-second section`)
    }
    const gap = normalized.length > 1 ? availableGap / (normalized.length - 1) : 0
    const parts = []
    let cursor = margin
    const opening = path.join(speechDir, `${section.id}-opening.wav`)
    ffmpeg(['-f', 'lavfi', '-i', `anullsrc=r=${RATE}:cl=mono`, '-t', margin.toFixed(6), '-c:a', 'pcm_s16le', opening])
    parts.push(opening)
    normalized.forEach((cue, i) => {
      const start = cursor
      const end = start + cue.seconds
      globalCues.push({ section: section.id, start: globalStart + start, end: globalStart + end, text: cue.text })
      parts.push(cue.file)
      cursor = end
      if (i < normalized.length - 1) {
        const silence = path.join(speechDir, `${section.id}-gap-${String(i + 1).padStart(2, '0')}.wav`)
        ffmpeg(['-f', 'lavfi', '-i', `anullsrc=r=${RATE}:cl=mono`, '-t', gap.toFixed(6), '-c:a', 'pcm_s16le', silence])
        parts.push(silence)
        cursor += gap
      }
    })
    const closing = path.join(speechDir, `${section.id}-closing.wav`)
    ffmpeg(['-f', 'lavfi', '-i', `anullsrc=r=${RATE}:cl=mono`, '-t', Math.max(0, section.targetSeconds - cursor).toFixed(6), '-c:a', 'pcm_s16le', closing])
    parts.push(closing)
    const list = path.join(speechDir, `${section.id}.txt`)
    fs.writeFileSync(list, parts.map((file) => `file '${file}'`).join('\n'))
    const track = path.join(speechDir, `${section.id}.wav`)
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-t', String(section.targetSeconds), '-c:a', 'pcm_s16le', track])
    sectionAudio.push(track)
    globalStart += section.targetSeconds
  }
  const list = path.join(work, 'narration.txt')
  fs.writeFileSync(list, sectionAudio.map((file) => `file '${file}'`).join('\n'))
  const audio = path.join(work, 'narration.wav')
  ffmpeg([
    '-f', 'concat', '-safe', '0', '-i', list, '-t', String(FIRST_TIME_TARGET_SECONDS),
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', String(RATE), '-ac', '2', '-c:a', 'pcm_s16le', audio,
  ])
  return { audio, cues: globalCues }
}

function wrap(text) {
  if (text.length <= 52) return text
  const words = text.split(' ')
  let best = text
  let score = Infinity
  for (let i = 1; i < words.length; i += 1) {
    const a = words.slice(0, i).join(' ')
    const b = words.slice(i).join(' ')
    const candidate = Math.max(a.length, b.length)
    if (candidate < score) {
      score = candidate
      best = `${a}\n${b}`
    }
  }
  return best
}

function subtitles(cues) {
  const blocks = cues.map((cue, i) => [
    String(i + 1),
    `${stamp(cue.start)} --> ${stamp(cue.end)}`,
    wrap(cue.text),
    '',
  ].join('\n'))
  const srt = `${base}.en.srt`
  const vtt = `${base}.en.vtt`
  fs.writeFileSync(srt, `${blocks.join('\n')}\n`)
  fs.writeFileSync(vtt, `WEBVTT\n\n${blocks.join('\n').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')}\n`)
  return { srt, vtt }
}

function chapterMetadata() {
  const lines = [';FFMETADATA1', 'title=Together — first-time customer presales journey']
  let start = 0
  for (const section of FIRST_TIME_SECTIONS) {
    lines.push(
      '[CHAPTER]',
      'TIMEBASE=1/1000',
      `START=${Math.round(start * 1000)}`,
      `END=${Math.round((start + section.targetSeconds) * 1000)}`,
      `title=${section.title}`,
    )
    start += section.targetSeconds
  }
  const file = path.join(work, 'chapters.ffmeta')
  fs.writeFileSync(file, `${lines.join('\n')}\n`)
  return file
}

fs.rmSync(clipsDir, { recursive: true, force: true })
fs.mkdirSync(clipsDir, { recursive: true })
fs.mkdirSync(speechDir, { recursive: true })
fs.mkdirSync(output, { recursive: true })

console.log('Validating source excerpts…')
const sourceChecks = validateSources()
console.log(`  ${sourceChecks.length} excerpts across ${new Set(sourceChecks.map((item) => item.scene)).size} source scenes`)

console.log('Building the 270-second visual timeline…')
const visuals = visualTimeline()

console.log('Synthesizing and timing local English narration…')
const narration = synthesizeNarration(narrationSections())
const sidecars = subtitles(narration.cues)
const chapters = chapterMetadata()

console.log('Burning captions and writing the new presales export…')
const mp4 = `${base}.mp4`
const escapedSrt = sidecars.srt.replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", "\\'")
ffmpeg([
  '-i', visuals.visual, '-i', narration.audio, '-i', sidecars.srt, '-i', chapters,
  '-filter_complex', `[0:v]subtitles='${escapedSrt}':force_style='FontName=DejaVu Sans,FontSize=13,PrimaryColour=&H00353F17,OutlineColour=&H00F7F1E7,BorderStyle=1,Outline=1,Shadow=0,Alignment=2,MarginV=20'[v]`,
  '-map', '[v]', '-map', '1:a', '-map', '2:s',
  '-map_metadata', '3', '-map_chapters', '3',
  '-t', String(FIRST_TIME_TARGET_SECONDS),
  ...VIDEO_ARGS,
  '-c:a', 'aac', '-b:a', '192k',
  '-c:s', 'mov_text',
  '-metadata:s:a:0', 'language=eng',
  '-metadata:s:s:0', 'language=eng',
  '-metadata:s:s:0', 'title=English',
  '-movflags', '+faststart',
  mp4,
])

const report = {
  generatedAt: new Date().toISOString(),
  output: path.relative(root, mp4),
  measuredSeconds: Number(probe(mp4).toFixed(3)),
  targetSeconds: FIRST_TIME_TARGET_SECONDS,
  format: '1920x1080, 30 fps, H.264 video, AAC English narration, burned and soft English captions',
  narration: {
    script: path.relative(root, scriptFile),
    voice: `local Piper (${path.basename(VOICE)}), length scale ${LENGTH_SCALE}`,
    cues: narration.cues.length,
  },
  sources: sourceChecks,
  timeline: FIRST_TIME_SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    seconds: section.targetSeconds,
    clips: section.clips,
  })),
  sidecars: [path.relative(root, sidecars.srt), path.relative(root, sidecars.vtt)],
  preservedExports: ['output/together-demo.mp4', 'output/together-presales.mp4'],
}
fs.writeFileSync(`${base}.assembly.json`, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ output: report.output, measuredSeconds: report.measuredSeconds, cues: report.narration.cues }, null, 2))
