// Records every scene of the demo in one isolated browser profile.
// Usage:
//   node record.mjs                  full capture (scene length follows narration durations)
//   DRY=1 node record.mjs            no capture; screenshot after each scene (for checking flows)
//   DRY=1 FROM=<sceneId> node ...    resume a dry run from the checkpoint saved before that scene
//   UNTIL=<sceneId>                  stop after that scene
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRecorder } from './recorder.mjs'
import { SCENES } from './scenes.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const work = path.join(root, 'work', 'recording')
const checkpoints = path.join(root, 'work', 'checkpoints')
const dry = process.env.DRY === '1'
const from = process.env.FROM
const base = process.env.APP_URL || 'http://127.0.0.1:4321'
const durationsFile = path.join(root, 'work', 'narration', 'durations.json')
const durations = fs.existsSync(durationsFile) ? JSON.parse(fs.readFileSync(durationsFile, 'utf8')) : {}
if (!dry && Object.keys(durations).length === 0) throw new Error('Generate narration first (node narrate.mjs) so scenes can be timed to it.')
if (!dry && from) throw new Error('Final recordings always run every scene from a fresh profile.')

if (!from) fs.rmSync(work, { recursive: true, force: true })
fs.mkdirSync(path.join(work, 'checks'), { recursive: true })
fs.mkdirSync(checkpoints, { recursive: true })
const r = await createRecorder({ profile: path.join(root, 'work', 'chrome-demo-profile'), base, workDir: work, capture: !dry, durations })
let state = {}
let index = 0
if (from) {
  index = SCENES.findIndex((scene) => scene.id === from)
  if (index < 1) throw new Error(`Unknown or first scene: ${from}`)
  const saved = JSON.parse(fs.readFileSync(path.join(checkpoints, `${process.env.CHECKPOINT || SCENES[index - 1].id}.json`), 'utf8'))
  state = saved.state
  await r.go('/demo-identities')
  await r.ev(`(()=>{localStorage.clear(); sessionStorage.clear(); const l=${JSON.stringify(saved.local)}; for (const k in l) localStorage.setItem(k,l[k]); const s=${JSON.stringify(saved.session)}; for (const k in s) sessionStorage.setItem(k,s[k])})()`)
  await r.go(saved.path)
}
const log = []
let failed = null
try {
  for (; index < SCENES.length; index += 1) {
    const scene = SCENES[index]
    if (scene.record === false) {
      console.log(`· ${scene.id} (off camera)`)
      await scene.run(r, state)
    } else {
      if (scene.before) await scene.before(r, state)
      await r.scene(scene.id)
      await scene.run(r, state)
      await r.end()
    }
    await r.shot(path.join(work, 'checks', `${scene.id}.png`))
    const snapshot = await r.ev(`({local: Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])), session: Object.fromEntries(Object.keys(sessionStorage).map(k=>[k,sessionStorage.getItem(k)])), path: location.pathname + location.search})`)
    fs.writeFileSync(path.join(checkpoints, `${scene.id}.json`), JSON.stringify({ ...snapshot, state }))
    log.push(`ok ${scene.id}`)
    if (process.env.UNTIL === scene.id) break
  }
} catch (error) {
  failed = error
  console.error('FAILED:', error.message)
  await r.shot(path.join(work, 'checks', '_failure.png')).catch(() => {})
}
fs.writeFileSync(path.join(work, 'state.json'), JSON.stringify(state, null, 1))
await r.finish()
console.log(log.join('\n'))
if (failed) process.exit(1)
