// Parses narration/script.md into chapters and scenes of sentences.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const SCRIPT_FILE = path.resolve(here, '..', 'narration', 'script.md')

const shown = (line) => line.replace(/\{([^|}]+)\|[^}]+\}/g, '$1')
const spoken = (line) => line.replace(/\{[^|}]+\|([^}]+)\}/g, '$1')

export function loadScript(file = SCRIPT_FILE) {
  const text = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '')
  const chapters = []
  const scenes = []
  let chapter = null
  let scene = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const ch = /^# chapter (\S+) \| (.+)$/.exec(line)
    if (ch) {
      chapter = { id: ch[1], title: ch[2], scenes: [] }
      chapters.push(chapter)
      scene = null
      continue
    }
    if (line.startsWith('# ')) continue
    const sc = /^## (\S+)$/.exec(line)
    if (sc) {
      if (!chapter) throw new Error(`Scene ${sc[1]} is outside a chapter`)
      scene = { id: sc[1], chapter: chapter.id, card: sc[1].startsWith('card-'), sentences: [] }
      chapter.scenes.push(scene)
      scenes.push(scene)
      continue
    }
    if (!scene) throw new Error(`Narration outside a scene: ${line}`)
    scene.sentences.push({ text: shown(line), speech: spoken(line) })
  }
  return { chapters, scenes }
}
